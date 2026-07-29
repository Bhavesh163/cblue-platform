import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { QualificationSubmissionStatus } from '@prisma/client';
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
import { QualificationAssessmentService } from './qualification-assessment.service';
import { QualificationRoutingService } from './qualification-routing.service';

const PORTFOLIO_MAX_FILES = 10;
const PORTFOLIO_MAX_FILE_BYTES = 300 * 1024;
const KYC_DOCUMENT_TYPES = ['id-front', 'id-back', 'selfie-with-id'] as const;
const UPLOADABLE_SUBMISSION_STATUSES = new Set([
  'DRAFT',
  'NEEDS_RESUBMISSION',
  'NEEDS_MORE_EVIDENCE',
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
      },
    });
  }

  async createSubmissionForUser(userId: string, consentVersion: string) {
    const fixer = await this.prisma.fixer.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!fixer) throw new NotFoundException('Fixer profile not found');
    return this.createSubmission(fixer.id, new Date(), consentVersion);
  }

  async getStatusForUser(userId: string) {
    const fixer = await this.prisma.fixer.findUnique({
      where: { userId },
      select: {
        id: true,
        tier: true,
        status: true,
        verified: true,
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
    return {
      sourceVersion: QUALIFICATION_POLICY_VERSION,
      fixer: {
        id: fixer.id,
        tier: fixer.tier,
        status: fixer.status,
        verified: fixer.verified,
        updatedAt: fixer.updatedAt,
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
    };
  }
  async getSubmissionForUser(userId: string, submissionId: string) {
    const submission = await this.prisma.kycSubmission.findFirst({
      where: { id: submissionId, fixer: { userId } },
      include: {
        documents: {
          select: {
            id: true,
            documentType: true,
            contentType: true,
            sizeBytes: true,
            evidenceStatus: true,
            expiresAt: true,
            createdAt: true,
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
    if (isKyc && !imageContentTypes.has(file.mimetype)) {
      throw new BadRequestException('KYC evidence must be an image');
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
        failedAttempts: true,
        lockedUntil: true,
        fixer: { select: { user: { select: { name: true } } } },
      },
    });
    if (!submission) {
      throw new NotFoundException('Qualification submission not found');
    }
    this.assertUploadableSubmission(submission.status, submission.lockedUntil);

    const safeName = (file.originalname || 'document')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(-80);
    const storageKey = [
      'qualification',
      submission.fixerId,
      submission.id,
      randomUUID() + '-' + (safeName || 'document'),
    ].join('/');
    const checksumSha256 = createHash('sha256')
      .update(file.buffer)
      .digest('hex');
    let storageWriteAttempted = false;
    let stagedDocumentId: string | null = null;

    try {
      const document = await this.prisma.$transaction(async (tx) => {
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
        );
        const duplicate = await tx.kycDocument.findFirst({
          where: { submissionId: submission.id, checksumSha256 },
          select: { id: true },
        });
        if (duplicate) {
          throw new ConflictException(
            'This evidence file was already uploaded',
          );
        }
        if (isPortfolio) {
          const existingCount = await tx.kycDocument.count({
            where: {
              submissionId: submission.id,
              documentType,
              isActive: true,
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
              isActive: true,
            },
          });
          if (existingCount >= 1) {
            throw new ConflictException(
              'Only one ' + documentType + ' document is allowed',
            );
          }
        }

        storageWriteAttempted = true;
        await this.storage.putPrivateObject({
          key: storageKey,
          body: file.buffer,
          contentType: file.mimetype,
        });

        return tx.kycDocument.create({
          data: {
            submissionId: submission.id,
            documentType,
            storageKey,
            checksumSha256,
            contentType: file.mimetype,
            sizeBytes: fileSize,
            encrypted: true,
            isActive: !isKyc,
            retentionDeleteAt: new Date(
              Date.now() + 3 * 365 * 24 * 60 * 60 * 1000,
            ),
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
      stagedDocumentId = document.id;

      const assessment = await this.assessment.assessDocument({
        submissionId: submission.id,
        documentId: document.id,
        registeredName: submission.fixer?.user.name || '',
        actorId: userId,
        auditAction: 'DOCUMENT_ASSESSED_ON_UPLOAD',
      });

      if (isKyc) {
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
          );
          const previousActive = await tx.kycDocument.findFirst({
            where: {
              submissionId: submission.id,
              documentType,
              isActive: true,
              id: { not: document.id },
            },
            select: { id: true },
          });
          const supersededAt = new Date();
          if (previousActive) {
            const superseded = await tx.kycDocument.updateMany({
              where: {
                id: previousActive.id,
                submissionId: submission.id,
                isActive: true,
              },
              data: {
                isActive: false,
                supersededAt,
                supersededById: document.id,
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
              id: document.id,
              submissionId: submission.id,
              isActive: false,
            },
            data: { isActive: true },
          });
          if (promoted.count !== 1) {
            throw new ConflictException(
              'Replacement KYC evidence could not be activated',
            );
          }
          if (previousActive) {
            await tx.kycSubmission.update({
              where: { id: submission.id },
              data:
                assessment.route === 'NEEDS_RESUBMISSION'
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
                entityId: document.id,
                reason: 'Assessed KYC replacement activated',
                metadata: {
                  documentType,
                  supersededDocumentId: previousActive.id,
                },
              },
            });
          }
        });
      }

      return { ...document, assessment };
    } catch (error) {
      if (storageWriteAttempted) {
        await this.cleanupFailedUpload({
          submissionId: submission.id,
          documentId: stagedDocumentId,
          storageKey,
          stagedInactive: isKyc,
        });
      }
      this.logger.error(
        `Failed to persist qualification evidence for ${submission.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
  private assertUploadableSubmission(
    status: string,
    lockedUntil: Date | null,
  ): void {
    if (!UPLOADABLE_SUBMISSION_STATUSES.has(status)) {
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

  private async cleanupFailedUpload(input: {
    submissionId: string;
    documentId: string | null;
    storageKey: string;
    stagedInactive: boolean;
  }): Promise<void> {
    let storageDeleted = false;
    for (let attempt = 1; attempt <= 2 && !storageDeleted; attempt += 1) {
      try {
        await this.storage.deletePrivateObject(input.storageKey);
        storageDeleted = true;
      } catch (error) {
        this.logger.error(
          `Failed Spaces compensation attempt ${attempt} for ${input.storageKey}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
    if (!storageDeleted || !input.documentId) return;

    try {
      await this.prisma.kycDocument.deleteMany({
        where: {
          id: input.documentId,
          submissionId: input.submissionId,
          ...(input.stagedInactive ? { isActive: false } : {}),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to remove compensated qualification document ${input.documentId}`,
        error instanceof Error ? error.stack : String(error),
      );
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
            fixer: { select: { user: { select: { name: true } } } },
            reviewTasks: {
              where: {
                status: 'ASSIGNED',
                assignedTo: adminId,
                proposedAt: null,
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
        'Qualification document verification requires the assigned maker',
      );
    }
    return this.assessment.assessDocument({
      submissionId,
      documentId,
      registeredName: context.submission.fixer.user.name || '',
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
            documents: {
              select: {
                documentType: true,
                sizeBytes: true,
                contentType: true,
                isActive: true,
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
          (document) => document.isActive,
        );
        const documentTypes = new Set(
          activeDocuments.map((document) => document.documentType),
        );
        const missingKyc = KYC_DOCUMENT_TYPES.filter(
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
        select: { id: true },
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
        where: { id: documentId, submissionId },
        select: {
          id: true,
          documentType: true,
          checksumSha256: true,
          evidenceStatus: true,
        },
      });
      if (!document)
        throw new NotFoundException('Qualification document not found');

      const updated = await tx.kycDocument.update({
        where: { id: document.id },
        data: { evidenceStatus: dto.evidenceStatus },
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
      await tx.qualificationAuditLog.create({
        data: {
          submissionId,
          actorId: adminId,
          action: 'EVIDENCE_STATUS_DECIDED',
          entityType: 'KycDocument',
          entityId: document.id,
          reason,
          beforeHash: createHash('sha256')
            .update(document.evidenceStatus)
            .digest('hex'),
          afterHash: createHash('sha256')
            .update(dto.evidenceStatus)
            .digest('hex'),
          metadata: { documentType: document.documentType },
        },
      });
      return updated;
    });
  }
  async listAdminAuditLogs(limit = 50, submissionId?: string) {
    const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit) || 50));
    return this.prisma.qualificationAuditLog.findMany({
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
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        },
        documents: {
          select: {
            id: true,
            documentType: true,
            contentType: true,
            sizeBytes: true,
            evidenceStatus: true,
            expiresAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    return submissions.map((submission) => ({
      id: submission.id,
      version: submission.version,
      status: submission.status,
      policyVersion: submission.policyVersion,
      submittedAt: submission.submittedAt,
      fixer: submission.fixer
        ? {
            id: submission.fixer.id,
            user: submission.fixer.user,
          }
        : null,
      documents: submission.documents,
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
        submission: {
          reviewTasks: {
            some: {
              status: 'ASSIGNED',
              OR: [
                { assignedTo: adminId, proposedAt: null },
                { proposedAt: { not: null }, proposedBy: { not: adminId } },
              ],
            },
          },
        },
      },
      select: { id: true, storageKey: true, documentType: true },
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

  evaluateEvidence(input: QualificationEvidenceInput) {
    return this.policy.evaluate(input);
  }
}
