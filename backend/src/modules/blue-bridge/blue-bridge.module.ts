import { Module } from '@nestjs/common';
import { BlueBridgeController } from './blue-bridge.controller';
import { BlueBridgeService } from './blue-bridge.service';

@Module({
  controllers: [BlueBridgeController],
  providers: [BlueBridgeService],
})
export class BlueBridgeModule {}
