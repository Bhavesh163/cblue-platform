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
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // ── Fixer management ──

  @Get('fixers/pending')
  getPendingFixers(@Query() pagination: PaginationDto) {
    return this.adminService.getPendingFixers(pagination);
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
