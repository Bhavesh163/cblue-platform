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
    qualificationAuditLog: { create: jest.fn() },
  } as any;
  const prisma = {
    qualificationReviewTask: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (client: any) => unknown) => callback(tx)),
  } as any;
  const service = new QualificationReviewService(prisma);

  const submission = {
    fixerId: 'fixer-1',
    policyVersion: 'policy-v1',
    fixer: {},
    evaluations: [{ recommendedTier: 'SPECIALIST' }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.qualificationReviewTask.updateMany.mockResolvedValue({ count: 1 });
    tx.qualificationReviewTask.updateMany.mockResolvedValue({ count: 1 });
    tx.qualificationReviewTask.update.mockImplementation(async ({ data }: any) => ({
      id: 'task-1',
      ...data,
    }));
    tx.tierQualification.create.mockResolvedValue({ id: 'tier-qualification-1' });
    tx.fixer.update.mockResolvedValue({
      id: 'fixer-1', status: 'APPROVED', tier: 'SPECIALIST', verified: true,
    });
    tx.kycSubmission.update.mockResolvedValue({ id: 'submission-1' });
    tx.qualificationAuditLog.create.mockResolvedValue({ id: 'audit-1' });
  });

  it('atomically assigns only an open task to the maker', async () => {
    prisma.qualificationReviewTask.findUnique.mockResolvedValue({
      id: 'task-1', status: 'ASSIGNED', assignedTo: 'maker-1',
    });

    await expect(service.assignTask('maker-1', 'task-1')).resolves.toEqual(
      expect.objectContaining({ status: 'ASSIGNED', assignedTo: 'maker-1' }),
    );
    expect(prisma.qualificationReviewTask.updateMany).toHaveBeenCalledWith({
      where: { id: 'task-1', status: 'OPEN', proposedAt: null },
      data: expect.objectContaining({ status: 'ASSIGNED', assignedTo: 'maker-1' }),
    });
  });

  it('rejects a concurrent maker claim', async () => {
    prisma.qualificationReviewTask.updateMany.mockResolvedValue({ count: 0 });
    prisma.qualificationReviewTask.findUnique.mockResolvedValue({ id: 'task-1' });

    await expect(service.assignTask('maker-2', 'task-1'))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('persists a maker proposal without changing the operational tier', async () => {
    tx.qualificationReviewTask.findUnique.mockResolvedValue({
      id: 'task-1',
      status: 'ASSIGNED',
      assignedTo: 'maker-1',
      proposedAt: null,
      submissionId: 'submission-1',
      submission,
    });
    const dto = {
      decision: QualificationReviewDecision.APPROVE,
      approvedTier: 'SPECIALIST',
      reason: 'Evidence supports the proposed specialist tier.',
    } as QualificationReviewDecisionDto;

    const result = await service.decideTask('maker-1', 'task-1', dto);

    expect(result).toEqual(expect.objectContaining({
      requiresIndependentCheck: true,
      applied: false,
    }));
    expect(tx.qualificationReviewTask.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        proposedDecision: 'APPROVE',
        proposedTier: 'SPECIALIST',
        proposedBy: 'maker-1',
      }),
    }));
    expect(tx.tierQualification.create).not.toHaveBeenCalled();
    expect(tx.fixer.update).not.toHaveBeenCalled();
    expect(tx.qualificationAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'QUALIFICATION_DECISION_PROPOSED' }),
    }));
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

    await expect(service.decideTask('maker-1', 'task-1', {
      decision: QualificationReviewDecision.APPROVE,
      approvedTier: 'STANDARD',
      reason: 'Evidence supports the standard tier proposal.',
    })).rejects.toBeInstanceOf(ConflictException);
  });

  it('prevents the maker from checking their own proposal', async () => {
    tx.qualificationReviewTask.findUnique.mockResolvedValue({
      id: 'task-1',
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

    await expect(service.checkTask('maker-1', 'task-1', {
      acceptProposal: true,
      reason: 'Independent check completed successfully.',
    })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.fixer.update).not.toHaveBeenCalled();
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
    expect(tx.tierQualification.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        source: 'HUMAN',
        approvedBy: 'checker-2',
        approvedTier: 'SPECIALIST',
      }),
    }));
    expect(tx.fixer.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'APPROVED',
        tier: 'SPECIALIST',
        verified: true,
      }),
    }));
    expect(tx.qualificationAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'QUALIFICATION_DECISION_CHECKED',
        actorId: 'checker-2',
        metadata: expect.objectContaining({ makerId: 'maker-1' }),
      }),
    }));
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

    await expect(service.checkTask('checker-3', 'task-1', {
      acceptProposal: true,
      reason: 'Second concurrent checker attempt.',
    })).rejects.toBeInstanceOf(ConflictException);
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
    expect(tx.qualificationReviewTask.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'OPEN',
        assignedTo: null,
        proposedBy: null,
        checkedBy: 'checker-2',
      }),
    }));
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

    await expect(service.decideTask('maker-1', 'task-1', dto))
      .rejects.toBeInstanceOf(ConflictException);
    expect(tx.qualificationReviewTask.update).not.toHaveBeenCalled();
  });

  it('rejects approval without an explicit proposed tier', async () => {
    const dto = {
      decision: QualificationReviewDecision.APPROVE,
      reason: 'Insufficient evidence for approval.',
    } as QualificationReviewDecisionDto;

    await expect(service.decideTask('maker-1', 'task-1', dto))
      .rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
