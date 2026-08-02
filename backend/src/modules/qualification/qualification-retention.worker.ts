import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const NOTICE_MONTHS = 11;
const DELETE_MONTHS = 12;
const SERVICE_HISTORY_MONTHS = 18;
const RETENTION_INTERVAL_MS = 24 * 60 * 60 * 1000;

function addCalendarMonths(value: Date, months: number): Date {
  const result = new Date(value);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0,
  ).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

@Injectable()
export class QualificationRetentionWorker
  implements OnModuleInit, OnModuleDestroy
{
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
    const noticeCutoff = addCalendarMonths(now, -NOTICE_MONTHS);
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        lastActivityAt: { lte: noticeCutoff },
        OR: [{ legalHoldUntil: null }, { legalHoldUntil: { lt: now } }],
      },
      select: {
        id: true,
        isActive: true,
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
            orders: {
              where: { status: { in: ['COMPLETED', 'CANCELLED'] } },
              select: {
                id: true,
                updatedAt: true,
                legalHoldUntil: true,
                serviceHistoryDeleteAt: true,
              },
            },
          },
        },
      },
    });

    let scheduled = 0;
    for (const user of users) {
      const inactiveDeleteAt = addCalendarMonths(
        user.lastActivityAt,
        DELETE_MONTHS,
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
      if (now >= inactiveDeleteAt && user.isActive) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { isActive: false },
        });
      }
      if (now < inactiveDeleteAt) continue;

      for (const order of user.fixer?.orders ?? []) {
        const serviceHistoryDeleteAt = addCalendarMonths(
          order.updatedAt,
          SERVICE_HISTORY_MONTHS,
        );
        if (
          !order.serviceHistoryDeleteAt &&
          serviceHistoryDeleteAt <= now &&
          (!order.legalHoldUntil || order.legalHoldUntil < now)
        ) {
          await this.prisma.order.updateMany({
            where: {
              id: order.id,
              status: { in: ['COMPLETED', 'CANCELLED'] },
              serviceHistoryDeleteAt: null,
              OR: [{ legalHoldUntil: null }, { legalHoldUntil: { lt: now } }],
            },
            data: {
              serviceHistoryDeleteAt: now,
              archivedAt: now,
            },
          });
        }
      }

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
              reason:
                'Inactive account reached the 12-month private evidence retention limit',
              metadata: { scheduledAt: now.toISOString(), legalHold: false },
            },
          });
        });
        scheduled += documents.length;
      }
    }
    if (scheduled > 0) {
      this.logger.log(
        'Scheduled ' +
          scheduled +
          ' qualification documents for retention cleanup',
      );
    }
    return scheduled;
  }
}
