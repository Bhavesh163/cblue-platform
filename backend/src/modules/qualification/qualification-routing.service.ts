import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QualificationReasonCode } from './qualification-assessment.types';

const REQUIRED_KYC_DOCUMENT_TYPES = [
  'id-front',
  'id-back',
  'selfie-with-id',
] as const;
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

  constructor(private readonly prisma: PrismaService) {}

  async routeSubmission(
    submissionId: string,
    actorId: string,
  ): Promise<KycRoutingDecision> {
    try {
      return await this.prisma.$transaction(async (tx) => {
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
            documents: {
              where: {
                isActive: true,
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

        for (const documentType of REQUIRED_KYC_DOCUMENT_TYPES) {
          const document = submission.documents.find(
            (candidate) => candidate.documentType === documentType,
          );
          if (!document) {
            unavailable = true;
            addReason('PROVIDER_UNAVAILABLE');
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

        if (ROUTED_STATUSES.has(submission.status)) return decision;

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
            await tx.qualificationReviewTask.create({
              data: {
                submissionId,
                kind: 'KYC',
                status: 'OPEN',
                reasonCodes: this.json(reasonCodes),
              },
            });
          }
        }

        return decision;
      });
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
    confidence: number | null;
  }): KycRoutingDecision['status'] {
    if (input.hardFailure) return 'NEEDS_RESUBMISSION';
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
