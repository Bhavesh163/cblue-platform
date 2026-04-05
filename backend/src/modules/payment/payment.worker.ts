import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PaymentService } from './payment.service';
import { QUEUE_EVENTS } from '../../queue/queue.constants';

@Injectable()
export class PaymentWorker {
  private readonly logger = new Logger(PaymentWorker.name);

  constructor(private readonly paymentService: PaymentService) {}

  @OnEvent(QUEUE_EVENTS.PAYMENT_COMPLETED)
  onPaymentCompleted(payload: {
    orderId: string;
    paymentId: string;
    amount: number;
  }) {
    this.logger.log(
      `[Worker] Payment ${payload.paymentId} completed — reconciling order ${payload.orderId}`,
    );
    // Future: reconcile with payment gateway, update ledger, etc.
  }
}
