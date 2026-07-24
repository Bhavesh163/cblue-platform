import { NotFoundException } from '@nestjs/common';
import { QualificationEvaluationService } from './qualification-evaluation.service';

describe('QualificationEvaluationService', () => {
  const tx = {
    qualificationEvaluation: { create: jest.fn() },
    qualificationReviewTask: { create: jest.fn() },
    kycSubmission: { update: jest.fn() },
  } as any;
  const prisma = {
    kycSubmission: { findFirst: jest.fn(), findUnique: jest.fn() },
    qualificationEvaluation: { findMany: jest.fn() },
    $transaction: jest.fn(async (callback: (client: any) => unknown) => callback(tx)),
  } as any;
  const policy = { evaluate: jest.fn() } as any;
  const config = { get: jest.fn().mockReturnValue(undefined) } as any;
  const service = new QualificationEvaluationService(prisma, policy, config);

  beforeEach(() => {
    jest.clearAllMocks();
    tx.qualificationEvaluation.create.mockResolvedValue({ id: 'evaluation-1' });
    tx.kycSubmission.update.mockResolvedValue({ id: 'submission-1' });
  });

  it('persists deterministic evaluation and continues without Typhoon', async () => {
    prisma.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-1',
      fixer: { id: 'fixer-1', yearsExperience: 4 },
      documents: [
        { id: 'front', documentType: 'id-front', evidenceStatus: 'VALIDATED' },
        { id: 'back', documentType: 'id-back', evidenceStatus: 'VALIDATED' },
        { id: 'cert', documentType: 'education-certificate', evidenceStatus: 'UNCHECKED' },
      ],
    });
    policy.evaluate.mockImplementation((input: any) => ({
      policyVersion: 'cblue-fixer-qualification-v1',
      recommendedTier: input.kycApproved ? 'STANDARD' : 'ECONOMY',
      eligibleTiers: ['ECONOMY', 'STANDARD'],
      humanReviewRequired: false,
      publicPromotionAllowed: true,
      reasons: [],
    }));

    const result = await service.evaluateSubmissionForUser('user-1', 'submission-1');

    expect(result.advisory).toBeNull();
    expect(result.reviewRequired).toBe(false);
    expect(tx.qualificationEvaluation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        provider: 'DETERMINISTIC_POLICY',
        status: 'COMPLETED',
        recommendedTier: 'STANDARD',
        inputHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    }));
    expect(tx.qualificationReviewTask.create).not.toHaveBeenCalled();
    expect(tx.kycSubmission.update).toHaveBeenCalledWith({
      where: { id: 'submission-1' },
      data: { status: 'PROCESSING' },
    });
  });

  it('fails closed for a submission owned by another user', async () => {
    prisma.kycSubmission.findFirst.mockResolvedValue(null);
    await expect(service.evaluateSubmissionForUser('other-user', 'submission-1'))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('creates a review task when evidence is incomplete or an upper tier is recommended', async () => {
    prisma.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-2',
      fixer: { id: 'fixer-2', yearsExperience: 12 },
      documents: [
        { id: 'front', documentType: 'id-front', evidenceStatus: 'UNCHECKED' },
        { id: 'back', documentType: 'id-back', evidenceStatus: 'UNCHECKED' },
        { id: 'award', documentType: 'international-award', evidenceStatus: 'VALIDATED' },
      ],
    });
    policy.evaluate.mockReturnValue({
      policyVersion: 'cblue-fixer-qualification-v1',
      recommendedTier: 'EXPERT',
      eligibleTiers: ['ECONOMY', 'EXPERT'],
      humanReviewRequired: true,
      publicPromotionAllowed: false,
      reasons: ['Human review required'],
    });

    const result = await service.evaluateSubmissionForUser('user-2', 'submission-2');

    expect(result.reviewRequired).toBe(true);
    expect(tx.qualificationReviewTask.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        submissionId: 'submission-2',
        status: 'OPEN',
        priority: 10,
      }),
    }));
    expect(tx.kycSubmission.update).toHaveBeenCalledWith({
      where: { id: 'submission-2' },
      data: { status: 'NEEDS_REVIEW' },
    });
  });
});
