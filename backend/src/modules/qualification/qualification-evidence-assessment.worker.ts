import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { QualificationEvaluationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QualificationAssessmentService } from './qualification-assessment.service';
import { QualificationEvaluationService } from './qualification-evaluation.service';

const INTERVAL_MS = 30_000;
const LEASE_MS = 5 * 60 * 1000;
const SHUTDOWN_GRACE_MS = 5_000;

@Injectable()
export class QualificationEvidenceAssessmentWorker
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(
    QualificationEvidenceAssessmentWorker.name,
  );
  private readonly workerId = randomUUID();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private activeRun: Promise<number> | null = null;
  private stopping = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly assessment: QualificationAssessmentService,
    private readonly tierEvaluation: QualificationEvaluationService,
  ) {}

  onModuleInit(): void {
    this.stopping = false;
    this.schedule(0);
  }

  async onModuleDestroy(): Promise<void> {
    this.stopping = true;
    if (this.timer) clearTimeout(this.timer);
    if (this.activeRun)
      await Promise.race([
        this.activeRun,
        new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, SHUTDOWN_GRACE_MS);
          timer.unref?.();
        }),
      ]);
  }

  runBatch(): Promise<number> {
    if (this.activeRun) return this.activeRun;
    const run = this.processBatch().finally(() => {
      if (this.activeRun === run) this.activeRun = null;
    });
    this.activeRun = run;
    return run;
  }

  private schedule(delayMs: number): void {
    if (this.stopping || this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.runBatch().finally(() => this.schedule(INTERVAL_MS));
    }, delayMs);
    this.timer.unref?.();
  }

  private async processBatch(): Promise<number> {
    const now = new Date();
    const jobs = await this.prisma.qualificationEvidenceAssessmentJob.findMany({
      where: {
        status: {
          in: [
            QualificationEvaluationStatus.QUEUED,
            QualificationEvaluationStatus.FAILED,
          ],
        },
        nextAttemptAt: { lte: now },
        eligibleAt: { lte: now },
        OR: [
          { claimedAt: null },
          { claimedAt: { lt: new Date(now.getTime() - LEASE_MS) } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
      select: {
        id: true,
        documentId: true,
        submissionId: true,
        attempts: true,
      },
    });
    let processed = 0;
    for (const job of jobs) {
      const claimedAt = new Date();
      const claim =
        await this.prisma.qualificationEvidenceAssessmentJob.updateMany({
          where: {
            id: job.id,
            status: {
              in: [
                QualificationEvaluationStatus.QUEUED,
                QualificationEvaluationStatus.FAILED,
              ],
            },
            OR: [
              { claimedAt: null },
              { claimedAt: { lt: new Date(claimedAt.getTime() - LEASE_MS) } },
            ],
          },
          data: {
            status: QualificationEvaluationStatus.RUNNING,
            attempts: { increment: 1 },
            claimedAt,
            claimedBy: this.workerId,
            lastError: null,
          },
        });
      if (claim.count !== 1) continue;
      try {
        const submission = await this.prisma.kycSubmission.findUnique({
          where: { id: job.submissionId },
          select: {
            status: true,
            fixer: { select: { user: { select: { name: true } } } },
          },
        });
        if (!submission) throw new Error('QUALIFICATION_SUBMISSION_NOT_FOUND');
        await this.assessment.assessDocument({
          submissionId: job.submissionId,
          documentId: job.documentId,
          registeredName: submission.fixer.user.name || '',
          actorId: 'system:qualification-evidence-worker',
          auditAction: 'DOCUMENT_VERIFICATION_COMPLETED',
        });
        await this.prisma.kycDocument.updateMany({
          where: {
            id: job.documentId,
            lifecycleState: { in: ['READY', 'ASSESSING'] },
          },
          data: {
            isActive: true,
            lifecycleState: 'READY',
            readyAt: new Date(),
          },
        });
        if (submission.status === 'APPROVED') {
          await this.tierEvaluation.evaluateTier(
            job.submissionId,
            'system:qualification-evidence-worker',
          );
        }
        await this.prisma.qualificationEvidenceAssessmentJob.updateMany({
          where: {
            id: job.id,
            status: QualificationEvaluationStatus.RUNNING,
            claimedBy: this.workerId,
          },
          data: {
            status: QualificationEvaluationStatus.COMPLETED,
            completedAt: new Date(),
            claimedAt: null,
            claimedBy: null,
            lastError: null,
          },
        });
        processed += 1;
      } catch (error) {
        await this.prisma.qualificationEvidenceAssessmentJob.updateMany({
          where: {
            id: job.id,
            status: QualificationEvaluationStatus.RUNNING,
            claimedBy: this.workerId,
          },
          data: {
            status: QualificationEvaluationStatus.FAILED,
            claimedAt: null,
            claimedBy: null,
            lastError:
              error instanceof Error ? error.message : 'ASSESSMENT_FAILED',
            nextAttemptAt: new Date(Date.now() + 60_000),
          },
        });
        this.logger.error(
          'Qualification evidence assessment failed',
          error instanceof Error ? error.name : 'UnknownError',
        );
      }
    }
    return processed;
  }
}
