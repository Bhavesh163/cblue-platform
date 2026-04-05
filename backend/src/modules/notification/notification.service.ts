import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SendNotificationDto } from './dto/send-notification.dto';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private prisma: PrismaService) {}

  async send(dto: SendNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        body: dto.body,
        data: dto.data ?? undefined,
      },
    });

    // Dispatch to appropriate channel
    switch (dto.type) {
      case NotificationType.PUSH:
        this.sendPush(dto);
        break;
      case NotificationType.SMS:
        this.sendSms(dto);
        break;
      case NotificationType.EMAIL:
        this.sendEmail(dto);
        break;
    }

    // Mark as sent
    await this.prisma.notification.update({
      where: { id: notification.id },
      data: { status: 'SENT', sentAt: new Date() },
    });

    return notification;
  }

  async getByUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
  }

  // ── Event listeners ──

  @OnEvent('order.created')
  async onOrderCreated(payload: { orderId: string; userId: string }) {
    this.logger.log(`Notifying user about order ${payload.orderId} created`);
    await this.send({
      userId: payload.userId,
      type: NotificationType.PUSH,
      title: 'Order Created',
      body: 'Your order has been created and we are finding the best fixer for you.',
      data: { orderId: payload.orderId },
    });
  }

  @OnEvent('payment.completed')
  async onPaymentCompleted(payload: { orderId: string; amount: number }) {
    const order = await this.prisma.order.findUnique({
      where: { id: payload.orderId },
    });
    if (!order) return;

    await this.send({
      userId: order.userId,
      type: NotificationType.PUSH,
      title: 'Payment Confirmed',
      body: `Your payment of ${payload.amount} THB has been confirmed.`,
      data: { orderId: payload.orderId },
    });
  }

  @OnEvent('fixer.registered')
  async onFixerRegistered(payload: { userId: string }) {
    await this.send({
      userId: payload.userId,
      type: NotificationType.PUSH,
      title: 'Registration Received',
      body: 'Your fixer registration is under review. We will notify you once approved.',
    });
  }

  // ── Channel implementations (stubs) ──

  private sendPush(dto: SendNotificationDto) {
    // TODO: Integrate Firebase Cloud Messaging
    this.logger.log(`[DEV] Push notification to ${dto.userId}: ${dto.title}`);
  }

  private sendSms(dto: SendNotificationDto) {
    // TODO: Integrate SMS provider (Twilio / AWS SNS)
    this.logger.log(`[DEV] SMS to ${dto.userId}: ${dto.body}`);
  }

  private sendEmail(dto: SendNotificationDto) {
    // TODO: Integrate email provider (SendGrid / SES)
    this.logger.log(`[DEV] Email to ${dto.userId}: ${dto.title}`);
  }
}
