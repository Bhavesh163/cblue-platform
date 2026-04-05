import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import generatePayload from 'promptpay-qr';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { DEPOSIT_AMOUNT } from '../../common/constants';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async createPayment(userId: string, dto: CreatePaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) {
      throw new BadRequestException('Order does not belong to user');
    }
    if (order.status !== OrderStatus.DEPOSIT_PENDING) {
      throw new BadRequestException('Order is not awaiting deposit');
    }

    // Check if payment already exists
    const existing = await this.prisma.payment.findUnique({
      where: { orderId: dto.orderId },
    });
    if (existing) {
      throw new BadRequestException('Payment already exists for this order');
    }

    const amount = dto.amount || DEPOSIT_AMOUNT;

    // Generate PromptPay QR
    // TODO: Integrate with real PromptPay QR generation library
    const qrCodeUrl = this.generatePromptPayQR(amount);

    const payment = await this.prisma.payment.create({
      data: {
        orderId: dto.orderId,
        amount,
        method: 'PROMPTPAY',
        qrCodeUrl,
      },
    });

    this.logger.log(`Payment created for order ${dto.orderId}: ${amount} THB`);

    return payment;
  }

  async verifyPayment(dto: VerifyPaymentDto) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        orderId: dto.transactionRef,
        status: PaymentStatus.PENDING,
      },
    });

    if (!payment) throw new NotFoundException('Pending payment not found');

    // TODO: Verify with actual payment provider webhook
    // For now, mark as completed (manual verification)

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.COMPLETED,
        transactionRef: dto.transactionRef,
        paidAt: new Date(),
      },
    });

    // Transition order to CONFIRMED
    await this.prisma.order.update({
      where: { id: payment.orderId },
      data: {
        status: OrderStatus.CONFIRMED,
        statusHistory: {
          create: {
            status: OrderStatus.CONFIRMED,
            note: 'Payment verified',
            changedBy: 'system',
          },
        },
      },
    });

    this.eventEmitter.emit('payment.completed', {
      paymentId: updated.id,
      orderId: payment.orderId,
      amount: payment.amount,
    });

    return updated;
  }

  async getPaymentByOrder(orderId: string) {
    return this.prisma.payment.findUnique({
      where: { orderId },
    });
  }

  private generatePromptPayQR(amount: number): string {
    const merchantId = process.env.PROMPTPAY_ID || '0000000000';
    const payload = generatePayload(merchantId, { amount });
    this.logger.log(`PromptPay QR generated for ${amount} THB`);
    return payload;
  }
}
