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

  // ── Fraud detection ──

  async getFraudFlags() {
    // 1. Fixers with suspiciously high ratings but very few completed jobs
    const suspiciousRatings = await this.prisma.fixer.findMany({
      where: {
        rating: { gte: 4.9 },
        completedJobs: { lt: 3 },
        status: FixerStatus.APPROVED,
      },
      include: { user: { select: { id: true, phone: true, name: true } } },
    });

    // 2. Approved fixers with zero skills (incomplete/fake registrations)
    const noSkillFixers = await this.prisma.fixer.findMany({
      where: {
        status: FixerStatus.APPROVED,
        skills: { none: {} },
      },
      include: { user: { select: { id: true, phone: true, name: true } } },
    });

    // 3. Users who registered as fixers but never completed KYC (not verified)
    const unverifiedActive = await this.prisma.fixer.findMany({
      where: {
        status: FixerStatus.APPROVED,
        verified: false,
      },
      include: { user: { select: { id: true, phone: true, name: true } } },
    });

    // 4. Fixers with abnormally fast response times (possible bot behaviour)
    const suspiciousResponseTime = await this.prisma.fixer.findMany({
      where: {
        responseTime: { lt: 1 },
        completedJobs: { gt: 0 },
        status: FixerStatus.APPROVED,
      },
      include: { user: { select: { id: true, phone: true, name: true } } },
    });

    const flags = [
      ...suspiciousRatings.map((f) => ({
        fixerId: f.id,
        user: f.user,
        type: 'SUSPICIOUS_RATING' as const,
        detail: `Rating ${f.rating} with only ${f.completedJobs} completed jobs`,
      })),
      ...noSkillFixers.map((f) => ({
        fixerId: f.id,
        user: f.user,
        type: 'NO_SKILLS' as const,
        detail: 'Approved fixer with no registered skills',
      })),
      ...unverifiedActive.map((f) => ({
        fixerId: f.id,
        user: f.user,
        type: 'UNVERIFIED_ACTIVE' as const,
        detail: 'Approved but not verified (KYC incomplete)',
      })),
      ...suspiciousResponseTime.map((f) => ({
        fixerId: f.id,
        user: f.user,
        type: 'SUSPICIOUS_RESPONSE_TIME' as const,
        detail: `Response time ${f.responseTime} min — possible bot`,
      })),
    ];

    return { flags, total: flags.length };
  }

  async suspendFixer(fixerId: string, reason: string) {
    const fixer = await this.prisma.fixer.findUnique({
      where: { id: fixerId },
    });
    if (!fixer) throw new NotFoundException('Fixer not found');

    const updated = await this.prisma.fixer.update({
      where: { id: fixerId },
      data: {
        status: FixerStatus.SUSPENDED,
        verified: false,
      },
      include: { user: true },
    });

    this.logger.warn(`Fixer ${fixerId} suspended. Reason: ${reason}`);

    this.eventEmitter.emit('fixer.suspended', {
      fixerId,
      userId: fixer.userId,
      reason,
    });

    return updated;
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
