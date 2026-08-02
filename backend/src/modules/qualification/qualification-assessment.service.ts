import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  QualificationEvaluationStatus,
  QualificationRisk,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { QUALIFICATION_POLICY_VERSION } from './qualification-policy.service';
import { QualificationVerificationService } from './qualification-verification.service';
import {
  QualificationDocumentAssessment,
  QualificationReasonCode,
} from './qualification-assessment.types';

const EVIDENCE_STATUSES = new Set([
  'VALIDATED',
  'CONTRADICTED',
  'EXPIRED',
  'INSUFFICIENT',
  'UNCHECKED',
]);
const ROUTES = new Set([
  'NEEDS_RESUBMISSION',
  'NEEDS_MORE_EVIDENCE',
  'NEEDS_REVIEW',
  'AI_PRECLEARED',
]);
const REASON_CODES = new Set<QualificationReasonCode>([
  'DOCUMENT_VALID',
  'WRONG_DOCUMENT_TYPE',
  'UNREADABLE_DOCUMENT',
  'EXPIRED_ID',
  'INVALID_ID_NUMBER',
  'SELFIE_REVIEW_REQUIRED',
  'AFFIDAVIT_REVIEW_REQUIRED',
  'AFFIDAVIT_EXPIRED',
  'LIVENESS_FAILED',
  'MISSING_REQUIRED_EVIDENCE',
  'PROVIDER_UNAVAILABLE',
  'HUMAN_REVIEW_REQUIRED',
]);
const REQUIRED_ASSESSMENT_KEYS = new Set([
  'evidenceStatus',
  'route',
  'confidence',
  'identityConfidence',
  'documentAuthenticityConfidence',
  'faceMatchConfidence',
  'livenessConfidence',
  'reasonCodes',
  'provider',
  'model',
  'assessedAt',
]);
const ASSESSMENT_KEYS = new Set([
  'evidenceStatus',
  'route',
  'confidence',
  'identityConfidence',
  'documentAuthenticityConfidence',
  'faceMatchConfidence',
  'livenessConfidence',
  'reasonCodes',
  'provider',
  'model',
  'assessedAt',
  'extractedFields',
  'identityNumberLast4',
  'identityNumberHash',
  'subjectNameHash',
  'identityExpiryDate',
]);

type AssessmentInput = {
  submissionId: string;
  documentId: string;
  registeredName: string;
  actorId: string;
  auditAction:
    | 'DOCUMENT_ASSESSED_ON_UPLOAD'
    | 'DOCUMENT_VERIFICATION_COMPLETED';
};

@Injectable()
export class QualificationAssessmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly verification: QualificationVerificationService,
  ) {}

  async assessDocument(
    input: AssessmentInput,
  ): Promise<QualificationDocumentAssessment> {
    const document = await this.prisma.kycDocument.findFirst({
      where: { id: input.documentId, submissionId: input.submissionId },
      select: {
        id: true,
        checksumSha256: true,
        evidenceStatus: true,
        updatedAt: true,
        documentType: true,
      },
    });
    if (!document) {
      throw new NotFoundException('Qualification document not found');
    }

    let candidate: QualificationDocumentAssessment;
    try {
      const providerResult =
        await this.verification.assessStoredDocument(input);
      candidate = this.isAssessment(providerResult)
        ? this.requireHumanReview(providerResult)
        : this.unavailableAssessment();
      candidate = await this.bindEvidenceIdentity(
        input.submissionId,
        document.documentType,
        candidate,
      );
    } catch {
      candidate = this.unavailableAssessment();
    }

    let persistedAssessment!: QualificationDocumentAssessment;
    await this.prisma.$transaction(async (tx) => {
      const completedAt = new Date();
      persistedAssessment = { ...candidate, assessedAt: completedAt };
      const updated = await tx.kycDocument.updateMany({
        where: {
          id: document.id,
          evidenceStatus: document.evidenceStatus,
          updatedAt: document.updatedAt,
        },
        data: {
          evidenceStatus: persistedAssessment.evidenceStatus,
          assessmentReasonCodes: persistedAssessment.reasonCodes,
          assessedAt: completedAt,
          extractionProvider: persistedAssessment.provider,
          extractionModel: persistedAssessment.model,
          extractedAt: completedAt,
          extractionErrorCode: persistedAssessment.reasonCodes.includes(
            'PROVIDER_UNAVAILABLE',
          )
            ? 'PROVIDER_UNAVAILABLE'
            : null,
          identityNumberLast4: persistedAssessment.identityNumberLast4,
          identityNumberHash: persistedAssessment.identityNumberHash,
          subjectNameHash: persistedAssessment.subjectNameHash,
          identityExpiryDate: persistedAssessment.identityExpiryDate,
          extractedFields: persistedAssessment.extractedFields
            ? this.json(persistedAssessment.extractedFields)
            : Prisma.JsonNull,
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException(
          'Qualification document changed while assessment was running',
        );
      }

      const output = this.json({
        evidenceStatus: persistedAssessment.evidenceStatus,
        route: persistedAssessment.route,
        reasonCodes: persistedAssessment.reasonCodes,
        extractedFields: persistedAssessment.extractedFields ?? null,
      });
      const evaluation = await tx.qualificationEvaluation.create({
        data: {
          submissionId: input.submissionId,
          provider: persistedAssessment.provider,
          model: persistedAssessment.model,
          promptVersion: 'cblue-qualification-document-assessment-v1',
          policyVersion: QUALIFICATION_POLICY_VERSION,
          status: QualificationEvaluationStatus.COMPLETED,
          risk: this.riskFor(persistedAssessment),
          confidence: persistedAssessment.confidence,
          identityConfidence: persistedAssessment.identityConfidence,
          documentAuthenticityConfidence:
            persistedAssessment.documentAuthenticityConfidence,
          faceMatchConfidence: persistedAssessment.faceMatchConfidence,
          livenessConfidence: persistedAssessment.livenessConfidence,
          humanReviewRequired: true,
          inputHash: document.checksumSha256,
          output,
          completedAt,
        },
        select: { id: true },
      });
      await tx.qualificationAuditLog.create({
        data: {
          submissionId: input.submissionId,
          actorId: input.actorId,
          action: input.auditAction,
          entityType: 'KycDocument',
          entityId: document.id,
          reason:
            input.auditAction === 'DOCUMENT_VERIFICATION_COMPLETED'
              ? 'Assigned admin requested persisted document assessment'
              : 'Document assessed immediately after authenticated upload',
          beforeHash: document.checksumSha256,
          afterHash: createHash('sha256')
            .update(JSON.stringify(output))
            .digest('hex'),
          metadata: this.json({
            evaluationId: evaluation.id,
            route: persistedAssessment.route,
            reasonCodes: persistedAssessment.reasonCodes,
            humanReviewRequired: true,
          }),
        },
      });
    });

    return persistedAssessment;
  }

  private requireHumanReview(
    assessment: QualificationDocumentAssessment,
  ): QualificationDocumentAssessment {
    if (
      assessment.evidenceStatus !== 'VALIDATED' &&
      assessment.route !== 'AI_PRECLEARED'
    ) {
      return assessment;
    }
    return {
      ...assessment,
      evidenceStatus: 'INSUFFICIENT',
      route: 'NEEDS_REVIEW',
      reasonCodes: assessment.reasonCodes.includes('HUMAN_REVIEW_REQUIRED')
        ? assessment.reasonCodes
        : [...assessment.reasonCodes, 'HUMAN_REVIEW_REQUIRED'],
    };
  }

  private unavailableAssessment(): QualificationDocumentAssessment {
    return {
      evidenceStatus: 'UNCHECKED',
      route: 'NEEDS_REVIEW',
      confidence: null,
      identityConfidence: null,
      documentAuthenticityConfidence: null,
      faceMatchConfidence: null,
      livenessConfidence: null,
      reasonCodes: ['PROVIDER_UNAVAILABLE', 'HUMAN_REVIEW_REQUIRED'],
      provider: 'TYPHOON_OCR',
      model: null,
      assessedAt: new Date(),
    };
  }

  private isAssessment(
    value: unknown,
  ): value is QualificationDocumentAssessment {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      return false;
    const assessment = value as Record<string, unknown>;
    const keys = Object.keys(assessment);
    if (
      keys.length < REQUIRED_ASSESSMENT_KEYS.size ||
      Array.from(REQUIRED_ASSESSMENT_KEYS).some((key) => !keys.includes(key)) ||
      keys.some((key) => !ASSESSMENT_KEYS.has(key))
    ) {
      return false;
    }
    const scores = [
      assessment.confidence,
      assessment.identityConfidence,
      assessment.documentAuthenticityConfidence,
      assessment.faceMatchConfidence,
      assessment.livenessConfidence,
    ];
    const validScore = (score: unknown) =>
      score === null ||
      (typeof score === 'number' &&
        Number.isInteger(score) &&
        score >= 0 &&
        score <= 100);
    return (
      typeof assessment.evidenceStatus === 'string' &&
      EVIDENCE_STATUSES.has(assessment.evidenceStatus) &&
      typeof assessment.route === 'string' &&
      ROUTES.has(assessment.route) &&
      scores.every(validScore) &&
      Array.isArray(assessment.reasonCodes) &&
      assessment.reasonCodes.length > 0 &&
      new Set(assessment.reasonCodes).size === assessment.reasonCodes.length &&
      assessment.reasonCodes.every(
        (reason) =>
          typeof reason === 'string' &&
          REASON_CODES.has(reason as QualificationReasonCode),
      ) &&
      typeof assessment.provider === 'string' &&
      assessment.provider.length > 0 &&
      assessment.provider.length <= 100 &&
      (assessment.model === null ||
        (typeof assessment.model === 'string' &&
          assessment.model.length > 0 &&
          assessment.model.length <= 200)) &&
      assessment.assessedAt instanceof Date &&
      !Number.isNaN(assessment.assessedAt.getTime()) &&
      (assessment.extractedFields === undefined ||
        assessment.extractedFields === null ||
        (typeof assessment.extractedFields === 'object' &&
          !Array.isArray(assessment.extractedFields))) &&
      (assessment.identityNumberLast4 === undefined ||
        assessment.identityNumberLast4 === null ||
        typeof assessment.identityNumberLast4 === 'string') &&
      (assessment.identityNumberHash === undefined ||
        assessment.identityNumberHash === null ||
        typeof assessment.identityNumberHash === 'string') &&
      (assessment.subjectNameHash === undefined ||
        assessment.subjectNameHash === null ||
        typeof assessment.subjectNameHash === 'string') &&
      (assessment.identityExpiryDate === undefined ||
        assessment.identityExpiryDate === null ||
        assessment.identityExpiryDate instanceof Date)
    );
  }

  private async bindEvidenceIdentity(
    submissionId: string,
    documentType: string,
    assessment: QualificationDocumentAssessment,
  ): Promise<QualificationDocumentAssessment> {
    if (
      !assessment.subjectNameHash ||
      !['portfolio', 'company-affidavit'].includes(documentType)
    ) {
      return assessment;
    }
    const identity = await this.prisma.kycDocument.findFirst({
      where: {
        submissionId,
        documentType: 'id-front',
        isActive: true,
        lifecycleState: 'READY',
      },
      select: { subjectNameHash: true },
    });
    if (!identity?.subjectNameHash) {
      return {
        ...assessment,
        route: 'NEEDS_REVIEW',
        reasonCodes: assessment.reasonCodes.includes('HUMAN_REVIEW_REQUIRED')
          ? assessment.reasonCodes
          : [...assessment.reasonCodes, 'HUMAN_REVIEW_REQUIRED'],
      };
    }
    if (identity.subjectNameHash !== assessment.subjectNameHash) {
      return {
        ...assessment,
        evidenceStatus: 'CONTRADICTED',
        route: 'NEEDS_REVIEW',
        reasonCodes: assessment.reasonCodes.includes('IDENTITY_CONTRADICTION')
          ? assessment.reasonCodes
          : ['IDENTITY_CONTRADICTION', ...assessment.reasonCodes],
      };
    }
    return assessment;
  }

  private riskFor(assessment: QualificationDocumentAssessment) {
    if (
      assessment.evidenceStatus === 'CONTRADICTED' ||
      assessment.reasonCodes.includes('PROVIDER_UNAVAILABLE')
    ) {
      return QualificationRisk.HIGH;
    }
    return assessment.route === 'AI_PRECLEARED'
      ? QualificationRisk.LOW
      : QualificationRisk.MEDIUM;
  }

  private json(value: unknown) {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
