import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FixerController } from './fixer.controller';
import { FixerService } from './fixer.service';
import { MatchingIntelligenceService } from './matching-intelligence.service';

@Module({
  imports: [HttpModule],
  controllers: [FixerController],
  providers: [FixerService, MatchingIntelligenceService],
  exports: [FixerService],
})
export class FixerModule {}
