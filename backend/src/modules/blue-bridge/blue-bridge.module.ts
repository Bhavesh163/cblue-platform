import { Module } from '@nestjs/common';
import { PropertyInquiryModule } from '../property-inquiry/property-inquiry.module';
import { PropertyModule } from '../property/property.module';
import { BlueBridgeController } from './blue-bridge.controller';
import { BlueBridgeService } from './blue-bridge.service';
import { FixerWorkflowBridgeService } from './fixer-workflow-bridge.service';
import { PropertyWorkflowBridgeController } from './property-workflow-bridge.controller';
import { PropertyWorkflowBridgeService } from './property-workflow-bridge.service';
import { QualificationBridgeController } from './qualification-bridge.controller';
import { QualificationBridgeService } from './qualification-bridge.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [PropertyModule, PropertyInquiryModule, UserModule],
  controllers: [
    BlueBridgeController,
    PropertyWorkflowBridgeController,
    QualificationBridgeController,
  ],
  providers: [
    BlueBridgeService,
    FixerWorkflowBridgeService,
    PropertyWorkflowBridgeService,
    QualificationBridgeService,
  ],
})
export class BlueBridgeModule {}
