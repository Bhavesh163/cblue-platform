import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FixerTier,
  Prisma,
  QualificationEvidenceStatus,
  QualificationEvaluationStatus,
  QualificationRisk,
  QualificationSubmissionStatus,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  QualificationEvidenceInput,
  QUALIFICATION_POLICY_VERSION,
  QualificationPolicyService,
  TierPolicyDecision,
} from './qualification-policy.service';

type AdvisoryResult = {
  recommendedTier: FixerTier;
  risk: QualificationRisk;
  confidence: number;
  findings: string[];
};

const tierRank: Record<FixerTier, number> = {
  ECONOMY: 0,
  STANDARD: 1,
  CORPORATE: 2,
  SPECIALIST: 3,
  EXPERT: 4,
};

@Injectable()
export class QualificationEvaluationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: QualificationPolicyService,
    private readonly config: ConfigService,
  ) {}

  async evaluateSubmissionForUser(userId: string, submissionId: string) {
    return this.evaluateSubmission(submissionId, userId, userId);
  }

  async evaluateSubmissionForAdmin(adminId: string, submissionId: string) {
    return this.evaluateSubmission(submissionId, undefined, adminId);
  }

  async evaluateTier(submissionId: string, actorId?: string) {
    return this.evaluateSubmission(submissionId, undefined, actorId);
  }

  private async evaluateSubmission(
    submissionId: string,
    ownerUserId?: string,
    actorId?: string,
  ) {
    const submission = await this.prisma.kycSubmission.findFirst({
      where: ownerUserId
        ? { id: submissionId, fixer: { userId: ownerUserId } }
        : { id: submissionId },
      include: {
        fixer: {
          select: { id: true, yearsExperience: true },
        },
        documents: {
          where: {
            isActive: true,
            lifecycleState: 'READY',
            evidenceStatus: QualificationEvidenceStatus.VALIDATED,
          },
          select: {
            id: true,
            documentType: true,
            evidenceStatus: true,
            extractedFields: true,
          },
        },
      },
    });
    if (!submission) {
      throw new NotFoundException('Qualification submission not found');
    }
    if (submission.status !== QualificationSubmissionStatus.APPROVED) {
      throw new ConflictException(
        'KYC approval is required before tier evaluation',
      );
    }

    const evidence = this.buildEvidenceInput(submission);
    const deterministic = this.policy.calculateTierCeiling(evidence);
    const inputHash = createHash('sha256')
      .update(JSON.stringify({ submissionId, evidence }))
      .digest('hex');
    const deterministicRisk = this.riskFor(deterministic);
    const deterministicOutput = {
      source: 'deterministic-policy',
      evidence,
      decision: deterministic,
    };

    const advisory = await this.requestTyphoonAdvisory(
      submissionId,
      evidence,
      deterministic,
    );
    const reviewRequired = deterministic.maximumTier !== FixerTier.ECONOMY;

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        submissionId,
      );
      const evaluation = await tx.qualificationEvaluation.create({
        data: {
          submissionId,
          provider: 'DETERMINISTIC_POLICY',
          model: null,
          promptVersion: null,
          policyVersion: QUALIFICATION_POLICY_VERSION,
          status: QualificationEvaluationStatus.COMPLETED,
          deterministicScore: deterministic.eligibilityScore,
          tierEligibilityScore: deterministic.eligibilityScore,
          humanReviewRequired: reviewRequired,
          aiScore: advisory ? advisory.confidence : null,
          risk: advisory?.risk || deterministicRisk,
          recommendedTier: deterministic.maximumTier,
          confidence: advisory?.confidence ?? (reviewRequired ? 60 : 90),
          inputHash,
          output: this.json(deterministicOutput),
          completedAt: new Date(),
        },
      });

      if (advisory) {
        await tx.qualificationEvaluation.create({
          data: {
            submissionId,
            provider: 'TYPHOON_ADVISORY',
            model: this.config.get<string>('typhoon.model') || null,
            promptVersion: 'cblue-fixer-qualification-advisory-v1',
            policyVersion: QUALIFICATION_POLICY_VERSION,
            status: QualificationEvaluationStatus.COMPLETED,
            deterministicScore: deterministic.eligibilityScore,
            tierEligibilityScore: deterministic.eligibilityScore,
            humanReviewRequired: reviewRequired,
            aiScore: advisory.confidence,
            risk: advisory.risk,
            recommendedTier: advisory.recommendedTier,
            confidence: advisory.confidence,
            inputHash,
            output: this.json(advisory),
            completedAt: new Date(),
          },
        });
      }

      if (reviewRequired) {
        const existingReviewTask = await tx.qualificationReviewTask.findFirst({
          where: {
            submissionId,
            kind: 'TIER',
            status: { in: ['OPEN', 'ASSIGNED'] },
          },
          select: { id: true },
        });
        if (!existingReviewTask)
          await tx.qualificationReviewTask.create({
            data: {
              submissionId,
              status: 'OPEN',
              kind: 'TIER',
              priority: 10,
              reasonCodes: this.json({
                policyVersion: QUALIFICATION_POLICY_VERSION,
                reasonCodes: deterministic.reasonCodes,
                typhoonAdvisory: Boolean(advisory),
              }),
            },
          });
      }

      await tx.qualificationAuditLog.create({
        data: {
          submissionId,
          actorId: actorId || null,
          action: 'QUALIFICATION_EVALUATED',
          entityType: 'KycSubmission',
          entityId: submissionId,
          reason: 'Qualification evaluation requested',
          afterHash: inputHash,
        },
      });

      return evaluation;
    });

    return {
      evaluationId: created.id,
      submissionId,
      policyVersion: QUALIFICATION_POLICY_VERSION,
      deterministic,
      advisory,
      reviewRequired,
      status: QualificationSubmissionStatus.APPROVED,
    };
  }

  async getLatestForUser(userId: string, submissionId: string) {
    const submission = await this.prisma.kycSubmission.findFirst({
      where: { id: submissionId, fixer: { userId } },
      select: { id: true },
    });
    if (!submission) {
      throw new NotFoundException('Qualification submission not found');
    }
    return this.getLatestForSubmission(submissionId);
  }

  async getLatestForAdmin(submissionId: string) {
    const submission = await this.prisma.kycSubmission.findUnique({
      where: { id: submissionId },
      select: { id: true },
    });
    if (!submission) {
      throw new NotFoundException('Qualification submission not found');
    }
    return this.getLatestForSubmission(submissionId);
  }

  private async getLatestForSubmission(submissionId: string) {
    return this.prisma.qualificationEvaluation.findMany({
      where: { submissionId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        provider: true,
        model: true,
        policyVersion: true,
        status: true,
        deterministicScore: true,
        aiScore: true,
        risk: true,
        recommendedTier: true,
        confidence: true,
        completedAt: true,
        createdAt: true,
        output: true,
        findings: {
          select: {
            code: true,
            severity: true,
            claim: true,
            result: true,
            confidence: true,
            sourceRef: true,
            details: true,
          },
        },
      },
    });
  }

  private buildEvidenceInput(submission: {
    fixer: { yearsExperience: number | null };
    documents: Array<{
      id: string;
      documentType: string;
      evidenceStatus: QualificationEvidenceStatus;
      extractedFields: Prisma.JsonValue | null;
    }>;
  }): QualificationEvidenceInput {
    const documents = submission.documents;
    const verified = (type: string) =>
      documents.filter(
        (document) =>
          document.documentType === type &&
          document.evidenceStatus === QualificationEvidenceStatus.VALIDATED,
      ).length;
    const extracted = (document: (typeof documents)[number]) => {
      if (
        !document.extractedFields ||
        typeof document.extractedFields !== 'object' ||
        Array.isArray(document.extractedFields)
      ) {
        return {} as Record<string, unknown>;
      }
      const root = document.extractedFields as Record<string, unknown>;
      return root.fields &&
        typeof root.fields === 'object' &&
        !Array.isArray(root.fields)
        ? (root.fields as Record<string, unknown>)
        : root;
    };
    const validatedDocuments = documents.filter(
      (document) =>
        document.evidenceStatus === QualificationEvidenceStatus.VALIDATED,
    );
    const isCredentialEvidence = (document: (typeof documents)[number]) => {
      if (
        document.documentType === 'education-certificate' ||
        document.documentType === 'professional-certificate'
      )
        return true;
      if (document.documentType !== 'portfolio') return false;
      const fields = extracted(document);
      const detected = String(fields.detectedDocumentType || '').toLowerCase();
      const level = String(fields.credentialLevel || '').toLowerCase();
      return (
        detected.includes('certificate') ||
        detected.includes('degree') ||
        detected.includes('diploma') ||
        detected.includes('toeic') ||
        level.includes('bachelor') ||
        level.includes('master') ||
        level.includes('doctor')
      );
    };
    const credentialDocuments = validatedDocuments.filter(isCredentialEvidence);
    const corporateVerified =
      verified('corporate-certificate') > 0 ||
      verified('project-completion-certificate') >= 2;
    const millionBahtProjects = validatedDocuments.filter(
      (document) =>
        document.documentType === 'project-completion-certificate' &&
        Number(extracted(document).projectValue || 0) >= 1_000_000,
    ).length;
    const hasEligibleDegree = credentialDocuments.some((document) => {
      const level = String(
        extracted(document).credentialLevel || '',
      ).toLowerCase();
      return level.includes('master') || level.includes('doctor');
    });

    return {
      yearsExperience: submission.fixer.yearsExperience || 0,
      relatedCertificateCount: credentialDocuments.length,
      corporateCertificateCount: verified('corporate-certificate'),
      corporateEndorsedCompletionCertificateCount: verified(
        'project-completion-certificate',
      ),
      projectCompletionCertificateCount: verified(
        'project-completion-certificate',
      ),
      millionBahtCompletionCertificateCount: millionBahtProjects,
      hasEligibleMastersOrDoctorate: hasEligibleDegree,
      hasInternationalAward: verified('international-award') > 0,
      corporateEvidenceVerified: corporateVerified,
    };
  }

  private riskFor(decision: TierPolicyDecision) {
    if (decision.maximumTier !== FixerTier.ECONOMY) {
      return QualificationRisk.MEDIUM;
    }
    return QualificationRisk.LOW;
  }

  private async requestTyphoonAdvisory(
    submissionId: string,
    evidence: QualificationEvidenceInput,
    deterministic: TierPolicyDecision,
  ): Promise<AdvisoryResult | null> {
    const apiKey =
      this.config.get<string>('typhoon.apiKey') || process.env.TYPHOON_API_KEY;
    if (!apiKey) return null;

    const baseUrl =
      this.config.get<string>('typhoon.baseUrl') ||
      process.env.TYPHOON_BASE_URL ||
      'https://api.opentyphoon.ai/v1';
    const model =
      this.config.get<string>('typhoon.model') ||
      process.env.TYPHOON_MODEL ||
      'typhoon-v2.5-30b-a3b-instruct';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(
        `${baseUrl.replace(/\/$/, '')}/chat/completions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            temperature: 0,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content:
                  'Return JSON only. You are an advisory fraud and credential reviewer. Never approve a tier. The deterministic policy and human admin remain authoritative.',
              },
              {
                role: 'user',
                content: JSON.stringify({
                  submissionId,
                  evidence,
                  deterministicCeiling: deterministic.maximumTier,
                  schema: {
                    recommendedTier:
                      'ECONOMY|STANDARD|CORPORATE|SPECIALIST|EXPERT',
                    risk: 'LOW|MEDIUM|HIGH',
                    confidence: 'integer 0..100',
                    findings: 'string[]',
                  },
                }),
              },
            ],
          }),
        },
      );
      if (!response.ok) return null;
      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) return null;
      const parsed = JSON.parse(content) as Partial<AdvisoryResult>;
      if (!this.isTier(parsed.recommendedTier) || !this.isRisk(parsed.risk))
        return null;
      const confidence = parsed.confidence;
      if (
        typeof confidence !== 'number' ||
        !Number.isInteger(confidence) ||
        confidence < 0 ||
        confidence > 100
      ) {
        return null;
      }
      return {
        recommendedTier: this.clampTier(
          parsed.recommendedTier,
          deterministic.maximumTier,
        ),
        risk: parsed.risk,
        confidence,
        findings: Array.isArray(parsed.findings)
          ? parsed.findings
              .filter((item): item is string => typeof item === 'string')
              .slice(0, 20)
          : [],
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private clampTier(recommended: FixerTier, maximum: FixerTier) {
    if (tierRank[recommended] > tierRank[maximum]) {
      return maximum;
    }
    return recommended;
  }

  private isTier(value: unknown): value is FixerTier {
    return typeof value === 'string' && value in tierRank;
  }

  private isRisk(value: unknown): value is QualificationRisk {
    return (
      value === QualificationRisk.LOW ||
      value === QualificationRisk.MEDIUM ||
      value === QualificationRisk.HIGH
    );
  }

  private json(value: unknown) {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
