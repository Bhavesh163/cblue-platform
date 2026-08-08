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
  QualificationVerificationCheck,
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
const CHECK_STATUSES = new Set([
  'PASS',
  'FAIL',
  'INCONCLUSIVE',
  'NOT_PERFORMED',
]);
const REASON_CODES = new Set<QualificationReasonCode>([
  'DOCUMENT_VALID',
  'WRONG_DOCUMENT_TYPE',
  'UNREADABLE_DOCUMENT',
  'EXPIRED_ID',
  'IDENTITY_CONTRADICTION',
  'INVALID_ID_NUMBER',
  'SELFIE_REVIEW_REQUIRED',
  'AFFIDAVIT_REVIEW_REQUIRED',
  'AFFIDAVIT_EXPIRED',
  'COMPANY_NAME_CONTRADICTION',
  'COMPANY_AUTHORITY_REVIEW_REQUIRED',
  'PORTFOLIO_IDENTITY_CONTRADICTION',
  'BIOMETRIC_CHECK_NOT_PERFORMED',
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
  'checks',
]);

function isQualificationVerificationCheck(
  value: unknown,
): value is QualificationVerificationCheck {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const check = value as Record<string, unknown>;
  const confidence = check.confidence;
  const reasonCode = check.reasonCode;
  return (
    typeof check.key === 'string' &&
    check.key.length > 0 &&
    check.key.length <= 100 &&
    typeof check.status === 'string' &&
    CHECK_STATUSES.has(check.status) &&
    (confidence === null ||
      (typeof confidence === 'number' &&
        Number.isInteger(confidence) &&
        confidence >= 0 &&
        confidence <= 100)) &&
    typeof check.note === 'string' &&
    check.note.length <= 500 &&
    (reasonCode === null ||
      (typeof reasonCode === 'string' &&
        REASON_CODES.has(reasonCode as QualificationReasonCode)))
  );
}

type AssessmentInput = {
  submissionId: string;
  documentId: string;
  registeredName: string;
  claimedCompanyName?: string;
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
        checks: this.verificationChecks(
          document.documentType,
          persistedAssessment,
        ),
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
          findings: {
            create: this.verificationChecks(
              document.documentType,
              persistedAssessment,
            ).map((check) => ({
              documentId: document.id,
              code: check.key,
              severity: check.status === 'FAIL' ? 'HIGH' : 'INFO',
              claim: check.note,
              result:
                check.status === 'PASS'
                  ? 'VALIDATED'
                  : check.status === 'FAIL'
                    ? 'CONTRADICTED'
                    : 'UNCHECKED',
              confidence: check.confidence,
              sourceRef: document.id,
              details: this.json({
                status: check.status,
                reasonCode: check.reasonCode,
              }),
            })),
          },
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
      checks: [],
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
        assessment.identityExpiryDate instanceof Date) &&
      (assessment.checks === undefined ||
        (Array.isArray(assessment.checks) &&
          assessment.checks.every(isQualificationVerificationCheck)))
    );
  }

  private verificationChecks(
    documentType: string,
    assessment: QualificationDocumentAssessment,
  ) {
    if (assessment.checks?.length) return assessment.checks;
    const reasons = new Set(assessment.reasonCodes);
    const unavailable = reasons.has('PROVIDER_UNAVAILABLE');
    const failed = (...codes: QualificationReasonCode[]) =>
      codes.find((code) => reasons.has(code)) || null;
    const check = (
      key: string,
      note: string,
      failureCodes: QualificationReasonCode[],
    ) => {
      const reasonCode = failed(...failureCodes);
      return {
        key,
        status: unavailable
          ? ('INCONCLUSIVE' as const)
          : reasonCode
            ? ('FAIL' as const)
            : reasons.has('DOCUMENT_VALID')
              ? ('PASS' as const)
              : ('INCONCLUSIVE' as const),
        confidence: assessment.confidence,
        note,
        reasonCode,
      };
    };
    const checks: QualificationVerificationCheck[] = [
      check('DOCUMENT_TYPE', 'Document type assessment', [
        'WRONG_DOCUMENT_TYPE',
      ]),
      check('DOCUMENT_READABILITY', 'Document readability assessment', [
        'UNREADABLE_DOCUMENT',
      ]),
    ];
    if (documentType === 'id-front') {
      checks.push(
        check('ID_NUMBER_VALID', 'Thai identity number validation', [
          'INVALID_ID_NUMBER',
        ]),
        check('ID_NOT_EXPIRED', 'Identity document expiry assessment', [
          'EXPIRED_ID',
        ]),
        check('REGISTERED_NAME_MATCH', 'Applicant name consistency', [
          'IDENTITY_CONTRADICTION',
        ]),
      );
    }
    if (documentType === 'selfie-with-id') {
      checks.push(
        {
          key: 'FACE_MATCH',
          status: 'NOT_PERFORMED' as const,
          confidence: null,
          note: 'Face comparison requires administrator review',
          reasonCode: 'BIOMETRIC_CHECK_NOT_PERFORMED' as const,
        },
        {
          key: 'LIVENESS',
          status: 'NOT_PERFORMED' as const,
          confidence: null,
          note: 'Liveness assessment requires a certified verification service',
          reasonCode: 'BIOMETRIC_CHECK_NOT_PERFORMED' as const,
        },
      );
    }
    return checks;
  }

  private async bindEvidenceIdentity(
    submissionId: string,
    documentType: string,
    assessment: QualificationDocumentAssessment,
  ): Promise<QualificationDocumentAssessment> {
    if (!assessment.subjectNameHash || documentType !== 'portfolio') {
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
    const company = await this.prisma.kycDocument.findFirst({
      where: {
        submissionId,
        documentType: 'company-affidavit',
        isActive: true,
        lifecycleState: 'READY',
      },
      select: { subjectNameHash: true },
    });
    const matchedPersonal =
      Boolean(identity?.subjectNameHash) &&
      identity?.subjectNameHash === assessment.subjectNameHash;
    const matchedCompany =
      Boolean(company?.subjectNameHash) &&
      company?.subjectNameHash === assessment.subjectNameHash;
    if (!identity?.subjectNameHash && !company?.subjectNameHash) {
      return {
        ...assessment,
        route: 'NEEDS_REVIEW',
        checks: [
          ...(assessment.checks || []),
          {
            key: 'PORTFOLIO_IDENTITY_MATCH',
            status: 'INCONCLUSIVE',
            confidence: assessment.confidence,
            note: 'Portfolio identity could not be linked automatically',
            reasonCode: null,
          },
        ],
        reasonCodes: assessment.reasonCodes.includes('HUMAN_REVIEW_REQUIRED')
          ? assessment.reasonCodes
          : [...assessment.reasonCodes, 'HUMAN_REVIEW_REQUIRED'],
      };
    }
    if (!matchedPersonal && !matchedCompany) {
      return {
        ...assessment,
        evidenceStatus: 'CONTRADICTED',
        route: 'NEEDS_REVIEW',
        checks: [
          ...(assessment.checks || []),
          {
            key: 'PORTFOLIO_IDENTITY_MATCH',
            status: 'FAIL',
            confidence: assessment.confidence,
            note: 'Portfolio identity does not match the applicant or company evidence',
            reasonCode: 'PORTFOLIO_IDENTITY_CONTRADICTION',
          },
        ],
        reasonCodes: assessment.reasonCodes.includes(
          'PORTFOLIO_IDENTITY_CONTRADICTION',
        )
          ? assessment.reasonCodes
          : ['PORTFOLIO_IDENTITY_CONTRADICTION', ...assessment.reasonCodes],
      };
    }
    return {
      ...assessment,
      checks: [
        ...(assessment.checks || []),
        {
          key: 'PORTFOLIO_IDENTITY_MATCH',
          status: 'PASS',
          confidence: assessment.confidence,
          note: matchedCompany
            ? 'Portfolio identity matches the submitted company evidence'
            : 'Portfolio identity matches the applicant evidence',
          reasonCode: null,
        },
      ],
    };
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
