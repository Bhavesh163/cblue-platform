import { Module } from '@nestjs/common';
import { FixerController } from './fixer.controller';
import { FixerService } from './fixer.service';

@Module({
  controllers: [FixerController],
  providers: [FixerService],
  exports: [FixerService],
})
export class FixerModule {}
