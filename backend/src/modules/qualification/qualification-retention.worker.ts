import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOTICE_AFTER_MS = 11 * 30 * DAY_MS;
const DELETE_AFTER_MS = 12 * 30 * DAY_MS;
const RETENTION_INTERVAL_MS = DAY_MS;

@Injectable()
export class QualificationRetentionWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QualificationRetentionWorker.name);
  private timer: ReturnType<typeof setTimeout> | null = null;
  private activeRun: Promise<number> | null = null;
  private stopping = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    this.stopping = false;
    this.schedule(0);
  }

  async onModuleDestroy(): Promise<void> {
    this.stopping = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.activeRun) await this.activeRun;
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
      void this.runBatch().finally(() => this.schedule(RETENTION_INTERVAL_MS));
    }, delayMs);
    this.timer.unref?.();
  }

  private async processBatch(): Promise<number> {
    const now = new Date();
    const noticeCutoff = new Date(now.getTime() - NOTICE_AFTER_MS);
    const deleteCutoff = new Date(now.getTime() - DELETE_AFTER_MS);
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        lastActivityAt: { lte: noticeCutoff },
        OR: [{ legalHoldUntil: null }, { legalHoldUntil: { lt: now } }],
      },
      select: {
        id: true,
        lastActivityAt: true,
        inactiveNoticeAt: true,
        inactiveDeleteAt: true,
        fixer: {
          select: {
            qualificationSubmissions: {
              select: {
                id: true,
                documents: {
                  where: {
                    isActive: true,
                    lifecycleState: { in: ['READY', 'FAILED'] },
                  },
                  select: { id: true, lifecycleState: true },
                },
              },
            },
          },
        },
      },
    });

    let scheduled = 0;
    for (const user of users) {
      const inactiveDeleteAt = new Date(
        user.lastActivityAt.getTime() + DELETE_AFTER_MS,
      );
      if (!user.inactiveNoticeAt || !user.inactiveDeleteAt) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            inactiveNoticeAt: user.inactiveNoticeAt ?? now,
            inactiveDeleteAt: user.inactiveDeleteAt ?? inactiveDeleteAt,
          },
        });
      }
      if (user.lastActivityAt > deleteCutoff) continue;

      for (const submission of user.fixer?.qualificationSubmissions ?? []) {
        const documents = submission.documents.filter(
          (document) => document.lifecycleState !== 'DELETE_PENDING',
        );
        if (documents.length === 0) continue;
        await this.prisma.$transaction(async (tx) => {
          await tx.kycDocument.updateMany({
            where: {
              id: { in: documents.map((document) => document.id) },
              lifecycleState: { in: ['READY', 'FAILED'] },
            },
            data: {
              lifecycleState: 'DELETE_PENDING',
              retentionDeleteAt: now,
              cleanupNextAttemptAt: now,
              cleanupErrorCode: null,
            },
          });
          await tx.qualificationAuditLog.create({
            data: {
              submissionId: submission.id,
              actorId: null,
              action: 'RETENTION_DELETE_SCHEDULED',
              entityType: 'KycDocument',
              entityId: submission.id,
              reason: 'Inactive account reached the 12-month private evidence retention limit',
              metadata: { scheduledAt: now.toISOString(), legalHold: false },
            },
          });
        });
        scheduled += documents.length;
      }
    }
    if (scheduled > 0) {
      this.logger.log('Scheduled ' + scheduled + ' qualification documents for retention cleanup');
    }
    return scheduled;
  }
}
