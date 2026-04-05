import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentWorker } from './payment.worker';

@Module({
  controllers: [PaymentController],
  providers: [PaymentService, PaymentWorker],
  exports: [PaymentService],
})
export class PaymentModule {}
