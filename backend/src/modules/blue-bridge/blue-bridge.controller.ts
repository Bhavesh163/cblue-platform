import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BlueBridgeService } from './blue-bridge.service';
import { FixerWorkflowActionDto } from './dto/fixer-workflow-action.dto';
import { FixerWorkflowBridgeService } from './fixer-workflow-bridge.service';

@Controller('blue')
export class BlueBridgeController {
  constructor(
    private readonly bridge: BlueBridgeService,
    private readonly fixerWorkflow: FixerWorkflowBridgeService,
  ) {}

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

  @Post('workflow-details/:poNumber/actions/:action')
  @UseGuards(JwtAuthGuard)
  workflowAction(
    @Param('poNumber') poNumber: string,
    @Param('action') action: string,
    @CurrentUser('id') userId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: FixerWorkflowActionDto,
  ): Promise<BlueWorkflowDetailResponse> {
    return this.fixerWorkflow.action(
      poNumber,
      userId,
      action,
      dto,
      idempotencyKey,
    );
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
  activityBucket: 'request' | 'active' | 'history';
  lifecycleStatus: string;
  archivedAt: string | null;
  cancelledAt: string | null;
  declinedAt: string | null;
  ratedAt: string | null;
  poNumber?: string;
  currentStep?: number;
  totalSteps?: number;
  status?: string;
  actions?: Array<{
    key: string;
    owner: 'customer' | 'partner';
    label: string;
    actionStep: number;
    feeMode?: 'payment' | 'free-pass';
  }>;
  availableActions?: string[];
  actionOwner?: 'customer' | 'partner' | null;
  nextActionKey?: string | null;
  nextActionLabel?: string | null;
  nextActionOwner?: 'customer' | 'partner' | null;
  nextActionStep?: number | null;
  sourceVersion?: 'cblue-fixer-workflow-v1';
  workflowVersion?: number;
  chat?: {
    enabled: boolean;
  };
}
