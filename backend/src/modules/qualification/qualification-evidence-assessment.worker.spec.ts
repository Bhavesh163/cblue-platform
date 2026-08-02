import { QualificationEvidenceAssessmentWorker } from './qualification-evidence-assessment.worker';

describe('QualificationEvidenceAssessmentWorker', () => {
  it('claims, assesses, promotes, and completes a queued non-KYC document', async () => {
    const prisma = {
      qualificationEvidenceAssessmentJob: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'job-1',
            documentId: 'doc-1',
            submissionId: 'submission-1',
            attempts: 0,
          },
        ]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      kycSubmission: {
        findUnique: jest.fn().mockResolvedValue({
          status: 'APPROVED',
          fixer: { user: { name: 'Suppadesh Fungprasertsuk' } },
        }),
      },
      kycDocument: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as any;
    const assessment = {
      assessDocument: jest
        .fn()
        .mockResolvedValue({ evidenceStatus: 'INSUFFICIENT' }),
    } as any;
    const tierEvaluation = {
      evaluateTier: jest.fn().mockResolvedValue({}),
    } as any;
    const worker = new QualificationEvidenceAssessmentWorker(
      prisma,
      assessment,
      tierEvaluation,
    );

    await expect(worker.runBatch()).resolves.toBe(1);

    expect(assessment.assessDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        submissionId: 'submission-1',
        documentId: 'doc-1',
        actorId: 'system:qualification-evidence-worker',
      }),
    );
    expect(prisma.kycDocument.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isActive: true,
          lifecycleState: 'READY',
        }),
      }),
    );
    expect(tierEvaluation.evaluateTier).toHaveBeenCalledWith(
      'submission-1',
      'system:qualification-evidence-worker',
    );
    expect(
      prisma.qualificationEvidenceAssessmentJob.updateMany,
    ).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'COMPLETED',
          claimedAt: null,
          claimedBy: null,
        }),
      }),
    );
  });

  it('routes an exhausted assessment job into the administrator review queue', async () => {
    const prisma = {
      qualificationEvidenceAssessmentJob: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            {
              id: 'job-1',
              documentId: 'doc-1',
              submissionId: 'submission-1',
              attempts: 4,
            },
          ]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      kycSubmission: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            status: 'DRAFT',
            fixer: { user: { name: 'Applicant' } },
          }),
      },
      kycDocument: { updateMany: jest.fn() },
      $transaction: jest.fn(async (callback: (client: any) => unknown) =>
        callback({
          qualificationReviewTask: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'task-1' }),
          },
          qualificationAuditLog: {
            create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
          },
        }),
      ),
    } as any;
    const assessment = {
      assessDocument: jest
        .fn()
        .mockRejectedValue(new Error('PROVIDER_UNAVAILABLE')),
    } as any;
    const worker = new QualificationEvidenceAssessmentWorker(
      prisma,
      assessment,
      { evaluateTier: jest.fn() } as any,
    );
    await expect(worker.runBatch()).resolves.toBe(0);
    expect(
      prisma.qualificationEvidenceAssessmentJob.updateMany,
    ).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'FAILED',
          nextAttemptAt: new Date('9999-12-31T00:00:00.000Z'),
        }),
      }),
    );
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
