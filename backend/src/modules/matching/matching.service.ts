import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderService } from '../order/order.service';
import {
  MATCHING_WEIGHTS,
  MAX_MATCHING_RESULTS,
  TIER_MULTIPLIERS,
} from '../../common/constants';

export interface MatchingResult {
  fixerId: string;
  fixerName: string;
  score: number;
  distance: number | null;
  rating: number;
  tier: string;
  tierMultiplier: number;
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    private prisma: PrismaService,
    private orderService: OrderService,
  ) {}

  @OnEvent('order.created')
  async handleOrderCreated(payload: {
    orderId: string;
    serviceCategory: string;
    addressId: string;
    isUrgent: boolean;
  }) {
    this.logger.log(`Matching triggered for order ${payload.orderId}`);

    // Transition order to MATCHING
    await this.orderService.updateStatus(
      payload.orderId,
      { status: OrderStatus.MATCHING },
      'system',
    );

    const suggestions = await this.findMatches(
      payload.serviceCategory,
      payload.addressId,
    );

    this.logger.log(
      `Found ${suggestions.length} matches for order ${payload.orderId}`,
    );

    return suggestions;
  }

  async findMatches(
    serviceCategory: string,
    addressId: string,
  ): Promise<MatchingResult[]> {
    // Get the order address for distance calculation
    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });

    // Find approved fixers with matching skills
    const fixers = await this.prisma.fixer.findMany({
      where: {
        status: 'APPROVED',
        skills: {
          some: { category: serviceCategory },
        },
      },
      include: {
        user: true,
        skills: true,
        availability: true,
      },
    });

    if (fixers.length === 0) {
      this.logger.warn(`No fixers found for category: ${serviceCategory}`);
      return [];
    }

    // Score each fixer
    const scored = fixers.map((fixer) => {
      const distanceScore = this.calculateDistanceScore(
        address?.latitude,
        address?.longitude,
        fixer.travelRadius,
      );
      const ratingScore = fixer.rating / 5; // normalize to 0-1
      const tierScore = this.calculateTierScore(fixer.tier);
      const availabilityScore = this.calculateAvailabilityScore(
        fixer.availability,
      );

      const totalScore =
        distanceScore * MATCHING_WEIGHTS.DISTANCE +
        ratingScore * MATCHING_WEIGHTS.RATING +
        tierScore * MATCHING_WEIGHTS.TIER +
        availabilityScore * MATCHING_WEIGHTS.AVAILABILITY;

      return {
        fixerId: fixer.id,
        fixerName: fixer.user.name || fixer.user.phone || 'Unknown',
        score: Math.round(totalScore * 100) / 100,
        distance: null, // Would be calculated with real coordinates
        rating: fixer.rating,
        tier: fixer.tier,
        tierMultiplier:
          TIER_MULTIPLIERS[fixer.tier as keyof typeof TIER_MULTIPLIERS],
      };
    });

    // Sort by score descending, return top N
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_MATCHING_RESULTS);
  }

  async getSuggestions(orderId: string) {
    const order = await this.orderService.findById(orderId);
    return this.findMatches(order.serviceCategory, order.addressId);
  }

  private calculateDistanceScore(
    lat?: number | null,
    lng?: number | null,
    travelRadius?: number,
  ): number {
    // Placeholder: in production, calculate actual distance
    // using Haversine formula between order address and fixer location
    if (!lat || !lng) return 0.5;
    // For now, give benefit of the doubt
    return travelRadius && travelRadius >= 10 ? 0.8 : 0.6;
  }

  private calculateTierScore(tier: string): number {
    const scores: Record<string, number> = {
      ECONOMY: 0.25,
      STANDARD: 0.5,
      CORPORATE: 0.75,
      EXPERT: 1.0,
    };
    return scores[tier] ?? 0.5;
  }

  private calculateAvailabilityScore(
    availability: { isActive: boolean }[],
  ): number {
    if (availability.length === 0) return 0;
    const activeSlots = availability.filter((a) => a.isActive).length;
    return activeSlots / 7; // 7 days per week
  }
}
