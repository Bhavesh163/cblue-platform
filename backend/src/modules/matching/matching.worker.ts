import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QUEUE_EVENTS } from '../../queue/queue.constants';
import { MatchingService } from './matching.service';

@Injectable()
export class MatchingWorker {
  private readonly logger = new Logger(MatchingWorker.name);

  constructor(
    private readonly matchingService: MatchingService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Processes order.created events from RabbitMQ.
   * Called by the EventEmitter bridge or directly from the queue consumer.
   */
  async processOrderCreated(payload: {
    orderId: string;
    serviceCategory: string;
    addressId: string;
    isUrgent: boolean;
  }) {
    this.logger.log(`[Worker] Processing match for order ${payload.orderId}`);

    const matches = await this.matchingService.handleOrderCreated(payload);

    if (matches.length > 0) {
      this.eventEmitter.emit(QUEUE_EVENTS.ORDER_MATCHED, {
        orderId: payload.orderId,
        matches,
      });
    } else {
      this.logger.warn(
        `[Worker] No matches found for order ${payload.orderId} — triggering admin fallback`,
      );
      this.eventEmitter.emit('matching.failed', {
        orderId: payload.orderId,
        reason: 'no_fixers_found',
      });
    }

    return matches;
  }
}
