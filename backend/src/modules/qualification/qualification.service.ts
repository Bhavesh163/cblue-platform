import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  Prisma,
  QualificationDocumentLifecycleState,
  QualificationReviewKind,
  QualificationStorageCleanupStatus,
  QualificationSubmissionStatus,
} from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  QUALIFICATION_POLICY_VERSION,
  QualificationEvidenceInput,
  QualificationPolicyService,
} from './qualification-policy.service';
import { QualificationStorageService } from './qualification-storage.service';
import { QUALIFICATION_DOCUMENT_TYPES } from './dto/upload-qualification-document.dto';
import { QualificationStorageReadinessService } from './qualification-storage-readiness.service';
import { QualificationEvidenceDecisionDto } from './dto/qualification-evidence-decision.dto';
import { QualificationComplianceAccessDto } from './dto/qualification-compliance-access.dto';
import { QualificationAssessmentService } from './qualification-assessment.service';
import { QualificationRoutingService } from './qualification-routing.service';
import {
  COMPANY_KYC_DOCUMENT_TYPES,
  mergeReverificationReasons,
  PERSONAL_KYC_DOCUMENT_TYPES,
  qualificationEligibilitySnapshot,
  type QualificationReverificationReason,
} from './qualification-eligibility';
import {
  hasValidThaiNationalId,
  identityMetadata,
  normalizeThaiDigits,
} from './identity-evidence.util';

const PORTFOLIO_MAX_FILES = 10;
const CONSENT_RETENTION_MS = 3 * 365 * 24 * 60 * 60 * 1000;
const PORTFOLIO_MAX_FILE_BYTES = 300 * 1024;
const KYC_DOCUMENT_TYPES = ['id-front', 'selfie-with-id'] as const;
const KYC_REVIEW_DOCUMENT_TYPES = new Set([
  ...KYC_DOCUMENT_TYPES,
  'company-affidavit',
  'company-letter-of-intent',
]);
const UPLOADABLE_SUBMISSION_STATUSES = new Set([
  'DRAFT',
  'NEEDS_RESUBMISSION',
  'NEEDS_MORE_EVIDENCE',
]);
const CLEANUP_BASE_BACKOFF_MS = 30_000;
const CLEANUP_MAX_BACKOFF_MS = 60 * 60 * 1000;
const CLEANUP_CLAIM_STALE_MS = 5 * 60 * 1000;
const ADMIN_EVIDENCE_REASON_CODES = new Set([
  'ADMIN_DOCUMENT_TYPE_CONFIRMED',
  'ADMIN_READABILITY_CONFIRMED',
  'ADMIN_APPLICANT_NAME_CONFIRMED',
  'ADMIN_ID_UNEXPIRED_CONFIRMED',
  'ADMIN_FACE_MATCH_CONFIRMED',
  'ADMIN_SELFIE_REVIEW_COMPLETED',
]);

function detectQualificationContentType(buffer: Buffer): string | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (
    buffer.length >= 5 &&
    buffer.subarray(0, 5).toString('ascii') === '%PDF-'
  ) {
    return 'application/pdf';
  }
  return null;
}

@Injectable()
export class QualificationService {
  private readonly logger = new Logger(QualificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: QualificationPolicyService,
    private readonly storage: QualificationStorageService,
    private readonly readiness: QualificationStorageReadinessService,
    private readonly assessment: QualificationAssessmentService,
    private readonly routing: QualificationRoutingService,
  ) {}

  async createSubmission(
    fixerId: string,
    consentAt: Date,
    consentVersion: string,
  ) {
    const latest = await this.prisma.kycSubmission.findFirst({
      where: { fixerId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    return this.prisma.kycSubmission.create({
      data: {
        fixerId,
        version: (latest?.version ?? 0) + 1,
        status: 'DRAFT',
        policyVersion: QUALIFICATION_POLICY_VERSION,
        consentAt,
        consentVersion,
        consentRetentionDeleteAt: new Date(
          consentAt.getTime() + CONSENT_RETENTION_MS,
        ),
      },
    });
  }

  async createOrResumeDraftForUser(userId: string, consentVersion: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        'qualification-draft:' + userId,
      );
      const fixer = await tx.fixer.findUnique({
        where: { userId },
        select: {
          id: true,
          qualificationEligibilityStatus: true,
          kycReverificationReasons: true,
        },
      });
      if (!fixer) throw new NotFoundException('Fixer profile not found');

      const draft = await tx.kycSubmission.findFirst({
        where: {
          fixerId: fixer.id,
          status: QualificationSubmissionStatus.DRAFT,
        },
        orderBy: { version: 'desc' },
        include: {
          documents: {
            where: {
              isActive: true,
              lifecycleState: { not: 'DELETE_PENDING' },
              documentType: { in: ['id-front', 'selfie-with-id'] },
            },
            select: {
              id: true,
              documentType: true,
              lifecycleState: true,
              evidenceStatus: true,
              assessmentReasonCodes: true,
              assessedAt: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
      if (draft) {
        const requiresReverification =
          fixer.qualificationEligibilityStatus === 'REVERIFICATION_REQUIRED';
        if (
          draft.policyVersion !== QUALIFICATION_POLICY_VERSION ||
          (requiresReverification && draft.purpose !== 'KYC_REVERIFICATION')
        ) {
          return tx.kycSubmission.update({
            where: { id: draft.id },
            data: {
              policyVersion: QUALIFICATION_POLICY_VERSION,
              purpose: requiresReverification
                ? 'KYC_REVERIFICATION'
                : draft.purpose,
              reverificationReasons: requiresReverification
                ? (fixer.kycReverificationReasons ?? Prisma.JsonNull)
                : (draft.reverificationReasons ?? Prisma.JsonNull),
              decisionReason: null,
            },
            include: {
              documents: {
                where: {
                  isActive: true,
                  lifecycleState: { not: 'DELETE_PENDING' },
                  documentType: { in: ['id-front', 'selfie-with-id'] },
                },
                select: {
                  id: true,
                  documentType: true,
                  lifecycleState: true,
                  evidenceStatus: true,
                  assessmentReasonCodes: true,
                  assessedAt: true,
                  createdAt: true,
                },
                orderBy: { createdAt: 'asc' },
              },
            },
          });
        }
        return draft;
      }
      const latest = await tx.kycSubmission.findFirst({
        where: { fixerId: fixer.id },
        orderBy: { version: 'desc' },
        select: { version: true },
      });
      return tx.kycSubmission.create({
        data: {
          fixerId: fixer.id,
          version: (latest?.version ?? 0) + 1,
          status: QualificationSubmissionStatus.DRAFT,
          policyVersion: QUALIFICATION_POLICY_VERSION,
          purpose:
            fixer.qualificationEligibilityStatus === 'REVERIFICATION_REQUIRED'
              ? 'KYC_REVERIFICATION'
              : 'INITIAL_KYC',
          reverificationReasons:
            fixer.qualificationEligibilityStatus === 'REVERIFICATION_REQUIRED'
              ? (fixer.kycReverificationReasons ?? Prisma.JsonNull)
              : undefined,
          consentAt: new Date(),
          consentVersion,
          consentRetentionDeleteAt: new Date(Date.now() + CONSENT_RETENTION_MS),
        },
        include: { documents: true },
      });
    });
  }

  async createSubmissionForUser(userId: string, consentVersion: string) {
    return this.createOrResumeDraftForUser(userId, consentVersion);
  }

  async getStatusForUser(userId: string) {
    const fixer = await this.prisma.fixer.findUnique({
      where: { userId },
      select: {
        id: true,
        tier: true,
        status: true,
        verified: true,
        publicDisplayName: true,
        verifiedCompanyName: true,
        companyIdentityVerifiedAt: true,
        qualificationEligibilityStatus: true,
        kycValidUntil: true,
        kycReverificationRequiredAt: true,
        kycReverificationReasons: true,
        tierReevaluationRequestedAt: true,
        tierReevaluationCompletedAt: true,
        suspendedAt: true,
        suspendedById: true,
        suspensionReason: true,
        aiScore: true,
        aiTier: true,
        aiCredentialStatus: true,
        updatedAt: true,
        qualificationSubmissions: {
          orderBy: { version: 'desc' },
          take: 1,
          select: {
            id: true,
            version: true,
            status: true,
            policyVersion: true,
            submittedAt: true,
            reviewedAt: true,
            decisionReason: true,
            evaluations: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                provider: true,
                status: true,
                risk: true,
                recommendedTier: true,
                confidence: true,
                deterministicScore: true,
                aiScore: true,
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
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                status: true,
                decision: true,
                proposedDecision: true,
                proposedTier: true,
                proposedAt: true,
                checkedAt: true,
                createdAt: true,
                decidedAt: true,
              },
            },
          },
        },
        tierQualifications: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            approvedTier: true,
            recommendedTier: true,
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
    if (!fixer) throw new NotFoundException('Fixer profile not found');
    const submission = fixer.qualificationSubmissions[0] ?? null;
    const evaluation = submission?.evaluations[0] ?? null;
    const reviewTask = submission?.reviewTasks[0] ?? null;
    const tierQualification = fixer.tierQualifications[0] ?? null;
    const eligibility = qualificationEligibilitySnapshot(fixer);
    return {
      sourceVersion: QUALIFICATION_POLICY_VERSION,
      fixer: {
        id: fixer.id,
        tier: fixer.tier,
        status: fixer.status,
        verified: fixer.verified,
        publicDisplayName: fixer.publicDisplayName,
        verifiedCompanyName: fixer.verifiedCompanyName,
        companyIdentityVerifiedAt: fixer.companyIdentityVerifiedAt,
        updatedAt: fixer.updatedAt,
        suspendedAt: fixer.suspendedAt,
        suspendedById: fixer.suspendedById,
        suspensionReason: fixer.suspensionReason,
      },
      ai: {
        score: fixer.aiScore,
        tier: fixer.aiTier,
        credentialStatus: fixer.aiCredentialStatus,
      },
      submission: submission
        ? {
            id: submission.id,
            version: submission.version,
            status: submission.status,
            policyVersion: submission.policyVersion,
            submittedAt: submission.submittedAt,
            reviewedAt: submission.reviewedAt,
            decisionReason: submission.decisionReason,
          }
        : null,
      evaluation,
      reviewTask,
      tierQualification,
      eligibility,
    };
  }

  async getTierReviewTargetForUser(userId: string) {
    const fixer = await this.prisma.fixer.findUnique({
      where: { userId },
      select: {
        id: true,
        status: true,
        verified: true,
        verifiedCompanyName: true,
        qualificationEligibilityStatus: true,
        kycValidUntil: true,
        kycReverificationRequiredAt: true,
        kycReverificationReasons: true,
        tierReevaluationRequestedAt: true,
        tierReevaluationCompletedAt: true,
        qualificationSubmissions: {
          where: { status: QualificationSubmissionStatus.APPROVED },
          orderBy: { version: 'desc' },
          take: 1,
          select: { id: true, status: true, version: true },
        },
      },
    });
    if (!fixer) throw new NotFoundException('Fixer profile not found');
    const eligibility = qualificationEligibilitySnapshot(fixer);
    if (!eligibility.newJobEligible) {
      throw new ConflictException(
        'Identity re-verification must be completed before a tier review',
      );
    }
    const submission = fixer.qualificationSubmissions[0];
    if (!submission) {
      throw new ConflictException(
        'An approved identity submission is required before a tier review',
      );
    }
    return { submission, eligibility };
  }

  async getSubmissionForUser(userId: string, submissionId: string) {
    const submission = await this.prisma.kycSubmission.findFirst({
      where: { id: submissionId, fixer: { userId } },
      include: {
        documents: {
          where: {
            isActive: true,
            lifecycleState: { not: 'DELETE_PENDING' },
            documentType: { not: 'id-back' },
          },
          select: {
            id: true,
            documentType: true,
            isActive: true,
            lifecycleState: true,
            objectDeletedAt: true,
            supersededAt: true,
            contentType: true,
            sizeBytes: true,
            evidenceStatus: true,
            expiresAt: true,
            createdAt: true,
            legalHoldUntil: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!submission)
      throw new NotFoundException('Qualification submission not found');
    return {
      id: submission.id,
      version: submission.version,
      status: submission.status,
      policyVersion: submission.policyVersion,
      consentAt: submission.consentAt,
      consentVersion: submission.consentVersion,
      submittedAt: submission.submittedAt,
      documents: submission.documents,
    };
  }

  async uploadDocumentForUser(
    userId: string,
    submissionId: string,
    documentType: string,
    file?: Express.Multer.File,
  ) {
    if (!file?.buffer || file.size <= 0) {
      throw new BadRequestException('A non-empty document file is required');
    }
    if (
      !QUALIFICATION_DOCUMENT_TYPES.includes(
        documentType as (typeof QUALIFICATION_DOCUMENT_TYPES)[number],
      )
    ) {
      throw new BadRequestException('Unsupported qualification document type');
    }

    const imageContentTypes = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
    ]);
    const qualificationContentTypes = new Set([
      ...imageContentTypes,
      'application/pdf',
    ]);
    const detectedContentType = detectQualificationContentType(file.buffer);
    if (!detectedContentType || detectedContentType !== file.mimetype) {
      throw new BadRequestException(
        'Qualification file content does not match its declared type',
      );
    }
    const fileSize = file.buffer.length;
    const isPortfolio = documentType === 'portfolio';
    const isCompactCompanyEvidence =
      documentType === 'company-affidavit' ||
      documentType === 'company-letter-of-intent';
    const isKyc = KYC_DOCUMENT_TYPES.includes(
      documentType as (typeof KYC_DOCUMENT_TYPES)[number],
    );
    if (isPortfolio && !qualificationContentTypes.has(file.mimetype)) {
      throw new BadRequestException(
        'Portfolio evidence must be a PDF, JPEG, PNG, or WebP file',
      );
    }
    if (isPortfolio && fileSize > PORTFOLIO_MAX_FILE_BYTES) {
      throw new BadRequestException(
        'Portfolio file exceeds 0.3 MB; images must be compressed before upload',
      );
    }
    if (isCompactCompanyEvidence && fileSize > PORTFOLIO_MAX_FILE_BYTES) {
      throw new BadRequestException(
        'Company evidence file exceeds 0.3 MB; compress it before upload',
      );
    }
    if (isKyc && !imageContentTypes.has(file.mimetype)) {
      throw new BadRequestException('KYC evidence must be an image');
    }
    if (isKyc && fileSize > PORTFOLIO_MAX_FILE_BYTES) {
      throw new BadRequestException(
        'KYC evidence exceeds 0.3 MB; compress it before upload',
      );
    }
    if (!qualificationContentTypes.has(file.mimetype)) {
      throw new BadRequestException(
        'Only PDF, JPEG, PNG, and WebP qualification documents are supported',
      );
    }
    if (!isPortfolio && fileSize > 25 * 1024 * 1024) {
      throw new BadRequestException('Qualification document exceeds 25 MB');
    }

    const submission = await this.prisma.kycSubmission.findFirst({
      where: { id: submissionId, fixer: { userId } },
      select: {
        id: true,
        fixerId: true,
        status: true,
        purpose: true,
        failedAttempts: true,
        lockedUntil: true,
        fixer: {
          select: {
            verified: true,
            verifiedCompanyName: true,
            qualificationEligibilityStatus: true,
            kycReverificationReasons: true,
            user: { select: { name: true, company: true } },
          },
        },
      },
    });
    if (!submission) {
      throw new NotFoundException('Qualification submission not found');
    }
    this.assertUploadableSubmission(
      submission.status,
      submission.lockedUntil,
      documentType,
    );

    const documentId = randomUUID();
    const storageKey = [
      'qualification',
      submission.fixerId,
      submission.id,
      documentId,
    ].join('/');
    const checksumSha256 = createHash('sha256')
      .update(file.buffer)
      .digest('hex');
    const existingEvidence = await this.prisma.kycDocument.findFirst({
      where: {
        submissionId: submission.id,
        checksumSha256,
        lifecycleState: {
          in: ['PENDING_UPLOAD', 'UPLOADED', 'ASSESSING', 'READY'],
        },
      },
      select: {
        id: true,
        documentType: true,
        contentType: true,
        sizeBytes: true,
        evidenceStatus: true,
        assessmentReasonCodes: true,
        extractedFields: true,
        assessedAt: true,
        extractionProvider: true,
        extractionModel: true,
        createdAt: true,
        lifecycleState: true,
      },
    });
    if (existingEvidence) {
      if (existingEvidence.documentType !== documentType) {
        throw new ConflictException({
          code: 'EVIDENCE_REUSED_FOR_DIFFERENT_TYPE',
          message:
            'The same evidence file cannot be used for two different document types',
        });
      }
      if (existingEvidence.lifecycleState !== 'READY') {
        throw new ConflictException({
          code: 'EVIDENCE_UPLOAD_IN_PROGRESS',
          message: 'This evidence upload is already being processed',
        });
      }
      const evaluation = await this.prisma.qualificationEvaluation.findFirst({
        where: {
          submissionId: submission.id,
          inputHash: checksumSha256,
          status: 'COMPLETED',
        },
        orderBy: { createdAt: 'desc' },
        select: { confidence: true, output: true },
      });
      const output =
        evaluation?.output &&
        typeof evaluation.output === 'object' &&
        !Array.isArray(evaluation.output)
          ? (evaluation.output as Record<string, unknown>)
          : null;
      return {
        ...existingEvidence,
        idempotentReplay: true,
        assessment: output
          ? {
              ...output,
              confidence: evaluation?.confidence ?? null,
              provider: existingEvidence.extractionProvider,
              model: existingEvidence.extractionModel,
              assessedAt: existingEvidence.assessedAt,
            }
          : null,
      };
    }
    const cleanupId = randomUUID();
    const cleanupReservation = randomUUID();
    let phase:
      | 'RESERVE_CLEANUP'
      | 'STAGE'
      | 'UPLOAD'
      | 'MARK_UPLOADED'
      | 'ASSESSMENT'
      | 'PROMOTION' = 'RESERVE_CLEANUP';
    let cleanupIntent: {
      id: string;
      status: QualificationStorageCleanupStatus;
    } | null = null;
    let document: {
      id: string;
      documentType: string;
      contentType: string;
      sizeBytes: number;
      evidenceStatus: string;
      expiresAt: Date | null;
      createdAt: Date;
    } | null = null;
    let persistedAssessment: Awaited<
      ReturnType<QualificationAssessmentService['assessDocument']>
    > | null = null;

    try {
      cleanupIntent = await this.reserveStorageCleanupIntent(
        storageKey,
        cleanupId,
        cleanupReservation,
      );
      const reservedCleanupIntent = cleanupIntent;

      phase = 'STAGE';
      document = await this.prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          'SELECT pg_advisory_xact_lock(hashtext($1))',
          submission.id,
        );
        const liveSubmission = await tx.kycSubmission.findUnique({
          where: { id: submission.id },
          select: {
            status: true,
            failedAttempts: true,
            lockedUntil: true,
          },
        });
        if (!liveSubmission) {
          throw new NotFoundException('Qualification submission not found');
        }
        this.assertUploadableSubmission(
          liveSubmission.status,
          liveSubmission.lockedUntil,
          documentType,
        );
        const duplicate = await tx.kycDocument.findFirst({
          where: {
            submissionId: submission.id,
            checksumSha256,
            lifecycleState: {
              in: ['PENDING_UPLOAD', 'UPLOADED', 'ASSESSING', 'READY'],
            },
          },
          select: { id: true },
        });
        if (duplicate) {
          throw new ConflictException({
            code: 'EVIDENCE_UPLOAD_IN_PROGRESS',
            message: 'This evidence upload is already being processed',
          });
        }
        if (isPortfolio) {
          const existingCount = await tx.kycDocument.count({
            where: {
              submissionId: submission.id,
              documentType,
              lifecycleState: {
                in: ['PENDING_UPLOAD', 'UPLOADED', 'ASSESSING', 'READY'],
              },
            },
          });
          if (existingCount >= PORTFOLIO_MAX_FILES) {
            throw new ConflictException('Maximum 10 portfolio files allowed');
          }
        } else if (!isKyc) {
          const existingCount = await tx.kycDocument.count({
            where: {
              submissionId: submission.id,
              documentType,
              lifecycleState: {
                in: ['PENDING_UPLOAD', 'UPLOADED', 'ASSESSING', 'READY'],
              },
            },
          });
          if (existingCount >= 1) {
            throw new ConflictException(
              'Only one ' + documentType + ' document is allowed',
            );
          }
        }

        return tx.kycDocument.create({
          data: {
            id: documentId,
            submissionId: submission.id,
            documentType,
            storageKey,
            checksumSha256,
            contentType: file.mimetype,
            sizeBytes: fileSize,
            encrypted: true,
            isActive: false,
            lifecycleState: 'PENDING_UPLOAD',
            retentionDeleteAt: null,
          },
          select: {
            id: true,
            documentType: true,
            contentType: true,
            sizeBytes: true,
            evidenceStatus: true,
            expiresAt: true,
            createdAt: true,
          },
        });
      });

      phase = 'UPLOAD';
      await this.storage.putPrivateObject({
        key: storageKey,
        body: file.buffer,
        contentType: file.mimetype,
      });

      phase = 'MARK_UPLOADED';
      await this.transitionLifecycleOrConfirm(
        documentId,
        'PENDING_UPLOAD',
        {
          lifecycleState: 'UPLOADED',
          objectUploadedAt: new Date(),
          cleanupErrorCode: null,
        },
        ['UPLOADED', 'ASSESSING', 'READY'],
      );

      if (!isKyc) {
        phase = 'PROMOTION';
        const readyAt = new Date();
        await this.prisma.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(
            'SELECT pg_advisory_xact_lock(hashtext($1))',
            submission.id,
          );
          const staged = await tx.kycDocument.findUnique({
            where: { id: documentId },
            select: { id: true, isActive: true, lifecycleState: true },
          });
          if (
            !staged ||
            staged.isActive ||
            staged.lifecycleState !== 'UPLOADED'
          ) {
            throw new ConflictException(
              'Qualification evidence changed during promotion',
            );
          }
          const promoted = await tx.kycDocument.updateMany({
            where: {
              id: documentId,
              submissionId: submission.id,
              isActive: false,
              lifecycleState: 'UPLOADED',
            },
            data: {
              isActive: true,
              lifecycleState: 'READY',
              readyAt,
              cleanupErrorCode: null,
            },
          });
          if (promoted.count !== 1) {
            throw new ConflictException(
              'Qualification evidence could not be activated',
            );
          }
          await tx.qualificationEvidenceAssessmentJob.create({
            data: {
              documentId,
              submissionId: submission.id,
              status: 'QUEUED',
              nextAttemptAt: readyAt,
              eligibleAt:
                isPortfolio &&
                submission.status === QualificationSubmissionStatus.APPROVED
                  ? readyAt
                  : null,
            },
          });
          if (
            isPortfolio &&
            submission.status === QualificationSubmissionStatus.APPROVED
          ) {
            await tx.fixer.update({
              where: { id: submission.fixerId },
              data: { tierReevaluationRequestedAt: readyAt },
            });
            await tx.qualificationAuditLog.create({
              data: {
                submissionId: submission.id,
                actorId: userId,
                action: 'TIER_REEVALUATION_REQUESTED',
                entityType: 'Fixer',
                entityId: submission.fixerId,
                reason: 'New portfolio evidence submitted for tier review',
                metadata: { documentId },
              },
            });
          }
          const resolvedCleanupIntent =
            await tx.qualificationStorageCleanupIntent.deleteMany({
              where: {
                id: reservedCleanupIntent.id,
                storageKey,
                status: 'PENDING',
                claimedBy: cleanupReservation,
              },
            });
          if (resolvedCleanupIntent.count !== 1) {
            throw new ConflictException(
              'Qualification storage ownership changed during promotion',
            );
          }
          await tx.qualificationAuditLog.create({
            data: {
              submissionId: submission.id,
              actorId: userId,
              action: 'EVIDENCE_ASSESSMENT_QUEUED',
              entityType: 'KycDocument',
              entityId: documentId,
              reason: 'Evidence promoted and queued for assessment',
              metadata: { documentType },
            },
          });
        });
        return { ...document, assessment: null, assessmentPending: true };
      }

      phase = 'ASSESSMENT';
      await this.transitionLifecycleOrConfirm(
        documentId,
        'UPLOADED',
        {
          lifecycleState: 'ASSESSING',
        },
        ['ASSESSING', 'READY'],
      );
      persistedAssessment = await this.assessment.assessDocument({
        submissionId: submission.id,
        documentId,
        registeredName: submission.fixer?.user.name || '',
        claimedCompanyName: submission.fixer?.user.company || undefined,
        actorId: userId,
        auditAction: 'DOCUMENT_ASSESSED_ON_UPLOAD',
      });

      const assessmentForPromotion = persistedAssessment;
      phase = 'PROMOTION';
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          'SELECT pg_advisory_xact_lock(hashtext($1))',
          submission.id,
        );
        const liveSubmission = await tx.kycSubmission.findUnique({
          where: { id: submission.id },
          select: {
            status: true,
            failedAttempts: true,
            lockedUntil: true,
          },
        });
        if (!liveSubmission) {
          throw new NotFoundException('Qualification submission not found');
        }
        this.assertUploadableSubmission(
          liveSubmission.status,
          liveSubmission.lockedUntil,
          documentType,
        );
        const staged = await tx.kycDocument.findUnique({
          where: { id: documentId },
          select: { id: true, isActive: true, lifecycleState: true },
        });
        if (
          !staged ||
          staged.isActive ||
          staged.lifecycleState !== 'ASSESSING'
        ) {
          throw new ConflictException(
            'Qualification evidence changed during promotion',
          );
        }
        const activateEvidence =
          assessmentForPromotion.route !== 'NEEDS_RESUBMISSION';
        const previousActive =
          isKyc && activateEvidence
            ? await tx.kycDocument.findFirst({
                where: {
                  submissionId: submission.id,
                  documentType,
                  isActive: true,
                  lifecycleState: 'READY',
                  id: { not: documentId },
                },
                select: { id: true },
              })
            : null;
        const readyAt = new Date();
        if (previousActive) {
          const superseded = await tx.kycDocument.updateMany({
            where: {
              id: previousActive.id,
              submissionId: submission.id,
              isActive: true,
              lifecycleState: 'READY',
            },
            data: {
              isActive: false,
              supersededAt: readyAt,
              supersededById: documentId,
            },
          });
          if (superseded.count !== 1) {
            throw new ConflictException(
              'Active KYC evidence changed during replacement',
            );
          }
        }
        const promoted = await tx.kycDocument.updateMany({
          where: {
            id: documentId,
            submissionId: submission.id,
            isActive: false,
            lifecycleState: 'ASSESSING',
          },
          data: {
            isActive: activateEvidence,
            lifecycleState: 'READY',
            readyAt,
            cleanupErrorCode: null,
          },
        });
        if (promoted.count !== 1) {
          throw new ConflictException(
            'Qualification evidence could not be activated',
          );
        }
        if (previousActive) {
          await tx.kycSubmission.update({
            where: { id: submission.id },
            data:
              assessmentForPromotion.route === 'NEEDS_RESUBMISSION'
                ? { status: 'DRAFT', lockedUntil: null }
                : {
                    status: 'DRAFT',
                    failedAttempts: 0,
                    lockedUntil: null,
                  },
          });
          await tx.qualificationAuditLog.create({
            data: {
              submissionId: submission.id,
              actorId: userId,
              action: 'KYC_DOCUMENT_SUPERSEDED',
              entityType: 'KycDocument',
              entityId: documentId,
              reason: 'Assessed KYC replacement activated',
              metadata: {
                documentType,
                supersededDocumentId: previousActive.id,
              },
            },
          });
        }
        if (activateEvidence && submission.fixer?.verified) {
          const reason: QualificationReverificationReason =
            documentType === 'id-front'
              ? 'ID_REPLACED'
              : 'ADMIN_RESUBMISSION_REQUIRED';
          const reasons = mergeReverificationReasons(
            submission.fixer.kycReverificationReasons,
            [reason],
          );
          await tx.fixer.update({
            where: { id: submission.fixerId },
            data: {
              qualificationEligibilityStatus: 'REVERIFICATION_REQUIRED',
              kycReverificationRequiredAt: readyAt,
              kycReverificationReasons: reasons,
              kycExpiryWarningSentAt: null,
            },
          });
          await tx.kycSubmission.update({
            where: { id: submission.id },
            data: {
              purpose: 'KYC_REVERIFICATION',
              reverificationReasons: reasons,
            },
          });
        }
        if (!activateEvidence) {
          await tx.qualificationAuditLog.create({
            data: {
              submissionId: submission.id,
              actorId: userId,
              action: 'KYC_EVIDENCE_REJECTED_ON_UPLOAD',
              entityType: 'KycDocument',
              entityId: documentId,
              reason: 'Evidence retained for audit but not activated',
              metadata: {
                documentType,
                reasonCodes: assessmentForPromotion.reasonCodes,
              },
            },
          });
        }
        const resolvedCleanupIntent =
          await tx.qualificationStorageCleanupIntent.deleteMany({
            where: {
              id: reservedCleanupIntent.id,
              storageKey,
              status: 'PENDING',
              claimedBy: cleanupReservation,
            },
          });
        if (resolvedCleanupIntent.count !== 1) {
          throw new ConflictException(
            'Qualification storage ownership changed during promotion',
          );
        }
      });

      return { ...document, assessment: persistedAssessment };
    } catch (error) {
      const errorCode = this.uploadErrorCode(phase);
      let authoritative: {
        id: string;
        submissionId: string;
        storageKey: string;
        isActive: boolean;
        lifecycleState: string;
      } | null = null;
      try {
        authoritative = await this.prisma.kycDocument.findUnique({
          where: { id: documentId },
          select: {
            id: true,
            submissionId: true,
            storageKey: true,
            isActive: true,
            lifecycleState: true,
          },
        });
      } catch (readError) {
        this.logger.error(
          `Qualification document reconciliation read failed document=${documentId} submission=${submission.id} code=RECONCILIATION_READ_FAILED`,
          readError instanceof Error ? readError.name : 'UnknownError',
        );
      }

      if (
        authoritative?.isActive &&
        authoritative.lifecycleState === 'READY' &&
        document &&
        persistedAssessment
      ) {
        return { ...document, assessment: persistedAssessment };
      }

      if (cleanupIntent) {
        await this.releaseStorageCleanupReservation(
          cleanupIntent.id,
          cleanupReservation,
          errorCode,
        );
        try {
          await this.retryStorageCleanupIntent(cleanupIntent.id);
        } catch (cleanupError) {
          this.logger.error(
            `Qualification storage cleanup retry failed cleanup=${cleanupIntent.id} code=CLEANUP_RETRY_FAILED`,
            cleanupError instanceof Error ? cleanupError.name : 'UnknownError',
          );
        }
      }

      if (authoritative && !authoritative.isActive) {
        await this.prisma.kycDocument.updateMany({
          where: {
            id: documentId,
            isActive: false,
            lifecycleState: { not: 'READY' },
          },
          data: {
            lifecycleState: 'FAILED',
            cleanupErrorCode: errorCode,
          },
        });
      }
      this.logger.error(
        cleanupIntent
          ? `Qualification upload failed cleanup=${cleanupIntent.id} code=${errorCode}`
          : `Qualification upload failed document=${documentId} submission=${submission.id} code=${errorCode}`,
        error instanceof Error ? error.name : 'UnknownError',
      );
      throw error;
    }
  }
  private assertUploadableSubmission(
    status: string,
    lockedUntil: Date | null,
    documentType: string,
  ): void {
    const approvedPortfolioUpload =
      status === QualificationSubmissionStatus.APPROVED &&
      documentType === 'portfolio';
    if (
      !UPLOADABLE_SUBMISSION_STATUSES.has(status) &&
      !approvedPortfolioUpload
    ) {
      throw new ConflictException(
        'Documents can only be added before qualification review',
      );
    }
    if (lockedUntil && lockedUntil.getTime() > Date.now()) {
      throw new ConflictException(
        'Qualification evidence replacement is temporarily locked',
      );
    }
  }

  private async transitionLifecycleOrConfirm(
    documentId: string,
    from: QualificationDocumentLifecycleState,
    data: Prisma.KycDocumentUpdateManyMutationInput,
    acceptableStates: QualificationDocumentLifecycleState[],
  ): Promise<void> {
    try {
      const transitioned = await this.prisma.kycDocument.updateMany({
        where: { id: documentId, isActive: false, lifecycleState: from },
        data,
      });
      if (transitioned.count === 1) return;
    } catch (error) {
      this.logger.error(
        `Qualification lifecycle transition uncertain document=${documentId} code=LIFECYCLE_TRANSITION_UNCERTAIN`,
        error instanceof Error ? error.name : 'UnknownError',
      );
    }

    const authoritative = await this.prisma.kycDocument.findUnique({
      where: { id: documentId },
      select: { lifecycleState: true, isActive: true },
    });
    if (
      authoritative &&
      acceptableStates.includes(authoritative.lifecycleState)
    ) {
      return;
    }
    throw new ConflictException(
      'Qualification document lifecycle transition was not persisted',
    );
  }

  private async releaseStorageCleanupReservation(
    cleanupId: string,
    cleanupReservation: string,
    errorCode: string,
  ): Promise<void> {
    try {
      await this.prisma.qualificationStorageCleanupIntent.updateMany({
        where: {
          id: cleanupId,
          status: 'PENDING',
          claimedBy: cleanupReservation,
        },
        data: {
          errorCode,
          nextAttemptAt: new Date(),
          claimedAt: null,
          claimedBy: null,
        },
      });
    } catch (error) {
      this.logger.error(
        `Qualification cleanup reservation release failed cleanup=${cleanupId} code=CLEANUP_RESERVATION_RELEASE_FAILED`,
        error instanceof Error ? error.name : 'UnknownError',
      );
    }
  }

  private async reserveStorageCleanupIntent(
    storageKey: string,
    cleanupId: string,
    cleanupReservation: string,
  ): Promise<{
    id: string;
    status: QualificationStorageCleanupStatus;
  }> {
    const intent = await this.ensureStorageCleanupIntent(
      storageKey,
      cleanupId,
      cleanupReservation,
    );
    let persistenceError: unknown;
    try {
      const authoritative =
        await this.prisma.qualificationStorageCleanupIntent.findUnique({
          where: { storageKey },
          select: { id: true, status: true, claimedBy: true },
        });
      if (
        authoritative?.id === intent.id &&
        authoritative.status === 'PENDING' &&
        authoritative.claimedBy === cleanupReservation
      ) {
        return intent;
      }
    } catch (error) {
      persistenceError = error;
    }

    this.logger.error(
      `Qualification cleanup reservation failed cleanup=${cleanupId} code=CLEANUP_RESERVATION_FAILED`,
      persistenceError instanceof Error
        ? persistenceError.name
        : 'ReservationConflict',
    );
    throw new ServiceUnavailableException(
      'Qualification storage cleanup could not be reserved',
    );
  }

  async ensureStorageCleanupIntent(
    storageKey: string,
    cleanupId: string = randomUUID(),
    claimedBy?: string,
  ): Promise<{
    id: string;
    status: QualificationStorageCleanupStatus;
  }> {
    let persistenceError: unknown;
    try {
      await this.prisma.qualificationStorageCleanupIntent.createMany({
        data: {
          id: cleanupId,
          storageKey,
          status: 'PENDING',
          nextAttemptAt: new Date(),
          ...(claimedBy ? { claimedAt: new Date(), claimedBy } : {}),
        },
        skipDuplicates: true,
      });
    } catch (error) {
      persistenceError = error;
    }

    try {
      const authoritative =
        await this.prisma.qualificationStorageCleanupIntent.findUnique({
          where: { storageKey },
          select: { id: true, status: true },
        });
      if (authoritative) {
        return {
          id: authoritative.id,
          status: authoritative.status,
        };
      }
    } catch (error) {
      persistenceError ??= error;
    }

    this.logger.error(
      `Qualification cleanup intent persistence failed cleanup=${cleanupId} code=CLEANUP_INTENT_PERSIST_FAILED`,
      persistenceError instanceof Error
        ? persistenceError.name
        : 'UnknownError',
    );
    throw new ServiceUnavailableException(
      'Qualification storage cleanup could not be persisted',
    );
  }

  async retryStorageCleanupIntent(
    cleanupId: string,
    claimedBy?: string,
  ): Promise<{
    cleaned: boolean;
    status: QualificationStorageCleanupStatus | 'MISSING';
    nextAttemptAt?: Date;
  }> {
    const claimToken = claimedBy ?? randomUUID();
    const now = new Date();
    if (!claimedBy) {
      const claimed =
        await this.prisma.qualificationStorageCleanupIntent.updateMany({
          where: {
            id: cleanupId,
            status: 'PENDING',
            OR: [
              { claimedAt: null },
              {
                claimedAt: {
                  lt: new Date(now.getTime() - CLEANUP_CLAIM_STALE_MS),
                },
              },
            ],
          },
          data: { claimedAt: now, claimedBy: claimToken },
        });
      if (claimed.count !== 1) {
        const current =
          await this.prisma.qualificationStorageCleanupIntent.findUnique({
            where: { id: cleanupId },
            select: { status: true },
          });
        return {
          cleaned: current?.status === 'COMPLETED',
          status: current?.status ?? 'MISSING',
        };
      }
    }

    const intent =
      await this.prisma.qualificationStorageCleanupIntent.findUnique({
        where: { id: cleanupId },
        select: {
          id: true,
          storageKey: true,
          status: true,
          attempts: true,
          claimedBy: true,
        },
      });
    if (!intent) return { cleaned: false, status: 'MISSING' };
    if (intent.status === 'COMPLETED') {
      return { cleaned: true, status: 'COMPLETED' };
    }
    if (intent.claimedBy !== claimToken) {
      return { cleaned: false, status: intent.status };
    }

    let activeOwner: { id: string } | null = null;
    try {
      activeOwner = await this.prisma.kycDocument.findFirst({
        where: {
          storageKey: intent.storageKey,
          isActive: true,
          lifecycleState: 'READY',
        },
        select: { id: true },
      });
    } catch (error) {
      const backoffMs = Math.min(
        CLEANUP_BASE_BACKOFF_MS * 2 ** Math.min(intent.attempts, 10),
        CLEANUP_MAX_BACKOFF_MS,
      );
      const nextAttemptAt = new Date(Date.now() + backoffMs);
      await this.prisma.qualificationStorageCleanupIntent.updateMany({
        where: {
          id: intent.id,
          status: 'PENDING',
          claimedBy: claimToken,
        },
        data: {
          attempts: { increment: 1 },
          errorCode: 'CLEANUP_OWNERSHIP_READ_FAILED',
          nextAttemptAt,
          claimedAt: null,
          claimedBy: null,
        },
      });
      this.logger.error(
        `Qualification cleanup ownership read failed cleanup=${intent.id} code=CLEANUP_OWNERSHIP_READ_FAILED`,
        error instanceof Error ? error.name : 'UnknownError',
      );
      return { cleaned: false, status: 'PENDING', nextAttemptAt };
    }
    if (activeOwner) {
      const resolved =
        await this.prisma.qualificationStorageCleanupIntent.updateMany({
          where: {
            id: intent.id,
            status: 'PENDING',
            claimedBy: claimToken,
          },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            errorCode: null,
            nextAttemptAt: null,
            claimedAt: null,
            claimedBy: null,
          },
        });
      return {
        cleaned: resolved.count === 1,
        status: resolved.count === 1 ? 'COMPLETED' : 'PENDING',
      };
    }

    try {
      await this.storage.deletePrivateObject(intent.storageKey);
    } catch (error) {
      const backoffMs = Math.min(
        CLEANUP_BASE_BACKOFF_MS * 2 ** Math.min(intent.attempts, 10),
        CLEANUP_MAX_BACKOFF_MS,
      );
      const nextAttemptAt = new Date(Date.now() + backoffMs);
      await this.prisma.qualificationStorageCleanupIntent.updateMany({
        where: {
          id: intent.id,
          status: 'PENDING',
          claimedBy: claimToken,
        },
        data: {
          attempts: { increment: 1 },
          errorCode: 'OBJECT_DELETE_FAILED',
          nextAttemptAt,
          claimedAt: null,
          claimedBy: null,
        },
      });
      this.logger.error(
        `Qualification orphan cleanup failed cleanup=${intent.id} code=OBJECT_DELETE_FAILED`,
        error instanceof Error ? error.name : 'UnknownError',
      );
      return { cleaned: false, status: 'PENDING', nextAttemptAt };
    }

    const finalized = await this.finalizeDeletedStorageCleanup(
      intent.id,
      intent.storageKey,
      claimToken,
    );
    return finalized
      ? { cleaned: true, status: 'COMPLETED' }
      : { cleaned: false, status: 'PENDING' };
  }

  private async finalizeDeletedStorageCleanup(
    cleanupId: string,
    storageKey: string,
    claimToken: string,
  ): Promise<boolean> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const completedAt = new Date();
        await tx.kycDocument.updateMany({
          where: {
            storageKey,
            isActive: false,
            lifecycleState: { not: 'READY' },
          },
          data: {
            lifecycleState: 'FAILED',
            objectDeletedAt: completedAt,
            cleanupErrorCode: null,
            cleanupNextAttemptAt: null,
            cleanupClaimedAt: null,
            cleanupClaimedBy: null,
          },
        });
        const finalized = await tx.qualificationStorageCleanupIntent.updateMany(
          {
            where: {
              id: cleanupId,
              status: 'PENDING',
              claimedBy: claimToken,
            },
            data: {
              status: 'COMPLETED',
              completedAt,
              attempts: { increment: 1 },
              errorCode: null,
              nextAttemptAt: null,
              claimedAt: null,
              claimedBy: null,
            },
          },
        );
        if (finalized.count !== 1) {
          throw new ConflictException(
            'Qualification storage cleanup ownership changed',
          );
        }
      });
      return true;
    } catch (error) {
      this.logger.error(
        `Qualification storage cleanup finalization failed cleanup=${cleanupId} code=CLEANUP_FINALIZATION_FAILED`,
        error instanceof Error ? error.name : 'UnknownError',
      );
      return false;
    }
  }

  async retryPendingDocumentCleanup(
    documentId: string,
    claimedBy?: string,
  ): Promise<{
    cleaned: boolean;
    lifecycleState: QualificationDocumentLifecycleState | 'MISSING';
    nextAttemptAt?: Date;
  }> {
    const claimToken = claimedBy ?? randomUUID();
    const now = new Date();
    if (!claimedBy) {
      const claimed = await this.prisma.kycDocument.updateMany({
        where: {
          id: documentId,
          isActive: false,
          lifecycleState: 'DELETE_PENDING',
          OR: [
            { cleanupClaimedAt: null },
            {
              cleanupClaimedAt: {
                lt: new Date(now.getTime() - CLEANUP_CLAIM_STALE_MS),
              },
            },
          ],
        },
        data: {
          cleanupClaimedAt: now,
          cleanupClaimedBy: claimToken,
        },
      });
      if (claimed.count !== 1) {
        const current = await this.prisma.kycDocument.findUnique({
          where: { id: documentId },
          select: { lifecycleState: true },
        });
        return {
          cleaned: current?.lifecycleState === 'FAILED',
          lifecycleState: current?.lifecycleState ?? 'MISSING',
        };
      }
    }

    const document = await this.prisma.kycDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        submissionId: true,
        storageKey: true,
        isActive: true,
        lifecycleState: true,
        cleanupAttempts: true,
        cleanupClaimedBy: true,
      },
    });
    if (!document) return { cleaned: false, lifecycleState: 'MISSING' };
    if (
      document.isActive ||
      document.lifecycleState === 'READY' ||
      document.lifecycleState !== 'DELETE_PENDING' ||
      (document.cleanupClaimedBy && document.cleanupClaimedBy !== claimToken)
    ) {
      return {
        cleaned: false,
        lifecycleState: document.lifecycleState,
      };
    }

    try {
      await this.storage.deletePrivateObject(document.storageKey);
    } catch (error) {
      const backoffMs = Math.min(
        CLEANUP_BASE_BACKOFF_MS *
          2 ** Math.min(document.cleanupAttempts ?? 0, 10),
        CLEANUP_MAX_BACKOFF_MS,
      );
      const nextAttemptAt = new Date(Date.now() + backoffMs);
      await this.prisma.kycDocument.updateMany({
        where: {
          id: document.id,
          isActive: false,
          lifecycleState: 'DELETE_PENDING',
          cleanupClaimedBy: claimToken,
        },
        data: {
          cleanupAttempts: { increment: 1 },
          cleanupErrorCode: 'OBJECT_DELETE_FAILED',
          cleanupNextAttemptAt: nextAttemptAt,
          cleanupClaimedAt: null,
          cleanupClaimedBy: null,
        },
      });
      this.logger.error(
        `Qualification cleanup failed document=${document.id} submission=${document.submissionId} code=OBJECT_DELETE_FAILED`,
        error instanceof Error ? error.name : 'UnknownError',
      );
      return {
        cleaned: false,
        lifecycleState: 'DELETE_PENDING',
        nextAttemptAt,
      };
    }

    const finalized = await this.prisma.kycDocument.updateMany({
      where: {
        id: document.id,
        isActive: false,
        lifecycleState: 'DELETE_PENDING',
        cleanupClaimedBy: claimToken,
      },
      data: {
        lifecycleState: 'FAILED',
        objectDeletedAt: new Date(),
        cleanupAttempts: { increment: 1 },
        cleanupErrorCode: null,
        cleanupNextAttemptAt: null,
        cleanupClaimedAt: null,
        cleanupClaimedBy: null,
      },
    });
    if (finalized.count !== 1) {
      const authoritative = await this.prisma.kycDocument.findUnique({
        where: { id: document.id },
        select: { lifecycleState: true },
      });
      return {
        cleaned: authoritative?.lifecycleState === 'FAILED',
        lifecycleState: authoritative?.lifecycleState ?? 'MISSING',
      };
    }
    return { cleaned: true, lifecycleState: 'FAILED' };
  }

  private uploadErrorCode(
    phase:
      | 'RESERVE_CLEANUP'
      | 'STAGE'
      | 'UPLOAD'
      | 'MARK_UPLOADED'
      | 'ASSESSMENT'
      | 'PROMOTION',
  ): string {
    switch (phase) {
      case 'RESERVE_CLEANUP':
        return 'CLEANUP_INTENT_RESERVATION_FAILED';
      case 'STAGE':
        return 'DOCUMENT_STAGE_FAILED';
      case 'UPLOAD':
        return 'OBJECT_UPLOAD_FAILED';
      case 'MARK_UPLOADED':
        return 'UPLOAD_STATE_FAILED';
      case 'ASSESSMENT':
        return 'DOCUMENT_ASSESSMENT_FAILED';
      case 'PROMOTION':
        return 'DOCUMENT_PROMOTION_FAILED';
    }
  }
  async verifyDocumentForAdmin(
    adminId: string,
    submissionId: string,
    documentId: string,
  ) {
    const context = await this.prisma.kycDocument.findFirst({
      where: { id: documentId, submissionId },
      select: {
        id: true,
        submission: {
          select: {
            fixer: {
              select: { user: { select: { name: true, company: true } } },
            },
            reviewTasks: {
              where: {
                status: 'ASSIGNED',
                assignedTo: adminId,
              },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    });
    if (!context) {
      throw new NotFoundException('Qualification document not found');
    }
    if (!context.submission.reviewTasks.length) {
      throw new ConflictException(
        'Qualification document verification requires the assigned administrator',
      );
    }
    return this.assessment.assessDocument({
      submissionId,
      documentId,
      registeredName: context.submission.fixer.user.name || '',
      claimedCompanyName: context.submission.fixer.user.company || undefined,
      actorId: adminId,
      auditAction: 'DOCUMENT_VERIFICATION_COMPLETED',
    });
  }

  async submitForUser(userId: string, submissionId: string) {
    try {
      await this.readiness.assertReady();
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          'SELECT pg_advisory_xact_lock(hashtext($1))',
          submissionId,
        );
        const submission = await tx.kycSubmission.findFirst({
          where: { id: submissionId, fixer: { userId } },
          include: {
            fixer: { select: { verifiedCompanyName: true } },
            documents: {
              select: {
                documentType: true,
                sizeBytes: true,
                contentType: true,
                isActive: true,
                lifecycleState: true,
              },
            },
          },
        });
        if (!submission) {
          throw new NotFoundException('Qualification submission not found');
        }
        if (submission.status !== 'DRAFT') {
          throw new ConflictException(
            'Qualification submission is already final',
          );
        }

        const activeDocuments = submission.documents.filter(
          (document) =>
            document.isActive && document.lifecycleState === 'READY',
        );
        const documentTypes = new Set(
          activeDocuments.map((document) => document.documentType),
        );
        const companyEvidenceRequested = Boolean(
          submission.fixer?.verifiedCompanyName ||
          documentTypes.has('company-affidavit') ||
          documentTypes.has('company-letter-of-intent'),
        );
        const requiredKyc = companyEvidenceRequested
          ? COMPANY_KYC_DOCUMENT_TYPES
          : PERSONAL_KYC_DOCUMENT_TYPES;
        const missingKyc = requiredKyc.filter(
          (documentType) => !documentTypes.has(documentType),
        );
        if (missingKyc.length > 0) {
          throw new BadRequestException(
            'Missing required KYC evidence: ' + missingKyc.join(', '),
          );
        }
        const portfolio = activeDocuments.filter(
          (document) => document.documentType === 'portfolio',
        );
        if (portfolio.length > PORTFOLIO_MAX_FILES) {
          throw new BadRequestException('Maximum 10 portfolio files allowed');
        }
        if (
          portfolio.some(
            (document) =>
              document.sizeBytes > PORTFOLIO_MAX_FILE_BYTES ||
              (!document.contentType.startsWith('image/') &&
                document.contentType !== 'application/pdf'),
          )
        ) {
          throw new BadRequestException(
            'Every portfolio item must be a PDF or image no larger than 0.3 MB',
          );
        }
      });

      await this.prisma.qualificationEvidenceAssessmentJob.updateMany({
        where: {
          submissionId,
          status: 'QUEUED',
          eligibleAt: null,
        },
        data: {
          eligibleAt: new Date(),
          nextAttemptAt: new Date(),
        },
      });
      return await this.routing.routeSubmission(submissionId, userId);
    } catch (error) {
      this.logger.error(
        `Failed to submit qualification ${submissionId} for routing`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
  async reviewDocumentEvidence(
    adminId: string,
    submissionId: string,
    documentId: string,
    dto: QualificationEvidenceDecisionDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const reviewTask = await tx.qualificationReviewTask.findFirst({
        where: {
          submissionId,
          status: 'ASSIGNED',
          assignedTo: adminId,
          proposedAt: null,
        },
        select: { id: true, kind: true },
      });
      if (!reviewTask) {
        throw new ConflictException(
          'Qualification evidence may only be decided by the assigned admin',
        );
      }
      const reason = dto.reason.trim();
      if (reason.length < 10) {
        throw new BadRequestException('Evidence decision reason is too short');
      }
      const document = await tx.kycDocument.findFirst({
        where: {
          id: documentId,
          submissionId,
          isActive: true,
          lifecycleState: 'READY',
        },
        select: {
          id: true,
          documentType: true,
          checksumSha256: true,
          evidenceStatus: true,
          assessmentReasonCodes: true,
          identityNumberLast4: true,
          identityNumberHash: true,
          identityExpiryDate: true,
        },
      });
      if (!document)
        throw new NotFoundException('Qualification document not found');
      const isKycEvidence = KYC_REVIEW_DOCUMENT_TYPES.has(
        document.documentType,
      );
      const taskMatchesDocument =
        (reviewTask.kind === QualificationReviewKind.KYC && isKycEvidence) ||
        (reviewTask.kind === QualificationReviewKind.TIER && !isKycEvidence);
      if (!taskMatchesDocument) {
        throw new ConflictException(
          'Qualification evidence must be decided in its assigned review queue',
        );
      }
      if (
        document.documentType !== 'id-front' &&
        (dto.identityNumber || dto.identityExpiryDate)
      ) {
        throw new BadRequestException(
          'Identity number and expiry may only be recorded for ID front evidence',
        );
      }
      if (
        document.documentType !== 'selfie-with-id' &&
        (dto.faceMatchConfirmed || dto.selfieReviewCompleted)
      ) {
        throw new BadRequestException(
          'Face comparison may only be recorded for selfie evidence',
        );
      }

      const reviewedAt = new Date();
      let identityNumberLast4 = document.identityNumberLast4;
      let identityNumberHash = document.identityNumberHash;
      let identityExpiryDate = document.identityExpiryDate;
      if (dto.identityExpiryDate) {
        const expiryValue = /^\d{4}-\d{2}-\d{2}$/.test(dto.identityExpiryDate)
          ? `${dto.identityExpiryDate}T23:59:59.999Z`
          : dto.identityExpiryDate;
        identityExpiryDate = new Date(expiryValue);
        if (Number.isNaN(identityExpiryDate.getTime())) {
          throw new BadRequestException('Identity expiry date is invalid');
        }
      }
      if (dto.identityNumber) {
        const normalizedIdentityNumber = normalizeThaiDigits(
          dto.identityNumber,
        );
        if (!hasValidThaiNationalId(normalizedIdentityNumber)) {
          throw new BadRequestException(
            'Thai identity number failed checksum validation',
          );
        }
        const protectedIdentity = identityMetadata(
          normalizedIdentityNumber,
          identityExpiryDate,
        );
        if (!protectedIdentity.identityNumberHash) {
          throw new ServiceUnavailableException(
            'Identity protection is not configured',
          );
        }
        identityNumberLast4 = protectedIdentity.identityNumberLast4;
        identityNumberHash = protectedIdentity.identityNumberHash;
      }

      if (
        dto.evidenceStatus === 'VALIDATED' &&
        document.documentType === 'id-front'
      ) {
        if (
          !dto.documentTypeConfirmed ||
          !dto.documentReadable ||
          !dto.applicantNameMatches ||
          !dto.identityUnexpiredConfirmed
        ) {
          throw new ConflictException(
            'Confirm document type, readability, applicant name, and unexpired status',
          );
        }
        if (!identityNumberHash || !identityNumberLast4) {
          throw new ConflictException(
            'A checksum-valid Thai identity number is required',
          );
        }
        if (!identityExpiryDate || identityExpiryDate <= reviewedAt) {
          throw new ConflictException(
            'A future identity document expiry date is required',
          );
        }
      }
      if (
        dto.evidenceStatus === 'VALIDATED' &&
        document.documentType === 'selfie-with-id' &&
        (!dto.documentTypeConfirmed ||
          !dto.documentReadable ||
          !dto.faceMatchConfirmed ||
          !dto.selfieReviewCompleted)
      ) {
        throw new ConflictException(
          'Confirm selfie evidence, readability, face comparison, and manual review',
        );
      }

      const existingReasonCodes = Array.isArray(document.assessmentReasonCodes)
        ? document.assessmentReasonCodes.filter(
            (value): value is string => typeof value === 'string',
          )
        : [];
      const assessmentReasonCodes = existingReasonCodes.filter(
        (code) => !ADMIN_EVIDENCE_REASON_CODES.has(code),
      );
      const addManualCode = (confirmed: boolean | undefined, code: string) => {
        if (confirmed) assessmentReasonCodes.push(code);
      };
      addManualCode(dto.documentTypeConfirmed, 'ADMIN_DOCUMENT_TYPE_CONFIRMED');
      addManualCode(dto.documentReadable, 'ADMIN_READABILITY_CONFIRMED');
      addManualCode(dto.applicantNameMatches, 'ADMIN_APPLICANT_NAME_CONFIRMED');
      addManualCode(
        dto.identityUnexpiredConfirmed,
        'ADMIN_ID_UNEXPIRED_CONFIRMED',
      );
      addManualCode(dto.faceMatchConfirmed, 'ADMIN_FACE_MATCH_CONFIRMED');
      addManualCode(dto.selfieReviewCompleted, 'ADMIN_SELFIE_REVIEW_COMPLETED');

      const updateData: Prisma.KycDocumentUpdateInput = {
        evidenceStatus: dto.evidenceStatus,
        assessmentReasonCodes: assessmentReasonCodes as Prisma.InputJsonValue,
        assessedAt: reviewedAt,
        ...(document.documentType === 'id-front'
          ? {
              identityNumberLast4,
              identityNumberHash,
              identityExpiryDate,
            }
          : {}),
      };

      const updated = await tx.kycDocument.update({
        where: { id: document.id },
        data: updateData,
        select: {
          id: true,
          documentType: true,
          contentType: true,
          sizeBytes: true,
          evidenceStatus: true,
          assessmentReasonCodes: true,
          identityNumberLast4: true,
          identityExpiryDate: true,
          assessedAt: true,
          expiresAt: true,
          createdAt: true,
          isActive: true,
          lifecycleState: true,
          legalHoldUntil: true,
        },
      });
      await tx.qualificationAuditLog.create({
        data: {
          submissionId,
          actorId: adminId,
          action: 'EVIDENCE_STATUS_DECIDED',
          entityType: 'KycDocument',
          entityId: document.id,
          reason,
          beforeHash: createHash('sha256')
            .update(
              JSON.stringify({
                evidenceStatus: document.evidenceStatus,
                identityNumberLast4: document.identityNumberLast4,
                identityExpiryDate:
                  document.identityExpiryDate?.toISOString() || null,
                manualReviewCodes: existingReasonCodes.filter((code) =>
                  ADMIN_EVIDENCE_REASON_CODES.has(code),
                ),
              }),
            )
            .digest('hex'),
          afterHash: createHash('sha256')
            .update(
              JSON.stringify({
                evidenceStatus: dto.evidenceStatus,
                identityNumberLast4,
                identityExpiryDate: identityExpiryDate?.toISOString() || null,
                manualReviewCodes: assessmentReasonCodes.filter((code) =>
                  ADMIN_EVIDENCE_REASON_CODES.has(code),
                ),
              }),
            )
            .digest('hex'),
          metadata: {
            documentType: document.documentType,
            identityNumberLast4,
            identityExpiryDate: identityExpiryDate?.toISOString() || null,
            manualReviewCodes: assessmentReasonCodes.filter((code) =>
              ADMIN_EVIDENCE_REASON_CODES.has(code),
            ),
          },
        },
      });
      return updated;
    });
  }
  async listAdminAuditLogs(limit = 50, submissionId?: string) {
    const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit) || 50));
    const logs = await this.prisma.qualificationAuditLog.findMany({
      where: submissionId ? { submissionId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
      select: {
        id: true,
        submissionId: true,
        actorId: true,
        action: true,
        entityType: true,
        entityId: true,
        reason: true,
        beforeHash: true,
        afterHash: true,
        createdAt: true,
      },
    });
    const actorIds = [
      ...new Set(
        logs.flatMap((entry) => (entry.actorId ? [entry.actorId] : [])),
      ),
    ];
    const actors = actorIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const actorsById = new Map(actors.map((actor) => [actor.id, actor]));
    return logs.map((entry) => ({
      ...entry,
      actor: entry.actorId ? actorsById.get(entry.actorId) || null : null,
    }));
  }
  async listAdminSubmissions(status?: string) {
    let normalizedStatus: QualificationSubmissionStatus | undefined;
    if (status) {
      if (
        !Object.values(QualificationSubmissionStatus).includes(
          status as QualificationSubmissionStatus,
        )
      ) {
        throw new BadRequestException('Unsupported qualification status');
      }
      normalizedStatus = status as QualificationSubmissionStatus;
    }
    const submissions = await this.prisma.kycSubmission.findMany({
      where: normalizedStatus ? { status: normalizedStatus } : undefined,
      orderBy: { submittedAt: 'asc' },
      include: {
        fixer: {
          select: {
            id: true,
            priceList: true,
            qualificationEligibilityStatus: true,
            kycValidUntil: true,
            kycReverificationRequiredAt: true,
            kycReverificationReasons: true,
            tierReevaluationRequestedAt: true,
            tierReevaluationCompletedAt: true,
            user: { select: { id: true, email: true, name: true } },
          },
        },
        documents: {
          where: {
            lifecycleState: { not: 'DELETE_PENDING' },
            documentType: { not: 'id-back' },
          },
          select: {
            id: true,
            documentType: true,
            isActive: true,
            lifecycleState: true,
            objectDeletedAt: true,
            supersededAt: true,
            contentType: true,
            sizeBytes: true,
            evidenceStatus: true,
            expiresAt: true,
            createdAt: true,
            extractedFields: true,
            assessmentReasonCodes: true,
            identityNumberLast4: true,
            identityExpiryDate: true,
            legalHoldUntil: true,
            assessmentJob: {
              select: {
                status: true,
                attempts: true,
                lastError: true,
                nextAttemptAt: true,
                completedAt: true,
              },
            },
            complianceAccesses: {
              orderBy: { createdAt: 'desc' },
              take: 20,
              select: {
                actorId: true,
                purpose: true,
                caseReference: true,
                legalHoldUntil: true,
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
            provider: true,
            policyVersion: true,
            status: true,
            recommendedTier: true,
            confidence: true,
            risk: true,
            tierEligibilityScore: true,
            identityConfidence: true,
            documentAuthenticityConfidence: true,
            faceMatchConfidence: true,
            livenessConfidence: true,
            credentialConfidence: true,
            deterministicScore: true,
            humanReviewRequired: true,
            output: true,
            findings: {
              select: {
                documentId: true,
                code: true,
                severity: true,
                claim: true,
                result: true,
                confidence: true,
                details: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'desc' },
            },
            createdAt: true,
            completedAt: true,
          },
        },
        reviewTasks: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            kind: true,
            status: true,
            proposedDecision: true,
            proposedTier: true,
            decision: true,
            proposedAt: true,
            decidedAt: true,
            createdAt: true,
          },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            actorId: true,
            action: true,
            entityType: true,
            entityId: true,
            reason: true,
            createdAt: true,
          },
        },
      },
    });
    return submissions.map((submission) => ({
      id: submission.id,
      version: submission.version,
      status: submission.status,
      purpose: submission.purpose,
      reverificationReasons: submission.reverificationReasons,
      policyVersion: submission.policyVersion,
      submittedAt: submission.submittedAt,
      fixer: submission.fixer
        ? {
            id: submission.fixer.id,
            user: submission.fixer.user,
            qualificationEligibilityStatus:
              submission.fixer.qualificationEligibilityStatus,
            kycValidUntil: submission.fixer.kycValidUntil,
            kycReverificationRequiredAt:
              submission.fixer.kycReverificationRequiredAt,
            kycReverificationReasons: submission.fixer.kycReverificationReasons,
            tierReevaluationRequestedAt:
              submission.fixer.tierReevaluationRequestedAt,
            tierReevaluationCompletedAt:
              submission.fixer.tierReevaluationCompletedAt,
          }
        : null,
      priceList: submission.fixer?.priceList || [],
      documents: submission.documents,
      evaluations: submission.evaluations,
      reviewTasks: submission.reviewTasks,
      auditLogs: submission.auditLogs,
    }));
  }

  async createAdminDocumentUrl(
    adminId: string,
    submissionId: string,
    documentId: string,
  ) {
    const document = await this.prisma.kycDocument.findFirst({
      where: {
        id: documentId,
        submissionId,
        isActive: true,
        lifecycleState: 'READY',
      },
      select: {
        id: true,
        storageKey: true,
        documentType: true,
        isActive: true,
        lifecycleState: true,
      },
    });
    if (!document)
      throw new NotFoundException('Qualification document not found');
    const expiresInSeconds = 300;
    const url = await this.storage.createReadUrl(
      document.storageKey,
      expiresInSeconds,
    );
    await this.prisma.qualificationAuditLog.create({
      data: {
        submissionId,
        actorId: adminId,
        action: 'DOCUMENT_VIEW_URL_CREATED',
        entityType: 'KycDocument',
        entityId: document.id,
        reason: 'Short-lived admin review URL',
      },
    });
    return {
      documentId: document.id,
      documentType: document.documentType,
      expiresInSeconds,
      url,
    };
  }

  async createComplianceDocumentUrl(
    adminId: string,
    submissionId: string,
    documentId: string,
    dto: QualificationComplianceAccessDto,
  ) {
    const purpose = dto.purpose.trim();
    const document = await this.prisma.kycDocument.findFirst({
      where: {
        id: documentId,
        submissionId,
        isActive: true,
        lifecycleState: 'READY',
      },
      select: {
        id: true,
        storageKey: true,
        documentType: true,
        legalHoldUntil: true,
      },
    });
    if (!document)
      throw new NotFoundException('Qualification document not found');
    const legalHoldUntil = dto.legalHold
      ? new Date(dto.legalHoldUntil || Date.now() + 365 * 24 * 60 * 60 * 1000)
      : null;
    const expiresInSeconds = 300;
    const url = await this.storage.createReadUrl(
      document.storageKey,
      expiresInSeconds,
    );
    await this.prisma.$transaction(async (tx) => {
      await tx.qualificationDocumentAccess.create({
        data: {
          documentId: document.id,
          submissionId,
          actorId: adminId,
          purpose,
          caseReference: dto.caseReference?.trim() || null,
          legalHoldUntil,
        },
      });
      if (legalHoldUntil) {
        await tx.kycDocument.update({
          where: { id: document.id },
          data: { legalHoldUntil },
        });
      }
      await tx.qualificationAuditLog.create({
        data: {
          submissionId,
          actorId: adminId,
          action: 'COMPLIANCE_DOCUMENT_ACCESS_GRANTED',
          entityType: 'KycDocument',
          entityId: document.id,
          reason: purpose,
          metadata: {
            caseReference: dto.caseReference?.trim() || null,
            legalHold: Boolean(dto.legalHold),
            legalHoldUntil: legalHoldUntil?.toISOString() || null,
          },
        },
      });
    });
    return {
      documentId: document.id,
      documentType: document.documentType,
      expiresInSeconds,
      legalHoldUntil,
      url,
    };
  }

  evaluateEvidence(input: QualificationEvidenceInput) {
    return this.policy.evaluate(input);
  }
}
