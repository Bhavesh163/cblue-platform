import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FixerController } from './fixer.controller';
import { FixerService } from './fixer.service';

@Module({
  imports: [HttpModule],
  controllers: [FixerController],
  providers: [FixerService],
  exports: [FixerService],
})
export class FixerModule {}
