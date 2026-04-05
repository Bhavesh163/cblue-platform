import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationWorker } from './notification.worker';

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, NotificationWorker],
  exports: [NotificationService],
})
export class NotificationModule {}
