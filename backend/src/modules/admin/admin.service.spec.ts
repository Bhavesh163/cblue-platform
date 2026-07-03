import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException } from '@nestjs/common';
import { FixerStatus, OrderStatus } from '@prisma/client';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: {
    fixer: Record<string, jest.Mock>;
    order: Record<string, jest.Mock>;
    user: Record<string, jest.Mock>;
  };
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    prisma = {
      fixer: {
        findUnique: jest.fn(),
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
    };
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
  describe('approveFixer', () => {
    it('should throw NotFoundException if fixer not found', async () => {
      prisma.fixer.findUnique.mockResolvedValue(null);

      await expect(
        service.approveFixer('bad-id', {
          status: FixerStatus.APPROVED,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should approve fixer and emit event', async () => {
      prisma.fixer.findUnique.mockResolvedValue({
        id: 'fixer-1',
        userId: 'user-1',
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
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'fixer.status_changed',
        expect.objectContaining({ fixerId: 'fixer-1' }),
      );
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
        service.suspendFixer('bad-id', 'Fraud detected'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should suspend fixer and emit event', async () => {
      prisma.fixer.findUnique.mockResolvedValue({
        id: 'fixer-1',
        userId: 'user-1',
      });
      prisma.fixer.update.mockResolvedValue({
        id: 'fixer-1',
        status: FixerStatus.SUSPENDED,
        verified: false,
        user: { id: 'user-1' },
      });

      const result = await service.suspendFixer(
        'fixer-1',
        'Fraudulent activity detected',
      );

      expect(result.status).toBe(FixerStatus.SUSPENDED);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'fixer.suspended',
        expect.objectContaining({
          fixerId: 'fixer-1',
          reason: 'Fraudulent activity detected',
        }),
      );
    });
  });

  describe('getFraudFlags', () => {
    it('should return fraud flags from multiple sources', async () => {
      // suspiciousRatings
      prisma.fixer.findMany
        .mockResolvedValueOnce([
          {
            id: 'fixer-1',
            rating: 5.0,
            completedJobs: 1,
            user: { id: 'user-1', phone: '+66811111111', name: 'Suspect' },
          },
        ])
        // noSkillFixers
        .mockResolvedValueOnce([])
        // unverifiedActive
        .mockResolvedValueOnce([])
        // suspiciousResponseTime
        .mockResolvedValueOnce([]);

      const result = await service.getFraudFlags();
      expect(result.total).toBe(1);
      expect(result.flags[0].type).toBe('SUSPICIOUS_RATING');
    });
  });
});
