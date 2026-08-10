import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
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
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(OptionalJwtAuthGuard)
  createInquiry(
    @Headers('x-blue-bridge-key') bridgeKey: string | undefined,
    @Headers('idempotency-key') headerIdempotencyKey: string | undefined,
    @CurrentUser('id') userId: string | undefined,
    @Body() dto: CreatePropertyWorkflowInquiryDto,
  ) {
    if (bridgeKey) {
      if (!dto.legacySubjectId && !userId) {
        throw new BadRequestException(
          'A linked subject or verified CBLUE customer token is required',
        );
      }
      return this.workflow.createBridgeInquiry(
        dto.legacySubjectId,
        dto,
        bridgeKey,
        headerIdempotencyKey,
        userId,
      );
    }
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
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
