import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  FixerStatus,
  FixerTier,
  OrderStatus,
  QualificationReviewKind,
  QualificationReviewStatus,
  QualificationSubmissionStatus,
} from '@prisma/client';
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

  private getTierReviewReason(fixer: {
    aiFlags?: unknown;
    aiTier?: string | null;
    tier?: unknown;
  }): string {
    const flags = Array.isArray(fixer.aiFlags) ? fixer.aiFlags : [];
    const adminFlag = flags.find(
      (flag) =>
        flag &&
        typeof flag === 'object' &&
        typeof (flag as { message?: unknown }).message === 'string' &&
        (flag as { message: string }).message.includes('Admin tier review'),
    ) as { message?: string } | undefined;
    if (adminFlag?.message) return adminFlag.message;

    const cautionFlag = flags.find(
      (flag) =>
        flag &&
        typeof flag === 'object' &&
        ['warn', 'fail'].includes(String((flag as { type?: unknown }).type)),
    ) as { message?: string } | undefined;
    if (cautionFlag?.message) return cautionFlag.message;

    const tier =
      typeof fixer.aiTier === 'string'
        ? fixer.aiTier
        : typeof fixer.tier === 'string'
          ? fixer.tier
          : 'partner';
    return `Upper tier ${tier} requires human evidence review`;
  }
  async getFixerDirectory(query: {
    page?: number;
    limit?: number;
    province?: string;
    district?: string;
    service?: string;
    tier?: string;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(20, Math.max(1, query.limit || 20));
    const where: Prisma.FixerWhereInput = {
      ...(query.province
        ? { serviceProvince: { contains: query.province, mode: 'insensitive' } }
        : {}),
      ...(query.district
        ? { serviceDistrict: { contains: query.district, mode: 'insensitive' } }
        : {}),
      ...(query.tier ? { tier: query.tier as FixerTier } : {}),
      ...(query.service
        ? {
            skills: {
              some: { name: { contains: query.service, mode: 'insensitive' } },
            },
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.fixer.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          tier: true,
          status: true,
          verified: true,
          rating: true,
          completedJobs: true,
          yearsExperience: true,
          serviceProvince: true,
          serviceDistrict: true,
          servicePostalCode: true,
          priceList: true,
          aiScore: true,
          aiTier: true,
          aiCredentialStatus: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, name: true, email: true, phone: true } },
          skills: {
            select: { category: true, name: true, yearsExperience: true },
          },
          qualificationSubmissions: {
            orderBy: { version: 'desc' },
            take: 1,
            select: {
              id: true,
              version: true,
              status: true,
              submittedAt: true,
              documents: {
                select: {
                  id: true,
                  documentType: true,
                  contentType: true,
                  sizeBytes: true,
                  evidenceStatus: true,
                  createdAt: true,
                },
              },
            },
          },
          orders: {
            select: {
              status: true,
              workflowActions: { select: { action: true } },
            },
          },
        },
      }),
      this.prisma.fixer.count({ where }),
    ]);
    return {
      rows: rows.map((row) => ({
        ...row,
        declineCount: row.orders.reduce(
          (sum, order) =>
            sum +
            order.workflowActions.filter(
              (event) => event.action === 'partner-decline',
            ).length,
          0,
        ),
        cancellationCount: row.orders.reduce(
          (sum, order) =>
            sum +
            order.workflowActions.filter(
              (event) => event.action === 'customer-cancel',
            ).length,
          0,
        ),
        orders: undefined,
      })),
      total,
      page,
      limit,
    };
  }

  async getPendingFixers(pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const where = {
      OR: [
        { status: FixerStatus.PENDING },
        {
          qualificationSubmissions: {
            some: {
              status: {
                in: [
                  QualificationSubmissionStatus.NEEDS_REVIEW,
                  QualificationSubmissionStatus.AI_PRECLEARED,
                ],
              },
              reviewTasks: {
                some: {
                  kind: QualificationReviewKind.KYC,
                  status: {
                    in: [
                      QualificationReviewStatus.OPEN,
                      QualificationReviewStatus.ASSIGNED,
                    ],
                  },
                },
              },
            },
          },
        },
      ],
    };
    const [fixers, total] = await Promise.all([
      this.prisma.fixer.findMany({
        where,
        include: { user: true, skills: true, images: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.fixer.count({
        where,
      }),
    ]);

    return { fixers, total, page, limit };
  }

  async getTierReviewFixers(pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const where = {
      status: FixerStatus.APPROVED,
      tier: {
        in: [FixerTier.CORPORATE, FixerTier.SPECIALIST, FixerTier.EXPERT],
      },
    };
    const [fixers, total] = await Promise.all([
      this.prisma.fixer.findMany({
        where,
        include: { user: true, skills: true, images: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.fixer.count({ where }),
    ]);

    return {
      fixers: fixers.map((fixer) => ({
        ...fixer,
        reviewStatus: 'NEEDS_ADMIN_REVIEW' as const,
        reviewReason: this.getTierReviewReason(fixer),
      })),
      total,
      page,
      limit,
    };
  }
  async getFixerQualificationDetail(fixerId: string) {
    const fixer = await this.prisma.fixer.findUnique({
      where: { id: fixerId },
      select: {
        id: true,
        tier: true,
        status: true,
        verified: true,
        priceList: true,
        aiScore: true,
        aiTier: true,
        aiBreakdown: true,
        aiFlags: true,
        aiCredentialStatus: true,
        user: { select: { id: true, name: true, email: true } },
        qualificationSubmissions: {
          orderBy: { version: 'desc' },
          select: {
            id: true,
            version: true,
            status: true,
            submittedAt: true,
            reviewedAt: true,
            reviewerId: true,
            decisionReason: true,
            documents: {
              select: {
                id: true,
                documentType: true,
                contentType: true,
                sizeBytes: true,
                evidenceStatus: true,
                lifecycleState: true,
                createdAt: true,
                expiresAt: true,
                identityNumberLast4: true,
                identityExpiryDate: true,
              },
              orderBy: { createdAt: 'asc' },
            },
            evaluations: {
              select: {
                id: true,
                provider: true,
                status: true,
                risk: true,
                recommendedTier: true,
                confidence: true,
                tierEligibilityScore: true,
                humanReviewRequired: true,
                completedAt: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'desc' },
            },
            reviewTasks: {
              select: {
                id: true,
                kind: true,
                status: true,
                proposedTier: true,
                decision: true,
                proposedReason: true,
                checkedBy: true,
                decidedAt: true,
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });
    if (!fixer) throw new NotFoundException('Fixer not found');
    return fixer;
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
