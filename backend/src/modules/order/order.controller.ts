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
import { CreateOrderChatMessageDto } from './dto/create-order-chat-message.dto';
import { UploadOrderAttachmentDto } from './dto/upload-order-attachment.dto';
import { UploadOrderAttachmentsBatchDto } from './dto/upload-order-attachments-batch.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

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
  async findMyFixerOrders(@CurrentUser('id') userId: string) {
    return this.orderService.findMyFixerOrders(userId);
  }

  @Get('my')
  findMyOrders(@CurrentUser('id') userId: string) {
    return this.orderService.findByUser(userId);
  }

  @Get(':orderId/chat')
  getOrderChat(
    @Param('orderId') orderId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.orderService.getOrderChatMessages(orderId, userId);
  }

  @Post(':orderId/chat')
  postOrderChat(
    @Param('orderId') orderId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrderChatMessageDto,
  ) {
    return this.orderService.createOrderChatMessage(orderId, userId, dto);
  }

  @Get(':orderId/attachments')
  getOrderAttachments(
    @Param('orderId') orderId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.orderService.getOrderAttachments(orderId, userId);
  }

  @Post(':orderId/attachments')
  uploadOrderAttachment(
    @Param('orderId') orderId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UploadOrderAttachmentDto,
  ) {
    return this.orderService.uploadOrderAttachment(orderId, userId, dto);
  }

  @Post(':orderId/attachments/batch')
  uploadOrderAttachmentsBatch(
    @Param('orderId') orderId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UploadOrderAttachmentsBatchDto,
  ) {
    return this.orderService.uploadOrderAttachments(orderId, userId, dto);
  }

  @Get(':orderId')
  findById(@Param('orderId') orderId: string) {
    return this.orderService.findById(orderId);
  }

  @Put(':orderId/status')
  updateStatus(
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.orderService.updateStatus(orderId, dto, userId, userRole);
  }
}
