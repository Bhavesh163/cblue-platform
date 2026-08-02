import {
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { QualificationReasonCode } from './qualification-assessment.types';

const REQUIRED_KYC_DOCUMENT_TYPES = ['id-front', 'selfie-with-id'] as const;
const HARD_FAILURE_REASON_CODES = new Set<QualificationReasonCode>([
  'WRONG_DOCUMENT_TYPE',
  'UNREADABLE_DOCUMENT',
  'EXPIRED_ID',
  'IDENTITY_CONTRADICTION',
  'LIVENESS_FAILED',
]);
const REASON_CODES = new Set<QualificationReasonCode>([
  'DOCUMENT_VALID',
  'WRONG_DOCUMENT_TYPE',
  'UNREADABLE_DOCUMENT',
  'EXPIRED_ID',
  'IDENTITY_CONTRADICTION',
  'INVALID_ID_NUMBER',
  'SELFIE_REVIEW_REQUIRED',
  'AFFIDAVIT_REVIEW_REQUIRED',
  'AFFIDAVIT_EXPIRED',
  'MISSING_REQUIRED_EVIDENCE',
  'LIVENESS_FAILED',
  'PROVIDER_UNAVAILABLE',
  'HUMAN_REVIEW_REQUIRED',
]);
const ROUTED_STATUSES = new Set([
  'NEEDS_RESUBMISSION',
  'NEEDS_MORE_EVIDENCE',
  'NEEDS_REVIEW',
  'AI_PRECLEARED',
]);
const MAX_CONSECUTIVE_HARD_FAILURES = 3;
const RESUBMISSION_COOLDOWN_MS = 15 * 60 * 1000;

export type KycRoutingDecision = {
  status:
    | 'NEEDS_RESUBMISSION'
    | 'NEEDS_MORE_EVIDENCE'
    | 'NEEDS_REVIEW'
    | 'AI_PRECLEARED';
  confidence: number | null;
  reasonCodes: QualificationReasonCode[];
  humanReviewRequired: true;
  lockedUntil: Date | null;
};

@Injectable()
export class QualificationRoutingService {
  private readonly logger = new Logger(QualificationRoutingService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notifications?: NotificationService,
  ) {}

  async routeSubmission(
    submissionId: string,
    actorId: string,
  ): Promise<KycRoutingDecision> {
    try {
      let applicantUserId: string | null = null;
      const decision = await this.prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          'SELECT pg_advisory_xact_lock(hashtext($1))',
          submissionId,
        );
        const submission = await tx.kycSubmission.findUnique({
          where: { id: submissionId },
          select: {
            id: true,
            status: true,
            failedAttempts: true,
            lockedUntil: true,
            fixer: { select: { userId: true } },
            documents: {
              where: {
                isActive: true,
                lifecycleState: 'READY',
                documentType: { in: [...REQUIRED_KYC_DOCUMENT_TYPES] },
              },
              select: {
                id: true,
                documentType: true,
                checksumSha256: true,
                assessedAt: true,
                assessmentReasonCodes: true,
              },
            },
          },
        });
        if (!submission) {
          throw new NotFoundException('Qualification submission not found');
        }
        applicantUserId = submission.fixer?.userId ?? null;

        const checksums = submission.documents.map(
          (document) => document.checksumSha256,
        );
        const evaluations = checksums.length
          ? await tx.qualificationEvaluation.findMany({
              where: {
                submissionId,
                inputHash: { in: checksums },
                status: 'COMPLETED',
              },
              orderBy: { createdAt: 'desc' },
              select: {
                inputHash: true,
                confidence: true,
                createdAt: true,
              },
            })
          : [];
        const latestEvaluationByChecksum = new Map<
          string,
          { confidence: number | null }
        >();
        for (const evaluation of evaluations) {
          if (!latestEvaluationByChecksum.has(evaluation.inputHash)) {
            latestEvaluationByChecksum.set(evaluation.inputHash, evaluation);
          }
        }

        const reasonCodes: QualificationReasonCode[] = [];
        const addReason = (reasonCode: QualificationReasonCode) => {
          if (!reasonCodes.includes(reasonCode)) reasonCodes.push(reasonCode);
        };
        const confidences: number[] = [];
        let unavailable = false;
        let missingEvidence = false;

        for (const documentType of REQUIRED_KYC_DOCUMENT_TYPES) {
          const document = submission.documents.find(
            (candidate) => candidate.documentType === documentType,
          );
          if (!document) {
            missingEvidence = true;
            addReason('MISSING_REQUIRED_EVIDENCE');
            continue;
          }
          for (const reasonCode of this.readReasonCodes(
            document.assessmentReasonCodes,
          )) {
            addReason(reasonCode);
          }
          const evaluation = latestEvaluationByChecksum.get(
            document.checksumSha256,
          );
          if (
            !document.assessedAt ||
            !evaluation ||
            evaluation.confidence === null
          ) {
            unavailable = true;
            addReason('PROVIDER_UNAVAILABLE');
          } else {
            confidences.push(evaluation.confidence);
          }
        }
        unavailable ||= reasonCodes.includes('PROVIDER_UNAVAILABLE');
        addReason('HUMAN_REVIEW_REQUIRED');

        const confidence =
          confidences.length > 0 ? Math.min(...confidences) : null;
        const hardFailure = reasonCodes.some((reasonCode) =>
          HARD_FAILURE_REASON_CODES.has(reasonCode),
        );
        const status = this.statusFor({
          hardFailure,
          unavailable,
          missingEvidence,
          confidence,
        });
        const failedAttempts = hardFailure
          ? Math.min(
              submission.failedAttempts + 1,
              MAX_CONSECUTIVE_HARD_FAILURES,
            )
          : submission.failedAttempts;
        const lockedUntil =
          hardFailure && failedAttempts >= MAX_CONSECUTIVE_HARD_FAILURES
            ? new Date(Date.now() + RESUBMISSION_COOLDOWN_MS)
            : null;
        const decision: KycRoutingDecision = {
          status,
          confidence,
          reasonCodes,
          humanReviewRequired: true,
          lockedUntil: ROUTED_STATUSES.has(submission.status)
            ? submission.lockedUntil
            : lockedUntil,
        };

        const alreadyRouted = ROUTED_STATUSES.has(submission.status);
        if (alreadyRouted && submission.status === decision.status) {
          return decision;
        }

        const submittedAt = new Date();
        await tx.kycSubmission.update({
          where: { id: submissionId },
          data: {
            status,
            submittedAt,
            failedAttempts,
            lockedUntil,
          },
        });
        await tx.qualificationAuditLog.create({
          data: {
            submissionId,
            actorId,
            action: 'QUALIFICATION_ROUTED',
            entityType: 'KycSubmission',
            entityId: submissionId,
            reason: 'Active KYC evidence routed from persisted assessments',
            metadata: this.json({
              confidence,
              reasonCodes,
              humanReviewRequired: true,
            }),
          },
        });

        if (status === 'NEEDS_REVIEW' || status === 'AI_PRECLEARED') {
          const existingReviewTask = await tx.qualificationReviewTask.findFirst(
            {
              where: {
                submissionId,
                kind: 'KYC',
                status: { in: ['OPEN', 'ASSIGNED'] },
              },
              select: { id: true },
            },
          );
          if (!existingReviewTask) {
            const created = await tx.qualificationReviewTask.createMany({
              data: {
                submissionId,
                kind: 'KYC',
                status: 'OPEN',
                reasonCodes: this.json(reasonCodes),
              },
              skipDuplicates: true,
            });
            if (created.count === 0) {
              await tx.qualificationReviewTask.findFirst({
                where: {
                  submissionId,
                  kind: 'KYC',
                  status: { in: ['OPEN', 'ASSIGNED'] },
                },
                select: { id: true },
              });
            }
          }
        }

        return decision;
      });
      if (
        applicantUserId &&
        decision.status === 'NEEDS_RESUBMISSION' &&
        this.notifications
      ) {
        try {
          await this.notifications.send({
            userId: applicantUserId,
            type: NotificationType.IN_APP,
            title: 'Information update needed',
            body: 'Please update your identity information and submit again so we can continue your registration.',
            dedupeKey: 'qualification:' + submissionId + ':' + decision.status,
            data: { submissionId, status: decision.status },
          });
          await this.notifications.send({
            userId: applicantUserId,
            type: NotificationType.EMAIL,
            title: 'Information update needed',
            body: 'Please update your identity information and submit again so we can continue your registration.',
            dedupeKey:
              'qualification-email:' + submissionId + ':' + decision.status,
            data: { submissionId, status: decision.status },
          });
        } catch (notificationError) {
          this.logger.warn(
            'Qualification resubmission notification could not be queued',
            notificationError instanceof Error
              ? notificationError.message
              : String(notificationError),
          );
        }
      }
      return decision;
    } catch (error) {
      this.logger.error(
        `Failed to route qualification submission ${submissionId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  private statusFor(input: {
    hardFailure: boolean;
    unavailable: boolean;
    missingEvidence: boolean;
    confidence: number | null;
  }): KycRoutingDecision['status'] {
    if (input.hardFailure) return 'NEEDS_RESUBMISSION';
    if (input.missingEvidence) return 'NEEDS_MORE_EVIDENCE';
    if (input.unavailable || input.confidence === null) return 'NEEDS_REVIEW';
    if (input.confidence >= 90) return 'AI_PRECLEARED';
    if (input.confidence >= 60) return 'NEEDS_REVIEW';
    return 'NEEDS_MORE_EVIDENCE';
  }

  private readReasonCodes(value: unknown): QualificationReasonCode[] {
    if (!Array.isArray(value)) return [];
    return value.filter(
      (reasonCode): reasonCode is QualificationReasonCode =>
        typeof reasonCode === 'string' &&
        REASON_CODES.has(reasonCode as QualificationReasonCode),
    );
  }

  private json(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
