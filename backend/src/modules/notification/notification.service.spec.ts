/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: {
    notification: Record<string, jest.Mock>;
    order: Record<string, jest.Mock>;
  };

  beforeEach(async () => {
    prisma = {
      notification: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('send', () => {
    it('should create notification and mark as sent', async () => {
      prisma.notification.create.mockResolvedValue({
        id: 'notif-1',
        userId: 'user-1',
        type: NotificationType.PUSH,
      } as never);
      prisma.notification.update.mockResolvedValue({
        id: 'notif-1',
        status: 'SENT',
      } as never);

      await service.send({
        userId: 'user-1',
        type: NotificationType.PUSH,
        title: 'Test',
        body: 'Test notification',
      });

      expect(prisma.notification.create).toHaveBeenCalledTimes(1);
      expect(prisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'SENT' }),
        }),
      );
    });

    it('should dispatch SMS notification', async () => {
      prisma.notification.create.mockResolvedValue({
        id: 'notif-2',
        type: NotificationType.SMS,
      } as never);
      prisma.notification.update.mockResolvedValue({} as never);

      await service.send({
        userId: 'user-1',
        type: NotificationType.SMS,
        title: 'Test',
        body: 'SMS test',
      });

      expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    });

    it('should dispatch EMAIL notification', async () => {
      prisma.notification.create.mockResolvedValue({
        id: 'notif-3',
        type: NotificationType.EMAIL,
      } as never);
      prisma.notification.update.mockResolvedValue({} as never);

      await service.send({
        userId: 'user-1',
        type: NotificationType.EMAIL,
        title: 'Test',
        body: 'Email test',
      });

      expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('getByUser', () => {
    it('should return notifications for user', async () => {
      prisma.notification.findMany.mockResolvedValue([
        { id: 'notif-1' },
        { id: 'notif-2' },
      ] as never);

      const result = (await service.getByUser('user-1')) as { id: string }[];
      expect(result).toHaveLength(2);
    });
  });

  describe('markAsRead', () => {
    it('should update readAt', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 1 });

      await service.markAsRead('user-1', 'notif-1');
      expect(prisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'notif-1', userId: 'user-1' },
        }),
      );
    });
  });

  describe('event listeners', () => {
    it('should send notification on order.created', async () => {
      prisma.notification.create.mockResolvedValue({
        id: 'notif-1',
        type: NotificationType.PUSH,
      } as never);
      prisma.notification.update.mockResolvedValue({} as never);

      await service.onOrderCreated({
        orderId: 'order-1',
        userId: 'user-1',
      });

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Order Created',
          }),
        }),
      );
    });

    it('should send notification on payment.completed', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        userId: 'user-1',
      } as never);
      prisma.notification.create.mockResolvedValue({
        id: 'notif-1',
        type: NotificationType.PUSH,
      } as never);
      prisma.notification.update.mockResolvedValue({} as never);

      await service.onPaymentCompleted({
        orderId: 'order-1',
        amount: 300,
      });

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Payment Confirmed',
          }),
        }),
      );
    });

    it('should skip if order not found on payment.completed', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await service.onPaymentCompleted({
        orderId: 'bad-order',
        amount: 300,
      });

      expect(prisma.notification.create).not.toHaveBeenCalled();
    });
  });
});
