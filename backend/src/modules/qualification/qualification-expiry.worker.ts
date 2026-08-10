import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import {
  NotificationType,
  QualificationEligibilityStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NotificationService,
  queueNotificationInTransaction,
} from '../notification/notification.service';
import {
  KYC_EXPIRY_WARNING_DAYS,
  mergeReverificationReasons,
} from './qualification-eligibility';

const EXPIRY_INTERVAL_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class QualificationExpiryWorker
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(QualificationExpiryWorker.name);
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running: Promise<number> | null = null;
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
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.running) await this.running;
  }

  runBatch(): Promise<number> {
    if (this.running) return this.running;
    const run = this.processBatch().finally(() => {
      if (this.running === run) this.running = null;
    });
    this.running = run;
    return run;
  }

  private schedule(delayMs: number): void {
    if (this.stopping || this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.runBatch()
        .catch((error: unknown) => {
          this.logger.error(
            'Qualification expiry processing failed',
            error instanceof Error ? error.stack : String(error),
          );
        })
        .finally(() => this.schedule(EXPIRY_INTERVAL_MS));
    }, delayMs);
    this.timer.unref?.();
  }

  private async processBatch(): Promise<number> {
    const now = new Date();
    const warningCutoff = new Date(
      now.getTime() + KYC_EXPIRY_WARNING_DAYS * DAY_MS,
    );
    const expiring = await this.prisma.fixer.findMany({
      where: {
        qualificationEligibilityStatus: QualificationEligibilityStatus.ELIGIBLE,
        kycReverificationRequiredAt: null,
        kycValidUntil: { gt: now, lte: warningCutoff },
        kycExpiryWarningSentAt: null,
      },
      select: { id: true, userId: true, kycValidUntil: true },
    });
    const expired = await this.prisma.fixer.findMany({
      where: {
        qualificationEligibilityStatus: QualificationEligibilityStatus.ELIGIBLE,
        kycValidUntil: { lte: now },
      },
      select: {
        id: true,
        userId: true,
        kycValidUntil: true,
        kycReverificationReasons: true,
      },
    });

    for (const fixer of expiring) {
      if (!fixer.kycValidUntil) continue;
      const expiresAt = fixer.kycValidUntil.toISOString();
      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.fixer.updateMany({
          where: { id: fixer.id, kycExpiryWarningSentAt: null },
          data: { kycExpiryWarningSentAt: now },
        });
        if (updated.count !== 1 || !this.notifications) return;
        const notice = {
          userId: fixer.userId,
          title: 'Identity verification renewal',
          body: 'Your identity document expires within 30 days. Update it in Edit Profile to keep receiving new opportunities.',
          data: { expiresAt, warningDays: KYC_EXPIRY_WARNING_DAYS },
        };
        await queueNotificationInTransaction(tx, {
          ...notice,
          type: NotificationType.IN_APP,
          dedupeKey: `kyc-expiry-warning:${fixer.id}:${expiresAt}`,
        });
        await queueNotificationInTransaction(tx, {
          ...notice,
          type: NotificationType.EMAIL,
          dedupeKey: `kyc-expiry-warning-email:${fixer.id}:${expiresAt}`,
        });
      });
    }

    for (const fixer of expired) {
      await this.prisma.$transaction(async (tx) => {
        const reasons = mergeReverificationReasons(
          fixer.kycReverificationReasons,
          ['ID_EXPIRED'],
        );
        const updated = await tx.fixer.updateMany({
          where: {
            id: fixer.id,
            qualificationEligibilityStatus:
              QualificationEligibilityStatus.ELIGIBLE,
            kycValidUntil: { lte: now },
          },
          data: {
            qualificationEligibilityStatus:
              QualificationEligibilityStatus.REVERIFICATION_REQUIRED,
            kycReverificationRequiredAt: now,
            kycReverificationReasons: reasons,
          },
        });
        if (updated.count !== 1 || !this.notifications) return;
        const expiresAt = fixer.kycValidUntil?.toISOString() ?? null;
        const notice = {
          userId: fixer.userId,
          title: 'Identity verification renewal required',
          body: 'Your identity document has expired. Complete identity verification in Edit Profile before receiving new opportunities.',
          data: { expiresAt },
        };
        await queueNotificationInTransaction(tx, {
          ...notice,
          type: NotificationType.IN_APP,
          dedupeKey: `kyc-expired:${fixer.id}:${expiresAt ?? 'missing'}`,
        });
        await queueNotificationInTransaction(tx, {
          ...notice,
          type: NotificationType.EMAIL,
          dedupeKey: `kyc-expired-email:${fixer.id}:${expiresAt ?? 'missing'}`,
        });
      });
    }

    return expiring.length + expired.length;
  }
}
