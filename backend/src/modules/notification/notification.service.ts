import { Injectable, Logger, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SendNotificationDto } from './dto/send-notification.dto';

const MAX_EMAIL_ATTEMPTS = 5;
const RETRY_BASE_MS = 5 * 60 * 1000;

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private prisma: PrismaService,
    @Optional() private readonly config?: ConfigService,
  ) {}

  async send(dto: SendNotificationDto) {
    if (dto.dedupeKey) {
      const existing = await this.prisma.notification.findUnique({
        where: { dedupeKey: dto.dedupeKey },
      });
      if (existing) return existing;
    }

    let notification;
    try {
      notification = await this.prisma.notification.create({
        data: {
          userId: dto.userId,
          type: dto.type,
          title: dto.title,
          body: dto.body,
          data: dto.data ?? undefined,
          dedupeKey: dto.dedupeKey,
          attempts: 0,
        },
      });
    } catch (error) {
      if (dto.dedupeKey) {
        const existing = await this.prisma.notification.findUnique({
          where: { dedupeKey: dto.dedupeKey },
        });
        if (existing) return existing;
      }
      throw error;
    }

    let delivered = true;
    switch (dto.type) {
      case NotificationType.PUSH:
        this.sendPush(dto);
        break;
      case NotificationType.SMS:
        this.sendSms(dto);
        break;
      case NotificationType.EMAIL:
        delivered = await this.sendEmail(dto);
        break;
      case NotificationType.IN_APP:
        delivered = true;
        break;
    }

    const now = new Date();
    await this.prisma.notification.update({
      where: { id: notification.id },
      data: delivered
        ? {
            status: 'SENT',
            sentAt: now,
            attempts: 1,
            lastErrorCode: null,
            nextAttemptAt: null,
            claimedAt: null,
            claimedBy: null,
            claimExpiresAt: null,
          }
        : {
            status: 'FAILED',
            attempts: 1,
            lastErrorCode: 'EMAIL_DELIVERY_FAILED',
            nextAttemptAt: new Date(now.getTime() + RETRY_BASE_MS),
          },
    });

    return notification;
  }

  async retryFailedEmails(limit = 50): Promise<number> {
    const now = new Date();
    const notifications = await this.prisma.notification.findMany({
      where: {
        status: 'FAILED',
        type: NotificationType.EMAIL,
        attempts: { lt: MAX_EMAIL_ATTEMPTS },
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    let retried = 0;
    for (const notification of notifications) {
      const claimToken = randomUUID();
      const claimed = await this.prisma.notification.updateMany({
        where: {
          id: notification.id,
          status: 'FAILED',
          OR: [{ claimedAt: null }, { claimExpiresAt: { lte: now } }],
        },
        data: {
          claimedAt: now,
          claimedBy: claimToken,
          claimExpiresAt: new Date(now.getTime() + RETRY_BASE_MS),
        },
      });
      if (claimed.count !== 1) continue;

      const attempt = notification.attempts + 1;
      const delivered = await this.sendEmail({
        userId: notification.userId,
        type: NotificationType.EMAIL,
        title: notification.title,
        body: notification.body,
        data: this.readNotificationData(notification.data),
        dedupeKey: notification.dedupeKey ?? undefined,
      });
      const nextAttemptAt = delivered
        ? null
        : attempt < MAX_EMAIL_ATTEMPTS
          ? new Date(now.getTime() + RETRY_BASE_MS * 2 ** (attempt - 1))
          : null;
      await this.prisma.notification.update({
        where: { id: notification.id, claimedBy: claimToken },
        data: delivered
          ? {
              status: 'SENT',
              sentAt: now,
              attempts: attempt,
              lastErrorCode: null,
              nextAttemptAt: null,
            }
          : {
              status: 'FAILED',
              attempts: attempt,
              lastErrorCode: 'EMAIL_DELIVERY_FAILED',
              nextAttemptAt,
              claimedAt: null,
              claimedBy: null,
              claimExpiresAt: null,
            },
      });
      retried += 1;
    }
    return retried;
  }

  private readNotificationData(
    value: unknown,
  ): Record<string, unknown> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }
    return value as Record<string, unknown>;
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

  private async sendEmail(dto: SendNotificationDto): Promise<boolean> {
    const user = this.prisma.user
      ? await this.prisma.user.findUnique({
          where: { id: dto.userId },
          select: { email: true, name: true },
        })
      : null;
    const apiKey = this.config?.get<string>('mailjet.apiKey') || '';
    const apiSecret = this.config?.get<string>('mailjet.apiSecret') || '';
    const fromEmail = this.config?.get<string>('mailjet.fromEmail') || '';
    if (!user?.email || !apiKey || !apiSecret || !fromEmail) {
      this.logger.warn('Applicant email notification is not configured');
      return false;
    }
    try {
      const response = await fetch('https://api.mailjet.com/v3.1/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:
            'Basic ' + Buffer.from(apiKey + ':' + apiSecret).toString('base64'),
        },
        body: JSON.stringify({
          Messages: [
            {
              From: { Email: fromEmail, Name: 'CBLUE' },
              To: [{ Email: user.email, Name: user.name || 'CBLUE partner' }],
              Subject: dto.title,
              CustomID: dto.dedupeKey,
              TextPart: dto.body,
              HTMLPart: '<p>' + dto.body.replace(/</g, '&lt;') + '</p>',
            },
          ],
        }),
      });
      if (!response.ok) {
        this.logger.warn('Applicant email notification delivery failed');
        return false;
      }
      return true;
    } catch (error) {
      this.logger.warn(
        'Applicant email notification delivery failed',
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  }
}
