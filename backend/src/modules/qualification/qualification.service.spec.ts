import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { QualificationService } from './qualification.service';

describe('QualificationService', () => {
  const tx = {
    qualificationReviewTask: { findFirst: jest.fn() },
    kycDocument: {
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    kycSubmission: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    qualificationAuditLog: { create: jest.fn() },
    $executeRawUnsafe: jest.fn(),
  } as any;
  const prisma = {
    fixer: { findUnique: jest.fn() },
    kycSubmission: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    kycDocument: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    qualificationAuditLog: { create: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(async (callback: (client: any) => unknown) =>
      callback(tx),
    ),
  } as any;
  const policy = { evaluate: jest.fn() } as any;
  const storage = {
    putPrivateObject: jest.fn(),
    createReadUrl: jest.fn(),
  } as any;
  const service = new QualificationService(prisma, policy, storage);

  beforeEach(() => {
    jest.clearAllMocks();
    tx.$executeRawUnsafe.mockResolvedValue(0);
    tx.kycDocument.findFirst.mockResolvedValue(null);
    tx.kycDocument.count.mockResolvedValue(0);
    tx.kycSubmission.findUnique.mockResolvedValue({ status: 'DRAFT' });
  });

  it('persists an admin evidence decision and immutable audit hashes', async () => {
    tx.qualificationReviewTask.findFirst.mockResolvedValue({ id: 'task-1' });
    tx.kycDocument.findFirst.mockResolvedValue({
      id: 'document-1',
      documentType: 'professional-certificate',
      checksumSha256: 'checksum',
      evidenceStatus: 'UNCHECKED',
    });
    tx.kycDocument.update.mockResolvedValue({
      id: 'document-1',
      documentType: 'professional-certificate',
      evidenceStatus: 'VALIDATED',
    });
    tx.qualificationAuditLog.create.mockResolvedValue({ id: 'audit-1' });

    await expect(
      service.reviewDocumentEvidence('admin-1', 'submission-1', 'document-1', {
        evidenceStatus: 'VALIDATED',
        reason: 'Certificate source and identity were verified.',
      }),
    ).resolves.toEqual(
      expect.objectContaining({ evidenceStatus: 'VALIDATED' }),
    );
    expect(tx.kycDocument.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'document-1', submissionId: 'submission-1' },
      }),
    );
    expect(tx.qualificationAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        submissionId: 'submission-1',
        actorId: 'admin-1',
        action: 'EVIDENCE_STATUS_DECIDED',
        entityId: 'document-1',
        reason: 'Certificate source and identity were verified.',
        beforeHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        afterHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    });
  });

  it('rejects an evidence decision from an admin who does not own the task', async () => {
    tx.qualificationReviewTask.findFirst.mockResolvedValue(null);

    await expect(
      service.reviewDocumentEvidence('admin-2', 'submission-1', 'document-1', {
        evidenceStatus: 'VALIDATED',
        reason: 'Certificate source and identity were verified.',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.kycDocument.update).not.toHaveBeenCalled();
  });

  it('returns a capped, sanitized admin audit feed', async () => {
    const createdAt = new Date('2026-07-24T00:00:00.000Z');
    prisma.qualificationAuditLog.findMany.mockResolvedValue([
      {
        id: 'audit-1',
        submissionId: 'submission-1',
        actorId: 'admin-1',
        action: 'QUALIFICATION_DECIDED',
        entityType: 'TierQualification',
        entityId: 'tier-1',
        reason: 'Approved after review',
        beforeHash: 'before',
        afterHash: 'after',
        createdAt,
      },
    ]);

    await expect(
      service.listAdminAuditLogs(500, 'submission-1'),
    ).resolves.toHaveLength(1);
    expect(prisma.qualificationAuditLog.findMany).toHaveBeenCalledWith({
      where: { submissionId: 'submission-1' },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: expect.objectContaining({
        action: true,
        beforeHash: true,
        afterHash: true,
      }),
    });
  });
  it('creates a submission for the authenticated fixer profile', async () => {
    prisma.fixer.findUnique.mockResolvedValue({ id: 'fixer-1' });
    prisma.kycSubmission.findFirst.mockResolvedValue(null);
    prisma.kycSubmission.create.mockResolvedValue({ id: 'submission-1' });

    await expect(
      service.createSubmissionForUser('user-1', 'pdpa-v1'),
    ).resolves.toEqual({ id: 'submission-1' });
    expect(prisma.kycSubmission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fixerId: 'fixer-1',
          consentVersion: 'pdpa-v1',
          status: 'DRAFT',
        }),
      }),
    );
  });

  it('returns only the authenticated fixer qualification status', async () => {
    const updatedAt = new Date('2026-07-24T00:00:00.000Z');
    prisma.fixer.findUnique.mockResolvedValue({
      id: 'fixer-1',
      tier: 'STANDARD',
      status: 'APPROVED',
      verified: true,
      aiScore: 78,
      aiTier: 'STANDARD',
      aiCredentialStatus: 'verified',
      updatedAt,
      qualificationSubmissions: [
        {
          id: 'submission-1',
          version: 2,
          status: 'APPROVED',
          policyVersion: 'cblue-fixer-qualification-v1',
          submittedAt: updatedAt,
          reviewedAt: updatedAt,
          decisionReason: 'Verified by admin',
          evaluations: [
            {
              provider: 'deterministic',
              status: 'COMPLETED',
              risk: 'LOW',
              recommendedTier: 'STANDARD',
              confidence: 92,
              deterministicScore: 78,
              aiScore: null,
              identityConfidence: 91,
              documentAuthenticityConfidence: 88,
              faceMatchConfidence: null,
              livenessConfidence: null,
              credentialConfidence: null,
              tierEligibilityScore: null,
              humanReviewRequired: true,
              completedAt: updatedAt,
              createdAt: updatedAt,
            },
          ],
          reviewTasks: [
            {
              status: 'DECIDED',
              decision: 'APPROVE',
              createdAt: updatedAt,
              decidedAt: updatedAt,
            },
          ],
        },
      ],
      tierQualifications: [
        {
          approvedTier: 'STANDARD',
          recommendedTier: 'STANDARD',
          source: 'HUMAN',
          policyVersion: 'cblue-fixer-qualification-v1',
          reason: 'Verified by admin',
          effectiveAt: updatedAt,
          expiresAt: null,
          createdAt: updatedAt,
        },
      ],
    });

    const result = await service.getStatusForUser('user-1');

    expect(result).toEqual(
      expect.objectContaining({
        sourceVersion: 'cblue-fixer-qualification-v1',
        fixer: expect.objectContaining({
          id: 'fixer-1',
          tier: 'STANDARD',
          status: 'APPROVED',
        }),
        submission: expect.objectContaining({
          id: 'submission-1',
          status: 'APPROVED',
        }),
        reviewTask: expect.objectContaining({
          status: 'DECIDED',
          decision: 'APPROVE',
        }),
        tierQualification: expect.objectContaining({
          approvedTier: 'STANDARD',
          source: 'HUMAN',
        }),
      }),
    );
    expect(prisma.kycDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
      }),
    );
    expect(result.evaluation).toEqual(
      expect.objectContaining({
        identityConfidence: 91,
        documentAuthenticityConfidence: 88,
        faceMatchConfidence: null,
        livenessConfidence: null,
        credentialConfidence: null,
        tierEligibilityScore: null,
        humanReviewRequired: true,
      }),
    );
    expect(prisma.fixer.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          qualificationSubmissions: expect.objectContaining({
            select: expect.objectContaining({
              evaluations: expect.objectContaining({
                select: expect.objectContaining({
                  identityConfidence: true,
                  documentAuthenticityConfidence: true,
                  faceMatchConfidence: true,
                  livenessConfidence: true,
                  credentialConfidence: true,
                  tierEligibilityScore: true,
                  humanReviewRequired: true,
                }),
              }),
            }),
          }),
        }),
      }),
    );
  });
  it('rejects a submission request without a fixer profile', async () => {
    prisma.fixer.findUnique.mockResolvedValue(null);
    await expect(
      service.createSubmissionForUser('user-unknown', 'pdpa-v1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('stores uploaded documents privately and never accepts a client storage key', async () => {
    prisma.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-1',
      fixerId: 'fixer-1',
      status: 'DRAFT',
    });
    tx.kycDocument.create.mockImplementation(async ({ data, select }: any) => ({
      id: 'document-1',
      documentType: data.documentType,
      contentType: data.contentType,
      sizeBytes: data.sizeBytes,
      evidenceStatus: 'UNCHECKED',
      expiresAt: null,
      createdAt: new Date('2026-07-24T00:00:00.000Z'),
      select,
    }));

    const result = await service.uploadDocumentForUser(
      'user-1',
      'submission-1',
      'id-front',
      {
        originalname: '../../identity.jpg',
        mimetype: 'image/jpeg',
        size: 4,
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
      } as Express.Multer.File,
    );

    expect(storage.putPrivateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        body: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
        contentType: 'image/jpeg',
        key: expect.stringMatching(
          /^qualification\/fixer-1\/submission-1\/[a-f0-9-]+-\.\._\.\._identity\.jpg$/,
        ),
      }),
    );
    const call = tx.kycDocument.create.mock.calls[0][0];
    expect(call.data.storageKey).not.toContain('../../');
    expect(call.data.checksumSha256).toHaveLength(64);
    expect(call.data.encrypted).toBe(true);
    expect(result.id).toBe('document-1');
  });

  it('stores a size-limited portfolio PDF as private evidence', async () => {
    prisma.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-1',
      fixerId: 'fixer-1',
      status: 'DRAFT',
    });
    tx.kycDocument.create.mockImplementation(async ({ data }: any) => ({
      id: 'portfolio-pdf-1',
      documentType: data.documentType,
      contentType: data.contentType,
      sizeBytes: data.sizeBytes,
      evidenceStatus: 'UNCHECKED',
      expiresAt: null,
      createdAt: new Date('2026-07-24T00:00:00.000Z'),
    }));
    const pdf = Buffer.from('%PDF-1.4\nportfolio');

    await expect(
      service.uploadDocumentForUser('user-1', 'submission-1', 'portfolio', {
        originalname: 'portfolio.pdf',
        mimetype: 'application/pdf',
        size: pdf.length,
        buffer: pdf,
      } as Express.Multer.File),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'portfolio-pdf-1',
        contentType: 'application/pdf',
      }),
    );
    expect(storage.putPrivateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        body: pdf,
        contentType: 'application/pdf',
      }),
    );
  });
  it('rejects a spoofed image MIME type before private storage', async () => {
    await expect(
      service.uploadDocumentForUser('user-1', 'submission-1', 'portfolio', {
        originalname: 'spoofed.jpg',
        mimetype: 'image/jpeg',
        size: 8,
        buffer: Buffer.from('not-jpeg'),
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.putPrivateObject).not.toHaveBeenCalled();
  });

  it('rejects unsupported document content without touching storage', async () => {
    await expect(
      service.uploadDocumentForUser('user-1', 'submission-1', 'id-front', {
        originalname: 'id.exe',
        mimetype: 'application/x-msdownload',
        size: 4,
        buffer: Buffer.from('nope'),
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.putPrivateObject).not.toHaveBeenCalled();
  });

  it('rejects portfolio files above 0.3 MB before private storage', async () => {
    await expect(
      service.uploadDocumentForUser('user-1', 'submission-1', 'portfolio', {
        originalname: 'large.jpg',
        mimetype: 'image/jpeg',
        size: 300 * 1024 + 1,
        buffer: Buffer.alloc(300 * 1024 + 1),
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.putPrivateObject).not.toHaveBeenCalled();
  });

  it('enforces the ten-file portfolio limit under a serialized upload lock', async () => {
    prisma.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-1',
      fixerId: 'fixer-1',
      status: 'DRAFT',
    });
    tx.kycDocument.count.mockResolvedValue(10);

    await expect(
      service.uploadDocumentForUser('user-1', 'submission-1', 'portfolio', {
        originalname: 'eleventh.jpg',
        mimetype: 'image/jpeg',
        size: 100,
        buffer: Buffer.concat([
          Buffer.from([0xff, 0xd8, 0xff]),
          Buffer.alloc(97),
        ]),
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.$executeRawUnsafe).toHaveBeenCalled();
    expect(storage.putPrivateObject).not.toHaveBeenCalled();
  });

  it('does not finalize a qualification submission without all three KYC types', async () => {
    tx.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-1',
      status: 'DRAFT',
      documents: [
        { documentType: 'id-front', sizeBytes: 100, contentType: 'image/jpeg' },
        { documentType: 'id-back', sizeBytes: 100, contentType: 'image/jpeg' },
      ],
    });

    await expect(
      service.submitForUser('user-1', 'submission-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.kycSubmission.update).not.toHaveBeenCalled();
  });

  it('finalizes complete KYC and portfolio evidence with an audit record', async () => {
    tx.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-1',
      status: 'DRAFT',
      documents: [
        { documentType: 'id-front', sizeBytes: 100, contentType: 'image/jpeg' },
        { documentType: 'id-back', sizeBytes: 100, contentType: 'image/jpeg' },
        {
          documentType: 'selfie-with-id',
          sizeBytes: 100,
          contentType: 'image/jpeg',
        },
        {
          documentType: 'portfolio',
          sizeBytes: 250 * 1024,
          contentType: 'image/jpeg',
        },
        {
          documentType: 'portfolio',
          sizeBytes: 200 * 1024,
          contentType: 'application/pdf',
        },
      ],
    });
    tx.kycSubmission.updateMany.mockResolvedValue({ count: 1 });
    tx.kycSubmission.findUniqueOrThrow.mockResolvedValue({
      id: 'submission-1',
      status: 'SUBMITTED',
    });

    await expect(
      service.submitForUser('user-1', 'submission-1'),
    ).resolves.toEqual(expect.objectContaining({ status: 'SUBMITTED' }));
    expect(tx.kycSubmission.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'submission-1', status: 'DRAFT' },
        data: expect.objectContaining({ status: 'SUBMITTED' }),
      }),
    );
    expect(tx.qualificationAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'QUALIFICATION_SUBMITTED',
        actorId: 'user-1',
        metadata: {
          kycDocumentCount: 3,
          portfolioFileCount: 2,
          portfolioImageCount: 1,
        },
      }),
    });
  });

  it('creates a short-lived admin review URL and audit record', async () => {
    prisma.kycDocument.findFirst.mockResolvedValue({
      id: 'document-1',
      storageKey: 'qualification/fixer-1/submission-1/document-1',
      documentType: 'id-front',
    });
    storage.createReadUrl.mockResolvedValue('https://private.example/document');

    await expect(
      service.createAdminDocumentUrl('admin-1', 'submission-1', 'document-1'),
    ).resolves.toEqual({
      documentId: 'document-1',
      documentType: 'id-front',
      expiresInSeconds: 300,
      url: 'https://private.example/document',
    });
    expect(prisma.qualificationAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        submissionId: 'submission-1',
        actorId: 'admin-1',
        action: 'DOCUMENT_VIEW_URL_CREATED',
      }),
    });
  });
});
