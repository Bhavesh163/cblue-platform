import {
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QualificationService } from './qualification.service';

describe('QualificationService', () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  const tx = {
    qualificationReviewTask: { findFirst: jest.fn() },
    kycDocument: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
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
      deleteMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    qualificationStorageCleanupIntent: {
      createMany: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    qualificationAuditLog: { create: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn((callback: (client: any) => unknown) => callback(tx)),
  } as any;
  const policy = { evaluate: jest.fn() } as any;
  const storage = {
    putPrivateObject: jest.fn(),
    deletePrivateObject: jest.fn(),
    createReadUrl: jest.fn(),
  } as any;
  const readiness = { assertReady: jest.fn() } as any;
  const assessment = { assessDocument: jest.fn() } as any;
  const routing = { routeSubmission: jest.fn() } as any;
  const service = new QualificationService(
    prisma,
    policy,
    storage,
    readiness,
    assessment,
    routing,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction
      .mockReset()
      .mockImplementation((callback: (client: any) => unknown) => callback(tx));
    readiness.assertReady.mockResolvedValue(undefined);
    assessment.assessDocument.mockResolvedValue({
      evidenceStatus: 'INSUFFICIENT',
      route: 'NEEDS_REVIEW',
      confidence: 96,
      identityConfidence: null,
      documentAuthenticityConfidence: null,
      faceMatchConfidence: null,
      livenessConfidence: null,
      reasonCodes: ['DOCUMENT_VALID', 'HUMAN_REVIEW_REQUIRED'],
      provider: 'TYPHOON_OCR',
      model: 'typhoon-model',
      assessedAt: new Date('2026-07-30T00:00:00.000Z'),
    });
    tx.$executeRawUnsafe.mockResolvedValue(0);
    tx.kycDocument.findFirst.mockResolvedValue(null);
    tx.kycDocument.findUnique.mockResolvedValue({
      id: 'document-1',
      isActive: false,
      lifecycleState: 'ASSESSING',
    });
    tx.kycDocument.count.mockResolvedValue(0);
    tx.kycDocument.updateMany.mockResolvedValue({ count: 1 });
    tx.kycSubmission.findUnique.mockResolvedValue({ status: 'DRAFT' });
    prisma.kycDocument.deleteMany.mockResolvedValue({ count: 1 });
    prisma.kycDocument.findUnique.mockResolvedValue(null);
    prisma.kycDocument.updateMany.mockResolvedValue({ count: 1 });
    prisma.qualificationStorageCleanupIntent.createMany.mockResolvedValue({ count: 1 });
    prisma.qualificationStorageCleanupIntent.updateMany.mockResolvedValue({ count: 1 });
    storage.deletePrivateObject.mockResolvedValue(undefined);
    routing.routeSubmission.mockResolvedValue({
      status: 'NEEDS_REVIEW',
      confidence: 80,
      reasonCodes: ['DOCUMENT_VALID', 'HUMAN_REVIEW_REQUIRED'],
      humanReviewRequired: true,
      lockedUntil: null,
    });
  });

  it('persists and audits authorized admin verification through the assessment service', async () => {
    prisma.kycDocument.findFirst.mockResolvedValue({
      id: 'document-1',
      submission: {
        fixer: { user: { name: 'Suppadesh Fungprasertsuk' } },
        reviewTasks: [{ id: 'task-1' }],
      },
    });

    await expect(
      service.verifyDocumentForAdmin('admin-1', 'submission-1', 'document-1'),
    ).resolves.toEqual(expect.objectContaining({ route: 'NEEDS_REVIEW' }));
    expect(assessment.assessDocument).toHaveBeenCalledWith({
      submissionId: 'submission-1',
      documentId: 'document-1',
      registeredName: 'Suppadesh Fungprasertsuk',
      actorId: 'admin-1',
      auditAction: 'DOCUMENT_VERIFICATION_COMPLETED',
    });
  });

  it('rejects admin verification when the admin does not own the maker task', async () => {
    prisma.kycDocument.findFirst.mockResolvedValue({
      id: 'document-1',
      submission: {
        fixer: { user: { name: 'Suppadesh Fungprasertsuk' } },
        reviewTasks: [],
      },
    });

    await expect(
      service.verifyDocumentForAdmin(
        'other-admin',
        'submission-1',
        'document-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(assessment.assessDocument).not.toHaveBeenCalled();
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

  it('persists a pending document before uploading outside the advisory-locked transaction', async () => {
    prisma.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-1',
      fixerId: 'fixer-1',
      status: 'DRAFT',
      failedAttempts: 0,
      lockedUntil: null,
      fixer: { user: { name: 'Registered Name' } },
    });
    tx.kycDocument.create.mockImplementation(({ data }: any) => ({
      id: data.id,
      documentType: data.documentType,
      contentType: data.contentType,
      sizeBytes: data.sizeBytes,
      evidenceStatus: 'UNCHECKED',
      expiresAt: null,
      createdAt: new Date('2026-07-30T00:00:00.000Z'),
    }));
    let transactionDepth = 0;
    prisma.$transaction.mockImplementation(
      async (callback: (client: any) => unknown) => {
        transactionDepth += 1;
        try {
          return await callback(tx);
        } finally {
          transactionDepth -= 1;
        }
      },
    );
    storage.putPrivateObject.mockImplementation(() => {
      expect(transactionDepth).toBe(0);
      return Promise.resolve();
    });

    await service.uploadDocumentForUser('user-1', 'submission-1', 'id-front', {
      originalname: 'identity.jpg',
      mimetype: 'image/jpeg',
      size: 4,
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0x10]),
    } as Express.Multer.File);

    expect(tx.kycDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isActive: false,
          lifecycleState: 'PENDING_UPLOAD',
        }),
      }),
    );
    expect(tx.kycDocument.create.mock.invocationCallOrder[0]).toBeLessThan(
      storage.putPrivateObject.mock.invocationCallOrder[0],
    );
  });

  it('durably tracks upload and cleanup failure without logging object keys or filenames', async () => {
    prisma.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-1',
      fixerId: 'fixer-1',
      status: 'DRAFT',
      failedAttempts: 0,
      lockedUntil: null,
      fixer: { user: { name: 'Registered Name' } },
    });
    tx.kycDocument.create.mockImplementation(({ data }: any) => ({
      id: data.id,
      documentType: data.documentType,
      contentType: data.contentType,
      sizeBytes: data.sizeBytes,
      evidenceStatus: 'UNCHECKED',
      expiresAt: null,
      createdAt: new Date('2026-07-30T00:00:00.000Z'),
    }));
    storage.putPrivateObject.mockRejectedValueOnce(
      Object.assign(new Error('upload failed'), { code: 'NetworkingError' }),
    );
    storage.deletePrivateObject.mockRejectedValueOnce(
      Object.assign(new Error('cleanup failed'), { code: 'TimeoutError' }),
    );
    prisma.kycDocument.findUnique.mockResolvedValue({
      id: 'staged-document',
      submissionId: 'submission-1',
      storageKey: 'qualification/fixer-1/submission-1/private-name.jpg',
      isActive: false,
      lifecycleState: 'DELETE_PENDING',
    });

    await expect(
      service.uploadDocumentForUser('user-1', 'submission-1', 'id-front', {
        originalname: 'private-name.jpg',
        mimetype: 'image/jpeg',
        size: 4,
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0x11]),
      } as Express.Multer.File),
    ).rejects.toThrow('upload failed');

    expect(prisma.kycDocument.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: false }),
        data: expect.objectContaining({
          lifecycleState: 'DELETE_PENDING',
          cleanupErrorCode: expect.any(String),
        }),
      }),
    );
    const logged = (Logger.prototype.error as jest.Mock).mock.calls
      .flat()
      .join(' ');
    expect(logged).not.toContain('private-name.jpg');
    expect(logged).not.toContain('qualification/fixer-1');
  });

  it('does not compensate an ambiguous promotion that authoritatively committed READY and active', async () => {
    prisma.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-1',
      fixerId: 'fixer-1',
      status: 'NEEDS_RESUBMISSION',
      failedAttempts: 2,
      lockedUntil: null,
      fixer: { user: { name: 'Registered Name' } },
    });
    tx.kycSubmission.findUnique.mockResolvedValue({
      status: 'NEEDS_RESUBMISSION',
      failedAttempts: 2,
      lockedUntil: null,
    });
    tx.kycDocument.findFirst.mockImplementation(({ where }: any) =>
      where.checksumSha256 ? null : { id: 'prior-active' },
    );
    tx.kycDocument.create.mockImplementation(({ data }: any) => ({
      id: data.id,
      documentType: data.documentType,
      contentType: data.contentType,
      sizeBytes: data.sizeBytes,
      evidenceStatus: 'UNCHECKED',
      expiresAt: null,
      createdAt: new Date('2026-07-30T00:00:00.000Z'),
    }));
    let transactionCall = 0;
    prisma.$transaction.mockImplementation(
      async (callback: (client: any) => unknown) => {
        transactionCall += 1;
        const result = await callback(tx);
        if (transactionCall === 2) {
          throw new Error('promotion commit acknowledgement lost');
        }
        return result;
      },
    );
    prisma.kycDocument.findUnique.mockResolvedValue({
      id: 'authoritative-ready',
      submissionId: 'submission-1',
      storageKey: 'opaque-key',
      isActive: true,
      lifecycleState: 'READY',
    });

    await expect(
      service.uploadDocumentForUser('user-1', 'submission-1', 'id-front', {
        originalname: 'replacement.jpg',
        mimetype: 'image/jpeg',
        size: 4,
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0x12]),
      } as Express.Multer.File),
    ).resolves.toEqual(
      expect.objectContaining({ assessment: expect.any(Object) }),
    );

    expect(storage.deletePrivateObject).not.toHaveBeenCalled();
    expect(prisma.kycDocument.updateMany).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lifecycleState: 'DELETE_PENDING' }),
      }),
    );
  });

  it('persists independent cleanup when the submission and document were cascade-deleted', async () => {
    prisma.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-1',
      fixerId: 'fixer-1',
      status: 'DRAFT',
      failedAttempts: 0,
      lockedUntil: null,
      fixer: { user: { name: 'Registered Name' } },
    });
    tx.kycDocument.create.mockImplementation(({ data }: any) => ({
      id: data.id,
      documentType: data.documentType,
      contentType: data.contentType,
      sizeBytes: data.sizeBytes,
      evidenceStatus: 'UNCHECKED',
      expiresAt: null,
      createdAt: new Date('2026-07-30T00:00:00.000Z'),
    }));
    let transactionCall = 0;
    prisma.$transaction.mockImplementation(
      async (callback: (client: any) => unknown) => {
        transactionCall += 1;
        if (transactionCall === 2) {
          throw new Error('promotion failed before commit');
        }
        return callback(tx);
      },
    );
    prisma.kycDocument.findUnique
      .mockResolvedValueOnce(null)
      .mockImplementation(async ({ where }: any) =>
        where.id
          ? {
              id: where.id,
              submissionId: 'submission-1',
              storageKey:
                'qualification/fixer-1/submission-1/opaque-document-id',
              isActive: false,
              lifecycleState: 'DELETE_PENDING',
              cleanupAttempts: 0,
            }
          : null,
      );
    prisma.kycDocument.findFirst.mockResolvedValue(null);
    prisma.kycDocument.create.mockRejectedValue(
      new Error('submission FK missing'),
    );
    prisma.qualificationStorageCleanupIntent.findUnique.mockImplementation(
      ({ where }: any) => ({
        id: 'cleanup-1',
        storageKey:
          where.storageKey ??
          'qualification/fixer-1/submission-1/opaque-document-id',
        status: 'PENDING',
        attempts: 0,
        claimedBy:
          prisma.qualificationStorageCleanupIntent.updateMany.mock.calls.at(-1)
            ?.[0].data.claimedBy ?? null,
      }),
    );
    storage.deletePrivateObject.mockRejectedValueOnce(
      new Error('delete unavailable'),
    );

    await expect(
      service.uploadDocumentForUser('user-1', 'submission-1', 'id-front', {
        originalname: 'passport-owner-name.jpg',
        mimetype: 'image/jpeg',
        size: 4,
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0x13]),
      } as Express.Multer.File),
    ).rejects.toThrow('promotion failed before commit');

    const staged = tx.kycDocument.create.mock.calls[0][0].data;
    expect(prisma.kycDocument.findFirst).toHaveBeenCalledWith({
      where: { storageKey: staged.storageKey },
      select: expect.objectContaining({
        id: true,
        isActive: true,
        lifecycleState: true,
      }),
    });
    expect(prisma.kycDocument.create).not.toHaveBeenCalled();
    expect(
      prisma.qualificationStorageCleanupIntent.createMany,
    ).toHaveBeenCalledWith({
      data: {
        id: expect.any(String),
        storageKey: staged.storageKey,
        status: 'PENDING',
        nextAttemptAt: expect.any(Date),
      },
      skipDuplicates: true,
    });
    expect(
      prisma.qualificationStorageCleanupIntent.updateMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          errorCode: 'OBJECT_DELETE_FAILED',
          nextAttemptAt: expect.any(Date),
        }),
      }),
    );
    const logged = (Logger.prototype.error as jest.Mock).mock.calls
      .flat()
      .join(' ');
    expect(logged).not.toContain('passport-owner-name.jpg');
    expect(logged).not.toContain(staged.storageKey);
  });

  it('creates orphan cleanup intent idempotently without returning the private key', async () => {
    prisma.qualificationStorageCleanupIntent.createMany.mockResolvedValue({
      count: 0,
    });
    prisma.qualificationStorageCleanupIntent.findUnique.mockResolvedValue({
      id: 'cleanup-existing',
      status: 'PENDING',
    });

    await expect(
      service.ensureStorageCleanupIntent(
        'qualification/private/passport-owner.jpg',
        'cleanup-new',
      ),
    ).resolves.toEqual({
      id: 'cleanup-existing',
      status: 'PENDING',
    });

    expect(
      prisma.qualificationStorageCleanupIntent.createMany,
    ).toHaveBeenCalledWith({
      data: {
        id: 'cleanup-new',
        storageKey: 'qualification/private/passport-owner.jpg',
        status: 'PENDING',
        nextAttemptAt: expect.any(Date),
      },
      skipDuplicates: true,
    });
  });

  it('does not delete or leak the private key when intent persistence fails', async () => {
    prisma.qualificationStorageCleanupIntent.createMany.mockRejectedValue(
      new Error('database unavailable'),
    );
    prisma.qualificationStorageCleanupIntent.findUnique.mockResolvedValue(null);

    await expect(
      service.ensureStorageCleanupIntent(
        'qualification/private/passport-owner.jpg',
        'cleanup-failed',
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(storage.deletePrivateObject).not.toHaveBeenCalled();
    const logged = (Logger.prototype.error as jest.Mock).mock.calls
      .flat()
      .join(' ');
    expect(logged).toContain('cleanup=cleanup-failed');
    expect(logged).toContain('code=CLEANUP_INTENT_PERSIST_FAILED');
    expect(logged).not.toContain('passport-owner');
    expect(logged).not.toContain('qualification/private');
  });

  it('retries orphan cleanup successfully and remains idempotent after completion', async () => {
    prisma.qualificationStorageCleanupIntent.findUnique
      .mockResolvedValueOnce({
        id: 'cleanup-success',
        storageKey: 'qualification/private/opaque-key',
        status: 'PENDING',
        attempts: 0,
        claimedBy: 'worker-1',
      })
      .mockResolvedValueOnce({
        id: 'cleanup-success',
        status: 'COMPLETED',
      });

    await expect(
      service.retryStorageCleanupIntent('cleanup-success', 'worker-1'),
    ).resolves.toEqual({ cleaned: true, status: 'COMPLETED' });
    await expect(
      service.retryStorageCleanupIntent('cleanup-success', 'worker-1'),
    ).resolves.toEqual({ cleaned: true, status: 'COMPLETED' });

    expect(storage.deletePrivateObject).toHaveBeenCalledTimes(1);
    expect(
      prisma.qualificationStorageCleanupIntent.updateMany,
    ).toHaveBeenCalledWith({
      where: {
        id: 'cleanup-success',
        status: 'PENDING',
        claimedBy: 'worker-1',
      },
      data: expect.objectContaining({
        status: 'COMPLETED',
        completedAt: expect.any(Date),
        errorCode: null,
        nextAttemptAt: null,
        claimedAt: null,
        claimedBy: null,
      }),
    });
  });

  it('persists orphan cleanup retry backoff and logs only cleanup metadata', async () => {
    jest.useFakeTimers().setSystemTime(Date.parse('2026-07-30T12:00:00.000Z'));
    prisma.qualificationStorageCleanupIntent.findUnique.mockResolvedValue({
      id: 'cleanup-retry',
      storageKey: 'qualification/private/passport-owner.jpg',
      status: 'PENDING',
      attempts: 1,
      claimedBy: 'worker-1',
    });
    storage.deletePrivateObject.mockRejectedValueOnce(
      new Error('private key should never be logged'),
    );

    await expect(
      service.retryStorageCleanupIntent('cleanup-retry', 'worker-1'),
    ).resolves.toEqual({
      cleaned: false,
      status: 'PENDING',
      nextAttemptAt: new Date('2026-07-30T12:01:00.000Z'),
    });

    expect(
      prisma.qualificationStorageCleanupIntent.updateMany,
    ).toHaveBeenCalledWith({
      where: {
        id: 'cleanup-retry',
        status: 'PENDING',
        claimedBy: 'worker-1',
      },
      data: {
        attempts: { increment: 1 },
        errorCode: 'OBJECT_DELETE_FAILED',
        nextAttemptAt: new Date('2026-07-30T12:01:00.000Z'),
        claimedAt: null,
        claimedBy: null,
      },
    });
    const logged = (Logger.prototype.error as jest.Mock).mock.calls
      .flat()
      .join(' ');
    expect(logged).toContain('cleanup=cleanup-retry');
    expect(logged).toContain('code=OBJECT_DELETE_FAILED');
    expect(logged).not.toContain('passport-owner');
    expect(logged).not.toContain('private key');
    jest.useRealTimers();
  });


  it('retries durable DELETE_PENDING cleanup and retains a terminal lifecycle row', async () => {
    prisma.kycDocument.findUnique.mockResolvedValue({
      id: 'document-cleanup',
      submissionId: 'submission-1',
      storageKey: 'opaque-storage-key',
      isActive: false,
      lifecycleState: 'DELETE_PENDING',
    });

    await expect(
      service.retryPendingDocumentCleanup('document-cleanup'),
    ).resolves.toEqual({ cleaned: true, lifecycleState: 'FAILED' });

    expect(storage.deletePrivateObject).toHaveBeenCalledWith(
      'opaque-storage-key',
    );
    expect(prisma.kycDocument.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: 'document-cleanup',
        isActive: false,
        lifecycleState: 'DELETE_PENDING',
        cleanupClaimedBy: expect.any(String),
      }),
      data: expect.objectContaining({
        lifecycleState: 'FAILED',
        objectDeletedAt: expect.any(Date),
        cleanupAttempts: { increment: 1 },
        cleanupErrorCode: null,
      }),
    });
  });

  it('persists exponential backoff and releases the worker claim after cleanup failure', async () => {
    jest.useFakeTimers().setSystemTime(Date.parse('2026-07-30T12:00:00.000Z'));
    prisma.kycDocument.findUnique.mockResolvedValue({
      id: 'document-retry',
      submissionId: 'submission-1',
      storageKey: 'opaque-storage-key',
      isActive: false,
      lifecycleState: 'DELETE_PENDING',
      cleanupAttempts: 2,
      cleanupClaimedBy: 'worker-1',
    });
    storage.deletePrivateObject.mockRejectedValueOnce(
      new Error('storage unavailable'),
    );

    await expect(
      service.retryPendingDocumentCleanup('document-retry', 'worker-1'),
    ).resolves.toEqual({
      cleaned: false,
      lifecycleState: 'DELETE_PENDING',
      nextAttemptAt: new Date('2026-07-30T12:02:00.000Z'),
    });

    expect(prisma.kycDocument.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'document-retry',
        isActive: false,
        lifecycleState: 'DELETE_PENDING',
        cleanupClaimedBy: 'worker-1',
      },
      data: {
        cleanupAttempts: { increment: 1 },
        cleanupErrorCode: 'OBJECT_DELETE_FAILED',
        cleanupNextAttemptAt: new Date('2026-07-30T12:02:00.000Z'),
        cleanupClaimedAt: null,
        cleanupClaimedBy: null,
      },
    });
    jest.useRealTimers();
  });

  it('stores uploaded documents privately and never accepts a client storage key', async () => {
    prisma.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-1',
      fixerId: 'fixer-1',
      status: 'DRAFT',
      fixer: { user: { name: 'Suppadesh Fungprasertsuk' } },
    });
    tx.kycDocument.create.mockImplementation(({ data, select }: any) => ({
      id: data.id,
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
          /^qualification\/fixer-1\/submission-1\/[a-f0-9-]+$/,
        ),
      }),
    );
    const call = tx.kycDocument.create.mock.calls[0][0];
    const uploadedDocumentId = call.data.id;
    expect(call.data.storageKey).not.toContain('../../');
    expect(call.data.storageKey).not.toContain('identity.jpg');
    expect(call.data.lifecycleState).toBe('PENDING_UPLOAD');
    expect(call.data.checksumSha256).toHaveLength(64);
    expect(call.data.encrypted).toBe(true);
    expect(call.data.isActive).toBe(false);
    expect(tx.kycDocument.findFirst).toHaveBeenCalledWith({
      where: {
        submissionId: 'submission-1',
        checksumSha256: expect.any(String),
        lifecycleState: {
          in: ['PENDING_UPLOAD', 'UPLOADED', 'ASSESSING', 'READY'],
        },
      },
      select: { id: true },
    });
    expect(result.id).toBe(uploadedDocumentId);
    expect(result.assessment).toEqual(
      expect.objectContaining({ route: 'NEEDS_REVIEW' }),
    );
    expect(assessment.assessDocument).toHaveBeenCalledWith({
      submissionId: 'submission-1',
      documentId: uploadedDocumentId,
      registeredName: 'Suppadesh Fungprasertsuk',
      actorId: 'user-1',
      auditAction: 'DOCUMENT_ASSESSED_ON_UPLOAD',
    });
    expect(tx.kycDocument.updateMany).toHaveBeenCalledWith({
      where: {
        id: uploadedDocumentId,
        submissionId: 'submission-1',
        isActive: false,
        lifecycleState: 'ASSESSING',
      },
      data: expect.objectContaining({
        isActive: true,
        lifecycleState: 'READY',
      }),
    });
  });

  it('promotes a fully assessed KYC replacement and supersedes the prior active evidence atomically', async () => {
    prisma.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-1',
      fixerId: 'fixer-1',
      status: 'NEEDS_RESUBMISSION',
      failedAttempts: 2,
      lockedUntil: null,
      fixer: { user: { name: 'Suppadesh Fungprasertsuk' } },
    });
    tx.kycSubmission.findUnique.mockResolvedValue({
      status: 'NEEDS_RESUBMISSION',
      failedAttempts: 2,
      lockedUntil: null,
    });
    tx.kycDocument.findFirst.mockImplementation(({ where }: any) =>
      where.checksumSha256
        ? null
        : {
            id: 'old-id-front',
            documentType: 'id-front',
            isActive: true,
          },
    );
    tx.kycDocument.create.mockImplementation(({ data }: any) => ({
      id: data.id,
      documentType: data.documentType,
      contentType: data.contentType,
      sizeBytes: data.sizeBytes,
      evidenceStatus: 'UNCHECKED',
      expiresAt: null,
      createdAt: new Date('2026-07-30T00:00:00.000Z'),
    }));

    await expect(
      service.uploadDocumentForUser('user-1', 'submission-1', 'id-front', {
        originalname: 'replacement.jpg',
        mimetype: 'image/jpeg',
        size: 4,
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0x01]),
      } as Express.Multer.File),
    ).resolves.toEqual(expect.objectContaining({ id: expect.any(String) }));
    const replacementId = tx.kycDocument.create.mock.calls[0][0].data.id;

    expect(tx.kycDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isActive: false }),
      }),
    );
    expect(tx.kycDocument.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'old-id-front',
        submissionId: 'submission-1',
        isActive: true,
        lifecycleState: 'READY',
      },
      data: {
        isActive: false,
        supersededAt: expect.any(Date),
        supersededById: replacementId,
      },
    });
    expect(tx.kycDocument.updateMany).toHaveBeenCalledWith({
      where: {
        id: replacementId,
        submissionId: 'submission-1',
        isActive: false,
        lifecycleState: 'ASSESSING',
      },
      data: expect.objectContaining({
        isActive: true,
        lifecycleState: 'READY',
      }),
    });
    expect(tx.kycSubmission.update).toHaveBeenCalledWith({
      where: { id: 'submission-1' },
      data: {
        status: 'DRAFT',
        failedAttempts: 0,
        lockedUntil: null,
      },
    });
    expect(tx.qualificationAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'KYC_DOCUMENT_SUPERSEDED',
        actorId: 'user-1',
        entityId: replacementId,
        metadata: {
          documentType: 'id-front',
          supersededDocumentId: 'old-id-front',
        },
      }),
    });
  });

  it('marks failed assessment cleanup durably and preserves the prior active evidence', async () => {
    prisma.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-1',
      fixerId: 'fixer-1',
      status: 'DRAFT',
      failedAttempts: 0,
      lockedUntil: null,
      fixer: { user: { name: 'Suppadesh Fungprasertsuk' } },
    });
    tx.kycDocument.create.mockImplementation(({ data }: any) => ({
      id: data.id,
      documentType: data.documentType,
      contentType: data.contentType,
      sizeBytes: data.sizeBytes,
      evidenceStatus: 'UNCHECKED',
      expiresAt: null,
      createdAt: new Date('2026-07-30T00:00:00.000Z'),
    }));
    assessment.assessDocument.mockRejectedValueOnce(
      new Error('assessment persistence failed'),
    );
    prisma.kycDocument.findUnique
      .mockResolvedValueOnce({
        id: 'staged-id-front',
        submissionId: 'submission-1',
        storageKey: 'opaque-storage-key',
        isActive: false,
        lifecycleState: 'ASSESSING',
      })
      .mockResolvedValueOnce({
        id: 'staged-id-front',
        submissionId: 'submission-1',
        storageKey: 'opaque-storage-key',
        isActive: false,
        lifecycleState: 'DELETE_PENDING',
      });

    await expect(
      service.uploadDocumentForUser('user-1', 'submission-1', 'id-front', {
        originalname: 'replacement.jpg',
        mimetype: 'image/jpeg',
        size: 4,
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0x02]),
      } as Express.Multer.File),
    ).rejects.toThrow('assessment persistence failed');

    expect(storage.deletePrivateObject).toHaveBeenCalledWith(
      'opaque-storage-key',
    );
    expect(prisma.kycDocument.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lifecycleState: 'DELETE_PENDING' }),
      }),
    );
    expect(prisma.kycDocument.deleteMany).not.toHaveBeenCalled();
    expect(tx.kycDocument.updateMany).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isActive: false }),
      }),
    );
  });
  it('does not call Spaces when durable document staging fails', async () => {
    prisma.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-1',
      fixerId: 'fixer-1',
      status: 'DRAFT',
      failedAttempts: 0,
      lockedUntil: null,
      fixer: { user: { name: 'Suppadesh Fungprasertsuk' } },
    });
    tx.kycDocument.create.mockRejectedValueOnce(
      new Error('document persistence failed'),
    );

    await expect(
      service.uploadDocumentForUser('user-1', 'submission-1', 'id-front', {
        originalname: 'replacement.jpg',
        mimetype: 'image/jpeg',
        size: 4,
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0x03]),
      } as Express.Multer.File),
    ).rejects.toThrow('document persistence failed');

    expect(storage.putPrivateObject).not.toHaveBeenCalled();
    expect(storage.deletePrivateObject).not.toHaveBeenCalled();
    expect(assessment.assessDocument).not.toHaveBeenCalled();
  });
  it('stores a size-limited portfolio PDF as private evidence', async () => {
    prisma.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-1',
      fixerId: 'fixer-1',
      status: 'DRAFT',
    });
    tx.kycDocument.create.mockImplementation(({ data }: any) => ({
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

  it('does not route a qualification submission without all three active READY KYC types', async () => {
    tx.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-1',
      status: 'DRAFT',
      documents: [
        {
          documentType: 'id-front',
          sizeBytes: 100,
          contentType: 'image/jpeg',
          isActive: true,
          lifecycleState: 'READY',
        },
        {
          documentType: 'id-back',
          sizeBytes: 100,
          contentType: 'image/jpeg',
          isActive: true,
          lifecycleState: 'READY',
        },
        {
          documentType: 'selfie-with-id',
          sizeBytes: 100,
          contentType: 'image/jpeg',
          isActive: true,
          lifecycleState: 'ASSESSING',
        },
      ],
    });

    await expect(
      service.submitForUser('user-1', 'submission-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(routing.routeSubmission).not.toHaveBeenCalled();
  });
  it('rejects submission before persistence when evidence storage is unavailable', async () => {
    readiness.assertReady.mockRejectedValueOnce(
      new ServiceUnavailableException(
        'Qualification evidence storage is unavailable',
      ),
    );

    await expect(
      service.submitForUser('user-1', 'submission-1'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(routing.routeSubmission).not.toHaveBeenCalled();
  });

  it('routes complete active KYC evidence without invoking tier evaluation', async () => {
    tx.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-1',
      status: 'DRAFT',
      documents: [
        {
          documentType: 'id-front',
          sizeBytes: 100,
          contentType: 'image/jpeg',
          isActive: true,
          lifecycleState: 'READY',
        },
        {
          documentType: 'id-back',
          sizeBytes: 100,
          contentType: 'image/jpeg',
          isActive: true,
          lifecycleState: 'READY',
        },
        {
          documentType: 'selfie-with-id',
          sizeBytes: 100,
          contentType: 'image/jpeg',
          isActive: true,
          lifecycleState: 'READY',
        },
        {
          documentType: 'portfolio',
          sizeBytes: 250 * 1024,
          contentType: 'image/jpeg',
          isActive: true,
          lifecycleState: 'READY',
        },
        {
          documentType: 'portfolio',
          sizeBytes: 200 * 1024,
          contentType: 'application/pdf',
          isActive: true,
          lifecycleState: 'READY',
        },
      ],
    });

    await expect(
      service.submitForUser('user-1', 'submission-1'),
    ).resolves.toEqual(expect.objectContaining({ status: 'NEEDS_REVIEW' }));
    expect(readiness.assertReady).toHaveBeenCalledTimes(1);
    expect(routing.routeSubmission).toHaveBeenCalledWith(
      'submission-1',
      'user-1',
    );
    expect(policy.evaluate).not.toHaveBeenCalled();
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
