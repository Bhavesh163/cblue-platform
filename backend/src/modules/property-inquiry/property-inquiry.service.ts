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

  async create(customerId: string, dto: CreatePropertyInquiryDto) {
    // Verify lister user exists
    const lister = await this.prisma.user.findUnique({
      where: { id: dto.listerUserId },
      select: { id: true },
    });
    if (!lister) {
      throw new NotFoundException('Lister user not found');
    }

    // Verify property exists
    const property = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
      select: { id: true },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
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
        listerUserId: dto.listerUserId,
        customerName: dto.customerName || customer.name || '',
        customerEmail: dto.customerEmail || customer.email || '',
        listerName: dto.listerName,
      },
    });
  }

  async findByCustomer(customerId: string) {
    return this.prisma.propertyInquiry.findMany({
      where: { customerId },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            tier: true,
            price: true,
            propertyType: true,
            listingType: true,
            province: true,
            district: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findByLister(listerUserId: string) {
    return this.prisma.propertyInquiry.findMany({
      where: { listerUserId },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            tier: true,
            price: true,
            propertyType: true,
            listingType: true,
            province: true,
            district: true,
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
    // Only the customer or lister can update
    if (inquiry.customerId !== userId && inquiry.listerUserId !== userId) {
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
