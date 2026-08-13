import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  FixerStatus,
  OrderStatus,
  QualificationEligibilityStatus,
} from '@prisma/client';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: {
    fixer: Record<string, jest.Mock>;
    order: Record<string, jest.Mock>;
    user: Record<string, jest.Mock>;
    kycSubmission: Record<string, jest.Mock>;
    notification: Record<string, jest.Mock>;
    $transaction: jest.Mock;
  };
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    prisma = {
      fixer: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      user: {
        count: jest.fn(),
      },
      kycSubmission: {
        findFirst: jest.fn(),
      },
      notification: {
        createMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => Promise<unknown>) =>
        callback(prisma),
    );
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPendingFixers', () => {
    it('should return paginated pending fixers', async () => {
      prisma.fixer.findMany.mockResolvedValue([{ id: 'fixer-1' }]);
      prisma.fixer.count.mockResolvedValue(1);

      const result = await service.getPendingFixers({ page: 1, limit: 20 });
      expect(prisma.fixer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user: { isActive: true },
            qualificationSubmissions: expect.objectContaining({
              some: expect.any(Object),
            }),
          }),
        }),
      );
      expect(result.total).toBe(1);
      expect(result.fixers).toHaveLength(1);
    });
  });

  describe('getTierReviewFixers', () => {
    it('returns approved upper-tier fixers that need admin review', async () => {
      prisma.fixer.findMany.mockResolvedValue([
        {
          id: 'fixer-specialist',
          tier: 'SPECIALIST',
          status: FixerStatus.APPROVED,
          aiTier: 'Specialist',
          aiCredentialStatus: 'verified',
          aiFlags: [
            {
              type: 'warn',
              message: 'Admin tier review required before public promotion',
            },
          ],
          user: { id: 'user-1', name: 'Specialist Partner' },
          skills: [],
          images: [],
        },
      ]);
      prisma.fixer.count.mockResolvedValue(1);

      const result = await service.getTierReviewFixers({ page: 1, limit: 20 });

      expect(prisma.fixer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user: { isActive: true },
            status: FixerStatus.APPROVED,
            tier: { in: ['CORPORATE', 'SPECIALIST', 'EXPERT'] },
          }),
        }),
      );
      expect(result.total).toBe(1);
      expect(result.fixers[0]).toEqual(
        expect.objectContaining({
          id: 'fixer-specialist',
          reviewStatus: 'NEEDS_ADMIN_REVIEW',
          reviewReason: expect.stringContaining('Admin tier review required'),
        }),
      );
    });
  });
  describe('getFixerDirectory', () => {
    it('returns normalized service area and participant-authored incidents', async () => {
      const now = new Date();
      prisma.fixer.findMany.mockResolvedValue([
        {
          id: 'fixer-1',
          publicDisplayName: 'Construction Blue',
          verifiedCompanyName: 'Construction Blue',
          serviceProvince: null,
          serviceDistrict: null,
          servicePostalCode: null,
          companyAddress: {
            province: 'Bangkok',
            district: 'Wang Thonglang',
            subdistrict: 'Saphan Song',
            postalCode: '10310',
          },
          orders: [
            {
              id: 'order-1',
              userId: 'customer-1',
              workflowActions: [
                {
                  action: 'partner-decline',
                  actorUserId: 'user-1',
                  payload: { reason: 'Schedule conflict' },
                  createdAt: now,
                },
                {
                  action: 'partner-decline',
                  actorUserId: 'other-user',
                  payload: { reason: 'Must not count' },
                  createdAt: now,
                },
                {
                  action: 'customer-cancel',
                  actorUserId: 'customer-1',
                  payload: { reason: 'Scope changed' },
                  createdAt: now,
                },
              ],
              statusHistory: [],
            },
          ],
          qualificationSubmissions: [],
          skills: [],
          user: { id: 'user-1', name: 'Provider' },
          _count: { orders: 7, reviews: 5 },
        },
      ]);
      prisma.fixer.count.mockResolvedValue(1);

      const result = await service.getFixerDirectory({
        province: 'Bangkok',
        district: 'Wang Thonglang',
        subdistrict: 'Saphan Song',
        maxDeclines90Days: 1,
        maxCancellations12Months: 1,
      });

      expect(result.rows).toEqual([
        expect.objectContaining({
          id: 'fixer-1',
          displayName: 'Construction Blue',
          serviceProvince: 'Bangkok',
          serviceDistrict: 'Wang Thonglang',
          serviceSubdistrict: 'Saphan Song',
          servicePostalCode: '10310',
          declineCount90Days: 1,
          cancellationCount12Months: 1,
          completedJobs: 7,
          reviewCount: 5,
          matchingEligibility: expect.objectContaining({
            status: 'PENDING',
            newJobEligible: false,
          }),
          recentIncidents: expect.arrayContaining([
            expect.objectContaining({
              eventType: 'PARTNER_DECLINE',
              reason: 'Schedule conflict',
            }),
            expect.objectContaining({
              eventType: 'CUSTOMER_CANCEL',
              reason: 'Scope changed',
            }),
          ]),
        }),
      ]);
      expect(prisma.fixer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user: { isActive: true },
            AND: expect.arrayContaining([
              expect.objectContaining({ OR: expect.any(Array) }),
            ]),
          }),
          select: expect.objectContaining({
            companyAddress: true,
            orders: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe('getFixerQualificationDetail', () => {
    it('returns the persisted provider detail selected for admin review', async () => {
      prisma.fixer.findFirst.mockResolvedValue({
        id: 'fixer-1',
        user: { id: 'user-1', name: 'Provider', addresses: [] },
        skills: [],
        qualificationSubmissions: [],
        _count: { orders: 12, reviews: 9 },
        orders: [],
        reviews: [],
      });

      await expect(
        service.getFixerQualificationDetail('fixer-1'),
      ).resolves.toEqual(expect.objectContaining({ id: 'fixer-1' }));
      expect(prisma.fixer.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'fixer-1', user: { isActive: true } },
          select: expect.objectContaining({
            companyAddress: true,
            skills: expect.any(Object),
            qualificationSubmissions: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe('getAllOrders', () => {
    it('returns a server-owned budget from persisted order values', async () => {
      prisma.order.findMany.mockResolvedValue([
        {
          id: 'order-1',
          estimatedPrice: null,
          finalPrice: null,
          budgetBreakdown: {
            items: [{ quantity: 2, unitRate: 1500 }, { total: 2500 }],
          },
        },
      ]);
      prisma.order.count.mockResolvedValue(1);

      const result = await service.getAllOrders({ page: 1, limit: 20 });

      expect(result.orders[0]).toEqual(
        expect.objectContaining({ id: 'order-1', budget: 5500 }),
      );
    });
  });

  describe('approveFixer', () => {
    it('should throw NotFoundException if fixer not found', async () => {
      prisma.fixer.findUnique.mockResolvedValue(null);

      await expect(
        service.approveFixer('bad-id', {
          status: FixerStatus.APPROVED,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('blocks the legacy approval path when KYC is not approved', async () => {
      prisma.fixer.findUnique.mockResolvedValue({
        id: 'fixer-1',
        userId: 'user-1',
      });
      prisma.kycSubmission.findFirst.mockResolvedValue({
        status: 'NEEDS_REVIEW',
      });

      await expect(
        service.approveFixer('fixer-1', {
          status: FixerStatus.APPROVED,
        }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.fixer.update).not.toHaveBeenCalled();
    });

    it('should approve a KYC-approved fixer and emit event', async () => {
      prisma.fixer.findUnique.mockResolvedValue({
        id: 'fixer-1',
        userId: 'user-1',
      });
      const identityExpiryDate = new Date(Date.now() + 86_400_000);
      prisma.kycSubmission.findFirst.mockResolvedValue({
        status: 'APPROVED',
        documents: [{ identityExpiryDate }],
      });
      prisma.fixer.update.mockResolvedValue({
        id: 'fixer-1',
        status: FixerStatus.APPROVED,
        verified: true,
        user: { id: 'user-1' },
      });

      const result = await service.approveFixer('fixer-1', {
        status: FixerStatus.APPROVED,
      });

      expect(result.status).toBe(FixerStatus.APPROVED);
      expect(prisma.fixer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: FixerStatus.APPROVED,
            verified: true,
            qualificationEligibilityStatus:
              QualificationEligibilityStatus.ELIGIBLE,
            kycValidUntil: identityExpiryDate,
            kycReverificationRequiredAt: null,
          }),
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'fixer.status_changed',
        expect.objectContaining({ fixerId: 'fixer-1' }),
      );
    });
    it('keeps a fixer paused when approved KYC has an expired ID date', async () => {
      prisma.fixer.findUnique.mockResolvedValue({
        id: 'fixer-1',
        userId: 'user-1',
      });
      prisma.kycSubmission.findFirst.mockResolvedValue({
        status: 'APPROVED',
        documents: [{ identityExpiryDate: new Date(Date.now() - 86_400_000) }],
      });

      await expect(
        service.approveFixer('fixer-1', {
          status: FixerStatus.APPROVED,
        }),
      ).rejects.toThrow(
        'Unexpired validated ID evidence is required before fixer approval',
      );
      expect(prisma.fixer.update).not.toHaveBeenCalled();
    });

    it('keeps a fixer paused when approved KYC has no ID expiry date', async () => {
      prisma.fixer.findUnique.mockResolvedValue({
        id: 'fixer-1',
        userId: 'user-1',
      });
      prisma.kycSubmission.findFirst.mockResolvedValue({
        status: 'APPROVED',
        documents: [{ identityExpiryDate: null }],
      });

      await expect(
        service.approveFixer('fixer-1', {
          status: FixerStatus.APPROVED,
        }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.fixer.update).not.toHaveBeenCalled();
    });
  });
  describe('manualAssign', () => {
    it('should throw if order not found', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.manualAssign(
          { orderId: 'bad-order', fixerId: 'fixer-1' },
          'admin-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if fixer not found', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'order-1' });
      prisma.fixer.findUnique.mockResolvedValue(null);

      await expect(
        service.manualAssign(
          { orderId: 'order-1', fixerId: 'bad-fixer' },
          'admin-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should assign fixer to order', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'order-1' });
      prisma.fixer.findUnique.mockResolvedValue({ id: 'fixer-1' });
      prisma.order.update.mockResolvedValue({
        id: 'order-1',
        fixerId: 'fixer-1',
        status: OrderStatus.ASSIGNED,
      });

      const result = await service.manualAssign(
        { orderId: 'order-1', fixerId: 'fixer-1' },
        'admin-1',
      );
      expect(result.status).toBe(OrderStatus.ASSIGNED);
    });
  });

  describe('getDashboardStats', () => {
    it('should return aggregated stats', async () => {
      prisma.user.count.mockResolvedValue(100);
      prisma.fixer.count.mockResolvedValueOnce(20).mockResolvedValueOnce(3);
      prisma.order.count
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(35);

      const result = await service.getDashboardStats();
      expect(result.totalUsers).toBe(100);
      expect(result.totalFixers).toBe(20);
      expect(result.pendingFixers).toBe(3);
      expect(result.totalOrders).toBe(50);
    });
  });

  describe('suspendFixer', () => {
    it('should throw NotFoundException if fixer not found', async () => {
      prisma.fixer.findUnique.mockResolvedValue(null);

      await expect(
        service.suspendFixer('bad-id', 'admin-1', 'Fraud detected'),
      ).rejects.toThrow(NotFoundException);
    });

    it('suspends matching without erasing approved KYC and persists a notice', async () => {
      prisma.fixer.findUnique.mockResolvedValue({
        id: 'fixer-1',
        userId: 'user-1',
        status: FixerStatus.APPROVED,
        verified: true,
      });
      prisma.fixer.update.mockResolvedValue({
        id: 'fixer-1',
        status: FixerStatus.SUSPENDED,
        verified: true,
        user: { id: 'user-1' },
      });
      prisma.notification.createMany.mockResolvedValue({ count: 1 });

      const result = await service.suspendFixer(
        'fixer-1',
        'admin-1',
        'Fraudulent activity detected',
      );

      expect(result.status).toBe(FixerStatus.SUSPENDED);
      expect(prisma.fixer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: FixerStatus.SUSPENDED,
            suspendedById: 'admin-1',
            suspensionReason: 'Fraudulent activity detected',
          }),
        }),
      );
      expect(prisma.fixer.update.mock.calls[0][0].data).not.toHaveProperty(
        'verified',
      );
      expect(prisma.notification.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({
              userId: 'user-1',
              title: 'Partner profile paused',
            }),
          ],
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'fixer.suspended',
        expect.objectContaining({
          fixerId: 'fixer-1',
          adminId: 'admin-1',
          reason: 'Fraudulent activity detected',
        }),
      );
    });

    it('restores a suspended partner only when approved KYC remains valid', async () => {
      prisma.fixer.findUnique.mockResolvedValue({
        id: 'fixer-1',
        userId: 'user-1',
        status: FixerStatus.SUSPENDED,
        verified: true,
        kycValidUntil: new Date('2026-09-30T00:00:00.000Z'),
      });
      prisma.fixer.update.mockResolvedValue({
        id: 'fixer-1',
        status: FixerStatus.APPROVED,
        verified: true,
        user: { id: 'user-1' },
      });
      prisma.notification.createMany.mockResolvedValue({ count: 1 });

      await expect(
        service.resumeFixer('fixer-1', 'admin-1', 'Complaint review completed'),
      ).resolves.toEqual(
        expect.objectContaining({ status: FixerStatus.APPROVED }),
      );
      expect(prisma.fixer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: FixerStatus.APPROVED,
            suspendedAt: null,
            suspendedById: null,
            suspensionReason: null,
          }),
        }),
      );
      expect(prisma.notification.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({ title: 'Partner profile restored' }),
          ],
        }),
      );
    });
  });

  describe('getFraudFlags', () => {
    it('flags only a rating that disagrees with persisted reviews', async () => {
      prisma.fixer.findMany
        .mockResolvedValueOnce([
          {
            id: 'fixer-1',
            rating: 5,
            reviews: [{ rating: 3 }, { rating: 3 }],
            user: { id: 'user-1', phone: '+66811111111', name: 'Suspect' },
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getFraudFlags();

      expect(result.total).toBe(1);
      expect(result.flags[0].type).toBe('RATING_INTEGRITY_MISMATCH');
      expect(result.flags[0].detail).toContain('persisted review average 3.00');
    });

    it('does not flag the default five-star value when no review exists', async () => {
      prisma.fixer.findMany
        .mockResolvedValueOnce([
          {
            id: 'fixer-legacy',
            rating: 5,
            reviews: [],
            user: { id: 'user-legacy', name: 'Legacy Provider' },
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await expect(service.getFraudFlags()).resolves.toEqual({
        flags: [],
        total: 0,
      });
    });
  });
});
