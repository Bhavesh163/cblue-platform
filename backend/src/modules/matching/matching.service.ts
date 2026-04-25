import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderService } from '../order/order.service';
import { MATCHING_WEIGHTS, TIER_MULTIPLIERS } from '../../common/constants';

export interface MatchingResult {
  fixerId: string;
  fixerName: string;
  score: number;
  distance: number | null;
  rating: number;
  tier: string;
  tierMultiplier: number;
  reason?: string;
  price?: number;
  completedJobs?: number;
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

  private getMinPrice(priceList: unknown): number {
    if (!priceList || !Array.isArray(priceList) || priceList.length === 0)
      return 999999;
    const minPrice = Math.min(
      ...priceList.map(
        (p: Record<string, unknown>) => Number(p.finalPrice) || 999999,
      ),
    );
    return minPrice;
  }

  async findMatches(
    serviceCategory: string,
    addressId: string,
    customerNominatedId?: string,
    returningPartnerId?: string,
  ): Promise<MatchingResult[]> {
    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });

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

    const scored = fixers.map((fixer) => {
      const distanceScore = this.calculateDistanceScore(
        address?.latitude,
        address?.longitude,
        fixer.travelRadius,
      );
      const ratingScore = fixer.rating / 5;
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
        distance: null,
        rating: fixer.rating,
        tier: fixer.tier,
        tierMultiplier:
          TIER_MULTIPLIERS[fixer.tier as keyof typeof TIER_MULTIPLIERS] || 1,
        price: this.getMinPrice(fixer.priceList),
        completedJobs: fixer.completedJobs || 0,
      };
    });

    const isUpperTier = (tier: string) =>
      [
        'CORPORATE',
        'SPECIALIST',
        'EXPERT',
        'MANAGER',
        'DIRECTOR',
        'UPPER',
        'LUXURY',
        'GRANDEUR',
      ].includes(tier);

    // AI Top-8 Selection Algorithm Matrix (Point 9)
    // Create 15-20 random pool if available, but we sort all to grab best candidates first
    const results: Map<string, MatchingResult> = new Map();

    // Helper to add if not already added and we have space
    const addResult = (candidate: MatchingResult, reasonCode: string) => {
      if (results.size >= 8) return false;
      if (!results.has(candidate.fixerId)) {
        candidate.reason = reasonCode;
        if (reasonCode === '🔄 Returning partner') {
          candidate.fixerName = '★ ' + candidate.fixerName;
        }
        results.set(candidate.fixerId, candidate);
      }
      return results.size < 8;
    };

    // Slots 1-2: 💰 Two cheapest in area
    const cheapest = [...scored].sort((a, b) => a.price - b.price);
    for (const c of cheapest.slice(0, 2)) addResult(c, '💰 Cheapest');

    // Slots 3-4: ⭐ Two highest satisfaction (stars, tiebreak by total jobs/reviews)
    const highestRated = [...scored].sort(
      (a, b) => b.rating - a.rating || b.completedJobs - a.completedJobs,
    );
    let hAdded = 0;
    for (const c of highestRated) {
      if (hAdded >= 2) break;
      if (!results.has(c.fixerId)) {
        addResult(c, '⭐ Highest Rated');
        hAdded++;
      }
    }

    // Slot 5: 🏆 Cheapest of upper tier
    const upperTiers = scored.filter((c) => isUpperTier(c.tier));
    if (upperTiers.length > 0) {
      const upperCheapest = [...upperTiers].sort((a, b) => a.price - b.price);
      for (const c of upperCheapest) {
        if (!results.has(c.fixerId)) {
          addResult(c, '🏆 Cheapest Upper Tier');
          break;
        }
      }
    }

    // Slot 6: 🏆 Highest rated of upper tier
    if (upperTiers.length > 0) {
      const upperRated = [...upperTiers].sort(
        (a, b) => b.rating - a.rating || b.completedJobs - a.completedJobs,
      );
      for (const c of upperRated) {
        if (!results.has(c.fixerId)) {
          addResult(c, '🏆 Highest Rated Upper Tier');
          break;
        }
      }
    }

    // Slot 7: 🔄 Returning partner
    if (returningPartnerId) {
      const returning = scored.find((c) => c.fixerId === returningPartnerId);
      if (returning && !results.has(returning.fixerId)) {
        addResult(returning, '🔄 Returning partner');
      }
    }

    // Slot 8: 👤 Customer nomination by partner ID number
    if (customerNominatedId) {
      const nominated = scored.find((c) => c.fixerId === customerNominatedId);
      if (nominated && !results.has(nominated.fixerId)) {
        addResult(nominated, '👤 Customer nomination');
      }
    }

    // Fill remaining up to 8 if pool is larger but limits not met
    if (results.size < 8) {
      for (const c of scored.sort((a, b) => b.score - a.score)) {
        if (results.size >= 8) break;
        if (!results.has(c.fixerId)) addResult(c, '✔️ Verified AI Match');
      }
    }

    return Array.from(results.values());
  }

  async getSuggestions(
    orderId: string,
    customerNominatedId?: string,
    returningId?: string,
  ) {
    const order = await this.orderService.findById(orderId);
    return this.findMatches(
      order.serviceCategory,
      order.addressId,
      customerNominatedId,
      returningId,
    );
  }

  private calculateDistanceScore(
    lat?: number | null,
    lng?: number | null,
    travelRadius?: number,
  ): number {
    if (!lat || !lng) return 0.5;
    return travelRadius && travelRadius >= 10 ? 0.8 : 0.6;
  }

  private calculateTierScore(tier: string): number {
    const scores: Record<string, number> = {
      ECONOMY: 0.25,
      STANDARD: 0.5,
      CORPORATE: 0.75,
      EXPERT: 1.0,
      MANAGER: 0.75,
      DIRECTOR: 1.0,
      UPPER: 0.7,
      LUXURY: 0.9,
      GRANDEUR: 1.0,
    };
    return scores[tier] ?? 0.5;
  }

  private calculateAvailabilityScore(
    availability: { isActive: boolean }[],
  ): number {
    if (!availability || availability.length === 0) return 0;
    const activeSlots = availability.filter((a) => a.isActive).length;
    return activeSlots / 7;
  }
}
