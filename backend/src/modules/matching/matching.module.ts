import { Module } from '@nestjs/common';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';
import { MatchingWorker } from './matching.worker';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [OrderModule],
  controllers: [MatchingController],
  providers: [MatchingService, MatchingWorker],
  exports: [MatchingService],
})
export class MatchingModule {}
