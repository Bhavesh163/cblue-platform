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
      update: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (client: any) => unknown) => callback(tx)),
  } as any;
  const service = new QualificationReviewService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    tx.tierQualification.create.mockResolvedValue({ id: 'tier-qualification-1' });
    tx.fixer.update.mockResolvedValue({
      id: 'fixer-1', status: 'APPROVED', tier: 'SPECIALIST', verified: true,
    });
    tx.kycSubmission.update.mockResolvedValue({ id: 'submission-1' });
    tx.qualificationReviewTask.update.mockResolvedValue({
      id: 'task-1', status: 'DECIDED',
    });
    tx.qualificationAuditLog.create.mockResolvedValue({ id: 'audit-1' });
  });

  it('assigns only an open review task to the authenticated admin', async () => {
    prisma.qualificationReviewTask.findUnique.mockResolvedValue({
      id: 'task-1', status: 'OPEN', assignedTo: null,
    });
    prisma.qualificationReviewTask.update.mockResolvedValue({
      id: 'task-1', status: 'ASSIGNED', assignedTo: 'admin-1',
    });

    await expect(service.assignTask('admin-1', 'task-1')).resolves.toEqual(
      expect.objectContaining({ status: 'ASSIGNED', assignedTo: 'admin-1' }),
    );
    expect(prisma.qualificationReviewTask.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: expect.objectContaining({ status: 'ASSIGNED', assignedTo: 'admin-1' }),
    });
  });

  it('requires assignment ownership before approving a tier', async () => {
    tx.qualificationReviewTask.findUnique.mockResolvedValue({
      id: 'task-1',
      status: 'ASSIGNED',
      assignedTo: 'other-admin',
      submissionId: 'submission-1',
      submission: { fixerId: 'fixer-1', policyVersion: 'policy-v1', fixer: {} },
    });
    const dto = {
      decision: QualificationReviewDecision.APPROVE,
      approvedTier: 'SPECIALIST',
      reason: 'Evidence reviewed and independently verified.',
    } as QualificationReviewDecisionDto;

    await expect(service.decideTask('admin-1', 'task-1', dto))
      .rejects.toBeInstanceOf(ConflictException);
    expect(tx.tierQualification.create).not.toHaveBeenCalled();
  });

  it('atomically persists human approval, operational tier, and audit evidence', async () => {
    tx.qualificationReviewTask.findUnique.mockResolvedValue({
      id: 'task-1',
      status: 'ASSIGNED',
      assignedTo: 'admin-1',
      submissionId: 'submission-1',
      submission: { fixerId: 'fixer-1', policyVersion: 'policy-v1', fixer: {} },
    });
    const dto = {
      decision: QualificationReviewDecision.APPROVE,
      approvedTier: 'SPECIALIST',
      reason: 'Evidence reviewed and independently verified.',
    } as QualificationReviewDecisionDto;

    const result = await service.decideTask('admin-1', 'task-1', dto);

    expect(result.fixer).toEqual(expect.objectContaining({ tier: 'SPECIALIST' }));
    expect(tx.tierQualification.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        source: 'HUMAN',
        approvedBy: 'admin-1',
        approvedTier: 'SPECIALIST',
      }),
    }));
    expect(tx.kycSubmission.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'APPROVED', reviewerId: 'admin-1' }),
    }));
    expect(tx.qualificationAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'QUALIFICATION_DECIDED',
        actorId: 'admin-1',
      }),
    }));
  });

  it('rejects approval without an explicit approved tier', async () => {
    const dto = {
      decision: QualificationReviewDecision.APPROVE,
      reason: 'Insufficient evidence for approval.',
    } as QualificationReviewDecisionDto;
    await expect(service.decideTask('admin-1', 'task-1', dto))
      .rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
