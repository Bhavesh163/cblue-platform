import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FixerStatus,
  QualificationDecisionSource,
  QualificationReviewStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  QualificationReviewDecision,
  QualificationReviewDecisionDto,
} from './dto/qualification-review-decision.dto';

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
              take: 3,
            },
          },
        },
      },
    });
  }

  async assignTask(adminId: string, taskId: string) {
    const task = await this.prisma.qualificationReviewTask.findUnique({
      where: { id: taskId },
      select: { id: true, status: true, assignedTo: true },
    });
    if (!task) throw new NotFoundException('Qualification review task not found');
    if (task.status !== QualificationReviewStatus.OPEN) {
      throw new ConflictException('Qualification review task is no longer open');
    }

    return this.prisma.qualificationReviewTask.update({
      where: { id: taskId },
      data: {
        status: QualificationReviewStatus.ASSIGNED,
        assignedTo: adminId,
        assignedAt: new Date(),
      },
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
            include: { fixer: true },
          },
        },
      });
      if (!task) throw new NotFoundException('Qualification review task not found');
      if (task.status !== QualificationReviewStatus.ASSIGNED) {
        throw new ConflictException('Qualification review task must be assigned first');
      }
      if (task.assignedTo !== adminId) {
        throw new ConflictException('Qualification review task belongs to another admin');
      }

      const approved = dto.decision === QualificationReviewDecision.APPROVE;
      const effectiveAt = approved ? new Date() : null;
      const tierQualification = await tx.tierQualification.create({
        data: {
          fixerId: task.submission.fixerId,
          submissionId: task.submissionId,
          approvedTier: approved ? dto.approvedTier : null,
          source: QualificationDecisionSource.HUMAN,
          policyVersion: task.submission.policyVersion,
          reason: dto.reason,
          effectiveAt,
          approvedBy: adminId,
        },
      });

      const fixer = await tx.fixer.update({
        where: { id: task.submission.fixerId },
        data: {
          status: approved ? FixerStatus.APPROVED : FixerStatus.REJECTED,
          verified: approved,
          ...(approved && dto.approvedTier
            ? { tier: dto.approvedTier }
            : {}),
        },
        select: { id: true, status: true, tier: true, verified: true },
      });

      await tx.kycSubmission.update({
        where: { id: task.submissionId },
        data: {
          status: approved ? 'APPROVED' : 'REJECTED',
          reviewedAt: new Date(),
          reviewerId: adminId,
          decisionReason: dto.reason,
        },
      });
      const updatedTask = await tx.qualificationReviewTask.update({
        where: { id: taskId },
        data: {
          status: QualificationReviewStatus.DECIDED,
          decidedAt: new Date(),
          decision: dto.decision,
        },
      });
      await tx.qualificationAuditLog.create({
        data: {
          submissionId: task.submissionId,
          actorId: adminId,
          action: 'QUALIFICATION_DECIDED',
          entityType: 'TierQualification',
          entityId: tierQualification.id,
          reason: dto.reason,
          metadata: {
            decision: dto.decision,
            approvedTier: dto.approvedTier || null,
          },
        },
      });

      return { task: updatedTask, tierQualification, fixer };
    });
  }
}
