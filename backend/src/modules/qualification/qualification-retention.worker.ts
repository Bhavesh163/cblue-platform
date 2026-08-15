import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Optional } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import {
  NotificationService,
  queueNotificationInTransaction,
} from '../notification/notification.service';
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

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notifications?: NotificationService,
  ) {}

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
        AND: [
          {
            OR: [
              { isActive: true, lastActivityAt: { lte: noticeCutoff } },
              { isActive: false, inactiveDeleteAt: { lte: now } },
            ],
          },
          {
            OR: [{ legalHoldUntil: null }, { legalHoldUntil: { lt: now } }],
          },
        ],
      },
      select: {
        id: true,
        isActive: true,
        lastActivityAt: true,
        inactiveNoticeAt: true,
        inactiveDeleteAt: true,
        orders: {
          where: { status: { in: ['COMPLETED', 'CANCELLED'] } },
          select: {
            id: true,
            updatedAt: true,
            legalHoldUntil: true,
            serviceHistoryDeleteAt: true,
          },
        },
        fixer: {
          select: {
            qualificationSubmissions: {
              select: {
                id: true,
                documents: {
                  where: {
                    isActive: true,
                    lifecycleState: { in: ['READY', 'FAILED'] },
                    OR: [
                      { legalHoldUntil: null },
                      { legalHoldUntil: { lt: now } },
                    ],
                  },
                  select: {
                    id: true,
                    lifecycleState: true,
                    legalHoldUntil: true,
                  },
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

    const deletedAudits = await this.prisma.accountDeletionAudit.deleteMany({
      where: {
        retentionDeleteAt: { lte: now },
        OR: [
          { legalHoldUntil: null },
          { legalHoldUntil: { lt: now } },
        ],
      },
    });
    scheduled += deletedAudits.count;

    const consentDue = await this.prisma.kycSubmission.findMany({
      where: {
        consentRetentionDeleteAt: { lte: now },
        fixer: {
          user: {
            OR: [{ legalHoldUntil: null }, { legalHoldUntil: { lt: now } }],
          },
        },
      },
      select: { id: true },
    });
    if (consentDue.length) {
      await this.prisma.kycSubmission.updateMany({
        where: {
          id: { in: consentDue.map((submission) => submission.id) },
          consentRetentionDeleteAt: { lte: now },
        },
        data: {
          consentAt: null,
          consentVersion: null,
          consentRetentionDeleteAt: null,
        },
      });
    }

    const historyDue = await this.prisma.order.findMany({
      where: {
        status: { in: ['COMPLETED', 'CANCELLED'] },
        serviceHistoryDeleteAt: null,
        updatedAt: { lte: addCalendarMonths(now, -SERVICE_HISTORY_MONTHS) },
        OR: [{ legalHoldUntil: null }, { legalHoldUntil: { lt: now } }],
      },
      select: { id: true },
      take: 500,
    });
    if (historyDue.length) {
      await this.prisma.order.updateMany({
        where: {
          id: { in: historyDue.map((order) => order.id) },
          serviceHistoryDeleteAt: null,
        },
        data: {
          serviceHistoryDeleteAt: now,
          archivedAt: now,
          description: '[Archived service history]',
          meetingDate: null,
          meetingTime: null,
          meetingVenue: null,
          meetingNote: null,
        },
      });
      scheduled += historyDue.length;
    }
    for (const user of users) {
      const inactiveDeleteAt = addCalendarMonths(
        user.lastActivityAt,
        DELETE_MONTHS,
      );
      if (!user.inactiveNoticeAt || !user.inactiveDeleteAt) {
        const shouldNotify = !user.inactiveNoticeAt;
        await this.prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: user.id },
            data: {
              inactiveNoticeAt: user.inactiveNoticeAt ?? now,
              inactiveDeleteAt: user.inactiveDeleteAt ?? inactiveDeleteAt,
            },
          });
          if (shouldNotify && this.notifications) {
            await queueNotificationInTransaction(tx, {
              userId: user.id,
              type: NotificationType.IN_APP,
              title: 'Account retention reminder',
              body: 'Your account has been inactive for 11 months. Sign in before the retention date to keep your account and private evidence.',
              dedupeKey: 'qualification-retention-notice:' + user.id,
              data: {
                inactiveDeleteAt: inactiveDeleteAt.toISOString(),
                retentionMonths: DELETE_MONTHS,
              },
            });
            await queueNotificationInTransaction(tx, {
              userId: user.id,
              type: NotificationType.EMAIL,
              title: 'Account retention reminder',
              body: 'Your account has been inactive for 11 months. Sign in before the retention date to keep your account and private evidence.',
              dedupeKey: 'qualification-retention-notice-email:' + user.id,
              data: {
                inactiveDeleteAt: inactiveDeleteAt.toISOString(),
                retentionMonths: DELETE_MONTHS,
              },
            });
          }
        });
      }
      if (now < inactiveDeleteAt) continue;

      const historyOrders = [
        ...(user.orders ?? []),
        ...(user.fixer?.orders ?? []),
      ];
      for (const order of historyOrders) {
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
          (document) =>
            document.lifecycleState !== 'DELETE_PENDING' &&
            (!document.legalHoldUntil || document.legalHoldUntil < now),
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

      if (now >= inactiveDeleteAt) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            isActive: false,
            name: '[Removed account]',
            company: null,
            phone: null,
            email: 'removed+' + user.id + '@invalid.cblue',
          },
        });
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
