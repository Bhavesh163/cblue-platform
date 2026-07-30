import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { QualificationService } from './qualification.service';

const CLEANUP_BATCH_SIZE = 20;
const CLEANUP_INTERVAL_MS = 30_000;

@Injectable()
export class QualificationDocumentCleanupWorker
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(QualificationDocumentCleanupWorker.name);
  private readonly workerId = randomUUID();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private activeRun: Promise<number> | null = null;
  private stopping = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly qualification: QualificationService,
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
    if (this.activeRun) {
      await this.activeRun;
    }
  }

  runBatch(): Promise<number> {
    if (this.activeRun) return this.activeRun;

    const run = this.processBatch().finally(() => {
      if (this.activeRun === run) {
        this.activeRun = null;
      }
    });
    this.activeRun = run;
    return run;
  }

  private schedule(delayMs: number): void {
    if (this.stopping || this.timer) return;

    this.timer = setTimeout(() => {
      this.timer = null;
      void this.runBatch().finally(() => {
        this.schedule(CLEANUP_INTERVAL_MS);
      });
    }, delayMs);
    this.timer.unref?.();
  }

  private async processBatch(): Promise<number> {
    let claimed: Array<{ id: string }>;
    try {
      claimed = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        WITH due AS (
          SELECT "id"
          FROM "kyc_documents"
          WHERE "lifecycleState" = 'DELETE_PENDING'
            AND (
              "cleanupNextAttemptAt" IS NULL
              OR "cleanupNextAttemptAt" <= NOW()
            )
            AND (
              "cleanupClaimedAt" IS NULL
              OR "cleanupClaimedAt" < NOW() - INTERVAL '5 minutes'
            )
          ORDER BY "cleanupNextAttemptAt" ASC NULLS FIRST, "updatedAt" ASC
          FOR UPDATE SKIP LOCKED
          LIMIT ${CLEANUP_BATCH_SIZE}
        )
        UPDATE "kyc_documents" AS document
        SET
          "cleanupClaimedAt" = NOW(),
          "cleanupClaimedBy" = ${this.workerId},
          "updatedAt" = NOW()
        FROM due
        WHERE document."id" = due."id"
        RETURNING document."id"
      `);
    } catch (error) {
      this.logger.error(
        'Qualification cleanup batch failed code=CLEANUP_BATCH_FAILED',
        error instanceof Error ? error.name : 'UnknownError',
      );
      return 0;
    }

    for (const document of claimed) {
      try {
        await this.qualification.retryPendingDocumentCleanup(
          document.id,
          this.workerId,
        );
      } catch (error) {
        this.logger.error(
          `Qualification cleanup item failed document=${document.id} code=CLEANUP_ITEM_FAILED`,
          error instanceof Error ? error.name : 'UnknownError',
        );
      }
    }
    return claimed.length;
  }
}
