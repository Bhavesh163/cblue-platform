import { Controller, Get, Headers, Query } from '@nestjs/common';
import { QualificationBridgeService } from './qualification-bridge.service';

@Controller('blue')
export class QualificationBridgeController {
  constructor(private readonly qualification: QualificationBridgeService) {}

  @Get('qualification')
  getQualification(
    @Query('legacySubjectId') legacySubjectId: string,
    @Headers('x-blue-bridge-key') bridgeKey?: string,
  ) {
    return this.qualification.getSnapshot(legacySubjectId, bridgeKey);
  }
}
