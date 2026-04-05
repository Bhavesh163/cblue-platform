import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

// Valid status transitions
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  CREATED: [OrderStatus.MATCHING, OrderStatus.CANCELLED],
  MATCHING: [OrderStatus.ASSIGNED, OrderStatus.CANCELLED],
  ASSIGNED: [OrderStatus.DEPOSIT_PENDING, OrderStatus.CANCELLED],
  DEPOSIT_PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.IN_PROGRESS, OrderStatus.CANCELLED],
  IN_PROGRESS: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(userId: string, dto: CreateOrderDto) {
    // Verify address belongs to user
    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, userId },
    });
    if (!address) {
      throw new BadRequestException('Address not found or does not belong to user');
    }

    const order = await this.prisma.order.create({
      data: {
        userId,
        addressId: dto.addressId,
        serviceCategory: dto.serviceCategory,
        description: dto.description,
        isUrgent: dto.isUrgent ?? false,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        estimatedPrice: dto.estimatedPrice,
        statusHistory: {
          create: {
            status: OrderStatus.CREATED,
            changedBy: userId,
            note: 'Order created',
          },
        },
      },
      include: {
        address: true,
        statusHistory: true,
      },
    });

    this.eventEmitter.emit('order.created', {
      orderId: order.id,
      userId,
      serviceCategory: dto.serviceCategory,
      addressId: dto.addressId,
      isUrgent: dto.isUrgent,
    });

    return order;
  }

  async findById(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        address: true,
        fixer: { include: { user: true } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        payment: true,
        review: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async findByUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        address: true,
        fixer: { include: { user: true } },
        statusHistory: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByFixer(fixerId: string) {
    return this.prisma.order.findMany({
      where: { fixerId },
      include: {
        address: true,
        user: true,
        statusHistory: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    changedBy: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    // Validate state transition
    const allowed = VALID_TRANSITIONS[order.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${dto.status}`,
      );
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: dto.status,
        statusHistory: {
          create: {
            status: dto.status,
            note: dto.note,
            changedBy,
          },
        },
      },
      include: {
        statusHistory: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    this.eventEmitter.emit(`order.${dto.status.toLowerCase()}`, {
      orderId: order.id,
      previousStatus: order.status,
      newStatus: dto.status,
      changedBy,
    });

    return updated;
  }

  async assignFixer(orderId: string, fixerId: string, changedBy: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (order.status !== OrderStatus.MATCHING) {
      throw new BadRequestException('Order is not in MATCHING status');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        fixerId,
        status: OrderStatus.ASSIGNED,
        statusHistory: {
          create: {
            status: OrderStatus.ASSIGNED,
            note: `Fixer ${fixerId} assigned`,
            changedBy,
          },
        },
      },
      include: {
        fixer: { include: { user: true } },
        statusHistory: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }
}
