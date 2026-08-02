import { QualificationEvidenceAssessmentWorker } from './qualification-evidence-assessment.worker';

describe('QualificationEvidenceAssessmentWorker', () => {
  it('claims, assesses, promotes, and completes a queued non-KYC document', async () => {
    const prisma = {
      qualificationEvidenceAssessmentJob: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            {
              id: 'job-1',
              documentId: 'doc-1',
              submissionId: 'submission-1',
              attempts: 0,
            },
          ]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
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
});
