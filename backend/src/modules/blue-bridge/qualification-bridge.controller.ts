import { Controller, Get, Headers, Query } from '@nestjs/common';
import { QualificationBridgeService } from './qualification-bridge.service';
import { QualificationSnapshotResponse } from './dto/qualification-snapshot.response.dto';

@Controller('blue')
export class QualificationBridgeController {
  constructor(private readonly qualification: QualificationBridgeService) {}

  @Get('qualification')
  getQualification(
    @Query('legacySubjectId') legacySubjectId: string,
    @Headers('x-blue-bridge-key') bridgeKey?: string,
  ): Promise<QualificationSnapshotResponse> {
    return this.qualification.getSnapshot(legacySubjectId, bridgeKey);
  }
}
