import {
  BadRequestException,
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

@Injectable()
export class QualificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: QualificationPolicyService,
    private readonly storage: QualificationStorageService,
  ) {}

  async createSubmission(fixerId: string, consentAt: Date, consentVersion: string) {
    const latest = await this.prisma.kycSubmission.findFirst({
      where: { fixerId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    return this.prisma.kycSubmission.create({
      data: {
        fixerId,
        version: (latest?.version ?? 0) + 1,
        status: 'SUBMITTED',
        policyVersion: QUALIFICATION_POLICY_VERSION,
        consentAt,
        consentVersion,
        submittedAt: new Date(),
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

  async getSubmissionForUser(userId: string, submissionId: string) {
    const submission = await this.prisma.kycSubmission.findFirst({
      where: { id: submissionId, fixer: { userId } },
      include: {
        documents: {
          select: {
            id: true, documentType: true, contentType: true, sizeBytes: true,
            evidenceStatus: true, expiresAt: true, createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!submission) throw new NotFoundException('Qualification submission not found');
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
    if (!QUALIFICATION_DOCUMENT_TYPES.includes(
      documentType as (typeof QUALIFICATION_DOCUMENT_TYPES)[number],
    )) {
      throw new BadRequestException('Unsupported qualification document type');
    }
    if (file.size > 25 * 1024 * 1024) {
      throw new BadRequestException('Qualification document exceeds 25 MB');
    }

    const contentTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
    if (!contentTypes.has(file.mimetype)) {
      throw new BadRequestException(
        'Only PDF, JPEG, and PNG qualification documents are supported',
      );
    }

    const submission = await this.prisma.kycSubmission.findFirst({
      where: { id: submissionId, fixer: { userId } },
      select: { id: true, fixerId: true },
    });
    if (!submission) throw new NotFoundException('Qualification submission not found');

    const safeName = (file.originalname || 'document')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(-80);
    const storageKey = [
      'qualification',
      submission.fixerId,
      submission.id,
      `${randomUUID()}-${safeName || 'document'}`,
    ].join('/');
    const checksumSha256 = createHash('sha256').update(file.buffer).digest('hex');

    await this.storage.putPrivateObject({
      key: storageKey,
      body: file.buffer,
      contentType: file.mimetype,
    });

    return this.prisma.kycDocument.create({
      data: {
        submissionId: submission.id,
        documentType,
        storageKey,
        checksumSha256,
        contentType: file.mimetype,
        sizeBytes: file.size,
        encrypted: true,
        retentionDeleteAt: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000),
      },
      select: {
        id: true, documentType: true, contentType: true, sizeBytes: true,
        evidenceStatus: true, expiresAt: true, createdAt: true,
      },
    });
  }

  async listAdminSubmissions(status?: string) {
    let normalizedStatus: QualificationSubmissionStatus | undefined;
    if (status) {
      if (!Object.values(QualificationSubmissionStatus).includes(
        status as QualificationSubmissionStatus,
      )) {
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
            id: true, documentType: true, contentType: true, sizeBytes: true,
            evidenceStatus: true, expiresAt: true, createdAt: true,
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
      fixer: submission.fixer ? {
        id: submission.fixer.id,
        user: submission.fixer.user,
      } : null,
      documents: submission.documents,
    }));
  }

  async createAdminDocumentUrl(
    adminId: string,
    submissionId: string,
    documentId: string,
  ) {
    const document = await this.prisma.kycDocument.findFirst({
      where: { id: documentId, submissionId },
      select: { id: true, storageKey: true, documentType: true },
    });
    if (!document) throw new NotFoundException('Qualification document not found');
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
