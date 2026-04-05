import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(userId: string, dto: CreateReviewDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) {
      throw new BadRequestException('You can only review your own orders');
    }
    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException('Can only review completed orders');
    }
    if (!order.fixerId) {
      throw new BadRequestException('Order has no assigned fixer');
    }

    // Check if already reviewed
    const existing = await this.prisma.review.findUnique({
      where: { orderId: dto.orderId },
    });
    if (existing) {
      throw new BadRequestException('Order already reviewed');
    }

    const review = await this.prisma.review.create({
      data: {
        orderId: dto.orderId,
        userId,
        fixerId: order.fixerId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });

    // Update fixer average rating
    const avgResult = await this.prisma.review.aggregate({
      where: { fixerId: order.fixerId },
      _avg: { rating: true },
      _count: true,
    });

    await this.prisma.fixer.update({
      where: { id: order.fixerId },
      data: {
        rating: avgResult._avg.rating ?? 5,
        completedJobs: avgResult._count,
      },
    });

    this.eventEmitter.emit('review.submitted', {
      reviewId: review.id,
      orderId: dto.orderId,
      fixerId: order.fixerId,
      rating: dto.rating,
    });

    return review;
  }

  async getByFixer(fixerId: string) {
    return this.prisma.review.findMany({
      where: { fixerId },
      include: { user: { select: { name: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getByOrder(orderId: string) {
    return this.prisma.review.findUnique({
      where: { orderId },
      include: { user: { select: { name: true } } },
    });
  }
}
