import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminOperationsService } from './admin-operations.service';
import { UpdateDemandGapDto } from './dto/update-demand-gap.dto';
import { ApproveFixerDto } from './dto/approve-fixer.dto';
import { ManualAssignDto } from './dto/manual-assign.dto';
import { SuspendFixerDto } from './dto/suspend-fixer.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly operationsService: AdminOperationsService,
  ) {}

  @Get('dashboard')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // ── Fixer management ──

  @Get('operations/overview')
  getOperationsOverview(@Query('days') days?: string) {
    return this.operationsService.getOverview(Number(days) || 90);
  }

  @Put('demand-gaps/:gapId')
  updateDemandGap(
    @Param('gapId') gapId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: UpdateDemandGapDto,
  ) {
    return this.operationsService.updateDemandGap(gapId, adminId, dto);
  }

  @Get('fixers/directory')
  getFixerDirectory(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('province') province?: string,
    @Query('district') district?: string,
    @Query('subdistrict') subdistrict?: string,
    @Query('service') service?: string,
    @Query('tier') tier?: string,
    @Query('minRating') minRating?: string,
    @Query('maxDeclines90Days') maxDeclines90Days?: string,
    @Query('maxCancellations12Months') maxCancellations12Months?: string,
  ) {
    return this.adminService.getFixerDirectory({
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      province,
      district,
      subdistrict,
      service,
      tier,
      minRating: minRating === undefined ? undefined : Number(minRating),
      maxDeclines90Days:
        maxDeclines90Days === undefined ? undefined : Number(maxDeclines90Days),
      maxCancellations12Months:
        maxCancellations12Months === undefined
          ? undefined
          : Number(maxCancellations12Months),
    });
  }
  @Get('fixers/pending')
  getPendingFixers(@Query() pagination: PaginationDto) {
    return this.adminService.getPendingFixers(pagination);
  }

  @Get('fixers/tier-review')
  getTierReviewFixers(@Query() pagination: PaginationDto) {
    return this.adminService.getTierReviewFixers(pagination);
  }

  @Get('fixers/:fixerId/qualification-detail')
  getFixerQualificationDetail(@Param('fixerId') fixerId: string) {
    return this.adminService.getFixerQualificationDetail(fixerId);
  }

  @Put('fixers/:fixerId/status')
  approveFixer(
    @Param('fixerId') fixerId: string,
    @Body() dto: ApproveFixerDto,
  ) {
    return this.adminService.approveFixer(fixerId, dto);
  }

  // ── Order management ──

  @Get('orders')
  getAllOrders(@Query() pagination: PaginationDto) {
    return this.adminService.getAllOrders(pagination);
  }

  @Post('orders/assign')
  manualAssign(
    @Body() dto: ManualAssignDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.manualAssign(dto, adminId);
  }

  // ── Fraud detection ──

  @Get('fraud/flags')
  getFraudFlags() {
    return this.adminService.getFraudFlags();
  }

  @Put('fixers/:fixerId/suspend')
  suspendFixer(
    @Param('fixerId') fixerId: string,
    @Body() dto: SuspendFixerDto,
  ) {
    return this.adminService.suspendFixer(fixerId, dto.reason);
  }
}
