import { ConflictException } from '@nestjs/common';
import { QualificationReviewService } from './qualification-review.service';
import {
  QualificationReviewDecision,
  QualificationReviewDecisionDto,
} from './dto/qualification-review-decision.dto';

describe('QualificationReviewService', () => {
  const tx = {
    qualificationReviewTask: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    tierQualification: { create: jest.fn() },
    fixer: { update: jest.fn() },
    kycSubmission: { update: jest.fn() },
    kycDocument: { findMany: jest.fn() },
    qualificationAuditLog: { create: jest.fn() },
    qualificationHandoff: { upsert: jest.fn() },
  } as any;
  const prisma = {
    qualificationReviewTask: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    qualificationHandoff: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (client: any) => unknown) =>
      callback(tx),
    ),
  } as any;
  const tierEvaluation = { evaluateTier: jest.fn() } as any;
  const service = new QualificationReviewService(prisma, tierEvaluation);

  const submission = {
    status: 'APPROVED',
    fixerId: 'fixer-1',
    policyVersion: 'policy-v1',
    fixer: {},
    evaluations: [{ recommendedTier: 'SPECIALIST' }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.qualificationReviewTask.updateMany.mockResolvedValue({ count: 1 });
    tx.qualificationReviewTask.updateMany.mockResolvedValue({ count: 1 });
    tx.qualificationReviewTask.update.mockImplementation(
      async ({ data }: any) => ({
        id: 'task-1',
        submissionId: 'submission-1',
        ...data,
      }),
    );
    tx.tierQualification.create.mockResolvedValue({
      id: 'tier-qualification-1',
    });
    tx.fixer.update.mockResolvedValue({
      id: 'fixer-1',
      status: 'APPROVED',
      tier: 'SPECIALIST',
      verified: true,
    });
    tx.kycSubmission.update.mockResolvedValue({ id: 'submission-1' });
    tx.kycDocument.findMany.mockResolvedValue([
      { documentType: 'id-front', evidenceStatus: 'VALIDATED' },
      { documentType: 'id-back', evidenceStatus: 'VALIDATED' },
      { documentType: 'selfie-with-id', evidenceStatus: 'VALIDATED' },
    ]);
    tx.qualificationAuditLog.create.mockResolvedValue({ id: 'audit-1' });
    tx.qualificationHandoff.upsert.mockResolvedValue({
      id: 'handoff-1',
      status: 'PENDING',
    });
    prisma.qualificationHandoff.findUnique.mockResolvedValue({
      id: 'handoff-1',
      status: 'PENDING',
    });
    prisma.qualificationHandoff.updateMany.mockResolvedValue({ count: 1 });
    tierEvaluation.evaluateTier.mockResolvedValue({
      maximumTier: 'ECONOMY',
    });
  });

  it('returns the latest actionable submission for each fixer', async () => {
    const older = {
      id: 'older-task',
      kind: 'KYC',
      createdAt: new Date('2026-07-01T00:00:00.000Z'),
      submission: {
        version: 1,
        submittedAt: new Date('2026-07-01T00:00:00.000Z'),
        updatedAt: new Date('2026-07-01T00:00:00.000Z'),
        fixer: { id: 'fixer-1' },
      },
    };
    const newer = {
      id: 'newer-task',
      kind: 'TIER',
      createdAt: new Date('2026-07-02T00:00:00.000Z'),
      submission: {
        version: 2,
        submittedAt: new Date('2026-07-02T00:00:00.000Z'),
        updatedAt: new Date('2026-07-02T00:00:00.000Z'),
        fixer: { id: 'fixer-1' },
      },
    };
    prisma.qualificationReviewTask.findMany.mockResolvedValue([older, newer]);

    await expect(service.listTasks()).resolves.toEqual([newer]);
  });

  it('atomically assigns only an open task to the maker', async () => {
    prisma.qualificationReviewTask.findUnique.mockResolvedValue({
      id: 'task-1',
      status: 'ASSIGNED',
      assignedTo: 'maker-1',
    });

    await expect(service.assignTask('maker-1', 'task-1')).resolves.toEqual(
      expect.objectContaining({ status: 'ASSIGNED', assignedTo: 'maker-1' }),
    );
    expect(prisma.qualificationReviewTask.updateMany).toHaveBeenCalledWith({
      where: { id: 'task-1', status: 'OPEN', proposedAt: null },
      data: expect.objectContaining({
        status: 'ASSIGNED',
        assignedTo: 'maker-1',
      }),
    });
  });

  it('rejects a concurrent maker claim', async () => {
    prisma.qualificationReviewTask.updateMany.mockResolvedValue({ count: 0 });
    prisma.qualificationReviewTask.findUnique.mockResolvedValue({
      id: 'task-1',
    });

    await expect(
      service.assignTask('maker-2', 'task-1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows one assigned administrator to finalize a decision', async () => {
    tx.qualificationReviewTask.findUnique
      .mockResolvedValueOnce({
        id: 'task-1',
        kind: 'TIER',
        status: 'ASSIGNED',
        assignedTo: 'maker-1',
        proposedAt: null,
        submissionId: 'submission-1',
        submission,
      })
      .mockResolvedValueOnce({
        id: 'task-1',
        kind: 'TIER',
        status: 'ASSIGNED',
        assignedTo: 'maker-1',
        proposedAt: new Date(),
        proposedDecision: 'APPROVE',
        proposedTier: 'SPECIALIST',
        proposedReason: 'Evidence supports the proposed specialist tier.',
        proposedBy: 'maker-1',
        submissionId: 'submission-1',
        submission,
      });
    const dto = {
      decision: QualificationReviewDecision.APPROVE,
      approvedTier: 'SPECIALIST',
      reason: 'Evidence supports the proposed specialist tier.',
    } as QualificationReviewDecisionDto;

    const result = await service.decideTask('maker-1', 'task-1', dto);

    expect(result).toEqual(
      expect.objectContaining({
        applied: true,
      }),
    );
    expect(tx.qualificationReviewTask.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          proposedDecision: 'APPROVE',
          proposedTier: 'SPECIALIST',
          proposedBy: 'maker-1',
        }),
      }),
    );
    expect(tx.tierQualification.create).toHaveBeenCalled();
    expect(tx.fixer.update).toHaveBeenCalled();
    expect(tx.qualificationAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'QUALIFICATION_DECISION_PROPOSED',
        }),
      }),
    );
  });

  it('rejects a duplicate maker proposal atomically', async () => {
    tx.qualificationReviewTask.findUnique.mockResolvedValue({
      id: 'task-1',
      status: 'ASSIGNED',
      assignedTo: 'maker-1',
      proposedAt: null,
      submissionId: 'submission-1',
      submission,
    });
    tx.qualificationReviewTask.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.decideTask('maker-1', 'task-1', {
        decision: QualificationReviewDecision.APPROVE,
        approvedTier: 'STANDARD',
        reason: 'Evidence supports the standard tier proposal.',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows the assigned administrator to finalize their own proposal', async () => {
    tx.qualificationReviewTask.findUnique.mockResolvedValue({
      id: 'task-1',
      kind: 'TIER',
      status: 'ASSIGNED',
      assignedTo: 'maker-1',
      proposedAt: new Date(),
      proposedDecision: 'APPROVE',
      proposedTier: 'SPECIALIST',
      proposedReason: 'Evidence supports specialist.',
      proposedBy: 'maker-1',
      submissionId: 'submission-1',
      submission,
    });

    await expect(
      service.checkTask('maker-1', 'task-1', {
        acceptProposal: true,
        reason: 'The assigned administrator completed the review.',
      }),
    ).resolves.toEqual(expect.objectContaining({ applied: true }));
    expect(tx.fixer.update).toHaveBeenCalled();
  });

  it('grants verified Economy on KYC approval and starts tier evaluation', async () => {
    tx.qualificationReviewTask.findUnique.mockResolvedValue({
      id: 'task-1',
      kind: 'KYC',
      status: 'ASSIGNED',
      assignedTo: 'maker-1',
      proposedAt: new Date('2026-07-25T00:00:00.000Z'),
      proposedDecision: 'APPROVE',
      proposedTier: null,
      proposedReason: 'Identity evidence is verified and complete.',
      proposedBy: 'maker-1',
      submissionId: 'submission-1',
      submission: {
        ...submission,
        evaluations: [],
        fixer: {
          id: 'fixer-1',
          status: 'PENDING',
          tier: 'ECONOMY',
          verified: false,
        },
      },
    });

    const result = await service.checkTask('checker-2', 'task-1', {
      acceptProposal: true,
      reason: 'Independent identity check confirms the proposal.',
    });

    expect(result).toEqual(expect.objectContaining({ applied: true }));
    expect(tx.kycSubmission.update).toHaveBeenCalledWith({
      where: { id: 'submission-1' },
      data: expect.objectContaining({
        status: 'APPROVED',
        reviewerId: 'checker-2',
      }),
    });
    expect(tx.fixer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: 'APPROVED',
          verified: true,
          tier: 'ECONOMY',
        },
      }),
    );
    expect(tierEvaluation.evaluateTier).toHaveBeenCalledWith(
      'submission-1',
      'checker-2',
    );
  });

  it('applies an upper-tier proposal only after an independent checker confirms it', async () => {
    tx.qualificationReviewTask.findUnique.mockResolvedValue({
      id: 'task-1',
      status: 'ASSIGNED',
      assignedTo: 'maker-1',
      proposedAt: new Date('2026-07-25T00:00:00.000Z'),
      proposedDecision: 'APPROVE',
      proposedTier: 'SPECIALIST',
      proposedReason: 'Evidence supports specialist.',
      proposedBy: 'maker-1',
      submissionId: 'submission-1',
      submission,
    });

    const result = await service.checkTask('checker-2', 'task-1', {
      acceptProposal: true,
      reason: 'Independent evidence check confirms the proposal.',
    });

    expect(result).toEqual(expect.objectContaining({ applied: true }));
    expect(tx.tierQualification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: 'HUMAN',
          approvedBy: 'checker-2',
          approvedTier: 'SPECIALIST',
        }),
      }),
    );
    expect(tx.fixer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { tier: 'SPECIALIST' },
      }),
    );
    expect(tx.qualificationAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'QUALIFICATION_DECISION_CHECKED',
          actorId: 'checker-2',
          metadata: expect.objectContaining({ makerId: 'maker-1' }),
        }),
      }),
    );
  });

  it('routes a rejected KYC review to resubmission without rejecting the fixer account', async () => {
    tx.qualificationReviewTask.findUnique.mockResolvedValue({
      id: 'task-1',
      kind: 'KYC',
      status: 'ASSIGNED',
      assignedTo: 'maker-1',
      proposedAt: new Date('2026-07-25T00:00:00.000Z'),
      proposedDecision: 'REJECT',
      proposedTier: null,
      proposedReason: 'Identity evidence must be replaced.',
      proposedBy: 'maker-1',
      submissionId: 'submission-1',
      submission: {
        ...submission,
        fixer: {
          id: 'fixer-1',
          status: 'APPROVED',
          tier: 'STANDARD',
          verified: true,
        },
      },
    });

    const result = await service.checkTask('checker-2', 'task-1', {
      acceptProposal: true,
      reason: 'The KYC evidence requires a new submission.',
    });

    expect(result).toEqual(
      expect.objectContaining({
        applied: true,
        requiresIndependentCheck: false,
      }),
    );
    expect(tx.kycSubmission.update).toHaveBeenCalledWith({
      where: { id: 'submission-1' },
      data: expect.objectContaining({
        status: 'NEEDS_RESUBMISSION',
        reviewerId: 'checker-2',
      }),
    });
    expect(tx.fixer.update).not.toHaveBeenCalled();
    expect(tx.tierQualification.create).not.toHaveBeenCalled();
  });

  it('rejects a concurrent second checker atomically', async () => {
    tx.qualificationReviewTask.findUnique.mockResolvedValue({
      id: 'task-1',
      status: 'ASSIGNED',
      assignedTo: 'maker-1',
      proposedAt: new Date(),
      proposedDecision: 'APPROVE',
      proposedTier: 'STANDARD',
      proposedReason: 'Initial proposal.',
      proposedBy: 'maker-1',
      checkedAt: null,
      submissionId: 'submission-1',
      submission,
    });
    tx.qualificationReviewTask.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.checkTask('checker-3', 'task-1', {
        acceptProposal: true,
        reason: 'Second concurrent checker attempt.',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.fixer.update).not.toHaveBeenCalled();
  });

  it('returns a rejected proposal to the open queue without changing the fixer', async () => {
    tx.qualificationReviewTask.findUnique.mockResolvedValue({
      id: 'task-1',
      status: 'ASSIGNED',
      assignedTo: 'maker-1',
      proposedAt: new Date(),
      proposedDecision: 'APPROVE',
      proposedTier: 'STANDARD',
      proposedReason: 'Initial proposal.',
      proposedBy: 'maker-1',
      submissionId: 'submission-1',
      submission,
    });

    const result = await service.checkTask('checker-2', 'task-1', {
      acceptProposal: false,
      reason: 'Evidence source requires another review.',
    });

    expect(result).toEqual(expect.objectContaining({ applied: false }));
    expect(tx.qualificationReviewTask.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'OPEN',
          assignedTo: null,
          proposedBy: null,
          checkedBy: 'checker-2',
        }),
      }),
    );
    expect(tx.fixer.update).not.toHaveBeenCalled();
  });

  it('rejects a proposal above the deterministic recommendation', async () => {
    tx.qualificationReviewTask.findUnique.mockResolvedValue({
      id: 'task-1',
      status: 'ASSIGNED',
      assignedTo: 'maker-1',
      proposedAt: null,
      submissionId: 'submission-1',
      submission: {
        ...submission,
        evaluations: [{ recommendedTier: 'STANDARD' }],
      },
    });
    const dto = {
      decision: QualificationReviewDecision.APPROVE,
      approvedTier: 'CORPORATE',
      reason: 'Attempted approval above the evidence ceiling.',
    } as QualificationReviewDecisionDto;

    await expect(
      service.decideTask('maker-1', 'task-1', dto),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.qualificationReviewTask.update).not.toHaveBeenCalled();
  });

  it('rejects approval without an explicit proposed tier', async () => {
    const dto = {
      decision: QualificationReviewDecision.APPROVE,
      reason: 'Insufficient evidence for approval.',
    } as QualificationReviewDecisionDto;

    await expect(
      service.decideTask('maker-1', 'task-1', dto),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).toHaveBeenCalled();
  });
  it('processes the KYC handoff only after commit, with the submission id, and only once', async () => {
    let committed = false;
    prisma['$transaction'].mockImplementationOnce(
      async (callback: (client: any) => unknown) => {
        const result = await callback(tx);
        committed = true;
        return result;
      },
    );
    prisma.qualificationHandoff.findUnique
      .mockResolvedValueOnce({ id: 'handoff-1', status: 'PENDING' })
      .mockResolvedValueOnce({ id: 'handoff-1', status: 'COMPLETED' });
    tierEvaluation.evaluateTier.mockImplementation(
      async (submissionId: string) => {
        expect(committed).toBe(true);
        expect(submissionId).toBe('submission-1');
        return { maximumTier: 'ECONOMY' };
      },
    );
    tx.qualificationReviewTask.findUnique.mockResolvedValue({
      id: 'task-kyc-1',
      kind: 'KYC',
      status: 'ASSIGNED',
      assignedTo: 'maker-1',
      proposedAt: new Date('2026-07-25T00:00:00.000Z'),
      proposedDecision: 'APPROVE',
      proposedTier: null,
      proposedReason: 'Identity evidence is verified and complete.',
      proposedBy: 'maker-1',
      submissionId: 'submission-1',
      submission: { ...submission, evaluations: [] },
    });

    await service.checkTask('checker-2', 'task-kyc-1', {
      acceptProposal: true,
      reason: 'Independent identity check confirms the proposal.',
    });
    await service.retryTierEvaluationHandoff('submission-1', 'checker-2');

    expect(tx.qualificationHandoff.upsert).toHaveBeenCalledWith({
      where: {
        submissionId_kind: { submissionId: 'submission-1', kind: 'TIER' },
      },
      create: {
        submissionId: 'submission-1',
        kind: 'TIER',
        status: 'PENDING',
      },
      update: {},
    });
    expect(tierEvaluation.evaluateTier).toHaveBeenCalledTimes(1);
    expect(tierEvaluation.evaluateTier).toHaveBeenCalledWith(
      'submission-1',
      'checker-2',
    );
    expect(prisma.qualificationHandoff.updateMany).toHaveBeenCalledTimes(2);
  });

  it('keeps KYC approval committed when handoff processing fails and retries it', async () => {
    prisma.qualificationHandoff.findUnique
      .mockResolvedValueOnce({ id: 'handoff-1', status: 'PENDING' })
      .mockResolvedValueOnce({ id: 'handoff-1', status: 'FAILED' });
    tierEvaluation.evaluateTier
      .mockRejectedValueOnce(new Error('tier evaluation unavailable'))
      .mockResolvedValueOnce({ maximumTier: 'ECONOMY' });
    tx.qualificationReviewTask.findUnique.mockResolvedValue({
      id: 'task-kyc-2',
      kind: 'KYC',
      status: 'ASSIGNED',
      assignedTo: 'maker-1',
      proposedAt: new Date('2026-07-25T00:00:00.000Z'),
      proposedDecision: 'APPROVE',
      proposedTier: null,
      proposedReason: 'Identity evidence is verified and complete.',
      proposedBy: 'maker-1',
      submissionId: 'submission-1',
      submission: { ...submission, evaluations: [] },
    });

    await expect(
      service.checkTask('checker-2', 'task-kyc-2', {
        acceptProposal: true,
        reason: 'Independent identity check confirms the proposal.',
      }),
    ).resolves.toEqual(expect.objectContaining({ handoffStatus: 'FAILED' }));

    expect(tx.kycSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'submission-1' },
        data: expect.objectContaining({ status: 'APPROVED' }),
      }),
    );
    expect(tx.fixer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'APPROVED',
          verified: true,
          tier: 'ECONOMY',
        }),
      }),
    );
    expect(prisma.qualificationHandoff.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FAILED' }),
      }),
    );

    await expect(
      service.retryTierEvaluationHandoff('submission-1', 'checker-2'),
    ).resolves.toBe('COMPLETED');
    expect(tierEvaluation.evaluateTier).toHaveBeenCalledTimes(2);
  });
});
