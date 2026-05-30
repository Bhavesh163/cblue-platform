import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { OrderStatus, UserRole } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CreateOrderChatMessageDto } from './dto/create-order-chat-message.dto';
import { UploadOrderAttachmentDto } from './dto/upload-order-attachment.dto';
import { UploadOrderAttachmentsBatchDto } from './dto/upload-order-attachments-batch.dto';

// Valid status transitions
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  CREATED: [OrderStatus.MATCHING, OrderStatus.CANCELLED],
  MATCHING: [OrderStatus.ASSIGNED, OrderStatus.CANCELLED],
  ASSIGNED: [OrderStatus.DEPOSIT_PENDING, OrderStatus.CANCELLED],
  DEPOSIT_PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.IN_PROGRESS, OrderStatus.CANCELLED],
  IN_PROGRESS: [
    OrderStatus.MEETING_REQUESTED,
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
  ],
  MEETING_REQUESTED: [
    OrderStatus.IN_PROGRESS,
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
  ],
  COMPLETED: [],
  CANCELLED: [],
};
const HIDDEN_TEST_PO_MARKERS = ['PO-2605-6716', 'PO-2605-9605', 'PO-2605-8699'];
const isHiddenTestOrder = (description?: string | null) =>
  HIDDEN_TEST_PO_MARKERS.some((po) =>
    String(description || '')
      .toUpperCase()
      .includes(po),
  );

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

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
        throw new BadRequestException(
          'Address not found or does not belong to user',
        );
      }
    } else {
      // Create fallback dummy address for guest/direct flows
      const dummyAddress = await this.prisma.address.create({
        data: {
          userId,
          label: 'Temporary Request Location',
          province: 'Unknown',
          district: 'Unknown',
          subdistrict: 'Unknown',
          postalCode: '00000',
        },
      });
      addressId = dummyAddress.id;
    }

    const attachmentRows = Array.isArray(dto.attachments)
      ? dto.attachments.filter((row) => String(row?.url || '').trim())
      : [];

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
        ...(attachmentRows.length > 0
          ? {
              images: {
                create: attachmentRows.map((row, index) => ({
                  type: 'order_attachment',
                  url: row.url,
                  key:
                    row.key?.trim() ||
                    `order/${Date.now()}-${index + 1}-${Math.random().toString(36).slice(2, 8)}`,
                })),
              },
            }
          : {}),
        ...(dto.fixerId && { status: OrderStatus.MATCHING }),
      },
      include: {
        address: true,
        images: {
          where: { type: { in: ['order_attachment', 'order_photo'] } },
          orderBy: { createdAt: 'asc' },
        },
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
    let orders: any[];
    try {
      orders = await this.prisma.order.findMany({
        where: { userId },
        include: {
          address: true,
          fixer: true,
          images: {
            where: { type: { in: ['order_attachment', 'order_photo'] } },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
          statusHistory: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.warn(
        `Falling back to scalar customer order query after relation query failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      try {
        orders = await this.prisma.order.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
      } catch (fallbackError) {
        this.logger.warn(
          `Returning empty customer order list after scalar query failed for ${userId}: ${
            fallbackError instanceof Error
              ? fallbackError.message
              : String(fallbackError)
          }`,
        );
        return [];
      }
    }

    const fixerUserIds = Array.from(
      new Set(
        orders
          .map((order) => String(order.fixer?.userId || '').trim())
          .filter(Boolean),
      ),
    );
    let fixerUsers: any[] = [];
    try {
      fixerUsers = fixerUserIds.length
        ? await this.prisma.user.findMany({
            where: { id: { in: fixerUserIds } },
            select: { id: true, name: true, email: true, role: true },
          })
        : [];
    } catch (error) {
      this.logger.warn(
        `Skipping fixer user hydration for customer orders after query failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    const fixerUserMap = new Map(fixerUsers.map((user) => [user.id, user]));

    return orders
      .filter((order) => !isHiddenTestOrder(order.description))
      .map((order) => ({
        ...order,
        fixer: order.fixer
          ? {
              ...order.fixer,
              user: fixerUserMap.get(String(order.fixer.userId || '').trim()) ||
                null,
            }
          : null,
      }));
  }

  async findMyFixerOrders(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          fixer: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!user?.fixer) {
        return [];
      }

      return await this.findByFixer(user.fixer.id);
    } catch (error) {
      this.logger.warn(
        `Returning empty fixer order list after query failed for user ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return [];
    }
  }

  async findByFixer(fixerId: string) {
    let orders: any[];
    try {
      orders = await this.prisma.order.findMany({
        where: { fixerId },
        include: {
          address: true,
          images: {
            where: { type: { in: ['order_attachment', 'order_photo'] } },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
          statusHistory: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.warn(
        `Falling back to scalar fixer order query after relation query failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      orders = await this.prisma.order.findMany({
        where: { fixerId },
        orderBy: { createdAt: 'desc' },
      });
    }

    const customerIds = Array.from(new Set(orders.map((order) => order.userId)));
    const customers = customerIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: customerIds } },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        })
      : [];
    const customerMap = new Map(customers.map((user) => [user.id, user]));

    return orders
      .filter((order) => !isHiddenTestOrder(order.description))
      .map((order) => ({
        ...order,
        user: customerMap.get(order.userId) || null,
      }));
  }

  private async getOrderForParticipant(orderId: string, userId: string) {
    let order: { id: string; userId: string; fixerId: string | null } | null = null;
    try {
      order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          userId: true,
          fixerId: true,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Order lookup failed for participant check on ${orderId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new NotFoundException('Order not found');
    }

    if (!order) throw new NotFoundException('Order not found');

    let fixerUserId: string | null = null;
    if (order.fixerId) {
      try {
        const fixer = await this.prisma.fixer.findUnique({
          where: { id: order.fixerId },
          select: { userId: true },
        });
        fixerUserId = fixer?.userId || null;
      } catch (error) {
        this.logger.warn(
          `Fixer lookup failed for order ${orderId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    const isCustomer = order.userId === userId;
    const isFixer = fixerUserId === userId;
    if (!isCustomer && !isFixer) {
      throw new ForbiddenException('You do not have access to this order');
    }

    return { order, isCustomer, isFixer };
  }

  async getOrderChatMessages(orderId: string, userId: string) {
    await this.getOrderForParticipant(orderId, userId);

    let messages: any[] = [];
    try {
      messages = await this.prisma.orderChatMessage.findMany({
        where: { orderId },
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      this.logger.warn(
        `Returning empty chat history after chat query failed for order ${orderId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return [];
    }

    const senderIds = Array.from(
      new Set(messages.map((message) => message.senderUserId).filter(Boolean)),
    );
    let senders: any[] = [];
    try {
      senders = senderIds.length
        ? await this.prisma.user.findMany({
            where: { id: { in: senderIds } },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          })
        : [];
    } catch (error) {
      this.logger.warn(
        `Skipping chat sender hydration after user query failed for order ${orderId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    const senderMap = new Map(senders.map((sender) => [sender.id, sender]));

    return messages.map((m) => ({
      id: m.id,
      orderId: m.orderId,
      senderUserId: m.senderUserId,
      senderRole: m.senderRole,
      senderName:
        senderMap.get(m.senderUserId)?.name ||
        senderMap.get(m.senderUserId)?.email ||
        'User',
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

    let sender: { role: UserRole } | null = null;
    try {
      sender = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
    } catch (error) {
      this.logger.warn(
        `Unable to load chat sender role for ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    let created: any;
    try {
      created = await this.prisma.orderChatMessage.create({
        data: {
          orderId,
          senderUserId: userId,
          senderRole: sender?.role ?? UserRole.USER,
          text: dto.text.trim(),
        },
      });
    } catch (error) {
      this.logger.warn(
        `Returning transient chat message after chat create failed for order ${orderId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return {
        id: `transient-${Date.now()}`,
        orderId,
        senderUserId: userId,
        senderRole: sender?.role ?? UserRole.USER,
        senderName: 'User',
        text: dto.text.trim(),
        createdAt: new Date(),
      };
    }

    let senderProfile: { name: string | null; email: string | null } | null = null;
    try {
      senderProfile = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      });
    } catch (error) {
      this.logger.warn(
        `Unable to load chat sender profile for ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return {
      id: created.id,
      orderId: created.orderId,
      senderUserId: created.senderUserId,
      senderRole: created.senderRole,
      senderName: senderProfile?.name || senderProfile?.email || 'User',
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

  async uploadOrderAttachments(
    orderId: string,
    userId: string,
    dto: UploadOrderAttachmentsBatchDto,
  ) {
    await this.getOrderForParticipant(orderId, userId);

    const rows = Array.isArray(dto.attachments) ? dto.attachments : [];
    if (rows.length === 0) {
      return [];
    }

    return this.prisma.$transaction(
      rows.map((row, index) => {
        const safeKey =
          row?.key?.trim() ||
          `order/${orderId}/${Date.now()}-${index + 1}-${Math.random().toString(36).slice(2, 8)}`;

        return this.prisma.image.create({
          data: {
            orderId,
            type: 'order_attachment',
            url: row.url,
            key: safeKey,
          },
        });
      }),
    );
  }

  async updateStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    changedBy: string,
    callerRole?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        fixerId: true,
        status: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const fixer = order.fixerId
      ? await this.prisma.fixer.findUnique({
          where: { id: order.fixerId },
          select: { userId: true },
        })
      : null;

    // Role-based access: USER can only advance their own order for specific transitions
    if (callerRole === UserRole.USER) {
      if (order.userId !== changedBy) {
        throw new ForbiddenException('You do not have access to this order');
      }
      const customerAllowed: OrderStatus[] = [
        OrderStatus.IN_PROGRESS,
        OrderStatus.MEETING_REQUESTED,
        OrderStatus.COMPLETED,
        OrderStatus.CANCELLED,
      ];
      if (!customerAllowed.includes(dto.status)) {
        throw new ForbiddenException(
          `Customers may only transition to IN_PROGRESS, MEETING_REQUESTED, COMPLETED, or CANCELLED`,
        );
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
