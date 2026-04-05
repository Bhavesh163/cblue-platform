import { Test, TestingModule } from '@nestjs/testing';
import { MatchingService } from './matching.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderService } from '../order/order.service';

describe('MatchingService', () => {
  let service: MatchingService;
  let prisma: {
    address: Record<string, jest.Mock>;
    fixer: Record<string, jest.Mock>;
  };
  let orderService: { updateStatus: jest.Mock; findById: jest.Mock };

  beforeEach(async () => {
    prisma = {
      address: { findUnique: jest.fn() },
      fixer: { findMany: jest.fn() },
    };
    orderService = {
      updateStatus: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchingService,
        { provide: PrismaService, useValue: prisma },
        { provide: OrderService, useValue: orderService },
      ],
    }).compile();

    service = module.get<MatchingService>(MatchingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findMatches', () => {
    it('should return empty array when no fixers match', async () => {
      prisma.address.findUnique.mockResolvedValue({
        id: 'addr-1',
        latitude: 13.7563,
        longitude: 100.5018,
      });
      prisma.fixer.findMany.mockResolvedValue([]);

      const result = await service.findMatches('Plumbing', 'addr-1');
      expect(result).toEqual([]);
    });

    it('should score and rank fixers correctly', async () => {
      prisma.address.findUnique.mockResolvedValue({
        id: 'addr-1',
        latitude: 13.7563,
        longitude: 100.5018,
      });
      prisma.fixer.findMany.mockResolvedValue([
        {
          id: 'fixer-1',
          user: { name: 'Fix A', phone: '0812345678' },
          rating: 5,
          tier: 'EXPERT',
          travelRadius: 20,
          skills: [{ category: 'Plumbing' }],
          availability: [
            { isActive: true },
            { isActive: true },
            { isActive: true },
          ],
        },
        {
          id: 'fixer-2',
          user: { name: 'Fix B', phone: '0899999999' },
          rating: 3,
          tier: 'ECONOMY',
          travelRadius: 5,
          skills: [{ category: 'Plumbing' }],
          availability: [{ isActive: false }],
        },
      ]);

      const result = await service.findMatches('Plumbing', 'addr-1');
      expect(result.length).toBe(2);
      // Higher-rated expert should score higher
      expect(result[0].fixerId).toBe('fixer-1');
      expect(result[0].score).toBeGreaterThan(result[1].score);
    });
  });

  describe('handleOrderCreated', () => {
    it('should transition order to MATCHING and return results', async () => {
      orderService.updateStatus.mockResolvedValue({});
      prisma.address.findUnique.mockResolvedValue({ id: 'addr-1' });
      prisma.fixer.findMany.mockResolvedValue([]);

      const result = await service.handleOrderCreated({
        orderId: 'order-1',
        serviceCategory: 'AC',
        addressId: 'addr-1',
        isUrgent: false,
      });

      expect(orderService.updateStatus).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
