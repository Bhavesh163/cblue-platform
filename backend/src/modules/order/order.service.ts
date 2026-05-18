import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { OrderStatus, UserRole } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CreateOrderChatMessageDto } from './dto/create-order-chat-message.dto';
import { UploadOrderAttachmentDto } from './dto/upload-order-attachment.dto';

// Valid status transitions
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  CREATED: [OrderStatus.MATCHING, OrderStatus.CANCELLED],
  MATCHING: [OrderStatus.ASSIGNED, OrderStatus.CANCELLED],
  ASSIGNED: [OrderStatus.DEPOSIT_PENDING, OrderStatus.CANCELLED],
  DEPOSIT_PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.IN_PROGRESS, OrderStatus.CANCELLED],
  IN_PROGRESS: [OrderStatus.MEETING_REQUESTED, OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  MEETING_REQUESTED: [OrderStatus.IN_PROGRESS, OrderStatus.COMPLETED, OrderStatus.CANCELLED],
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
    let addressId = dto.addressId;
    if (addressId) {
      const address = await this.prisma.address.findFirst({
        where: { id: addressId, userId },
      });
      if (!address) {
        throw new BadRequestException('Address not found or does not belong to user');
      }
    } else {
      // Create fallback dummy address for guest/direct flows
      const dummyAddress = await this.prisma.address.create({
        data: {
          userId,
          label: "Temporary Request Location",
          province: "Unknown",
          district: "Unknown",
          subdistrict: "Unknown",
          postalCode: "00000"
        }
      });
      addressId = dummyAddress.id;
    }

    const order = await this.prisma.order.create({
      data: {
        userId,
        addressId: addressId,
        orderType: dto.orderType,
        serviceCategory: dto.serviceCategory,
        description: dto.description,
        isUrgent: dto.isUrgent ?? false,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        estimatedPrice: dto.estimatedPrice,
        fixerId: dto.fixerId || null,
        statusHistory: {
          create: {
            status: dto.fixerId ? OrderStatus.MATCHING : OrderStatus.CREATED,
            changedBy: userId,
            note: 'Order created',
          },
        },
        ...(dto.fixerId && { status: OrderStatus.MATCHING }),
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
        images: {
          where: { type: { in: ['order_attachment', 'order_photo'] } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        statusHistory: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMyFixerOrders(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { fixer: true },
    });

    if (!user?.fixer) {
      return [];
    }

    return this.findByFixer(user.fixer.id);
  }

  async findByFixer(fixerId: string) {
    return this.prisma.order.findMany({
      where: { fixerId },
      include: {
        address: true,
        user: true,
        images: {
          where: { type: { in: ['order_attachment', 'order_photo'] } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        statusHistory: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async getOrderForParticipant(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        fixer: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    const isCustomer = order.userId === userId;
    const isFixer = order.fixer?.userId === userId;
    if (!isCustomer && !isFixer) {
      throw new ForbiddenException('You do not have access to this order');
    }

    return { order, isCustomer, isFixer };
  }

  async getOrderChatMessages(orderId: string, userId: string) {
    await this.getOrderForParticipant(orderId, userId);

    const messages = await this.prisma.orderChatMessage.findMany({
      where: { orderId },
      include: {
        senderUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map((m) => ({
      id: m.id,
      orderId: m.orderId,
      senderUserId: m.senderUserId,
      senderRole: m.senderRole,
      senderName: m.senderUser?.name || m.senderUser?.email || 'User',
      text: m.text,
      createdAt: m.createdAt,
    }));
  }

  async createOrderChatMessage(
    orderId: string,
    userId: string,
    dto: CreateOrderChatMessageDto,
  ) {
    await this.getOrderForParticipant(orderId, userId);

    const sender = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const created = await this.prisma.orderChatMessage.create({
      data: {
        orderId,
        senderUserId: userId,
        senderRole: sender?.role ?? UserRole.USER,
        text: dto.text.trim(),
      },
      include: {
        senderUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return {
      id: created.id,
      orderId: created.orderId,
      senderUserId: created.senderUserId,
      senderRole: created.senderRole,
      senderName: created.senderUser?.name || created.senderUser?.email || 'User',
      text: created.text,
      createdAt: created.createdAt,
    };
  }

  async getOrderAttachments(orderId: string, userId: string) {
    await this.getOrderForParticipant(orderId, userId);

    return this.prisma.image.findMany({
      where: {
        orderId,
        type: {
          in: ['order_attachment', 'order_photo'],
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async uploadOrderAttachment(
    orderId: string,
    userId: string,
    dto: UploadOrderAttachmentDto,
  ) {
    await this.getOrderForParticipant(orderId, userId);

    const safeKey =
      dto.key?.trim() ||
      `order/${orderId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    return this.prisma.image.create({
      data: {
        orderId,
        type: 'order_attachment',
        url: dto.url,
        key: safeKey,
      },
    });
  }

  async updateStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    changedBy: string,
    callerRole?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { fixer: { select: { userId: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    // Role-based access: USER can only advance their own order for specific transitions
    if (callerRole === UserRole.USER) {
      if (order.userId !== changedBy) {
        throw new ForbiddenException('You do not have access to this order');
      }
      const customerAllowed: OrderStatus[] = [OrderStatus.IN_PROGRESS, OrderStatus.MEETING_REQUESTED, OrderStatus.COMPLETED, OrderStatus.CANCELLED];
      if (!customerAllowed.includes(dto.status)) {
        throw new ForbiddenException(`Customers may only transition to IN_PROGRESS, MEETING_REQUESTED, COMPLETED, or CANCELLED`);
      }
    }

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
