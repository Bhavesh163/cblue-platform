import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FixerStatus,
  FixerTier,
  QualificationDecisionSource,
  QualificationReviewStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  QualificationReviewDecision,
  QualificationReviewDecisionDto,
} from './dto/qualification-review-decision.dto';
import { QualificationReviewCheckDto } from './dto/qualification-review-check.dto';

const tierRank: Record<FixerTier, number> = {
  ECONOMY: 0,
  STANDARD: 1,
  CORPORATE: 2,
  SPECIALIST: 3,
  EXPERT: 4,
};

@Injectable()
export class QualificationReviewService {
  constructor(private readonly prisma: PrismaService) {}

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
      if (!exists) throw new NotFoundException('Qualification review task not found');
      throw new ConflictException('Qualification review task is no longer open');
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
    if (
      dto.decision === QualificationReviewDecision.APPROVE &&
      !dto.approvedTier
    ) {
      throw new ConflictException('An approved tier is required for approval');
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
      if (!task) throw new NotFoundException('Qualification review task not found');
      if (
        task.status !== QualificationReviewStatus.ASSIGNED ||
        task.proposedAt
      ) {
        throw new ConflictException(
          'Qualification review task is not awaiting a maker decision',
        );
      }
      if (task.assignedTo !== adminId) {
        throw new ConflictException('Qualification review task belongs to another admin');
      }

      const approved = dto.decision === QualificationReviewDecision.APPROVE;
      const recommendedTier = task.submission.evaluations[0]?.recommendedTier;
      if (
        approved &&
        dto.approvedTier &&
        (!recommendedTier || tierRank[dto.approvedTier] > tierRank[recommendedTier])
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
          proposedTier: approved ? dto.approvedTier : null,
          proposedReason: dto.reason.trim(),
          proposedBy: adminId,
          proposedAt,
        },
      });
      if (proposed.count !== 1) {
        throw new ConflictException('Qualification proposal was already submitted');
      }
      const updatedTask = {
        ...task,
        proposedDecision: dto.decision,
        proposedTier: approved ? dto.approvedTier : null,
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
    return this.prisma.$transaction(async (tx) => {
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
      if (!task) throw new NotFoundException('Qualification review task not found');
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
        };
      }

      const approved =
        task.proposedDecision === QualificationReviewDecision.APPROVE;
      const approvedTier = approved ? task.proposedTier : null;
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
      if (approved && !approvedTier) {
        throw new ConflictException('The approval proposal has no tier');
      }

      const effectiveAt = approved ? new Date() : null;
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
        data: {
          status: approved ? FixerStatus.APPROVED : FixerStatus.REJECTED,
          verified: approved,
          ...(approvedTier ? { tier: approvedTier } : {}),
        },
        select: { id: true, status: true, tier: true, verified: true },
      });
      await tx.kycSubmission.update({
        where: { id: task.submissionId },
        data: {
          status: approved ? 'APPROVED' : 'REJECTED',
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
      };
    });
  }
}
