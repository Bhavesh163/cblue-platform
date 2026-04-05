import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@prisma/client';

describe('PaymentService', () => {
  let service: PaymentService;
  let prisma: {
    order: Record<string, jest.Mock>;
    payment: Record<string, jest.Mock>;
  };
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    prisma = {
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      payment: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPayment', () => {
    it('should throw if order not found', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(
        service.createPayment('user-1', { orderId: 'bad-id' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if order does not belong to user', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        userId: 'someone-else',
        status: OrderStatus.DEPOSIT_PENDING,
      });
      await expect(
        service.createPayment('user-1', { orderId: 'order-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if order status is not DEPOSIT_PENDING', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        userId: 'user-1',
        status: OrderStatus.CREATED,
      });
      await expect(
        service.createPayment('user-1', { orderId: 'order-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create payment with PromptPay QR', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        userId: 'user-1',
        status: OrderStatus.DEPOSIT_PENDING,
      });
      prisma.payment.findUnique.mockResolvedValue(null);
      prisma.payment.create.mockResolvedValue({
        id: 'pay-1',
        orderId: 'order-1',
        amount: 300,
        method: 'PROMPTPAY',
        qrCodeUrl: 'test-qr',
      } as never);

      const result = await service.createPayment('user-1', {
        orderId: 'order-1',
      });
      expect(result.orderId).toBe('order-1');
      expect(prisma.payment.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('verifyPayment', () => {
    it('should throw if no pending payment found', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);
      await expect(
        service.verifyPayment({ transactionRef: 'bad-ref' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should complete payment and transition order', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-1',
        orderId: 'order-1',
        amount: 300,
        status: PaymentStatus.PENDING,
      });
      prisma.payment.update.mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.COMPLETED,
      });
      prisma.order.update.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.CONFIRMED,
      });

      const result = await service.verifyPayment({
        transactionRef: 'order-1',
      });
      expect(result.status).toBe(PaymentStatus.COMPLETED);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'payment.completed',
        expect.objectContaining({ orderId: 'order-1' }),
      );
    });
  });
});
