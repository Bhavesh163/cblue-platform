import { Test, TestingModule } from '@nestjs/testing';
import { ReviewService } from './review.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

describe('ReviewService', () => {
  let service: ReviewService;
  let prisma: {
    order: Record<string, jest.Mock>;
    review: Record<string, jest.Mock>;
    fixer: Record<string, jest.Mock>;
  };
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    prisma = {
      order: { findUnique: jest.fn() },
      review: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        aggregate: jest.fn(),
      },
      fixer: { update: jest.fn() },
    };
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw if order not found', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(
        service.create('user-1', { orderId: 'bad', rating: 5 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if user does not own order', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        userId: 'other-user',
        status: OrderStatus.COMPLETED,
        fixerId: 'fixer-1',
      });

      await expect(
        service.create('user-1', { orderId: 'order-1', rating: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if order is not completed', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        userId: 'user-1',
        status: OrderStatus.IN_PROGRESS,
        fixerId: 'fixer-1',
      });

      await expect(
        service.create('user-1', { orderId: 'order-1', rating: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create review and recalculate fixer rating', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        userId: 'user-1',
        status: OrderStatus.COMPLETED,
        fixerId: 'fixer-1',
      });
      prisma.review.findUnique.mockResolvedValue(null);
      prisma.review.create.mockResolvedValue({
        id: 'rev-1',
        orderId: 'order-1',
        userId: 'user-1',
        fixerId: 'fixer-1',
        rating: 5,
      });
      prisma.review.aggregate.mockResolvedValue({
        _avg: { rating: 4.5 },
        _count: 10,
      });
      prisma.fixer.update.mockResolvedValue({});

      const result = await service.create('user-1', {
        orderId: 'order-1',
        rating: 5,
        comment: 'Great work!',
      });

      expect(result.rating).toBe(5);
      expect(prisma.fixer.update).toHaveBeenCalledWith({
        where: { id: 'fixer-1' },
        data: { rating: 4.5, completedJobs: 10 },
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'review.submitted',
        expect.objectContaining({ fixerId: 'fixer-1' }),
      );
    });
  });
});
