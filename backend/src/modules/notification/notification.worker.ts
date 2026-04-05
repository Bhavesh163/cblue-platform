import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from './notification.service';
import { QUEUE_EVENTS } from '../../queue/queue.constants';

@Injectable()
export class NotificationWorker {
  private readonly logger = new Logger(NotificationWorker.name);

  constructor(private readonly notificationService: NotificationService) {}

  @OnEvent(QUEUE_EVENTS.ORDER_MATCHED)
  onOrderMatched(payload: {
    orderId: string;
    matches: { fixerId: string; fixerName: string }[];
  }) {
    this.logger.log(
      `[Worker] Notifying ${payload.matches.length} fixers about order ${payload.orderId}`,
    );

    // In production: send push to each matched fixer
    for (const match of payload.matches) {
      this.logger.log(
        `[Worker] Would send push to fixer ${match.fixerName} (${match.fixerId})`,
      );
    }
  }

  @OnEvent('matching.failed')
  onMatchingFailed(payload: { orderId: string; reason: string }) {
    this.logger.warn(
      `[Worker] Matching failed for order ${payload.orderId}: ${payload.reason}`,
    );
    // Notify admins for manual assignment
  }
}
