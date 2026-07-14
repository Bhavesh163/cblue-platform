import { Module } from '@nestjs/common';
import { PropertyInquiryModule } from '../property-inquiry/property-inquiry.module';
import { PropertyModule } from '../property/property.module';
import { BlueBridgeController } from './blue-bridge.controller';
import { BlueBridgeService } from './blue-bridge.service';
import { FixerWorkflowBridgeService } from './fixer-workflow-bridge.service';
import { PropertyWorkflowBridgeController } from './property-workflow-bridge.controller';
import { PropertyWorkflowBridgeService } from './property-workflow-bridge.service';

@Module({
  imports: [PropertyModule, PropertyInquiryModule],
  controllers: [BlueBridgeController, PropertyWorkflowBridgeController],
  providers: [BlueBridgeService, FixerWorkflowBridgeService, PropertyWorkflowBridgeService],
})
export class BlueBridgeModule {}
