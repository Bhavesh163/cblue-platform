import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { QualificationSnapshotResponse } from './dto/qualification-snapshot.response.dto';
import {
  COMPANY_KYC_DOCUMENT_TYPES,
  PERSONAL_KYC_DOCUMENT_TYPES,
  QUALIFICATION_SOURCE_VERSION,
  qualificationEligibilitySnapshot,
} from '../qualification/qualification-eligibility';

@Injectable()
export class QualificationBridgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getSnapshot(
    legacySubjectId: string,
    bridgeKey?: string,
  ): Promise<QualificationSnapshotResponse> {
    this.assertBridgeKey(bridgeKey);
    const subject = String(legacySubjectId || '').trim();
    if (!subject) throw new NotFoundException('Qualification not found');

    const userIds = await this.resolveUserIds(subject);
    if (userIds.length === 0)
      throw new NotFoundException('Qualification not found');
    const fixer = await this.prisma.fixer.findFirst({
      where: { userId: { in: userIds } },
      include: {
        user: { select: { id: true, name: true } },
        qualificationSubmissions: {
          orderBy: { version: 'desc' },
          take: 1,
          include: {
            documents: {
              where: {
                isActive: true,
                lifecycleState: 'READY',
                documentType: { not: 'id-back' },
              },
              select: {
                id: true,
                documentType: true,
                isActive: true,
                lifecycleState: true,
                contentType: true,
                sizeBytes: true,
                evidenceStatus: true,
                extractedAt: true,
                credentialVerifiedAt: true,
                expiresAt: true,
                retentionDeleteAt: true,
                assessmentReasonCodes: true,
                createdAt: true,
                credentialVerifications: {
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                  select: {
                    status: true,
                    issuerType: true,
                    issuerName: true,
                    credentialType: true,
                    verificationMethod: true,
                    externalReference: true,
                    projectValueBaht: true,
                    corporateEndorsement: true,
                    verifiedAt: true,
                    createdAt: true,
                  },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
            evaluations: {
              orderBy: { createdAt: 'desc' },
              take: 20,
              select: {
                id: true,
                provider: true,
                model: true,
                policyVersion: true,
                promptVersion: true,
                status: true,
                deterministicScore: true,
                aiScore: true,
                risk: true,
                recommendedTier: true,
                confidence: true,
                identityConfidence: true,
                documentAuthenticityConfidence: true,
                faceMatchConfidence: true,
                livenessConfidence: true,
                credentialConfidence: true,
                tierEligibilityScore: true,
                humanReviewRequired: true,
                completedAt: true,
                createdAt: true,
              },
            },
            reviewTasks: {
              where: { status: { not: 'DECIDED' } },
              orderBy: { createdAt: 'desc' },
              take: 10,
              select: {
                id: true,
                kind: true,
                status: true,
                priority: true,
                assignedAt: true,
                proposedDecision: true,
                proposedTier: true,
                proposedAt: true,
                checkedAt: true,
                decidedAt: true,
                createdAt: true,
              },
            },
          },
        },
        tierQualifications: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            recommendedTier: true,
            approvedTier: true,
            source: true,
            policyVersion: true,
            reason: true,
            effectiveAt: true,
            expiresAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!fixer) throw new NotFoundException('Qualification not found');
    const submission = fixer.qualificationSubmissions[0] || null;
    const bridgeDocuments =
      submission?.documents.filter(
        (document) =>
          document.isActive &&
          document.lifecycleState === 'READY' &&
          document.documentType !== 'id-back',
      ) || [];
    const tierQualification = fixer.tierQualifications[0] || null;
    const eligibility = qualificationEligibilitySnapshot(fixer);
    const reviewTasks = submission?.reviewTasks || [];
    const reviewStatus = {
      kyc: reviewTasks.find((task) => task.kind === 'KYC') || null,
      tier: reviewTasks.find((task) => task.kind === 'TIER') || null,
    };
    const evidenceStatuses = bridgeDocuments.map(
      (document) => document.evidenceStatus,
    );
    const kycEvaluation =
      submission?.evaluations.find(
        (evaluation) =>
          evaluation.provider === 'TYPHOON_OCR' &&
          evaluation.promptVersion ===
            'cblue-qualification-document-assessment-v1',
      ) || null;
    const tierEvaluation =
      submission?.evaluations.find(
        (evaluation) => evaluation.provider === 'DETERMINISTIC_POLICY',
      ) || null;

    return {
      sourceVersion: QUALIFICATION_SOURCE_VERSION,
      subject: {
        id: fixer.user.id,
        displayName: fixer.publicDisplayName || fixer.user.name || 'Partner',
      },
      fixer: {
        id: fixer.id,
        status: fixer.status,
        verified: fixer.verified,
        tier: fixer.tier,
        yearsExperience: fixer.yearsExperience,
        aiScore: fixer.aiScore,
        aiTier: fixer.aiTier,
        aiCredentialStatus: fixer.aiCredentialStatus,
        publicDisplayName: fixer.publicDisplayName,
        verifiedCompanyName: fixer.verifiedCompanyName,
        companyIdentityVerifiedAt: fixer.companyIdentityVerifiedAt,
      },
      requiredEvidence: eligibility.companyPartner
        ? COMPANY_KYC_DOCUMENT_TYPES
        : PERSONAL_KYC_DOCUMENT_TYPES,
      optionalEvidence: eligibility.companyPartner
        ? ['portfolio']
        : ['company-affidavit', 'company-letter-of-intent', 'portfolio'],
      eligibility,
      submission: submission
        ? {
            id: submission.id,
            version: submission.version,
            status: submission.status,
            policyVersion: submission.policyVersion,
            submittedAt: submission.submittedAt,
            documents: bridgeDocuments.map((document) => ({
              documentType: document.documentType,
              evidenceStatus: document.evidenceStatus,
              reasonCodes: Array.isArray(document.assessmentReasonCodes)
                ? document.assessmentReasonCodes
                : [],
              expiresAt: document.expiresAt,
              createdAt: document.createdAt,
              credentialVerification: document.credentialVerifications?.[0]
                ? {
                    status: document.credentialVerifications?.[0]?.status,
                    issuerType:
                      document.credentialVerifications?.[0]?.issuerType,
                    issuerName:
                      document.credentialVerifications?.[0]?.issuerName,
                    credentialType:
                      document.credentialVerifications?.[0]?.credentialType,
                    verificationMethod:
                      document.credentialVerifications?.[0]?.verificationMethod,
                    externalReference:
                      document.credentialVerifications?.[0]?.externalReference,
                    projectValueBaht:
                      document.credentialVerifications?.[0]?.projectValueBaht,
                    corporateEndorsement:
                      document.credentialVerifications?.[0]
                        ?.corporateEndorsement,
                    verifiedAt:
                      document.credentialVerifications?.[0]?.verifiedAt,
                    createdAt: document.credentialVerifications?.[0]?.createdAt,
                  }
                : null,
            })),
            evaluations: submission.evaluations.map((evaluation) => ({
              policyVersion: evaluation.policyVersion,
              status: evaluation.status,
              deterministicScore: evaluation.deterministicScore,
              aiScore: evaluation.aiScore,
              risk: evaluation.risk,
              recommendedTier: evaluation.recommendedTier,
              confidence: evaluation.confidence,
              identityConfidence: evaluation.identityConfidence,
              documentAuthenticityConfidence:
                evaluation.documentAuthenticityConfidence,
              faceMatchConfidence: evaluation.faceMatchConfidence,
              livenessConfidence: evaluation.livenessConfidence,
              credentialConfidence: evaluation.credentialConfidence,
              tierEligibilityScore: evaluation.tierEligibilityScore,
              humanReviewRequired: evaluation.humanReviewRequired,
              completedAt: evaluation.completedAt,
              createdAt: evaluation.createdAt,
            })),
            reviewTask: reviewTasks[0] || null,
            reviewTasks,
          }
        : null,
      reviewStatus,
      tierQualification,
      kyc: {
        status: submission?.status || null,
        identityConfidence: kycEvaluation?.identityConfidence ?? null,
        documentAuthenticityConfidence:
          kycEvaluation?.documentAuthenticityConfidence ?? null,
        faceMatchConfidence: kycEvaluation?.faceMatchConfidence ?? null,
        livenessConfidence: kycEvaluation?.livenessConfidence ?? null,
        fraudRisk: kycEvaluation?.risk || null,
        humanReviewRequired: kycEvaluation?.humanReviewRequired ?? null,
        reasonCodes: Array.from(
          new Set(
            bridgeDocuments.flatMap((document) =>
              Array.isArray(document.assessmentReasonCodes)
                ? document.assessmentReasonCodes.filter(
                    (value): value is string => typeof value === 'string',
                  )
                : [],
            ),
          ),
        ),
      },
      tier: {
        eligibilityScore: tierEvaluation?.tierEligibilityScore ?? null,
        recommendedTier:
          tierQualification?.recommendedTier ||
          tierEvaluation?.recommendedTier ||
          null,
        approvedTier: tierQualification?.approvedTier || null,
        humanReviewRequired: tierEvaluation?.humanReviewRequired ?? null,
      },
      verification: {
        documentCount: evidenceStatuses.length,
        validatedCount: evidenceStatuses.filter(
          (status) => status === 'VALIDATED',
        ).length,
        contradictedCount: evidenceStatuses.filter(
          (status) => status === 'CONTRADICTED',
        ).length,
        insufficientCount: evidenceStatuses.filter(
          (status) => status === 'INSUFFICIENT',
        ).length,
        uncheckedCount: evidenceStatuses.filter(
          (status) => status === 'UNCHECKED',
        ).length,
        adminDecisionStatus: reviewTasks[0]
          ? reviewTasks[0].proposedAt && !reviewTasks[0].checkedAt
            ? 'DECISION_IN_PROGRESS'
            : reviewTasks[0].status
          : null,
        decisionStatus: reviewTasks[0]
          ? reviewTasks[0].proposedAt && !reviewTasks[0].checkedAt
            ? 'DECISION_IN_PROGRESS'
            : reviewTasks[0].status
          : null,
        makerCheckerStatus: reviewTasks[0]
          ? reviewTasks[0].proposedAt && !reviewTasks[0].checkedAt
            ? 'DECISION_IN_PROGRESS'
            : reviewTasks[0].status
          : null,
      },
    };
  }

  private assertBridgeKey(providedKey?: string) {
    const expectedKey = String(
      this.config.get<string>('blueBridge.apiKey') || '',
    ).trim();
    if (!expectedKey || String(providedKey || '').trim() !== expectedKey) {
      throw new UnauthorizedException('Invalid BLUE bridge key');
    }
  }

  private async resolveUserIds(subject: string) {
    const subscriber = await this.prisma.subscriber.findFirst({
      where: {
        OR: [
          { id: subject },
          { email: { equals: subject, mode: 'insensitive' } },
        ],
      },
      select: { id: true, email: true },
    });
    const email = String(subscriber?.email || subject).trim();
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { id: subject },
          { subscriberId: subject },
          ...(subscriber?.id ? [{ subscriberId: subscriber.id }] : []),
          ...(email.includes('@')
            ? [{ email: { equals: email, mode: 'insensitive' as const } }]
            : []),
        ],
      },
      select: { id: true },
    });
    return Array.from(new Set(users.map((user) => user.id)));
  }
}
