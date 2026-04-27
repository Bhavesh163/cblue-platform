import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateOrderDto) {
    return this.orderService.create(userId, dto);
  }

  @Get('fixer')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FIXER)
  async findMyFixerOrders(@CurrentUser('id') userId: string) {
    const user = await this.orderService['prisma'].user.findUnique({
      where: { id: userId },
      include: { fixer: true },
    });
    if (!user || !user.fixer) {
      return [];
    }
    return this.orderService.findByFixer(user.fixer.id);
  }

  @Get('my')
  findMyOrders(@CurrentUser('id') userId: string) {
    return this.orderService.findByUser(userId);
  }

  @Get(':orderId')
  findById(@Param('orderId') orderId: string) {
    return this.orderService.findById(orderId);
  }

  @Put(':orderId/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FIXER)
  updateStatus(
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.orderService.updateStatus(orderId, dto, userId);
  }
}
