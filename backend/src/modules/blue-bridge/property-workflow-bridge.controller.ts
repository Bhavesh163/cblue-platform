import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreatePropertyWorkflowInquiryDto,
  PropertyWorkflowActionDto,
  PropertyWorkflowListingQueryDto,
} from './dto/property-workflow.dto';
import { PropertyWorkflowBridgeService } from './property-workflow-bridge.service';

@Controller('blue/property-workflow')
export class PropertyWorkflowBridgeController {
  constructor(private readonly workflow: PropertyWorkflowBridgeService) {}

  @Get('listings')
  listings(@Query() query: PropertyWorkflowListingQueryDto) {
    return this.workflow.listings(query);
  }

  @Post('inquiries')
  @UseGuards(JwtAuthGuard)
  createInquiry(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePropertyWorkflowInquiryDto,
  ) {
    return this.workflow.createInquiry(userId, dto);
  }

  @Get('inquiries/:reference')
  @UseGuards(JwtAuthGuard)
  inquiry(
    @Param('reference') reference: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.workflow.snapshot(reference, userId, userRole);
  }

  @Post('inquiries/:reference/accept')
  @UseGuards(JwtAuthGuard)
  accept(
    @Param('reference') reference: string,
    @CurrentUser('id') userId: string,
    @Body() dto: PropertyWorkflowActionDto,
  ) {
    return this.workflow.action(reference, userId, 'accept', dto);
  }

  @Post('inquiries/:reference/decline')
  @UseGuards(JwtAuthGuard)
  decline(
    @Param('reference') reference: string,
    @CurrentUser('id') userId: string,
    @Body() dto: PropertyWorkflowActionDto,
  ) {
    return this.workflow.action(reference, userId, 'decline', dto);
  }

  @Post('inquiries/:reference/fee')
  @UseGuards(JwtAuthGuard)
  fee(
    @Param('reference') reference: string,
    @CurrentUser('id') userId: string,
    @Body() dto: PropertyWorkflowActionDto,
  ) {
    return this.workflow.action(reference, userId, 'fee', dto);
  }

  @Post('inquiries/:reference/viewing-invite')
  @UseGuards(JwtAuthGuard)
  viewingInvite(
    @Param('reference') reference: string,
    @CurrentUser('id') userId: string,
    @Body() dto: PropertyWorkflowActionDto,
  ) {
    return this.workflow.action(reference, userId, 'viewing-invite', dto);
  }

  @Post('inquiries/:reference/viewing-confirmation')
  @UseGuards(JwtAuthGuard)
  viewingConfirmation(
    @Param('reference') reference: string,
    @CurrentUser('id') userId: string,
    @Body() dto: PropertyWorkflowActionDto,
  ) {
    return this.workflow.action(reference, userId, 'viewing-confirmation', dto);
  }

  @Post('inquiries/:reference/customer-rating')
  @UseGuards(JwtAuthGuard)
  customerRating(
    @Param('reference') reference: string,
    @CurrentUser('id') userId: string,
    @Body() dto: PropertyWorkflowActionDto,
  ) {
    return this.workflow.action(reference, userId, 'customer-rating', dto);
  }

  @Post('inquiries/:reference/lister-rating')
  @UseGuards(JwtAuthGuard)
  listerRating(
    @Param('reference') reference: string,
    @CurrentUser('id') userId: string,
    @Body() dto: PropertyWorkflowActionDto,
  ) {
    return this.workflow.action(reference, userId, 'lister-rating', dto);
  }

  @Post('inquiries/:reference/cancel')
  @UseGuards(JwtAuthGuard)
  cancel(
    @Param('reference') reference: string,
    @CurrentUser('id') userId: string,
    @Body() dto: PropertyWorkflowActionDto,
  ) {
    return this.workflow.action(reference, userId, 'cancel', dto);
  }
}
