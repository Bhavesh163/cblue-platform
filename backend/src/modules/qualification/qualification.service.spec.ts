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
    fixer: { findUnique: jest.fn() },
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
      create: jest.fn(),
    },
    qualificationAuditLog: { create: jest.fn() },
    qualificationDocumentAccess: { create: jest.fn() },
    qualificationEvidenceAssessmentJob: {
      create: jest.fn(),
      updateMany: jest.fn(),
      createMany: jest.fn(),
    },
    qualificationStorageCleanupIntent: {
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
    },
    $executeRawUnsafe: jest.fn(),
  } as any;
  const prisma = {
    fixer: { findUnique: jest.fn() },
    user: { findMany: jest.fn() },
    kycSubmission: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    kycDocument: {
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    qualificationEvidenceAssessmentJob: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    qualificationStorageCleanupIntent: {
      createMany: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    qualificationAuditLog: { create: jest.fn(), findMany: jest.fn() },
    qualificationEvaluation: { findFirst: jest.fn() },
    update: jest.fn(),
    qualificationDocumentAccess: { create: jest.fn() },
    update: jest.fn(),
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
    tx.fixer.findUnique.mockResolvedValue({ id: 'fixer-1' });
    tx.kycDocument.findFirst.mockResolvedValue(null);
    tx.kycDocument.findUnique.mockResolvedValue({
      id: 'document-1',
      isActive: false,
      lifecycleState: 'ASSESSING',
    });
    tx.kycDocument.count.mockResolvedValue(0);
    tx.kycDocument.updateMany.mockResolvedValue({ count: 1 });
    tx.kycSubmission.findUnique.mockResolvedValue({ status: 'DRAFT' });
    tx.qualificationStorageCleanupIntent.deleteMany.mockResolvedValue({
      count: 1,
    });
    tx.qualificationEvidenceAssessmentJob.createMany.mockResolvedValue({
      count: 0,
    });
    prisma.qualificationEvidenceAssessmentJob.create.mockResolvedValue({
      id: 'job-1',
    });
    tx.qualificationStorageCleanupIntent.updateMany.mockResolvedValue({
      count: 1,
    });
    prisma.kycDocument.deleteMany.mockResolvedValue({ count: 1 });
    prisma.kycDocument.findFirst.mockReset().mockResolvedValue(null);
    prisma.qualificationEvaluation.findFirst
      .mockReset()
      .mockResolvedValue(null);
    prisma.kycDocument.findUnique.mockResolvedValue(null);
    prisma.kycDocument.updateMany.mockResolvedValue({ count: 1 });
    prisma.qualificationStorageCleanupIntent.createMany.mockResolvedValue({
      count: 1,
    });
    prisma.qualificationStorageCleanupIntent.findUnique
      .mockReset()
      .mockImplementation(({ where }: any) => {
        if (!where.storageKey) return null;
        const reserved =
          prisma.qualificationStorageCleanupIntent.createMany.mock.calls.at(
            -1,
          )?.[0].data;
        return reserved
          ? {
              id: reserved.id,
              status: reserved.status,
              claimedBy: reserved.claimedBy ?? null,
            }
          : null;
      });
    prisma.qualificationStorageCleanupIntent.updateMany.mockResolvedValue({
      count: 1,
    });
    storage.putPrivateObject.mockReset().mockResolvedValue(undefined);
    storage.deletePrivateObject.mockReset().mockResolvedValue(undefined);
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
    tx.qualificationReviewTask.findFirst.mockResolvedValue({
      id: 'task-1',
      kind: 'TIER',
    });
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
        where: {
          id: 'document-1',
          submissionId: 'submission-1',
          isActive: true,
          lifecycleState: 'READY',
        },
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
  it('persists a protected manual ID review without auditing the full number', async () => {
    const previousSecret = process.env.QUALIFICATION_IDENTITY_HMAC_SECRET;
    process.env.QUALIFICATION_IDENTITY_HMAC_SECRET = 'test-identity-secret';
    tx.qualificationReviewTask.findFirst.mockResolvedValue({
      id: 'task-1',
      kind: 'KYC',
    });
    tx.kycDocument.findFirst.mockResolvedValue({
      id: 'document-front',
      documentType: 'id-front',
      checksumSha256: 'checksum',
      evidenceStatus: 'UNCHECKED',
      assessmentReasonCodes: ['PROVIDER_UNAVAILABLE'],
      identityNumberLast4: null,
      identityNumberHash: null,
      identityExpiryDate: null,
    });
    tx.kycDocument.update.mockImplementation(({ data }: any) => ({
      id: 'document-front',
      documentType: 'id-front',
      ...data,
    }));
    tx.qualificationAuditLog.create.mockResolvedValue({ id: 'audit-1' });

    try {
      await expect(
        service.reviewDocumentEvidence(
          'admin-1',
          'submission-1',
          'document-front',
          {
            evidenceStatus: 'VALIDATED',
            reason: 'Identity and expiry were checked against the document.',
            identityNumber: '1101700203450',
            identityExpiryDate: '2030-10-15',
            documentTypeConfirmed: true,
            documentReadable: true,
            applicantNameMatches: true,
            identityUnexpiredConfirmed: true,
          },
        ),
      ).resolves.toEqual(
        expect.objectContaining({
          evidenceStatus: 'VALIDATED',
          identityNumberLast4: '3450',
          identityExpiryDate: new Date('2030-10-15T23:59:59.999Z'),
        }),
      );
      expect(tx.kycDocument.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            identityNumberLast4: '3450',
            identityNumberHash: expect.stringMatching(/^[a-f0-9]{64}$/),
            assessmentReasonCodes: expect.arrayContaining([
              'ADMIN_DOCUMENT_TYPE_CONFIRMED',
              'ADMIN_READABILITY_CONFIRMED',
              'ADMIN_APPLICANT_NAME_CONFIRMED',
              'ADMIN_ID_UNEXPIRED_CONFIRMED',
            ]),
          }),
        }),
      );
      expect(
        JSON.stringify(tx.qualificationAuditLog.create.mock.calls.at(-1)),
      ).not.toContain('1101700203450');
    } finally {
      if (previousSecret === undefined)
        delete process.env.QUALIFICATION_IDENTITY_HMAC_SECRET;
      else process.env.QUALIFICATION_IDENTITY_HMAC_SECRET = previousSecret;
    }
  });

  it('does not infer identity expiry or checks from an administrator note', async () => {
    tx.qualificationReviewTask.findFirst.mockResolvedValue({
      id: 'task-1',
      kind: 'KYC',
    });
    tx.kycDocument.findFirst.mockResolvedValue({
      id: 'document-front',
      documentType: 'id-front',
      checksumSha256: 'checksum',
      evidenceStatus: 'UNCHECKED',
      assessmentReasonCodes: [],
      identityNumberLast4: null,
      identityNumberHash: null,
      identityExpiryDate: null,
    });

    await expect(
      service.reviewDocumentEvidence(
        'admin-1',
        'submission-1',
        'document-front',
        {
          evidenceStatus: 'VALIDATED',
          reason: 'ID card is valid and expires on 15 October 2030.',
        },
      ),
    ).rejects.toThrow(
      'Confirm document type, readability, applicant name, and unexpired status',
    );
    expect(tx.kycDocument.update).not.toHaveBeenCalled();
  });

  it.each([
    ['KYC', 'professional-certificate'],
    ['TIER', 'id-front'],
  ])('rejects %s review access to %s evidence', async (kind, documentType) => {
    tx.qualificationReviewTask.findFirst.mockResolvedValue({
      id: 'task-1',
      kind,
    });
    tx.kycDocument.findFirst.mockResolvedValue({
      id: 'document-1',
      documentType,
      checksumSha256: 'checksum',
      evidenceStatus: 'UNCHECKED',
    });

    await expect(
      service.reviewDocumentEvidence('admin-1', 'submission-1', 'document-1', {
        evidenceStatus: 'VALIDATED',
        reason: 'Evidence source and identity were verified.',
      }),
    ).rejects.toThrow(
      'Qualification evidence must be decided in its assigned review queue',
    );
    expect(tx.kycDocument.update).not.toHaveBeenCalled();
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
    prisma.user.findMany.mockResolvedValue([]);

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
    tx.fixer.findUnique.mockResolvedValue({ id: 'fixer-1' });
    tx.kycSubmission.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    tx.kycSubmission.create.mockResolvedValue({ id: 'submission-1' });

    await expect(
      service.createSubmissionForUser('user-1', 'pdpa-v1'),
    ).resolves.toEqual({ id: 'submission-1' });
    expect(tx.kycSubmission.create).toHaveBeenCalledWith(
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
      publicDisplayName: 'Example Company Limited',
      verifiedCompanyName: 'Example Company Limited',
      companyIdentityVerifiedAt: updatedAt,
      aiScore: 78,
      aiTier: 'STANDARD',
      aiCredentialStatus: 'verified',
      updatedAt,
      qualificationSubmissions: [
        {
          id: 'submission-1',
          version: 2,
          status: 'APPROVED',
          policyVersion: 'cblue-fixer-qualification-v2',
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
          policyVersion: 'cblue-fixer-qualification-v2',
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
        sourceVersion: 'cblue-fixer-qualification-v5',
        fixer: expect.objectContaining({
          id: 'fixer-1',
          tier: 'STANDARD',
          status: 'APPROVED',
          publicDisplayName: 'Example Company Limited',
          verifiedCompanyName: 'Example Company Limited',
          companyIdentityVerifiedAt: updatedAt,
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
    tx.fixer.findUnique.mockResolvedValue(null);
    await expect(
      service.createSubmissionForUser('user-unknown', 'pdpa-v1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('prevents upload when the independent cleanup intent cannot be persisted', async () => {
    prisma.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-1',
      fixerId: 'fixer-1',
      status: 'DRAFT',
      failedAttempts: 0,
      lockedUntil: null,
      fixer: { user: { name: 'Registered Name' } },
    });
    prisma.qualificationStorageCleanupIntent.createMany.mockRejectedValueOnce(
      new Error('intent database unavailable'),
    );
    prisma.qualificationStorageCleanupIntent.findUnique.mockResolvedValueOnce(
      null,
    );

    await expect(
      service.uploadDocumentForUser('user-1', 'submission-1', 'id-front', {
        originalname: 'identity.jpg',
        mimetype: 'image/jpeg',
        size: 4,
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0x0f]),
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(storage.putPrivateObject).not.toHaveBeenCalled();
    expect(tx.kycDocument.create).not.toHaveBeenCalled();
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
    expect(
      prisma.qualificationStorageCleanupIntent.createMany,
    ).toHaveBeenCalledWith({
      data: {
        id: expect.any(String),
        storageKey: tx.kycDocument.create.mock.calls[0][0].data.storageKey,
        status: 'PENDING',
        nextAttemptAt: expect.any(Date),
        claimedAt: expect.any(Date),
        claimedBy: expect.any(String),
      },
      skipDuplicates: true,
    });
    expect(
      prisma.qualificationStorageCleanupIntent.createMany.mock
        .invocationCallOrder[0],
    ).toBeLessThan(storage.putPrivateObject.mock.invocationCallOrder[0]);
    expect(
      tx.qualificationStorageCleanupIntent.deleteMany,
    ).toHaveBeenCalledWith({
      where: expect.objectContaining({
        storageKey: tx.kycDocument.create.mock.calls[0][0].data.storageKey,
        status: 'PENDING',
      }),
    });
    expect(
      tx.kycDocument.updateMany.mock.invocationCallOrder.at(-1),
    ).toBeLessThan(
      tx.qualificationStorageCleanupIntent.deleteMany.mock
        .invocationCallOrder[0],
    );

    const reserved =
      prisma.qualificationStorageCleanupIntent.createMany.mock.calls[0][0].data;
    prisma.qualificationStorageCleanupIntent.findUnique.mockResolvedValue(null);
    await expect(
      service.retryStorageCleanupIntent(reserved.id, 'late-worker'),
    ).resolves.toEqual({ cleaned: false, status: 'MISSING' });
    expect(storage.deletePrivateObject).not.toHaveBeenCalled();
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
    prisma.qualificationStorageCleanupIntent.findUnique.mockImplementation(
      ({ where }: any) => {
        const reserved =
          prisma.qualificationStorageCleanupIntent.createMany.mock.calls[0][0]
            .data;
        if (where.storageKey) {
          return {
            id: reserved.id,
            status: 'PENDING',
            claimedBy: reserved.claimedBy,
          };
        }
        const latestClaim =
          prisma.qualificationStorageCleanupIntent.updateMany.mock.calls.at(
            -1,
          )?.[0].data.claimedBy;
        return {
          ...reserved,
          attempts: 0,
          claimedBy: latestClaim ?? null,
        };
      },
    );

    await expect(
      service.uploadDocumentForUser('user-1', 'submission-1', 'id-front', {
        originalname: 'private-name.jpg',
        mimetype: 'image/jpeg',
        size: 4,
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0x11]),
      } as Express.Multer.File),
    ).rejects.toMatchObject({
      response: {
        code: 'OBJECT_UPLOAD_FAILED',
      },
    });

    expect(prisma.kycDocument.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: false }),
        data: expect.objectContaining({
          lifecycleState: 'FAILED',
          cleanupErrorCode: expect.any(String),
        }),
      }),
    );
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

  it('returns a persisted director authorization letter when promotion acknowledgement is lost', async () => {
    prisma.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-1',
      fixerId: 'fixer-1',
      status: 'DRAFT',
      failedAttempts: 0,
      lockedUntil: null,
      fixer: {
        verified: false,
        kycReverificationReasons: [],
        user: { name: 'Registered Name', company: 'Annova Company Limited' },
      },
    });
    tx.kycDocument.findUnique.mockResolvedValue({
      id: 'director-letter-document',
      isActive: false,
      lifecycleState: 'UPLOADED',
    });
    tx.kycDocument.create.mockImplementation(({ data }: any) => ({
      id: data.id,
      documentType: data.documentType,
      contentType: data.contentType,
      sizeBytes: data.sizeBytes,
      evidenceStatus: 'UNCHECKED',
      expiresAt: null,
      createdAt: new Date('2026-08-13T00:00:00.000Z'),
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
      id: 'director-letter-document',
      submissionId: 'submission-1',
      storageKey: 'opaque-key',
      isActive: true,
      lifecycleState: 'READY',
    });

    await expect(
      service.uploadDocumentForUser(
        'user-1',
        'submission-1',
        'company-letter-of-intent',
        {
          originalname: 'director-authorization.pdf',
          mimetype: 'application/pdf',
          size: 8,
          buffer: Buffer.from('%PDF-1.7'),
        } as Express.Multer.File,
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        documentType: 'company-letter-of-intent',
        assessment: null,
        assessmentPending: true,
      }),
    );

    expect(assessment.assessDocument).not.toHaveBeenCalled();
    expect(storage.deletePrivateObject).not.toHaveBeenCalled();
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
      (callback: (client: any) => unknown) => {
        transactionCall += 1;
        if (transactionCall === 2) {
          throw new Error('promotion failed before commit');
        }
        return callback(tx);
      },
    );
    prisma.kycDocument.findUnique.mockResolvedValue(null);
    prisma.kycDocument.findFirst.mockResolvedValue(null);
    prisma.qualificationStorageCleanupIntent.findUnique.mockImplementation(
      ({ where }: any) => {
        const reserved =
          prisma.qualificationStorageCleanupIntent.createMany.mock.calls[0][0]
            .data;
        if (where.storageKey) {
          return {
            id: reserved.id,
            status: 'PENDING',
            claimedBy: reserved.claimedBy,
          };
        }
        return {
          ...reserved,
          attempts: 0,
          claimedBy:
            prisma.qualificationStorageCleanupIntent.updateMany.mock.calls.at(
              -1,
            )?.[0].data.claimedBy ?? null,
        };
      },
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
    ).rejects.toMatchObject({
      response: {
        code: 'DOCUMENT_PROMOTION_FAILED',
      },
    });

    const staged = tx.kycDocument.create.mock.calls[0][0].data;
    expect(prisma.kycDocument.findFirst).toHaveBeenCalledWith({
      where: {
        storageKey: staged.storageKey,
        isActive: true,
        lifecycleState: 'READY',
      },
      select: { id: true },
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
        claimedAt: expect.any(Date),
        claimedBy: expect.any(String),
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
    await expect(
      service.ensureStorageCleanupIntent(
        'qualification/private/passport-owner.jpg',
        'cleanup-duplicate',
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
    expect(
      prisma.qualificationStorageCleanupIntent.createMany,
    ).toHaveBeenCalledTimes(2);
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

  it('recovers a stale reservation after a crash before upload and deletes idempotently', async () => {
    await service.ensureStorageCleanupIntent(
      'qualification/private/opaque-key',
      'cleanup-success',
      'upload-reservation',
    );
    expect(
      prisma.qualificationStorageCleanupIntent.createMany,
    ).toHaveBeenCalledWith({
      data: {
        id: 'cleanup-success',
        storageKey: 'qualification/private/opaque-key',
        status: 'PENDING',
        nextAttemptAt: expect.any(Date),
        claimedAt: expect.any(Date),
        claimedBy: 'upload-reservation',
      },
      skipDuplicates: true,
    });
    prisma.qualificationStorageCleanupIntent.findUnique.mockReset();
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
    tx.kycDocument.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      service.retryStorageCleanupIntent('cleanup-success', 'worker-1'),
    ).resolves.toEqual({ cleaned: true, status: 'COMPLETED' });
    await expect(
      service.retryStorageCleanupIntent('cleanup-success', 'worker-1'),
    ).resolves.toEqual({ cleaned: true, status: 'COMPLETED' });

    expect(storage.deletePrivateObject).toHaveBeenCalledTimes(1);
    expect(
      tx.qualificationStorageCleanupIntent.updateMany,
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

  it('retries atomic document and intent finalization after post-delete database failure', async () => {
    const storageKey = 'qualification/private/stale-checksum-key';
    let documentLifecycle = 'ASSESSING';
    const liveDuplicateStates = new Set([
      'PENDING_UPLOAD',
      'UPLOADED',
      'ASSESSING',
      'READY',
    ]);
    const sameChecksumUploadIsBlocked = () =>
      liveDuplicateStates.has(documentLifecycle);

    prisma.qualificationStorageCleanupIntent.findUnique
      .mockResolvedValueOnce({
        id: 'cleanup-atomic',
        storageKey,
        status: 'PENDING',
        attempts: 0,
        claimedBy: 'worker-1',
      })
      .mockResolvedValueOnce({
        id: 'cleanup-atomic',
        storageKey,
        status: 'PENDING',
        attempts: 0,
        claimedBy: 'worker-2',
      });
    prisma.kycDocument.findFirst.mockResolvedValue(null);
    tx.kycDocument.updateMany
      .mockRejectedValueOnce(new Error('document terminalization failed'))
      .mockImplementationOnce(({ data }: any) => {
        documentLifecycle = data.lifecycleState;
        return { count: 1 };
      });

    await expect(
      service.retryStorageCleanupIntent('cleanup-atomic', 'worker-1'),
    ).resolves.toEqual({ cleaned: false, status: 'PENDING' });

    expect(storage.deletePrivateObject).toHaveBeenCalledTimes(1);
    expect(storage.deletePrivateObject).toHaveBeenLastCalledWith(storageKey);
    expect(sameChecksumUploadIsBlocked()).toBe(true);
    expect(
      tx.qualificationStorageCleanupIntent.updateMany,
    ).not.toHaveBeenCalled();

    await expect(
      service.retryStorageCleanupIntent('cleanup-atomic', 'worker-2'),
    ).resolves.toEqual({ cleaned: true, status: 'COMPLETED' });

    expect(storage.deletePrivateObject).toHaveBeenCalledTimes(2);
    expect(storage.deletePrivateObject).toHaveBeenLastCalledWith(storageKey);
    expect(sameChecksumUploadIsBlocked()).toBe(false);
    expect(tx.kycDocument.updateMany).toHaveBeenLastCalledWith({
      where: {
        storageKey,
        isActive: false,
        lifecycleState: { not: 'READY' },
      },
      data: expect.objectContaining({
        lifecycleState: 'FAILED',
        objectDeletedAt: expect.any(Date),
      }),
    });
    expect(
      tx.qualificationStorageCleanupIntent.updateMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'cleanup-atomic',
          status: 'PENDING',
          claimedBy: 'worker-2',
        },
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }),
    );
  });

  it('does not delete an object when worker cleanup races authoritative ownership', async () => {
    prisma.qualificationStorageCleanupIntent.findUnique.mockResolvedValue({
      id: 'cleanup-owned',
      storageKey: 'qualification/private/owned-key',
      status: 'PENDING',
      attempts: 0,
      claimedBy: 'worker-1',
    });
    prisma.kycDocument.findFirst.mockResolvedValue({
      id: 'active-ready-document',
    });

    await expect(
      service.retryStorageCleanupIntent('cleanup-owned', 'worker-1'),
    ).resolves.toEqual({ cleaned: true, status: 'COMPLETED' });

    expect(prisma.kycDocument.findFirst).toHaveBeenCalledWith({
      where: {
        storageKey: 'qualification/private/owned-key',
        isActive: true,
        lifecycleState: 'READY',
      },
      select: { id: true },
    });
    expect(storage.deletePrivateObject).not.toHaveBeenCalled();
    expect(
      prisma.qualificationStorageCleanupIntent.updateMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }),
    );
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

  it('returns an idempotent snapshot when the same evidence file is retried', async () => {
    prisma.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-1',
      fixerId: 'fixer-1',
      status: 'DRAFT',
      failedAttempts: 0,
      lockedUntil: null,
      fixer: { user: { name: 'Suppadesh Fungprasertsuk', company: null } },
    });
    prisma.kycDocument.findFirst.mockResolvedValue({
      id: 'document-existing',
      documentType: 'id-front',
      contentType: 'image/jpeg',
      sizeBytes: 4,
      evidenceStatus: 'INSUFFICIENT',
      assessmentReasonCodes: ['DOCUMENT_VALID', 'HUMAN_REVIEW_REQUIRED'],
      extractedFields: null,
      assessedAt: new Date('2026-07-30T00:00:00.000Z'),
      extractionProvider: 'TYPHOON_OCR',
      extractionModel: 'typhoon-model',
      createdAt: new Date('2026-07-30T00:00:00.000Z'),
      lifecycleState: 'READY',
    });
    prisma.qualificationEvaluation.findFirst.mockResolvedValue({
      confidence: 96,
      output: {
        route: 'NEEDS_REVIEW',
        reasonCodes: ['DOCUMENT_VALID', 'HUMAN_REVIEW_REQUIRED'],
      },
    });

    await expect(
      service.uploadDocumentForUser('user-1', 'submission-1', 'id-front', {
        originalname: 'identity.jpg',
        mimetype: 'image/jpeg',
        size: 4,
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
      } as Express.Multer.File),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'document-existing',
        idempotentReplay: true,
        assessment: expect.objectContaining({ route: 'NEEDS_REVIEW' }),
      }),
    );
    expect(storage.putPrivateObject).not.toHaveBeenCalled();
    expect(assessment.assessDocument).not.toHaveBeenCalled();
  });

  it('reports an in-progress conflict instead of succeeding for a nonterminal replay', async () => {
    prisma.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-1',
      fixerId: 'fixer-1',
      status: 'DRAFT',
      failedAttempts: 0,
      lockedUntil: null,
      fixer: { user: { name: 'Suppadesh Fungprasertsuk', company: null } },
    });
    prisma.kycDocument.findFirst.mockResolvedValue({
      id: 'document-uploading',
      documentType: 'id-front',
      contentType: 'image/jpeg',
      sizeBytes: 4,
      evidenceStatus: 'UNCHECKED',
      assessmentReasonCodes: [],
      extractedFields: null,
      assessedAt: null,
      extractionProvider: null,
      extractionModel: null,
      createdAt: new Date('2026-07-30T00:00:00.000Z'),
      lifecycleState: 'ASSESSING',
    });

    const promise = service.uploadDocumentForUser(
      'user-1',
      'submission-1',
      'id-front',
      {
        originalname: 'identity.jpg',
        mimetype: 'image/jpeg',
        size: 4,
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
      } as Express.Multer.File,
    );

    await expect(promise).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'EVIDENCE_UPLOAD_IN_PROGRESS',
      }),
    });
    expect(prisma.qualificationEvaluation.findFirst).not.toHaveBeenCalled();
    expect(storage.putPrivateObject).not.toHaveBeenCalled();
  });

  it('retains failed KYC evidence for audit without activating it', async () => {
    prisma.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-1',
      fixerId: 'fixer-1',
      status: 'DRAFT',
      failedAttempts: 0,
      lockedUntil: null,
      fixer: { user: { name: 'Suppadesh Fungprasertsuk', company: null } },
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
    assessment.assessDocument.mockResolvedValueOnce({
      evidenceStatus: 'REJECTED',
      route: 'NEEDS_RESUBMISSION',
      confidence: 98,
      identityConfidence: null,
      documentAuthenticityConfidence: 2,
      faceMatchConfidence: null,
      livenessConfidence: null,
      reasonCodes: ['WRONG_DOCUMENT_TYPE'],
      provider: 'TYPHOON_OCR',
      model: 'typhoon-model',
      assessedAt: new Date('2026-07-30T00:00:00.000Z'),
    });

    const result = await service.uploadDocumentForUser(
      'user-1',
      'submission-1',
      'id-front',
      {
        originalname: 'scenery.jpg',
        mimetype: 'image/jpeg',
        size: 4,
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0x22]),
      } as Express.Multer.File,
    );
    const rejectedDocumentId = tx.kycDocument.create.mock.calls[0][0].data.id;

    expect(result.assessment).toEqual(
      expect.objectContaining({ route: 'NEEDS_RESUBMISSION' }),
    );
    expect(tx.kycDocument.updateMany).toHaveBeenCalledWith({
      where: {
        id: rejectedDocumentId,
        submissionId: 'submission-1',
        isActive: false,
        lifecycleState: 'ASSESSING',
      },
      data: expect.objectContaining({
        isActive: false,
        lifecycleState: 'READY',
      }),
    });
    expect(tx.qualificationAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'KYC_EVIDENCE_REJECTED_ON_UPLOAD',
        entityId: rejectedDocumentId,
        metadata: {
          documentType: 'id-front',
          reasonCodes: ['WRONG_DOCUMENT_TYPE'],
        },
      }),
    });
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
    prisma.kycDocument.findUnique.mockResolvedValue({
      id: 'staged-id-front',
      submissionId: 'submission-1',
      storageKey: 'opaque-storage-key',
      isActive: false,
      lifecycleState: 'ASSESSING',
    });
    prisma.qualificationStorageCleanupIntent.findUnique.mockImplementation(
      ({ where }: any) => {
        const reserved =
          prisma.qualificationStorageCleanupIntent.createMany.mock.calls[0][0]
            .data;
        if (where.storageKey) {
          return {
            id: reserved.id,
            status: 'PENDING',
            claimedBy: reserved.claimedBy,
          };
        }
        return {
          ...reserved,
          attempts: 0,
          claimedBy:
            prisma.qualificationStorageCleanupIntent.updateMany.mock.calls.at(
              -1,
            )?.[0].data.claimedBy ?? null,
        };
      },
    );

    await expect(
      service.uploadDocumentForUser('user-1', 'submission-1', 'id-front', {
        originalname: 'replacement.jpg',
        mimetype: 'image/jpeg',
        size: 4,
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0x02]),
      } as Express.Multer.File),
    ).rejects.toMatchObject({
      response: {
        code: 'DOCUMENT_ASSESSMENT_FAILED',
      },
    });

    const reserved =
      prisma.qualificationStorageCleanupIntent.createMany.mock.calls[0][0].data;
    expect(storage.putPrivateObject).toHaveBeenCalledWith(
      expect.objectContaining({ key: reserved.storageKey }),
    );
    expect(storage.deletePrivateObject).toHaveBeenCalledWith(
      reserved.storageKey,
    );
    expect(prisma.kycDocument.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lifecycleState: 'FAILED' }),
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
    ).rejects.toMatchObject({
      response: {
        code: 'DOCUMENT_STAGE_FAILED',
      },
    });

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
    tx.kycDocument.findUnique.mockResolvedValue({
      id: 'portfolio-pdf-1',
      isActive: false,
      lifecycleState: 'UPLOADED',
    });
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

  it.each(['id-front', 'selfie-with-id'])(
    'rejects %s evidence above 0.3 MB before private storage',
    async (documentType) => {
      const body = Buffer.concat([
        Buffer.from([0xff, 0xd8, 0xff]),
        Buffer.alloc(300 * 1024),
      ]);
      await expect(
        service.uploadDocumentForUser('user-1', 'submission-1', documentType, {
          originalname: `large-${documentType}.jpg`,
          mimetype: 'image/jpeg',
          size: body.length,
          buffer: body,
        } as Express.Multer.File),
      ).rejects.toThrow(
        'KYC evidence exceeds 0.3 MB; compress it before upload',
      );
      expect(storage.putPrivateObject).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['company-affidavit', 700 * 1024],
    ['company-letter-of-intent', 250 * 1024],
  ] as const)(
    'accepts and supersedes readable %s evidence within its limit',
    async (documentType, fileSize) => {
      prisma.kycSubmission.findFirst.mockResolvedValue({
        id: 'submission-1',
        fixerId: 'fixer-1',
        status: 'DRAFT',
        failedAttempts: 0,
        lockedUntil: null,
        fixer: {
          verified: false,
          verifiedCompanyName: null,
          qualificationEligibilityStatus: 'PENDING',
          kycReverificationReasons: null,
          user: {
            name: 'Suppadesh Fungprasertsuk',
            company: 'Construction Blue Co., Ltd.',
          },
        },
      });
      tx.kycDocument.count.mockResolvedValue(0);
      tx.kycDocument.findFirst.mockImplementation(({ where }: any) =>
        where.checksumSha256
          ? null
          : {
              id: `old-${documentType}`,
              documentType,
              isActive: true,
              lifecycleState: 'READY',
            },
      );
      tx.kycDocument.create.mockImplementation(({ data }: any) => ({
        id: data.id,
        documentType: data.documentType,
        contentType: data.contentType,
        sizeBytes: data.sizeBytes,
        evidenceStatus: 'UNCHECKED',
        expiresAt: null,
        createdAt: new Date('2026-08-12T00:00:00.000Z'),
      }));
      tx.kycDocument.findUnique.mockResolvedValue({
        id: 'replacement-company-evidence',
        isActive: false,
        lifecycleState: 'UPLOADED',
      });

      const body = Buffer.concat([
        Buffer.from('%PDF-1.4\\n'),
        Buffer.alloc(fileSize),
      ]);
      await expect(
        service.uploadDocumentForUser('user-1', 'submission-1', documentType, {
          originalname: `${documentType}.pdf`,
          mimetype: 'application/pdf',
          size: body.length,
          buffer: body,
        } as Express.Multer.File),
      ).resolves.toEqual(expect.objectContaining({ id: expect.any(String) }));

      const replacementId = tx.kycDocument.create.mock.calls.at(-1)[0].data.id;
      expect(tx.kycDocument.updateMany).toHaveBeenCalledWith({
        where: {
          id: `old-${documentType}`,
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
    },
  );

  it.each(['company-letter-of-intent'])(
    'rejects %s evidence above 0.3 MB before private storage',
    async (documentType) => {
      const body = Buffer.concat([
        Buffer.from('%PDF-1.4\n'),
        Buffer.alloc(300 * 1024),
      ]);
      await expect(
        service.uploadDocumentForUser('user-1', 'submission-1', documentType, {
          originalname: `large-${documentType}.pdf`,
          mimetype: 'application/pdf',
          size: body.length,
          buffer: body,
        } as Express.Multer.File),
      ).rejects.toThrow(
        'Company letter of intent exceeds 0.3 MB; compress it before upload',
      );
      expect(storage.putPrivateObject).not.toHaveBeenCalled();
    },
  );

  it('rejects a company affidavit above 1 MB before private storage', async () => {
    const body = Buffer.concat([
      Buffer.from('%PDF-1.4\n'),
      Buffer.alloc(1024 * 1024),
    ]);
    await expect(
      service.uploadDocumentForUser(
        'user-1',
        'submission-1',
        'company-affidavit',
        {
          originalname: 'oversized-company-affidavit.pdf',
          mimetype: 'application/pdf',
          size: body.length,
          buffer: body,
        } as Express.Multer.File,
      ),
    ).rejects.toThrow('Company affidavit exceeds 1 MB');
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

  it('does not route a qualification submission without both active READY KYC types', async () => {
    tx.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-1',
      status: 'DRAFT',
      fixer: { verifiedCompanyName: null },
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
      fixer: { verifiedCompanyName: null },
      documents: [
        {
          id: 'id-front-document',
          documentType: 'id-front',
          sizeBytes: 100,
          contentType: 'image/jpeg',
          isActive: true,
          lifecycleState: 'READY',
        },
        {
          id: 'id-back-document',
          documentType: 'id-back',
          sizeBytes: 100,
          contentType: 'image/jpeg',
          isActive: true,
          lifecycleState: 'READY',
        },
        {
          id: 'selfie-document',
          documentType: 'selfie-with-id',
          sizeBytes: 100,
          contentType: 'image/jpeg',
          isActive: true,
          lifecycleState: 'READY',
        },
        {
          id: 'portfolio-image-document',
          documentType: 'portfolio',
          sizeBytes: 250 * 1024,
          contentType: 'image/jpeg',
          isActive: true,
          lifecycleState: 'READY',
        },
        {
          id: 'portfolio-pdf-document',
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
    expect(
      tx.qualificationEvidenceAssessmentJob.createMany,
    ).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          documentId: 'portfolio-image-document',
          submissionId: 'submission-1',
          status: 'QUEUED',
          eligibleAt: expect.any(Date),
        }),
        expect.objectContaining({
          documentId: 'portfolio-pdf-document',
          submissionId: 'submission-1',
          status: 'QUEUED',
          eligibleAt: expect.any(Date),
        }),
      ],
      skipDuplicates: true,
    });
  });

  it('queues both company documents atomically when the applicant submits', async () => {
    tx.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-1',
      status: 'DRAFT',
      fixer: { verifiedCompanyName: null },
      documents: [
        {
          id: 'id-front-document',
          documentType: 'id-front',
          sizeBytes: 100,
          contentType: 'image/jpeg',
          isActive: true,
          lifecycleState: 'READY',
        },
        {
          id: 'selfie-document',
          documentType: 'selfie-with-id',
          sizeBytes: 100,
          contentType: 'image/jpeg',
          isActive: true,
          lifecycleState: 'READY',
        },
        {
          id: 'company-affidavit-document',
          documentType: 'company-affidavit',
          sizeBytes: 608 * 1024,
          contentType: 'application/pdf',
          isActive: true,
          lifecycleState: 'READY',
        },
        {
          id: 'company-letter-document',
          documentType: 'company-letter-of-intent',
          sizeBytes: 22 * 1024,
          contentType: 'application/pdf',
          isActive: true,
          lifecycleState: 'READY',
        },
      ],
    });

    await expect(
      service.submitForUser('user-1', 'submission-1'),
    ).resolves.toEqual(expect.objectContaining({ status: 'NEEDS_REVIEW' }));

    expect(
      tx.qualificationEvidenceAssessmentJob.createMany,
    ).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          documentId: 'company-affidavit-document',
          submissionId: 'submission-1',
          status: 'QUEUED',
          eligibleAt: expect.any(Date),
        }),
        expect.objectContaining({
          documentId: 'company-letter-document',
          submissionId: 'submission-1',
          status: 'QUEUED',
          eligibleAt: expect.any(Date),
        }),
      ],
      skipDuplicates: true,
    });
    expect(
      tx.qualificationEvidenceAssessmentJob.updateMany,
    ).toHaveBeenCalledWith({
      where: {
        submissionId: 'submission-1',
        status: 'QUEUED',
        eligibleAt: null,
      },
      data: {
        eligibleAt: expect.any(Date),
        nextAttemptAt: expect.any(Date),
      },
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
  it('creates an audited compliance retrieval URL with an optional legal hold', async () => {
    prisma.kycDocument.findFirst.mockResolvedValue({
      id: 'document-1',
      storageKey: 'qualification/fixer-1/submission-1/document-1',
      documentType: 'id-front',
    });
    storage.createReadUrl.mockResolvedValue(
      'https://private.example/compliance',
    );

    await expect(
      service.createComplianceDocumentUrl(
        'admin-1',
        'submission-1',
        'document-1',
        {
          purpose: 'Regulator request for identity evidence',
          caseReference: 'REG-2026-001',
          legalHold: true,
          legalHoldUntil: '2027-01-01T00:00:00.000Z',
        },
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        documentId: 'document-1',
        documentType: 'id-front',
        expiresInSeconds: 300,
        url: 'https://private.example/compliance',
      }),
    );
    expect(tx.qualificationDocumentAccess.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        submissionId: 'submission-1',
        actorId: 'admin-1',
        purpose: 'Regulator request for identity evidence',
        caseReference: 'REG-2026-001',
        legalHoldUntil: expect.any(Date),
      }),
    });
  });

  it('atomically promotes draft portfolio evidence for assessment at submit', async () => {
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
    tx.qualificationEvidenceAssessmentJob.create.mockResolvedValue({
      id: 'job-1',
    });
    tx.kycDocument.findUnique.mockResolvedValue({
      id: 'document-1',
      isActive: false,
      lifecycleState: 'UPLOADED',
    });

    await expect(
      service.uploadDocumentForUser('user-1', 'submission-1', 'portfolio', {
        originalname: 'portfolio.pdf',
        mimetype: 'application/pdf',
        size: 4,
        buffer: Buffer.from('%PDF-1.7'),
      } as Express.Multer.File),
    ).resolves.toEqual(expect.objectContaining({ assessmentPending: true }));

    expect(tx.qualificationEvidenceAssessmentJob.create).not.toHaveBeenCalled();
    expect(tx.qualificationStorageCleanupIntent.deleteMany).toHaveBeenCalled();
    expect(tx.qualificationAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'EVIDENCE_STAGED_FOR_SUBMISSION',
        entityType: 'KycDocument',
      }),
    });
  });

  it("resumes only the authenticated fixer's latest editable draft", async () => {
    tx.fixer.findUnique.mockResolvedValue({ id: 'fixer-1' });
    tx.kycSubmission.findFirst.mockResolvedValue({
      id: 'draft-1',
      version: 3,
      policyVersion: 'cblue-fixer-qualification-v5',
      status: 'DRAFT',
    });

    await expect(
      service.createOrResumeDraftForUser('user-1', 'pdpa-v2'),
    ).resolves.toEqual(
      expect.objectContaining({ id: 'draft-1', status: 'DRAFT' }),
    );
    expect(tx.kycSubmission.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { fixerId: 'fixer-1', status: 'DRAFT' },
        orderBy: { version: 'desc' },
        include: expect.objectContaining({ documents: expect.any(Object) }),
      }),
    );
    expect(prisma.kycSubmission.create).not.toHaveBeenCalled();
  });

  it('preserves resumable KYC evidence when upgrading a draft policy version', async () => {
    tx.fixer.findUnique.mockResolvedValue({ id: 'fixer-1' });
    tx.kycSubmission.findFirst.mockResolvedValue({
      id: 'draft-1',
      version: 3,
      policyVersion: 'cblue-fixer-qualification-v4',
      status: 'DRAFT',
      fixer: { verifiedCompanyName: null },
      documents: [{ id: 'document-1', documentType: 'id-front' }],
    });
    tx.kycSubmission.update.mockResolvedValue({
      id: 'draft-1',
      version: 3,
      policyVersion: 'cblue-fixer-qualification-v5',
      status: 'DRAFT',
      fixer: { verifiedCompanyName: null },
      documents: [{ id: 'document-1', documentType: 'id-front' }],
    });

    await expect(
      service.createOrResumeDraftForUser('user-1', 'pdpa-v2'),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'draft-1',
        documents: [
          expect.objectContaining({
            id: 'document-1',
            documentType: 'id-front',
          }),
        ],
      }),
    );
    expect(tx.kycSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'draft-1' },
        include: expect.objectContaining({
          documents: expect.objectContaining({
            where: expect.objectContaining({ isActive: true }),
          }),
        }),
      }),
    );
  });

  it('requires active ready evidence for ordinary admin review links', async () => {
    prisma.kycDocument.findFirst.mockResolvedValue({
      id: 'document-1',
      storageKey: 'qualification/fixer-1/submission-1/document-1',
      documentType: 'id-front',
    });
    storage.createReadUrl.mockResolvedValue('https://private.example/document');

    await service.createAdminDocumentUrl(
      'admin-1',
      'submission-1',
      'document-1',
    );

    expect(prisma.kycDocument.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          lifecycleState: 'READY',
        }),
      }),
    );
  });
  it('returns the persisted administrator identity for audit events', async () => {
    const createdAt = new Date('2026-08-03T12:00:00.000Z');
    prisma.qualificationAuditLog.findMany.mockResolvedValue([
      {
        id: 'audit-1',
        submissionId: 'submission-1',
        actorId: 'admin-1',
        action: 'KYC_APPROVED',
        entityType: 'TierQualification',
        entityId: 'qualification-1',
        reason: 'Identity evidence approved',
        beforeHash: null,
        afterHash: null,
        createdAt,
      },
    ]);
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'admin-1',
        name: 'Admin Reviewer',
        email: 'admin@example.com',
      },
    ]);

    await expect(service.listAdminAuditLogs()).resolves.toEqual([
      expect.objectContaining({
        id: 'audit-1',
        actor: {
          id: 'admin-1',
          name: 'Admin Reviewer',
          email: 'admin@example.com',
        },
      }),
    ]);
  });
});
