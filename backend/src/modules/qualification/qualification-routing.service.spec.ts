import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QualificationRoutingService } from './qualification-routing.service';

describe('QualificationRoutingService', () => {
  const tx = {
    kycSubmission: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    qualificationEvaluation: {
      findMany: jest.fn(),
    },
    qualificationReviewTask: {
      findFirst: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
    },
    qualificationAuditLog: {
      create: jest.fn(),
    },
    $executeRawUnsafe: jest.fn(),
  } as any;
  const prisma = {
    $transaction: jest.fn((callback: (client: any) => unknown) => callback(tx)),
  } as any;
  const service = new QualificationRoutingService(prisma);

  const requiredDocuments = (reasonCodes: string[] = ['DOCUMENT_VALID']) => [
    {
      id: 'id-front',
      documentType: 'id-front',
      checksumSha256: 'front-checksum',
      assessedAt: new Date('2026-07-30T00:00:00.000Z'),
      assessmentReasonCodes: reasonCodes,
    },
    {
      id: 'id-back',
      documentType: 'id-back',
      checksumSha256: 'back-checksum',
      assessedAt: new Date('2026-07-30T00:00:00.000Z'),
      assessmentReasonCodes: ['DOCUMENT_VALID'],
    },
    {
      id: 'selfie',
      documentType: 'selfie-with-id',
      checksumSha256: 'selfie-checksum',
      assessedAt: new Date('2026-07-30T00:00:00.000Z'),
      assessmentReasonCodes: ['DOCUMENT_VALID'],
    },
  ];

  const evaluations = (
    confidences: [number | null, number | null, number | null],
  ) =>
    ['front', 'back', 'selfie'].map((slot, index) => ({
      inputHash: `${slot}-checksum`,
      confidence: confidences[index],
      createdAt: new Date(`2026-07-30T00:00:0${index}.000Z`),
    }));

  beforeEach(() => {
    jest.clearAllMocks();
    tx.qualificationReviewTask.findFirst.mockReset();
    tx.$executeRawUnsafe.mockResolvedValue(0);
    tx.kycSubmission.findUnique.mockResolvedValue({
      id: 'submission-1',
      status: 'DRAFT',
      failedAttempts: 0,
      lockedUntil: null,
      documents: requiredDocuments(),
    });
    tx.qualificationEvaluation.findMany.mockResolvedValue(
      evaluations([90, 95, 98]),
    );
    tx.kycSubmission.update.mockResolvedValue({ id: 'submission-1' });
    tx.qualificationReviewTask.findFirst.mockResolvedValue(null);
    tx.qualificationReviewTask.create.mockResolvedValue({ id: 'review-1' });
    tx.qualificationReviewTask.createMany.mockResolvedValue({ count: 1 });
    tx.qualificationAuditLog.create.mockResolvedValue({ id: 'audit-1' });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([
    {
      confidence: 59,
      status: 'NEEDS_MORE_EVIDENCE',
      createsReview: false,
    },
    { confidence: 60, status: 'NEEDS_REVIEW', createsReview: true },
    { confidence: 90, status: 'AI_PRECLEARED', createsReview: true },
  ])(
    'routes minimum confidence $confidence to $status',
    async ({ confidence, status, createsReview }) => {
      tx.qualificationEvaluation.findMany.mockResolvedValue(
        evaluations([99, confidence, 96]),
      );

      await expect(
        service.routeSubmission('submission-1', 'user-1'),
      ).resolves.toEqual({
        status,
        confidence,
        reasonCodes: ['DOCUMENT_VALID', 'HUMAN_REVIEW_REQUIRED'],
        humanReviewRequired: true,
        lockedUntil: null,
      });
      expect(tx.qualificationReviewTask.createMany).toHaveBeenCalledTimes(
        createsReview ? 1 : 0,
      );
    },
  );

  it('loads only active READY evidence for aggregate routing', async () => {
    await service.routeSubmission('submission-1', 'user-1');

    expect(tx.kycSubmission.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          documents: expect.objectContaining({
            where: {
              isActive: true,
              lifecycleState: 'READY',
              documentType: {
                in: ['id-front', 'id-back', 'selfie-with-id'],
              },
            },
          }),
        }),
      }),
    );
  });
  it('lets a persisted hard failure win over confidence thresholds', async () => {
    tx.kycSubmission.findUnique.mockResolvedValue({
      id: 'submission-1',
      status: 'DRAFT',
      failedAttempts: 0,
      lockedUntil: null,
      documents: requiredDocuments(['WRONG_DOCUMENT_TYPE']),
    });
    tx.qualificationEvaluation.findMany.mockResolvedValue(
      evaluations([99, 98, 97]),
    );

    await expect(
      service.routeSubmission('submission-1', 'user-1'),
    ).resolves.toEqual(
      expect.objectContaining({
        status: 'NEEDS_RESUBMISSION',
        confidence: 97,
        reasonCodes: [
          'WRONG_DOCUMENT_TYPE',
          'DOCUMENT_VALID',
          'HUMAN_REVIEW_REQUIRED',
        ],
      }),
    );
    expect(tx.qualificationReviewTask.create).not.toHaveBeenCalled();
  });

  it('routes an unavailable required assessment to review instead of omitting it', async () => {
    tx.qualificationEvaluation.findMany.mockResolvedValue(
      evaluations([95, null, 97]),
    );

    await expect(
      service.routeSubmission('submission-1', 'user-1'),
    ).resolves.toEqual({
      status: 'NEEDS_REVIEW',
      confidence: 95,
      reasonCodes: [
        'DOCUMENT_VALID',
        'PROVIDER_UNAVAILABLE',
        'HUMAN_REVIEW_REQUIRED',
      ],
      humanReviewRequired: true,
      lockedUntil: null,
    });
  });

  it('routes an explicit provider-unavailable reason to review even with a numeric score', async () => {
    tx.kycSubmission.findUnique.mockResolvedValue({
      id: 'submission-1',
      status: 'DRAFT',
      failedAttempts: 0,
      lockedUntil: null,
      documents: requiredDocuments(['PROVIDER_UNAVAILABLE']),
    });
    tx.qualificationEvaluation.findMany.mockResolvedValue(
      evaluations([95, 97, 99]),
    );

    await expect(
      service.routeSubmission('submission-1', 'user-1'),
    ).resolves.toEqual(
      expect.objectContaining({
        status: 'NEEDS_REVIEW',
        confidence: 95,
        reasonCodes: [
          'PROVIDER_UNAVAILABLE',
          'DOCUMENT_VALID',
          'HUMAN_REVIEW_REQUIRED',
        ],
      }),
    );
  });
  it('sets a bounded cooldown on the third consecutive hard failure', async () => {
    jest.useFakeTimers().setSystemTime(Date.parse('2026-07-30T08:00:00.000Z'));
    tx.kycSubmission.findUnique.mockResolvedValue({
      id: 'submission-1',
      status: 'DRAFT',
      failedAttempts: 2,
      lockedUntil: null,
      documents: requiredDocuments(['EXPIRED_ID']),
    });

    await expect(
      service.routeSubmission('submission-1', 'user-1'),
    ).resolves.toEqual(
      expect.objectContaining({
        status: 'NEEDS_RESUBMISSION',
        lockedUntil: new Date('2026-07-30T08:15:00.000Z'),
      }),
    );
    expect(tx.kycSubmission.update).toHaveBeenCalledWith({
      where: { id: 'submission-1' },
      data: expect.objectContaining({
        failedAttempts: 3,
        lockedUntil: new Date('2026-07-30T08:15:00.000Z'),
      }),
    });
  });

  it('treats a concurrent partial-unique conflict as idempotent KYC task creation', async () => {
    tx.qualificationReviewTask.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'review-created-concurrently' });
    tx.qualificationReviewTask.createMany.mockResolvedValue({ count: 0 });

    await expect(
      service.routeSubmission('submission-1', 'user-1'),
    ).resolves.toEqual(expect.objectContaining({ status: 'AI_PRECLEARED' }));

    expect(tx.qualificationReviewTask.createMany).toHaveBeenCalledWith({
      data: expect.objectContaining({
        submissionId: 'submission-1',
        kind: 'KYC',
        status: 'OPEN',
      }),
      skipDuplicates: true,
    });
    expect(tx.qualificationReviewTask.create).not.toHaveBeenCalled();
  });

  it('ships a partial unique index for one unresolved KYC task per submission', () => {
    const migrationPath = join(
      process.cwd(),
      'prisma/migrations/20260730170000_add_qualification_document_saga/migration.sql',
    );
    expect(existsSync(migrationPath)).toBe(true);
    const migration = readFileSync(migrationPath, 'utf8');
    expect(migration).toMatch(
      /CREATE UNIQUE INDEX "qualification_review_tasks_one_unresolved_kyc"[\s\S]*WHERE "kind" = 'KYC' AND "status" <> 'DECIDED'/,
    );
  });
  it('does not duplicate persistence or open KYC review work when routing repeats', async () => {
    let status = 'DRAFT';
    tx.kycSubmission.findUnique.mockImplementation(() => ({
      id: 'submission-1',
      status,
      failedAttempts: 0,
      lockedUntil: null,
      documents: requiredDocuments(),
    }));
    tx.kycSubmission.update.mockImplementation(({ data }: any) => {
      status = data.status;
      return { id: 'submission-1' };
    });

    const first = await service.routeSubmission('submission-1', 'user-1');
    const second = await service.routeSubmission('submission-1', 'user-1');

    expect(first).toEqual(second);
    expect(tx.kycSubmission.update).toHaveBeenCalledTimes(1);
    expect(tx.qualificationAuditLog.create).toHaveBeenCalledTimes(1);
    expect(tx.qualificationReviewTask.createMany).toHaveBeenCalledTimes(1);
  });
});
