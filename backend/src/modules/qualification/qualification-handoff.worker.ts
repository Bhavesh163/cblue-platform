import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { QualificationReviewService } from './qualification-review.service';

const HANDOFF_INTERVAL_MS = 30_000;

@Injectable()
export class QualificationHandoffWorker
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(QualificationHandoffWorker.name);
  private readonly workerId = randomUUID();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private activeRun: Promise<number> | null = null;
  private stopping = false;

  constructor(private readonly reviews: QualificationReviewService) {}

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
      void this.runBatch().finally(() => this.schedule(HANDOFF_INTERVAL_MS));
    }, delayMs);
    this.timer.unref?.();
  }

  private async processBatch(): Promise<number> {
    try {
      return await this.reviews.retryDueTierEvaluationHandoffs(
        'qualification-handoff-worker:' + this.workerId,
      );
    } catch (error: unknown) {
      this.logger.error(
        'Qualification handoff batch failed code=QUALIFICATION_HANDOFF_BATCH_FAILED',
        error instanceof Error ? error.name : 'UnknownError',
      );
      return 0;
    }
  }
}
