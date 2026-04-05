import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FixerStatus, OrderStatus } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { ApproveFixerDto } from './dto/approve-fixer.dto';
import { ManualAssignDto } from './dto/manual-assign.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  // ── Fixer management ──

  async getPendingFixers(pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const [fixers, total] = await Promise.all([
      this.prisma.fixer.findMany({
        where: { status: FixerStatus.PENDING },
        include: { user: true, skills: true, images: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.fixer.count({
        where: { status: FixerStatus.PENDING },
      }),
    ]);

    return { fixers, total, page, limit };
  }

  async approveFixer(fixerId: string, dto: ApproveFixerDto) {
    const fixer = await this.prisma.fixer.findUnique({
      where: { id: fixerId },
    });
    if (!fixer) throw new NotFoundException('Fixer not found');

    const updated = await this.prisma.fixer.update({
      where: { id: fixerId },
      data: {
        status: dto.status,
        verified: dto.status === FixerStatus.APPROVED,
      },
      include: { user: true },
    });

    this.logger.log(`Fixer ${fixerId} status changed to ${dto.status}`);

    this.eventEmitter.emit('fixer.status_changed', {
      fixerId,
      userId: fixer.userId,
      status: dto.status,
    });

    return updated;
  }

  // ── Order management ──

  async getAllOrders(pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        include: {
          user: true,
          fixer: { include: { user: true } },
          address: true,
          payment: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count(),
    ]);

    return { orders, total, page, limit };
  }

  async manualAssign(dto: ManualAssignDto, adminId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    const fixer = await this.prisma.fixer.findUnique({
      where: { id: dto.fixerId },
    });
    if (!fixer) throw new NotFoundException('Fixer not found');

    return this.prisma.order.update({
      where: { id: dto.orderId },
      data: {
        fixerId: dto.fixerId,
        status: OrderStatus.ASSIGNED,
        statusHistory: {
          create: {
            status: OrderStatus.ASSIGNED,
            note: `Manually assigned by admin`,
            changedBy: adminId,
          },
        },
      },
      include: {
        fixer: { include: { user: true } },
      },
    });
  }

  // ── Dashboard stats ──

  async getDashboardStats() {
    const [
      totalUsers,
      totalFixers,
      pendingFixers,
      totalOrders,
      activeOrders,
      completedOrders,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.fixer.count(),
      this.prisma.fixer.count({ where: { status: FixerStatus.PENDING } }),
      this.prisma.order.count(),
      this.prisma.order.count({
        where: {
          status: {
            in: [
              OrderStatus.CREATED,
              OrderStatus.MATCHING,
              OrderStatus.ASSIGNED,
              OrderStatus.DEPOSIT_PENDING,
              OrderStatus.CONFIRMED,
              OrderStatus.IN_PROGRESS,
            ],
          },
        },
      }),
      this.prisma.order.count({
        where: { status: OrderStatus.COMPLETED },
      }),
    ]);

    return {
      totalUsers,
      totalFixers,
      pendingFixers,
      totalOrders,
      activeOrders,
      completedOrders,
    };
  }
}
