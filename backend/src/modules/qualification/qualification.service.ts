import {
  BadRequestException,
  ConflictException,
  Injectable,
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
import { QualificationEvidenceDecisionDto } from './dto/qualification-evidence-decision.dto';

const PORTFOLIO_MAX_FILES = 10;
const PORTFOLIO_MAX_FILE_BYTES = 300 * 1024;
const KYC_DOCUMENT_TYPES = ['id-front', 'id-back', 'selfie-with-id'] as const;

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: QualificationPolicyService,
    private readonly storage: QualificationStorageService,
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
    if (isPortfolio && !imageContentTypes.has(file.mimetype)) {
      throw new BadRequestException('Portfolio evidence must be an image');
    }
    if (isPortfolio && fileSize > PORTFOLIO_MAX_FILE_BYTES) {
      throw new BadRequestException(
        'Portfolio image exceeds 0.3 MB after compression',
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
      select: { id: true, fixerId: true, status: true },
    });
    if (!submission) {
      throw new NotFoundException('Qualification submission not found');
    }
    if (submission.status !== 'DRAFT') {
      throw new ConflictException(
        'Documents can only be added before qualification submission',
      );
    }

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

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        submission.id,
      );
      const liveSubmission = await tx.kycSubmission.findUnique({
        where: { id: submission.id },
        select: { status: true },
      });
      if (liveSubmission?.status !== 'DRAFT') {
        throw new ConflictException(
          'Documents can only be added before qualification submission',
        );
      }
      const duplicate = await tx.kycDocument.findFirst({
        where: { submissionId: submission.id, checksumSha256 },
        select: { id: true },
      });
      if (duplicate) {
        throw new ConflictException('This evidence file was already uploaded');
      }
      const existingCount = await tx.kycDocument.count({
        where: { submissionId: submission.id, documentType },
      });
      const maximum = isPortfolio ? PORTFOLIO_MAX_FILES : 1;
      if (existingCount >= maximum) {
        throw new ConflictException(
          isPortfolio
            ? 'Maximum 10 portfolio images allowed'
            : 'Only one ' + documentType + ' document is allowed',
        );
      }

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
  }

  async submitForUser(userId: string, submissionId: string) {
    return this.prisma.$transaction(async (tx) => {
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

      const documentTypes = new Set(
        submission.documents.map((document) => document.documentType),
      );
      const missingKyc = KYC_DOCUMENT_TYPES.filter(
        (documentType) => !documentTypes.has(documentType),
      );
      if (missingKyc.length > 0) {
        throw new BadRequestException(
          'Missing required KYC evidence: ' + missingKyc.join(', '),
        );
      }
      const portfolio = submission.documents.filter(
        (document) => document.documentType === 'portfolio',
      );
      if (portfolio.length > PORTFOLIO_MAX_FILES) {
        throw new BadRequestException('Maximum 10 portfolio images allowed');
      }
      if (
        portfolio.some(
          (document) =>
            document.sizeBytes > PORTFOLIO_MAX_FILE_BYTES ||
            !document.contentType.startsWith('image/'),
        )
      ) {
        throw new BadRequestException(
          'Every portfolio item must be an image no larger than 0.3 MB',
        );
      }

      const submittedAt = new Date();
      const finalized = await tx.kycSubmission.updateMany({
        where: { id: submission.id, status: 'DRAFT' },
        data: { status: 'SUBMITTED', submittedAt },
      });
      if (finalized.count !== 1) {
        throw new ConflictException(
          'Qualification submission is already final',
        );
      }
      const updated = await tx.kycSubmission.findUniqueOrThrow({
        where: { id: submission.id },
        select: {
          id: true,
          version: true,
          status: true,
          policyVersion: true,
          submittedAt: true,
        },
      });
      await tx.qualificationAuditLog.create({
        data: {
          submissionId: submission.id,
          actorId: userId,
          action: 'QUALIFICATION_SUBMITTED',
          entityType: 'KycSubmission',
          entityId: submission.id,
          reason: 'Partner finalized required KYC evidence',
          metadata: {
            kycDocumentCount: KYC_DOCUMENT_TYPES.length,
            portfolioImageCount: portfolio.length,
          },
        },
      });
      return updated;
    });
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
