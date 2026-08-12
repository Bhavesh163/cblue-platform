import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  FixerStatus,
  FixerTier,
  OrderStatus,
  NotificationType,
  QualificationEligibilityStatus,
  QualificationReviewKind,
  QualificationReviewStatus,
  QualificationSubmissionStatus,
} from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { qualificationEligibilitySnapshot } from '../qualification/qualification-eligibility';
import { ApproveFixerDto } from './dto/approve-fixer.dto';
import { ManualAssignDto } from './dto/manual-assign.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
const AUTHORITATIVE_COMPLETION_WHERE: Prisma.OrderWhereInput = {
  OR: [
    { status: OrderStatus.COMPLETED },
    { workflowActions: { some: { action: 'confirm-completion' } } },
  ],
};

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
    subdistrict?: string;
    service?: string;
    tier?: string;
    minRating?: number;
    maxDeclines90Days?: number;
    maxCancellations12Months?: number;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(20, Math.max(1, query.limit || 20));
    const locationFilters: Prisma.FixerWhereInput[] = [];
    const province = query.province?.trim();
    const district = query.district?.trim();
    const subdistrict = query.subdistrict?.trim();
    if (province) {
      locationFilters.push({
        OR: [
          { serviceProvince: { contains: province, mode: 'insensitive' } },
          {
            companyAddress: {
              path: ['province'],
              string_contains: province,
            },
          },
        ],
      });
    }
    if (district) {
      locationFilters.push({
        OR: [
          { serviceDistrict: { contains: district, mode: 'insensitive' } },
          {
            companyAddress: {
              path: ['district'],
              string_contains: district,
            },
          },
        ],
      });
    }
    if (subdistrict) {
      locationFilters.push({
        companyAddress: {
          path: ['subdistrict'],
          string_contains: subdistrict,
        },
      });
    }
    const hasPostFilters =
      query.maxDeclines90Days !== undefined ||
      query.maxCancellations12Months !== undefined;
    const where: Prisma.FixerWhereInput = {
      ...(locationFilters.length ? { AND: locationFilters } : {}),
      ...(query.tier ? { tier: query.tier as FixerTier } : {}),
      ...(query.minRating !== undefined
        ? { rating: { gte: query.minRating } }
        : {}),
      ...(query.service
        ? {
            skills: {
              some: { name: { contains: query.service, mode: 'insensitive' } },
            },
          }
        : {}),
    };
    const now = new Date();
    const declineWindowStart = new Date(now);
    declineWindowStart.setUTCDate(declineWindowStart.getUTCDate() - 90);
    const cancellationWindowStart = new Date(now);
    cancellationWindowStart.setUTCFullYear(
      cancellationWindowStart.getUTCFullYear() - 1,
    );
    const incidentWindowStart =
      declineWindowStart < cancellationWindowStart
        ? declineWindowStart
        : cancellationWindowStart;
    const [candidates, persistedTotal] = await Promise.all([
      this.prisma.fixer.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        ...(hasPostFilters ? {} : { skip: (page - 1) * limit, take: limit }),
        select: {
          id: true,
          tier: true,
          status: true,
          verified: true,
          verifiedCompanyName: true,
          qualificationEligibilityStatus: true,
          kycValidUntil: true,
          kycReverificationRequiredAt: true,
          kycReverificationReasons: true,
          tierReevaluationRequestedAt: true,
          tierReevaluationCompletedAt: true,
          suspendedAt: true,
          suspendedById: true,
          suspensionReason: true,
          rating: true,
          completedJobs: true,
          yearsExperience: true,
          contactPhone: true,
          serviceProvince: true,
          serviceDistrict: true,
          servicePostalCode: true,
          companyAddress: true,
          priceList: true,
          aiScore: true,
          aiTier: true,
          aiCredentialStatus: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, name: true, email: true, phone: true } },
          _count: {
            select: {
              orders: { where: AUTHORITATIVE_COMPLETION_WHERE },
              reviews: true,
            },
          },
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
                where: {
                  isActive: true,
                  lifecycleState: { not: 'DELETE_PENDING' },
                  documentType: { not: 'id-back' },
                },
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
              id: true,
              userId: true,
              workflowActions: {
                where: {
                  action: { in: ['partner-decline', 'customer-cancel'] },
                  createdAt: { gte: incidentWindowStart },
                },
                select: {
                  action: true,
                  actorUserId: true,
                  payload: true,
                  createdAt: true,
                },
              },
              statusHistory: {
                where: {
                  status: OrderStatus.CANCELLED,
                  createdAt: { gte: incidentWindowStart },
                },
                select: {
                  changedBy: true,
                  note: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.fixer.count({ where }),
    ]);
    const readReason = (value: Prisma.JsonValue | null): string | null => {
      if (!value || typeof value !== 'object' || Array.isArray(value))
        return null;
      for (const key of ['reason', 'note', 'privateNote']) {
        const candidate = value[key];
        if (typeof candidate === 'string' && candidate.trim())
          return candidate.trim();
      }
      return null;
    };
    const readStatusReason = (note: string | null): string | null => {
      const value = note?.trim();
      if (!value) return null;
      return value
        .replace(/^Customer cancelled\.\s*Reason:\s*/i, '')
        .replace(/^Partner declined\.\s*Reason:\s*/i, '')
        .trim();
    };
    const normalized = candidates.map((row) => {
      const eligibility = qualificationEligibilitySnapshot(row, now);
      const address =
        row.companyAddress &&
        typeof row.companyAddress === 'object' &&
        !Array.isArray(row.companyAddress)
          ? row.companyAddress
          : null;
      const addressValue = (key: string) => {
        const value = address?.[key];
        return typeof value === 'string' && value.trim() ? value.trim() : null;
      };
      const recentIncidents = row.orders.flatMap((order) => {
        const workflowIncidents = order.workflowActions.flatMap((event) => {
          const partnerAuthored =
            event.action === 'partner-decline' &&
            event.actorUserId === row.user.id;
          const customerAuthored =
            event.action === 'customer-cancel' &&
            event.actorUserId === order.userId;
          if (!partnerAuthored && !customerAuthored) return [];
          return [
            {
              orderId: order.id,
              eventType: partnerAuthored
                ? ('PARTNER_DECLINE' as const)
                : ('CUSTOMER_CANCEL' as const),
              reason: readReason(event.payload),
              createdAt: event.createdAt,
            },
          ];
        });
        const workflowTypes = new Set(
          workflowIncidents.map((event) => event.eventType),
        );
        const historyIncidents = order.statusHistory.flatMap((event) => {
          const eventType =
            event.changedBy === row.user.id
              ? ('PARTNER_DECLINE' as const)
              : event.changedBy === order.userId
                ? ('CUSTOMER_CANCEL' as const)
                : null;
          if (!eventType || workflowTypes.has(eventType)) return [];
          return [
            {
              orderId: order.id,
              eventType,
              reason: readStatusReason(event.note),
              createdAt: event.createdAt,
            },
          ];
        });
        return [...workflowIncidents, ...historyIncidents];
      });
      recentIncidents.sort(
        (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
      );
      const authoritativeCompletedJobs = Math.max(
        row._count.orders,
        row._count.reviews,
      );
      return {
        ...row,
        completedJobs: authoritativeCompletedJobs,
        reviewCount: row._count.reviews,
        serviceProvince: row.serviceProvince || addressValue('province'),
        serviceDistrict: row.serviceDistrict || addressValue('district'),
        serviceSubdistrict: addressValue('subdistrict'),
        servicePostalCode: row.servicePostalCode || addressValue('postalCode'),
        declineCount90Days: recentIncidents.filter(
          (event) =>
            event.eventType === 'PARTNER_DECLINE' &&
            event.createdAt >= declineWindowStart,
        ).length,
        cancellationCount12Months: recentIncidents.filter(
          (event) =>
            event.eventType === 'CUSTOMER_CANCEL' &&
            event.createdAt >= cancellationWindowStart,
        ).length,
        matchingEligibility: {
          status: eligibility.status,
          newJobEligible: eligibility.newJobEligible,
          kycValidUntil: eligibility.kycValidUntil,
          daysUntilExpiry: eligibility.daysUntilExpiry,
          reasons: eligibility.reasons,
        },
        recentIncidents: recentIncidents.slice(0, 20),
        companyAddress: undefined,
        orders: undefined,
        _count: undefined,
      };
    });
    const filtered = normalized.filter((row) => {
      if (
        query.maxDeclines90Days !== undefined &&
        row.declineCount90Days > query.maxDeclines90Days
      )
        return false;
      if (
        query.maxCancellations12Months !== undefined &&
        row.cancellationCount12Months > query.maxCancellations12Months
      )
        return false;
      return true;
    });
    return {
      rows: hasPostFilters
        ? filtered.slice((page - 1) * limit, page * limit)
        : filtered,
      total: hasPostFilters ? filtered.length : persistedTotal,
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
        rating: true,
        status: true,
        verified: true,
        verifiedCompanyName: true,
        qualificationEligibilityStatus: true,
        kycValidUntil: true,
        kycReverificationRequiredAt: true,
        kycReverificationReasons: true,
        tierReevaluationRequestedAt: true,
        tierReevaluationCompletedAt: true,
        suspendedAt: true,
        suspendedById: true,
        suspensionReason: true,
        yearsExperience: true,
        contactPhone: true,
        bio: true,
        description: true,
        pastExperience: true,
        pastProjectType: true,
        companyAddress: true,
        serviceProvince: true,
        serviceDistrict: true,
        servicePostalCode: true,
        gpsLat: true,
        gpsLng: true,
        priceList: true,
        aiScore: true,
        aiTier: true,
        aiBreakdown: true,
        aiFlags: true,
        aiCredentialStatus: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            addresses: {
              orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
              take: 3,
              select: {
                label: true,
                province: true,
                district: true,
                subdistrict: true,
                postalCode: true,
                street: true,
                building: true,
                unit: true,
                latitude: true,
                longitude: true,
                isDefault: true,
              },
            },
          },
        },
        skills: {
          orderBy: [{ category: 'asc' }, { name: 'asc' }],
          select: { category: true, name: true, yearsExperience: true },
        },
        _count: {
          select: {
            orders: { where: AUTHORITATIVE_COMPLETION_WHERE },
            reviews: true,
          },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            order: {
              select: {
                id: true,
                serviceCategory: true,
                status: true,
                updatedAt: true,
              },
            },
          },
        },
        orders: {
          where: AUTHORITATIVE_COMPLETION_WHERE,
          orderBy: { updatedAt: 'desc' },
          take: 20,
          select: {
            id: true,
            serviceCategory: true,
            status: true,
            estimatedPrice: true,
            finalPrice: true,
            updatedAt: true,
          },
        },
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
              where: {
                lifecycleState: { not: 'DELETE_PENDING' },
                documentType: { not: 'id-back' },
              },
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
                legalHoldUntil: true,
                assessmentReasonCodes: true,
                extractedFields: true,
                credentialVerification: true,
                credentialVerifiedAt: true,
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
                output: true,
                findings: {
                  select: {
                    documentId: true,
                    code: true,
                    severity: true,
                    claim: true,
                    result: true,
                    confidence: true,
                    details: true,
                    createdAt: true,
                  },
                  orderBy: { createdAt: 'desc' },
                },
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
    const { _count, ...detail } = fixer;
    return {
      ...detail,
      completedJobs: Math.max(_count.orders, _count.reviews),
      reviewCount: _count.reviews,
      matchingEligibility: qualificationEligibilitySnapshot(fixer),
    };
  }

  async approveFixer(fixerId: string, dto: ApproveFixerDto) {
    const fixer = await this.prisma.fixer.findUnique({
      where: { id: fixerId },
    });
    if (!fixer) throw new NotFoundException('Fixer not found');

    let updateData: Prisma.FixerUpdateInput = {
      status: dto.status,
      verified: false,
    };
    if (dto.status === FixerStatus.APPROVED) {
      const latestSubmission = await this.prisma.kycSubmission.findFirst({
        where: { fixerId },
        orderBy: { version: 'desc' },
        select: {
          status: true,
          documents: {
            where: {
              documentType: 'id-front',
              isActive: true,
              lifecycleState: 'READY',
              evidenceStatus: 'VALIDATED',
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { identityExpiryDate: true },
          },
        },
      });
      if (latestSubmission?.status !== QualificationSubmissionStatus.APPROVED) {
        throw new ConflictException(
          'Approved KYC is required before fixer approval',
        );
      }
      const kycValidUntil =
        latestSubmission.documents[0]?.identityExpiryDate ?? null;
      if (!kycValidUntil || kycValidUntil <= new Date()) {
        throw new ConflictException(
          'Unexpired validated ID evidence is required before fixer approval',
        );
      }
      updateData = {
        status: FixerStatus.APPROVED,
        verified: true,
        qualificationEligibilityStatus: QualificationEligibilityStatus.ELIGIBLE,
        kycValidUntil,
        kycReverificationRequiredAt: null,
        kycReverificationReasons: Prisma.JsonNull,
        kycExpiryWarningSentAt: null,
      };
    }

    const updated = await this.prisma.fixer.update({
      where: { id: fixerId },
      data: updateData,
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

  private readOrderBudget(order: {
    estimatedPrice: number | null;
    finalPrice: number | null;
    budgetBreakdown: Prisma.JsonValue | null;
  }): number | null {
    const positiveAmount = (value: unknown): number | null => {
      const amount =
        typeof value === 'number'
          ? value
          : typeof value === 'string' && value.trim()
            ? Number(value)
            : Number.NaN;
      return Number.isFinite(amount) && amount > 0 ? amount : null;
    };
    const estimated = positiveAmount(order.estimatedPrice);
    if (estimated !== null) return estimated;

    const asObject = (value: unknown): Record<string, unknown> | null =>
      value !== null && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
    const breakdown: unknown = order.budgetBreakdown;
    const root = asObject(breakdown);
    const persistedTotal = positiveAmount(root?.total ?? root?.estimatedTotal);
    if (persistedTotal !== null) return persistedTotal;
    let items: unknown[] | null = Array.isArray(breakdown)
      ? (breakdown as unknown[])
      : null;
    if (!items && root) {
      const nestedItems: unknown[] = [
        root.items,
        root.budgetBreakdown,
        root.breakdown,
        root.lineItems,
      ];
      const persistedItems = nestedItems.find((value) => Array.isArray(value));
      items = Array.isArray(persistedItems)
        ? (persistedItems as unknown[])
        : null;
    }
    if (items) {
      const total = items.reduce<number>((sum, item) => {
        const line = asObject(item);
        if (!line) return sum;
        const direct = positiveAmount(
          line.total ?? line.amount ?? line.lineTotal,
        );
        if (direct !== null) return sum + direct;
        const quantity = positiveAmount(line.quantity) || 0;
        const unitRate =
          positiveAmount(line.unitRate ?? line.rate ?? line.unitPrice) || 0;
        return sum + quantity * unitRate;
      }, 0);
      if (total > 0) return total;
    }
    return positiveAmount(order.finalPrice);
  }

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

    return {
      orders: orders.map((order) => ({
        ...order,
        budget: this.readOrderBudget(order),
      })),
      total,
      page,
      limit,
    };
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
    // Ratings are evidence-backed only when persisted reviews exist.
    const ratingCandidates = await this.prisma.fixer.findMany({
      where: {
        rating: { gte: 4.9 },
        status: FixerStatus.APPROVED,
      },
      select: {
        id: true,
        rating: true,
        user: { select: { id: true, phone: true, name: true } },
        reviews: { select: { rating: true } },
      },
    });
    const ratingIntegrityFlags = ratingCandidates.flatMap((fixer) => {
      if (!fixer.reviews.length) return [];
      const persistedAverage =
        fixer.reviews.reduce((sum, review) => sum + review.rating, 0) /
        fixer.reviews.length;
      if (Math.abs(fixer.rating - persistedAverage) < 0.05) return [];
      return [
        {
          fixerId: fixer.id,
          user: fixer.user,
          type: 'RATING_INTEGRITY_MISMATCH' as const,
          detail: `Stored rating ${fixer.rating.toFixed(2)} differs from persisted review average ${persistedAverage.toFixed(2)} across ${fixer.reviews.length} reviews`,
        },
      ];
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

    // 4. Fixers with abnormally fast response times and persisted work history.
    const responseTimeCandidates = await this.prisma.fixer.findMany({
      where: {
        responseTime: { lt: 1 },
        status: FixerStatus.APPROVED,
      },
      select: {
        id: true,
        responseTime: true,
        user: { select: { id: true, phone: true, name: true } },
        _count: {
          select: {
            orders: { where: AUTHORITATIVE_COMPLETION_WHERE },
            reviews: true,
          },
        },
      },
    });
    const suspiciousResponseTime = responseTimeCandidates.filter(
      (fixer) => Math.max(fixer._count.orders, fixer._count.reviews) > 0,
    );

    const flags = [
      ...ratingIntegrityFlags,
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

  async suspendFixer(fixerId: string, adminId: string, reason: string) {
    const fixer = await this.prisma.fixer.findUnique({
      where: { id: fixerId },
    });
    if (!fixer) throw new NotFoundException('Fixer not found');

    const suspendedAt = new Date();
    const suspensionReason = reason.trim();
    const updated = await this.prisma.$transaction(async (tx) => {
      const suspended = await tx.fixer.update({
        where: { id: fixerId },
        data: {
          status: FixerStatus.SUSPENDED,
          suspendedAt,
          suspendedById: adminId,
          suspensionReason,
        },
        include: { user: true },
      });
      await tx.notification.createMany({
        data: [
          {
            userId: fixer.userId,
            type: NotificationType.IN_APP,
            title: 'Partner profile paused',
            body: `Your partner profile is paused from receiving new opportunities. Reason: ${suspensionReason}`,
            data: {
              fixerId,
              reason: suspensionReason,
              suspendedAt: suspendedAt.toISOString(),
            },
            dedupeKey: `fixer-suspended:${fixerId}:${suspendedAt.getTime()}`,
          },
        ],
        skipDuplicates: true,
      });
      return suspended;
    });

    this.logger.warn(
      `Fixer ${fixerId} suspended by ${adminId}. Reason: ${suspensionReason}`,
    );

    this.eventEmitter.emit('fixer.suspended', {
      fixerId,
      userId: fixer.userId,
      adminId,
      reason: suspensionReason,
      suspendedAt,
    });

    return updated;
  }

  async resumeFixer(fixerId: string, adminId: string, reason: string) {
    const fixer = await this.prisma.fixer.findUnique({
      where: { id: fixerId },
    });
    if (!fixer) throw new NotFoundException('Fixer not found');
    if (fixer.status !== FixerStatus.SUSPENDED) {
      throw new ConflictException('Fixer is not suspended');
    }
    if (
      !fixer.verified ||
      !fixer.kycValidUntil ||
      fixer.kycValidUntil <= new Date()
    ) {
      throw new ConflictException(
        'Current approved identity verification is required before restoring new matching',
      );
    }

    const resumedAt = new Date();
    const resumeReason = reason.trim();
    const updated = await this.prisma.$transaction(async (tx) => {
      const resumed = await tx.fixer.update({
        where: { id: fixerId },
        data: {
          status: FixerStatus.APPROVED,
          suspendedAt: null,
          suspendedById: null,
          suspensionReason: null,
        },
        include: { user: true },
      });
      await tx.notification.createMany({
        data: [
          {
            userId: fixer.userId,
            type: NotificationType.IN_APP,
            title: 'Partner profile restored',
            body: `Your partner profile can receive new opportunities again. Reason: ${resumeReason}`,
            data: {
              fixerId,
              reason: resumeReason,
              resumedAt: resumedAt.toISOString(),
            },
            dedupeKey: `fixer-resumed:${fixerId}:${resumedAt.getTime()}`,
          },
        ],
        skipDuplicates: true,
      });
      return resumed;
    });

    this.logger.log(
      `Fixer ${fixerId} restored by ${adminId}. Reason: ${resumeReason}`,
    );
    this.eventEmitter.emit('fixer.resumed', {
      fixerId,
      userId: fixer.userId,
      adminId,
      reason: resumeReason,
      resumedAt,
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
