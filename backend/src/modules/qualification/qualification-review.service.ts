import {
  ConflictException,
  Injectable,
  Logger,
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
  Prisma,
} from '@prisma/client';
import { Optional } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import {
  NotificationService,
  queueNotificationInTransaction,
} from '../notification/notification.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  QualificationReviewDecision,
  QualificationReviewDecisionDto,
} from './dto/qualification-review-decision.dto';
import { QualificationReviewCheckDto } from './dto/qualification-review-check.dto';
import { QualificationEvaluationService } from './qualification-evaluation.service';
const HANDOFF_LEASE_MS = 5 * 60 * 1000;
const REVIEW_CLAIM_LEASE_MS = 30 * 60 * 1000;
const REQUIRED_KYC_DOCUMENT_TYPES = ['id-front', 'selfie-with-id'] as const;

function getReviewReadiness(task: {
  kind: QualificationReviewKind;
  submission: {
    status: QualificationSubmissionStatus;
    documents?: Array<{
      documentType: string;
      evidenceStatus: string;
      lifecycleState: string;
      isActive: boolean;
    }>;
  };
}) {
  if (task.kind === 'KYC') {
    const documents = task.submission.documents || [];
    const requiredEvidence = REQUIRED_KYC_DOCUMENT_TYPES.map((documentType) => {
      const document = documents.find(
        (candidate) =>
          candidate.documentType === documentType &&
          candidate.isActive &&
          candidate.lifecycleState === 'READY',
      );
      return {
        documentType,
        status: document?.evidenceStatus || 'MISSING',
        ready: document?.evidenceStatus === 'VALIDATED',
      };
    });
    return {
      canApprove: requiredEvidence.every((item) => item.ready),
      blockingReason: requiredEvidence.every((item) => item.ready)
        ? null
        : 'Validate the ID front and selfie with ID before approving KYC.',
      requiredEvidence,
    };
  }

  const canApprove =
    task.submission.status === QualificationSubmissionStatus.APPROVED;
  return {
    canApprove,
    blockingReason: canApprove
      ? null
      : 'Approve KYC before making a tier decision.',
    requiredEvidence: [],
  };
}

async function queueDecisionNotifications(
  tx: Prisma.TransactionClient,
  userId: string,
  taskId: string,
  kind: QualificationReviewKind,
  decision: QualificationReviewDecision,
  reason?: string | null,
  approvedTier?: FixerTier | null,
) {
  const content = buildDecisionNotification(
    kind,
    decision,
    reason,
    approvedTier,
  );
  const base = {
    userId,
    type: NotificationType.IN_APP,
    title: content.title,
    body: content.body,
    dedupeKey: 'qualification-decision:' + taskId + ':' + decision,
    data: {
      taskId,
      kind,
      decision,
      approved: decision === QualificationReviewDecision.APPROVE,
      approvedTier: approvedTier || null,
    },
  };
  await queueNotificationInTransaction(tx, base);
  await queueNotificationInTransaction(tx, {
    ...base,
    type: NotificationType.EMAIL,
    dedupeKey: 'qualification-decision-email:' + taskId + ':' + decision,
  });
}

function buildDecisionNotification(
  kind: QualificationReviewKind,
  decision: QualificationReviewDecision,
  reason?: string | null,
  approvedTier?: FixerTier | null,
) {
  const approved = decision === QualificationReviewDecision.APPROVE;
  if (kind === QualificationReviewKind.KYC) {
    return approved
      ? {
          title: 'Identity review approved',
          body: 'Your identity review is approved. Your partner profile is active at the Economy tier while your qualification evidence is reviewed.',
        }
      : {
          title: 'Identity information update needed',
          body:
            'Your identity evidence needs an update.' +
            (reason ? ' ' + reason : ''),
        };
  }
  return approved
    ? {
        title: 'Partner tier approved',
        body:
          'Your approved partner tier is ' +
          (approvedTier || FixerTier.ECONOMY) +
          '.',
      }
    : {
        title: 'Tier review complete',
        body:
          'Your current approved tier remains unchanged.' +
          (reason ? ' ' + reason : ''),
      };
}

function parseReviewDecision(
  value: string | null,
): QualificationReviewDecision {
  if (value === QualificationReviewDecision.APPROVE) {
    return QualificationReviewDecision.APPROVE;
  }
  if (value === QualificationReviewDecision.REJECT) {
    return QualificationReviewDecision.REJECT;
  }
  throw new ConflictException('Qualification review decision is invalid');
}

const tierRank: Record<FixerTier, number> = {
  ECONOMY: 0,
  STANDARD: 1,
  CORPORATE: 2,
  SPECIALIST: 3,
  EXPERT: 4,
};

@Injectable()
export class QualificationReviewService {
  private readonly logger = new Logger(QualificationReviewService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tierEvaluation: QualificationEvaluationService,
    @Optional() private readonly notifications?: NotificationService,
  ) {}

  async listTasks(status?: QualificationReviewStatus) {
    const where: Prisma.QualificationReviewTaskWhereInput = {
      status: status || {
        in: [
          QualificationReviewStatus.OPEN,
          QualificationReviewStatus.ASSIGNED,
        ],
      },
      OR: [
        {
          kind: QualificationReviewKind.KYC,
          submission: {
            status: {
              in: [
                QualificationSubmissionStatus.NEEDS_REVIEW,
                QualificationSubmissionStatus.AI_PRECLEARED,
              ],
            },
          },
        },
        {
          kind: QualificationReviewKind.TIER,
          submission: { status: QualificationSubmissionStatus.APPROVED },
        },
      ],
    };
    const tasks = await this.prisma.qualificationReviewTask.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        submission: {
          include: {
            fixer: {
              include: {
                user: { select: { id: true, name: true, email: true } },
                qualificationSubmissions: {
                  orderBy: { version: 'desc' },
                  take: 1,
                  select: { id: true, version: true },
                },
              },
            },
            documents: {
              where: {
                isActive: true,
                lifecycleState: { not: 'DELETE_PENDING' },
                documentType: { not: 'id-back' },
              },
              select: {
                id: true,
                documentType: true,
                contentType: true,
                sizeBytes: true,
                evidenceStatus: true,
                assessmentReasonCodes: true,
                extractedFields: true,
                extractionProvider: true,
                extractionModel: true,
                extractedAt: true,
                credentialVerification: true,
                credentialVerifiedAt: true,
                credentialVerifications: {
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                  select: {
                    status: true,
                    issuerType: true,
                    issuerName: true,
                    credentialType: true,
                    credentialCount: true,
                    verificationMethod: true,
                    externalReference: true,
                    projectValueBaht: true,
                    corporateEndorsement: true,
                    verifiedAt: true,
                    createdAt: true,
                  },
                },
                expiresAt: true,
                identityNumberLast4: true,
                identityExpiryDate: true,
                subjectNameHash: true,
                legalHoldUntil: true,
                isActive: true,
                lifecycleState: true,
                assessmentJob: {
                  select: {
                    status: true,
                    attempts: true,
                    lastError: true,
                    nextAttemptAt: true,
                    completedAt: true,
                  },
                },
                complianceAccesses: {
                  orderBy: { createdAt: 'desc' },
                  take: 10,
                  select: {
                    actorId: true,
                    purpose: true,
                    caseReference: true,
                    legalHoldUntil: true,
                    createdAt: true,
                  },
                },
                createdAt: true,
              },
              orderBy: { createdAt: 'asc' },
            },
            evaluations: {
              select: {
                id: true,
                provider: true,
                policyVersion: true,
                status: true,
                risk: true,
                recommendedTier: true,
                confidence: true,
                identityConfidence: true,
                documentAuthenticityConfidence: true,
                faceMatchConfidence: true,
                livenessConfidence: true,
                credentialConfidence: true,
                tierEligibilityScore: true,
                humanReviewRequired: true,
                findings: {
                  select: {
                    code: true,
                    severity: true,
                    claim: true,
                    result: true,
                    confidence: true,
                    details: true,
                    createdAt: true,
                  },
                  orderBy: { createdAt: 'desc' },
                  take: 20,
                },
                completedAt: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
            auditLogs: {
              orderBy: { createdAt: 'desc' },
              take: 20,
              select: {
                id: true,
                actorId: true,
                action: true,
                reason: true,
                metadata: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });
    const latestByKind = new Map<string, (typeof tasks)[number]>();
    for (const task of tasks) {
      const latestSubmission =
        task.submission.fixer.qualificationSubmissions[0];
      if (!latestSubmission || latestSubmission.id !== task.submission.id) {
        continue;
      }
      const key = task.submission.fixer.id + ':' + task.kind;
      const current = latestByKind.get(key);
      if (
        !current ||
        task.submission.version > current.submission.version ||
        (task.submission.version === current.submission.version &&
          task.createdAt.getTime() > current.createdAt.getTime())
      )
        latestByKind.set(key, task);
    }
    return [...latestByKind.values()]
      .sort(
        (left, right) =>
          right.priority - left.priority ||
          right.createdAt.getTime() - left.createdAt.getTime(),
      )
      .map((task) => ({
        ...task,
        reviewReadiness: getReviewReadiness(task),
      }));
  }

  async assignTask(adminId: string, taskId: string) {
    const now = new Date();
    const staleBefore = new Date(now.getTime() - REVIEW_CLAIM_LEASE_MS);
    const claimed = await this.prisma.qualificationReviewTask.updateMany({
      where: {
        id: taskId,
        proposedAt: null,
        OR: [
          { status: QualificationReviewStatus.OPEN },
          {
            status: QualificationReviewStatus.ASSIGNED,
            assignedAt: { lt: staleBefore },
          },
        ],
      },
      data: {
        status: QualificationReviewStatus.ASSIGNED,
        assignedTo: adminId,
        assignedAt: now,
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
        'Qualification review task is currently assigned to another administrator',
      );
    }
    return this.prisma.qualificationReviewTask.findUnique({
      where: { id: taskId },
    });
  }

  async releaseTask(adminId: string, taskId: string) {
    const task = await this.prisma.qualificationReviewTask.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        submissionId: true,
        status: true,
        assignedTo: true,
        proposedAt: true,
      },
    });
    if (!task)
      throw new NotFoundException('Qualification review task not found');
    if (
      task.status !== QualificationReviewStatus.ASSIGNED ||
      task.assignedTo !== adminId ||
      task.proposedAt
    ) {
      throw new ConflictException(
        'Qualification review task cannot be released',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.qualificationReviewTask.updateMany({
        where: {
          id: taskId,
          status: QualificationReviewStatus.ASSIGNED,
          assignedTo: adminId,
          proposedAt: null,
        },
        data: {
          status: QualificationReviewStatus.OPEN,
          assignedTo: null,
          assignedAt: null,
        },
      });
      if (updated.count !== 1)
        throw new ConflictException(
          'Qualification review task changed while releasing',
        );
      await tx.qualificationAuditLog.create({
        data: {
          submissionId: task.submissionId,
          actorId: adminId,
          action: 'QUALIFICATION_REVIEW_RELEASED',
          entityType: 'QualificationReviewTask',
          entityId: taskId,
          reason: 'Administrator released the review claim',
        },
      });
      return tx.qualificationReviewTask.findUnique({ where: { id: taskId } });
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
    // Finalize the decision in the same transaction as the proposal metadata.
    return this.checkTask(
      adminId,
      taskId,
      {
        acceptProposal: true,
        reason,
      },
      {
        decision: dto.decision,
        approvedTier: dto.approvedTier,
        reason,
      },
    );
  }

  async checkTask(
    checkerId: string,
    taskId: string,
    dto: QualificationReviewCheckDto,
    directDecision?: {
      decision: QualificationReviewDecision;
      approvedTier?: FixerTier;
      reason: string;
    },
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const loadedTask = await tx.qualificationReviewTask.findUnique({
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
      if (!loadedTask)
        throw new NotFoundException('Qualification review task not found');
      let task = loadedTask;
      if (directDecision) {
        if (
          task.status !== QualificationReviewStatus.ASSIGNED ||
          task.proposedAt ||
          task.assignedTo !== checkerId
        ) {
          throw new ConflictException(
            'Qualification review task is not awaiting an administrator decision',
          );
        }
        const approved =
          directDecision.decision === QualificationReviewDecision.APPROVE;
        const recommendedTier = task.submission.evaluations[0]?.recommendedTier;
        if (
          approved &&
          task.kind !== QualificationReviewKind.KYC &&
          !directDecision.approvedTier
        ) {
          throw new ConflictException(
            'An approved tier is required for TIER approval',
          );
        }
        if (approved && task.kind === 'KYC' && directDecision.approvedTier) {
          throw new ConflictException('KYC approval cannot include a tier');
        }
        if (
          approved &&
          task.kind !== QualificationReviewKind.KYC &&
          directDecision.approvedTier &&
          (!recommendedTier ||
            tierRank[directDecision.approvedTier] > tierRank[recommendedTier])
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
            assignedTo: checkerId,
            proposedAt: null,
          },
          data: {
            proposedDecision: directDecision.decision,
            proposedTier:
              approved && task.kind !== QualificationReviewKind.KYC
                ? directDecision.approvedTier
                : null,
            proposedReason: directDecision.reason,
            proposedBy: checkerId,
            proposedAt,
          },
        });
        if (proposed.count !== 1) {
          throw new ConflictException(
            'Qualification decision was already submitted',
          );
        }
        await tx.qualificationAuditLog.create({
          data: {
            submissionId: task.submissionId,
            actorId: checkerId,
            action: 'QUALIFICATION_DECISION_PROPOSED',
            entityType: 'QualificationReviewTask',
            entityId: taskId,
            reason: directDecision.reason,
            metadata: {
              decision: directDecision.decision,
              approvedTier: directDecision.approvedTier || null,
              requiresIndependentCheck: false,
            },
          },
        });
        task = {
          ...task,
          proposedDecision: directDecision.decision,
          proposedTier:
            approved && task.kind !== QualificationReviewKind.KYC
              ? (directDecision.approvedTier ?? null)
              : null,
          proposedReason: directDecision.reason,
          proposedBy: checkerId,
          proposedAt,
        };
      }
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

      const reviewDecision = parseReviewDecision(task.proposedDecision);
      if (
        dto.acceptProposal &&
        reviewDecision === QualificationReviewDecision.APPROVE &&
        task.kind === 'KYC'
      ) {
        const documents = await tx.kycDocument.findMany({
          where: {
            submissionId: task.submissionId,
            isActive: true,
            lifecycleState: 'READY',
          },
          select: { documentType: true, evidenceStatus: true },
        });
        const allValidated = REQUIRED_KYC_DOCUMENT_TYPES.every((type) =>
          documents.some(
            (document) =>
              document.documentType === type &&
              document.evidenceStatus === 'VALIDATED',
          ),
        );
        if (!allValidated) {
          throw new ConflictException(
            'All required KYC evidence must be validated before approval',
          );
        }
      }

      const approved = reviewDecision === QualificationReviewDecision.APPROVE;
      const approvedTier = approved ? task.proposedTier : null;
      if (task.kind === 'KYC') {
        await tx.qualificationReviewTask.updateMany({
          where: {
            id: { not: taskId },
            kind: QualificationReviewKind.KYC,
            status: {
              in: [
                QualificationReviewStatus.OPEN,
                QualificationReviewStatus.ASSIGNED,
              ],
            },
            submission: { fixerId: task.submission.fixerId },
          },
          data: {
            status: QualificationReviewStatus.DECIDED,
            decision: 'SUPERSEDED_BY_NEWER_SUBMISSION',
            decidedAt: checkedAt,
          },
        });
      }
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
        await queueDecisionNotifications(
          tx,
          task.submission.fixer.userId,
          taskId,
          task.kind,
          reviewDecision,
          task.proposedReason,
          task.proposedTier,
        );
        return {
          task: updatedTask,
          tierQualification,
          fixer,
          requiresIndependentCheck: false,
          applied: true,
          startTierEvaluation: true,
          notificationUserId: task.submission.fixer.userId,
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
        await queueDecisionNotifications(
          tx,
          task.submission.fixer.userId,
          taskId,
          task.kind,
          reviewDecision,
          task.proposedReason,
          task.proposedTier,
        );
        return {
          task: updatedTask,
          tierQualification: null,
          fixer: task.submission.fixer,
          requiresIndependentCheck: false,
          applied: true,
          startTierEvaluation: false,
          notificationUserId: task.submission.fixer.userId,
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
        await queueDecisionNotifications(
          tx,
          task.submission.fixer.userId,
          taskId,
          task.kind,
          reviewDecision,
          task.proposedReason,
          task.proposedTier,
        );
        return {
          task: updatedTask,
          tierQualification: null,
          fixer: task.submission.fixer,
          requiresIndependentCheck: false,
          applied: true,
          startTierEvaluation: false,
          notificationUserId: task.submission.fixer.userId,
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

      await queueDecisionNotifications(
        tx,
        task.submission.fixer.userId,
        taskId,
        task.kind,
        reviewDecision,
        task.proposedReason,
        task.proposedTier,
      );
      return {
        task: updatedTask,
        tierQualification,
        fixer,
        requiresIndependentCheck: false,
        applied: true,
        startTierEvaluation: false,
        notificationUserId: task.submission.fixer.userId,
      };
    });

    if (result.applied && result.notificationUserId && this.notifications) {
      const resultDecision = parseReviewDecision(result.task.decision);
      const content = buildDecisionNotification(
        result.task.kind,
        resultDecision,
        result.task.proposedReason,
        result.tierQualification?.approvedTier,
      );
      const approved = resultDecision === QualificationReviewDecision.APPROVE;
      try {
        await this.notifications.send({
          userId: result.notificationUserId,
          type: NotificationType.IN_APP,
          title: content.title,
          body: content.body,
          dedupeKey:
            'qualification-decision:' +
            result.task.id +
            ':' +
            result.task.decision,
          data: {
            taskId: result.task.id,
            kind: result.task.kind,
            decision: result.task.decision,
            approved,
          },
        });
        await this.notifications.send({
          userId: result.notificationUserId,
          type: NotificationType.EMAIL,
          title: content.title,
          body: content.body,
          data: {
            taskId: result.task.id,
            kind: result.task.kind,
            decision: result.task.decision,
          },
          dedupeKey:
            'qualification-decision-email:' +
            result.task.id +
            ':' +
            result.task.decision,
        });
      } catch (error) {
        this.logger.error(
          'Qualification decision notification failed',
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    let handoffStatus: QualificationHandoffStatus | undefined;
    if (result.startTierEvaluation) {
      handoffStatus = await this.processTierEvaluationHandoff(
        result.task.submissionId,
        checkerId,
      );
    }
    const { startTierEvaluation, notificationUserId, ...response } = result;
    void startTierEvaluation;
    void notificationUserId;
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
    const claimAt = new Date();
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
        claimedAt: claimAt,
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
      const completed = await this.prisma.qualificationHandoff.updateMany({
        where: {
          id: handoff.id,
          status: QualificationHandoffStatus.RUNNING,
          claimedAt: claimAt,
        },
        data: {
          status: QualificationHandoffStatus.COMPLETED,
          completedAt: new Date(),
          lastError: null,
        },
      });
      if (completed.count !== 1) {
        const current = await this.prisma.qualificationHandoff.findUnique({
          where: { id: handoff.id },
          select: { status: true },
        });
        return current?.status || QualificationHandoffStatus.RUNNING;
      }
      return QualificationHandoffStatus.COMPLETED;
    } catch (error: unknown) {
      const failed = await this.prisma.qualificationHandoff.updateMany({
        where: {
          id: handoff.id,
          status: QualificationHandoffStatus.RUNNING,
          claimedAt: claimAt,
        },
        data: {
          status: QualificationHandoffStatus.FAILED,
          claimedAt: null,
          lastError: error instanceof Error ? error.message : String(error),
        },
      });
      if (failed.count !== 1) {
        const current = await this.prisma.qualificationHandoff.findUnique({
          where: { id: handoff.id },
          select: { status: true },
        });
        return current?.status || QualificationHandoffStatus.RUNNING;
      }
      return QualificationHandoffStatus.FAILED;
    }
  }
}
