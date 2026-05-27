import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePropertyInquiryDto,
  UpdatePropertyInquiryDto,
} from './dto/property-inquiry.dto';

@Injectable()
export class PropertyInquiryService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveLinkedUserIds(userId: string) {
    const fallbackId = String(userId || '').trim();
    if (!fallbackId) return [] as string[];

    const user = await this.prisma.user.findUnique({
      where: { id: fallbackId },
      select: { id: true, subscriberId: true, email: true },
    });

    if (!user) return [fallbackId];

    const linkedIds = new Set<string>([user.id]);

    if (user.subscriberId) {
      const bySubscriberId = await this.prisma.user.findMany({
        where: { subscriberId: user.subscriberId },
        select: { id: true },
      });
      bySubscriberId.forEach((item) => linkedIds.add(item.id));
    }

    const normalizedEmail = String(user.email || '')
      .trim()
      .toLowerCase();
    if (normalizedEmail) {
      const byEmail = await this.prisma.user.findMany({
        where: {
          email: {
            equals: normalizedEmail,
            mode: 'insensitive',
          },
        },
        select: { id: true },
      });
      byEmail.forEach((item) => linkedIds.add(item.id));
    }

    return Array.from(linkedIds);
  }

  async create(customerId: string, dto: CreatePropertyInquiryDto) {
    // Verify property exists
    const property = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
      select: {
        id: true,
        userId: true,
        contactName: true,
      },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    // Always derive lister from the property owner for workflow consistency.
    const lister = await this.prisma.user.findUnique({
      where: { id: property.userId },
      select: { id: true, name: true },
    });
    if (!lister) {
      throw new NotFoundException('Lister user not found');
    }

    // Get customer info
    const customer = await this.prisma.user.findUnique({
      where: { id: customerId },
      select: { id: true, email: true, name: true },
    });
    if (!customer) {
      throw new NotFoundException('Customer user not found');
    }

    return this.prisma.propertyInquiry.create({
      data: {
        poNumber: dto.poNumber,
        propertyId: dto.propertyId,
        customerId,
        listerUserId: property.userId,
        customerName: dto.customerName || customer.name || '',
        customerEmail: dto.customerEmail || customer.email || '',
        listerName: dto.listerName || lister.name || property.contactName || '',
      },
    });
  }

  async findByCustomer(customerId: string) {
    const customerIds = await this.resolveLinkedUserIds(customerId);
    if (customerIds.length === 0) return [];

    return this.prisma.propertyInquiry.findMany({
      where: { customerId: { in: customerIds } },
      include: {
        property: {
          select: {
            id: true,
            userId: true,
            title: true,
            tier: true,
            price: true,
            propertyType: true,
            listingType: true,
            province: true,
            district: true,
            subdistrict: true,
            addressLine: true,
            area: true,
            bedrooms: true,
            bathrooms: true,
            images: {
              select: {
                url: true,
                sortOrder: true,
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findByLister(listerUserId: string) {
    const listerIds = await this.resolveLinkedUserIds(listerUserId);
    if (listerIds.length === 0) return [];

    return this.prisma.propertyInquiry.findMany({
      where: {
        OR: [
          { listerUserId: { in: listerIds } },
          { property: { userId: { in: listerIds } } },
        ],
      },
      include: {
        property: {
          select: {
            id: true,
            userId: true,
            title: true,
            tier: true,
            price: true,
            propertyType: true,
            listingType: true,
            province: true,
            district: true,
            subdistrict: true,
            addressLine: true,
            area: true,
            bedrooms: true,
            bathrooms: true,
            images: {
              select: {
                url: true,
                sortOrder: true,
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async update(id: string, userId: string, dto: UpdatePropertyInquiryDto) {
    const inquiry = await this.prisma.propertyInquiry.findUnique({
      where: { id },
    });
    if (!inquiry) {
      throw new NotFoundException('Inquiry not found');
    }
    // Allow canonicalized bridge identities (same subscriber/email) to update.
    const requesterIds = await this.resolveLinkedUserIds(userId);
    const isAllowed =
      requesterIds.includes(inquiry.customerId) ||
      requesterIds.includes(inquiry.listerUserId);
    if (!isAllowed) {
      throw new ForbiddenException('Not authorized to update this inquiry');
    }

    return this.prisma.propertyInquiry.update({
      where: { id },
      data: {
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.step !== undefined && { step: dto.step }),
        ...(dto.meetingDate !== undefined && { meetingDate: dto.meetingDate }),
        ...(dto.meetingTime !== undefined && { meetingTime: dto.meetingTime }),
        ...(dto.meetingVenue !== undefined && {
          meetingVenue: dto.meetingVenue,
        }),
        ...(dto.customerRating !== undefined && {
          customerRating: dto.customerRating,
        }),
        ...(dto.customerComment !== undefined && {
          customerComment: dto.customerComment,
        }),
        ...(dto.listerRating !== undefined && {
          listerRating: dto.listerRating,
        }),
        ...(dto.listerComment !== undefined && {
          listerComment: dto.listerComment,
        }),
        ...(dto.reselectedOnce !== undefined && {
          reselectedOnce: dto.reselectedOnce,
        }),
      },
    });
  }
}
