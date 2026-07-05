import { Controller, Get, Headers, Param, Query } from '@nestjs/common';
import { BlueBridgeService } from './blue-bridge.service';

@Controller('blue')
export class BlueBridgeController {
  constructor(private readonly bridge: BlueBridgeService) {}

  @Get('workflow-details/:poNumber')
  workflowDetails(
    @Param('poNumber') poNumber: string,
    @Query('legacySubjectId') legacySubjectId: string,
    @Headers('x-blue-bridge-key') bridgeKey?: string,
  ): Promise<BlueWorkflowDetailResponse> {
    return this.bridge.workflowDetails({
      poNumber,
      legacySubjectId,
      bridgeKey,
    });
  }
}

export interface BlueWorkflowDetailResponse {
  detailRows: Array<{ label: string; value: string }>;
  budgetLines: string[];
  budgetBreakdown: Array<{
    service: string;
    qty: number;
    unit: string;
    unitRate: number;
    total: number;
  }>;
  uploadedFiles: Array<{ label: string; url: string }>;
}
