import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FixerStatus,
  FixerTier,
  QualificationDecisionSource,
  QualificationHandoffStatus,
  QualificationReviewKind,
  QualificationReviewStatus,
  QualificationSubmissionStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  QualificationReviewDecision,
  QualificationReviewDecisionDto,
} from './dto/qualification-review-decision.dto';
import { QualificationReviewCheckDto } from './dto/qualification-review-check.dto';
import { QualificationEvaluationService } from './qualification-evaluation.service';
const HANDOFF_LEASE_MS = 5 * 60 * 1000;

const tierRank: Record<FixerTier, number> = {
  ECONOMY: 0,
  STANDARD: 1,
  CORPORATE: 2,
  SPECIALIST: 3,
  EXPERT: 4,
};

@Injectable()
export class QualificationReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tierEvaluation: QualificationEvaluationService,
  ) {}

  async listTasks(status?: QualificationReviewStatus) {
    return this.prisma.qualificationReviewTask.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      include: {
        submission: {
          include: {
            fixer: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
            documents: {
              select: {
                id: true,
                documentType: true,
                contentType: true,
                sizeBytes: true,
                evidenceStatus: true,
                extractedFields: true,
                extractionProvider: true,
                extractionModel: true,
                extractedAt: true,
                credentialVerification: true,
                credentialVerifiedAt: true,
                expiresAt: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'asc' },
            },
            evaluations: {
              select: {
                id: true,
                provider: true,
                status: true,
                risk: true,
                recommendedTier: true,
                confidence: true,
                completedAt: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
      },
    });
  }

  async assignTask(adminId: string, taskId: string) {
    const claimed = await this.prisma.qualificationReviewTask.updateMany({
      where: {
        id: taskId,
        status: QualificationReviewStatus.OPEN,
        proposedAt: null,
      },
      data: {
        status: QualificationReviewStatus.ASSIGNED,
        assignedTo: adminId,
        assignedAt: new Date(),
      },
    });
    if (claimed.count !== 1) {
      const exists = await this.prisma.qualificationReviewTask.findUnique({
        where: { id: taskId },
        select: { id: true },
      });
      if (!exists)
        throw new NotFoundException('Qualification review task not found');
      throw new ConflictException(
        'Qualification review task is no longer open',
      );
    }
    return this.prisma.qualificationReviewTask.findUnique({
      where: { id: taskId },
    });
  }

  async decideTask(
    adminId: string,
    taskId: string,
    dto: QualificationReviewDecisionDto,
  ) {
    const reason = dto.reason.trim();
    if (!reason) {
      throw new ConflictException('A decision reason is required');
    }

    return this.prisma.$transaction(async (tx) => {
      const task = await tx.qualificationReviewTask.findUnique({
        where: { id: taskId },
        include: {
          submission: {
            include: {
              evaluations: {
                where: { provider: 'DETERMINISTIC_POLICY' },
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { recommendedTier: true },
              },
            },
          },
        },
      });
      if (!task)
        throw new NotFoundException('Qualification review task not found');
      if (
        task.status !== QualificationReviewStatus.ASSIGNED ||
        task.proposedAt
      ) {
        throw new ConflictException(
          'Qualification review task is not awaiting a maker decision',
        );
      }
      if (task.assignedTo !== adminId) {
        throw new ConflictException(
          'Qualification review task belongs to another admin',
        );
      }

      const approved = dto.decision === QualificationReviewDecision.APPROVE;
      const recommendedTier = task.submission.evaluations[0]?.recommendedTier;
      if (approved && task.kind !== 'KYC' && !dto.approvedTier) {
        throw new ConflictException(
          'An approved tier is required for TIER approval',
        );
      }
      if (approved && task.kind === 'KYC' && dto.approvedTier) {
        throw new ConflictException('KYC approval cannot propose a tier');
      }
      if (
        approved &&
        task.kind !== 'KYC' &&
        dto.approvedTier &&
        (!recommendedTier ||
          tierRank[dto.approvedTier] > tierRank[recommendedTier])
      ) {
        throw new ConflictException(
          'Approved tier cannot exceed the deterministic evidence recommendation',
        );
      }

      const proposedAt = new Date();
      const proposed = await tx.qualificationReviewTask.updateMany({
        where: {
          id: taskId,
          status: QualificationReviewStatus.ASSIGNED,
          assignedTo: adminId,
          proposedAt: null,
        },
        data: {
          proposedDecision: dto.decision,
          proposedTier:
            approved && task.kind !== 'KYC' ? dto.approvedTier : null,
          proposedReason: dto.reason.trim(),
          proposedBy: adminId,
          proposedAt,
        },
      });
      if (proposed.count !== 1) {
        throw new ConflictException(
          'Qualification proposal was already submitted',
        );
      }
      const updatedTask = {
        ...task,
        proposedDecision: dto.decision,
        proposedTier: approved && task.kind !== 'KYC' ? dto.approvedTier : null,
        proposedReason: dto.reason.trim(),
        proposedBy: adminId,
        proposedAt,
      };
      await tx.qualificationAuditLog.create({
        data: {
          submissionId: task.submissionId,
          actorId: adminId,
          action: 'QUALIFICATION_DECISION_PROPOSED',
          entityType: 'QualificationReviewTask',
          entityId: taskId,
          reason: dto.reason.trim(),
          metadata: {
            decision: dto.decision,
            approvedTier: dto.approvedTier || null,
            requiresIndependentCheck: true,
          },
        },
      });

      return {
        task: updatedTask,
        requiresIndependentCheck: true,
        applied: false,
      };
    });
  }

  async checkTask(
    checkerId: string,
    taskId: string,
    dto: QualificationReviewCheckDto,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const task = await tx.qualificationReviewTask.findUnique({
        where: { id: taskId },
        include: {
          submission: {
            include: {
              fixer: true,
              evaluations: {
                where: { provider: 'DETERMINISTIC_POLICY' },
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { recommendedTier: true },
              },
            },
          },
        },
      });
      if (!task)
        throw new NotFoundException('Qualification review task not found');
      if (
        task.status !== QualificationReviewStatus.ASSIGNED ||
        !task.proposedAt ||
        !task.proposedDecision ||
        !task.proposedBy
      ) {
        throw new ConflictException(
          'Qualification review task is not awaiting an independent check',
        );
      }
      if (task.proposedBy === checkerId) {
        throw new ConflictException(
          'The maker and checker must be different administrators',
        );
      }

      const checkReason = dto.reason.trim();
      const checkedAt = new Date();
      const checkerClaim = await tx.qualificationReviewTask.updateMany({
        where: {
          id: taskId,
          status: QualificationReviewStatus.ASSIGNED,
          proposedAt: { not: null },
          checkedAt: null,
        },
        data: {
          checkedBy: checkerId,
          checkedAt,
          checkReason,
        },
      });
      if (checkerClaim.count !== 1) {
        throw new ConflictException(
          'Qualification proposal was already checked',
        );
      }
      if (!dto.acceptProposal) {
        const reopened = await tx.qualificationReviewTask.update({
          where: { id: taskId },
          data: {
            status: QualificationReviewStatus.OPEN,
            assignedTo: null,
            assignedAt: null,
            proposedDecision: null,
            proposedTier: null,
            proposedReason: null,
            proposedBy: null,
            proposedAt: null,
            checkedBy: checkerId,
            checkedAt,
            checkReason,
          },
        });
        await tx.qualificationAuditLog.create({
          data: {
            submissionId: task.submissionId,
            actorId: checkerId,
            action: 'QUALIFICATION_PROPOSAL_RETURNED',
            entityType: 'QualificationReviewTask',
            entityId: taskId,
            reason: checkReason,
            metadata: { makerId: task.proposedBy },
          },
        });
        return {
          task: reopened,
          requiresIndependentCheck: false,
          applied: false,
          startTierEvaluation: false,
        };
      }

      const approved =
        task.proposedDecision === QualificationReviewDecision.APPROVE;
      const approvedTier = approved ? task.proposedTier : null;
      if (
        approved &&
        task.kind === QualificationReviewKind.TIER &&
        task.submission.status !== QualificationSubmissionStatus.APPROVED
      ) {
        throw new ConflictException(
          'KYC approval is required before tier qualification',
        );
      }
      const recommendedTier = task.submission.evaluations[0]?.recommendedTier;
      if (
        approved &&
        approvedTier &&
        (!recommendedTier || tierRank[approvedTier] > tierRank[recommendedTier])
      ) {
        throw new ConflictException(
          'Proposed tier exceeds the latest deterministic evidence recommendation',
        );
      }
      if (approved && task.kind === 'TIER' && !approvedTier) {
        throw new ConflictException('The approval proposal has no tier');
      }

      if (approved && task.kind === 'KYC') {
        const tierQualification = await tx.tierQualification.create({
          data: {
            fixerId: task.submission.fixerId,
            submissionId: task.submissionId,
            recommendedTier: FixerTier.ECONOMY,
            approvedTier: FixerTier.ECONOMY,
            source: QualificationDecisionSource.HUMAN,
            policyVersion: task.submission.policyVersion,
            reason: task.proposedReason,
            effectiveAt: checkedAt,
            approvedBy: checkerId,
          },
        });
        const fixer = await tx.fixer.update({
          where: { id: task.submission.fixerId },
          data: {
            status: FixerStatus.APPROVED,
            verified: true,
            tier: FixerTier.ECONOMY,
          },
          select: { id: true, status: true, tier: true, verified: true },
        });
        await tx.kycSubmission.update({
          where: { id: task.submissionId },
          data: {
            status: 'APPROVED',
            reviewedAt: checkedAt,
            reviewerId: checkerId,
            decisionReason: task.proposedReason,
          },
        });
        const updatedTask = await tx.qualificationReviewTask.update({
          where: { id: taskId },
          data: {
            status: QualificationReviewStatus.DECIDED,
            decidedAt: checkedAt,
            decision: task.proposedDecision,
            checkedBy: checkerId,
            checkedAt,
            checkReason,
          },
        });
        await tx.qualificationAuditLog.create({
          data: {
            submissionId: task.submissionId,
            actorId: checkerId,
            action: 'KYC_APPROVED',
            entityType: 'TierQualification',
            entityId: tierQualification.id,
            reason: checkReason,
            metadata: {
              makerId: task.proposedBy,
              approvedTier: FixerTier.ECONOMY,
            },
          },
        });
        await tx.qualificationHandoff.upsert({
          where: {
            submissionId_kind: {
              submissionId: task.submissionId,
              kind: QualificationReviewKind.TIER,
            },
          },
          create: {
            submissionId: task.submissionId,
            kind: QualificationReviewKind.TIER,
            status: QualificationHandoffStatus.PENDING,
          },
          update: {},
        });
        return {
          task: updatedTask,
          tierQualification,
          fixer,
          requiresIndependentCheck: false,
          applied: true,
          startTierEvaluation: true,
        };
      }
      if (!approved && task.kind === 'KYC') {
        await tx.kycSubmission.update({
          where: { id: task.submissionId },
          data: {
            status: 'NEEDS_RESUBMISSION',
            reviewedAt: new Date(),
            reviewerId: checkerId,
            decisionReason: task.proposedReason,
          },
        });
        const updatedTask = await tx.qualificationReviewTask.update({
          where: { id: taskId },
          data: {
            status: QualificationReviewStatus.DECIDED,
            decidedAt: checkedAt,
            decision: task.proposedDecision,
            checkedBy: checkerId,
            checkedAt,
            checkReason,
          },
        });
        await tx.qualificationAuditLog.create({
          data: {
            submissionId: task.submissionId,
            actorId: checkerId,
            action: 'KYC_RESUBMISSION_REQUIRED',
            entityType: 'QualificationReviewTask',
            entityId: taskId,
            reason: checkReason,
            metadata: {
              makerId: task.proposedBy,
              decision: task.proposedDecision,
              fixerStatusChanged: false,
            },
          },
        });
        return {
          task: updatedTask,
          tierQualification: null,
          fixer: task.submission.fixer,
          requiresIndependentCheck: false,
          applied: true,
          startTierEvaluation: false,
        };
      }
      if (!approved && task.kind === 'TIER') {
        const updatedTask = await tx.qualificationReviewTask.update({
          where: { id: taskId },
          data: {
            status: QualificationReviewStatus.DECIDED,
            decidedAt: checkedAt,
            decision: task.proposedDecision,
            checkedBy: checkerId,
            checkedAt,
            checkReason,
          },
        });
        await tx.qualificationAuditLog.create({
          data: {
            submissionId: task.submissionId,
            actorId: checkerId,
            action: 'TIER_REJECTED',
            entityType: 'QualificationReviewTask',
            entityId: taskId,
            reason: checkReason,
            metadata: { makerId: task.proposedBy },
          },
        });
        return {
          task: updatedTask,
          tierQualification: null,
          fixer: task.submission.fixer,
          requiresIndependentCheck: false,
          applied: true,
          startTierEvaluation: false,
        };
      }
      const effectiveAt = new Date();
      const tierQualification = await tx.tierQualification.create({
        data: {
          fixerId: task.submission.fixerId,
          submissionId: task.submissionId,
          recommendedTier,
          approvedTier,
          source: QualificationDecisionSource.HUMAN,
          policyVersion: task.submission.policyVersion,
          reason: task.proposedReason,
          effectiveAt,
          approvedBy: checkerId,
        },
      });
      const fixer = await tx.fixer.update({
        where: { id: task.submission.fixerId },
        data: { tier: approvedTier as FixerTier },
        select: { id: true, status: true, tier: true, verified: true },
      });

      const updatedTask = await tx.qualificationReviewTask.update({
        where: { id: taskId },
        data: {
          status: QualificationReviewStatus.DECIDED,
          decidedAt: checkedAt,
          decision: task.proposedDecision,
          checkedBy: checkerId,
          checkedAt,
          checkReason,
        },
      });
      await tx.qualificationAuditLog.create({
        data: {
          submissionId: task.submissionId,
          actorId: checkerId,
          action: 'QUALIFICATION_DECISION_CHECKED',
          entityType: 'TierQualification',
          entityId: tierQualification.id,
          reason: checkReason,
          metadata: {
            makerId: task.proposedBy,
            decision: task.proposedDecision,
            approvedTier,
          },
        },
      });

      return {
        task: updatedTask,
        tierQualification,
        fixer,
        requiresIndependentCheck: false,
        applied: true,
        startTierEvaluation: false,
      };
    });

    let handoffStatus: QualificationHandoffStatus | undefined;
    if (result.startTierEvaluation) {
      handoffStatus = await this.processTierEvaluationHandoff(
        result.task.submissionId,
        checkerId,
      );
    }
    const { startTierEvaluation, ...response } = result;
    return handoffStatus ? { ...response, handoffStatus } : response;
  }
  async retryTierEvaluationHandoff(
    submissionId: string,
    actorId: string,
  ): Promise<QualificationHandoffStatus | undefined> {
    return this.processTierEvaluationHandoff(submissionId, actorId);
  }

  async retryDueTierEvaluationHandoffs(
    actorId: string,
    limit = 20,
  ): Promise<number> {
    const staleBefore = new Date(Date.now() - HANDOFF_LEASE_MS);
    const handoffs = await this.prisma.qualificationHandoff.findMany({
      where: {
        kind: QualificationReviewKind.TIER,
        OR: [
          {
            status: {
              in: [
                QualificationHandoffStatus.PENDING,
                QualificationHandoffStatus.FAILED,
              ],
            },
          },
          {
            status: QualificationHandoffStatus.RUNNING,
            claimedAt: { lt: staleBefore },
          },
        ],
      },
      select: { submissionId: true },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    let processed = 0;
    for (const handoff of handoffs) {
      await this.processTierEvaluationHandoff(handoff.submissionId, actorId);
      processed += 1;
    }
    return processed;
  }

  private async processTierEvaluationHandoff(
    submissionId: string,
    actorId: string,
  ): Promise<QualificationHandoffStatus | undefined> {
    const handoff = await this.prisma.qualificationHandoff.findUnique({
      where: {
        submissionId_kind: {
          submissionId,
          kind: QualificationReviewKind.TIER,
        },
      },
    });
    if (!handoff) {
      return undefined;
    }
    if (handoff.status === QualificationHandoffStatus.COMPLETED)
      return handoff.status;
    if (
      handoff.status === QualificationHandoffStatus.RUNNING &&
      handoff.claimedAt &&
      handoff.claimedAt.getTime() >= Date.now() - HANDOFF_LEASE_MS
    )
      return handoff.status;
    const claimed = await this.prisma.qualificationHandoff.updateMany({
      where: {
        id: handoff.id,
        OR: [
          {
            status: {
              in: [
                QualificationHandoffStatus.PENDING,
                QualificationHandoffStatus.FAILED,
              ],
            },
          },
          {
            status: QualificationHandoffStatus.RUNNING,
            claimedAt: { lt: new Date(Date.now() - HANDOFF_LEASE_MS) },
          },
        ],
      },
      data: {
        status: QualificationHandoffStatus.RUNNING,
        attempts: { increment: 1 },
        claimedAt: new Date(),
        lastError: null,
      },
    });
    if (claimed.count !== 1) {
      const current = await this.prisma.qualificationHandoff.findUnique({
        where: { id: handoff.id },
        select: { status: true },
      });
      return current?.status || QualificationHandoffStatus.RUNNING;
    }
    try {
      await this.tierEvaluation.evaluateTier(submissionId, actorId);
      await this.prisma.qualificationHandoff.update({
        where: { id: handoff.id },
        data: {
          status: QualificationHandoffStatus.COMPLETED,
          completedAt: new Date(),
          lastError: null,
        },
      });
      return QualificationHandoffStatus.COMPLETED;
    } catch (error: unknown) {
      await this.prisma.qualificationHandoff.update({
        where: { id: handoff.id },
        data: {
          status: QualificationHandoffStatus.FAILED,
          claimedAt: null,
          lastError: error instanceof Error ? error.message : String(error),
        },
      });
      return QualificationHandoffStatus.FAILED;
    }
  }
}
