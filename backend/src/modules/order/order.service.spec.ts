import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

describe('OrderService', () => {
  let service: OrderService;
  let prisma: {
    order: Record<string, jest.Mock>;
    address: Record<string, jest.Mock>;
  };
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    prisma = {
      order: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      address: {
        findFirst: jest.fn(),
      },
    };
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw if address does not belong to user', async () => {
      prisma.address.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-1', {
          addressId: 'addr-1',
          orderType: 'HOUSEHOLD' as never,
          serviceCategory: 'Plumbing',
          description: 'Fix sink',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create order and emit event', async () => {
      const address = { id: 'addr-1', userId: 'user-1' };
      const order = {
        id: 'order-1',
        userId: 'user-1',
        status: OrderStatus.CREATED,
      };

      prisma.address.findFirst.mockResolvedValue(address);
      prisma.order.create.mockResolvedValue(order);

      const result = await service.create('user-1', {
        addressId: 'addr-1',
        orderType: 'HOUSEHOLD' as never,
        serviceCategory: 'Plumbing',
        description: 'Fix sink',
      });

      expect(result).toEqual(order);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'order.created',
        expect.objectContaining({ orderId: 'order-1' }),
      );
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException when order not found', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(service.findById('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStatus', () => {
    it('should reject invalid status transition', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.COMPLETED,
      });

      await expect(
        service.updateStatus(
          'order-1',
          { status: OrderStatus.CREATED },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow valid status transition', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.CREATED,
      });
      prisma.order.update.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.MATCHING,
      });

      const result = await service.updateStatus(
        'order-1',
        { status: OrderStatus.MATCHING },
        'user-1',
      );
      expect(result.status).toBe(OrderStatus.MATCHING);
    });
  });
});
