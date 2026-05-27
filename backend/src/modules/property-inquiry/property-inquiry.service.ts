import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePropertyInquiryDto,
  UpdatePropertyInquiryDto,
} from './dto/property-inquiry.dto';

@Injectable()
export class PropertyInquiryService {
  private propertyInquiryChatTableReady = false;

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

  private async ensurePropertyInquiryChatTable() {
    if (this.propertyInquiryChatTableReady) return;

    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS property_inquiry_chats (
        id TEXT PRIMARY KEY,
        inquiry_id TEXT NOT NULL REFERENCES property_inquiries(id) ON DELETE CASCADE,
        sender_user_id TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        text TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_property_inquiry_chats_inquiry_created_at
      ON property_inquiry_chats (inquiry_id, created_at)
    `);

    this.propertyInquiryChatTableReady = true;
  }

  private async findAuthorizedInquiryByPo(userId: string, poNumber: string) {
    const normalizedPo = String(poNumber || '').trim();
    if (!normalizedPo) {
      throw new BadRequestException('PO number is required');
    }

    const requesterIds = await this.resolveLinkedUserIds(userId);
    if (requesterIds.length === 0) {
      throw new ForbiddenException('Not authorized for this inquiry');
    }

    const inquiry = await this.prisma.propertyInquiry.findFirst({
      where: {
        poNumber: normalizedPo,
        OR: [
          { customerId: { in: requesterIds } },
          { listerUserId: { in: requesterIds } },
          { property: { userId: { in: requesterIds } } },
        ],
      },
      select: { id: true, poNumber: true },
    });

    if (!inquiry) {
      throw new NotFoundException('Inquiry not found');
    }

    return inquiry;
  }

  async listChatByPo(userId: string, poNumber: string) {
    const inquiry = await this.findAuthorizedInquiryByPo(userId, poNumber);
    await this.ensurePropertyInquiryChatTable();

    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        sender_user_id: string;
        sender_name: string;
        text: string;
        created_at: Date;
      }>
    >`
      SELECT id, sender_user_id, sender_name, text, created_at
      FROM property_inquiry_chats
      WHERE inquiry_id = ${inquiry.id}
      ORDER BY created_at ASC, id ASC
    `;

    return rows.map((row) => ({
      id: row.id,
      senderUserId: row.sender_user_id,
      senderName: row.sender_name,
      text: row.text,
      createdAt: row.created_at,
    }));
  }

  async sendChatByPo(userId: string, poNumber: string, text: string) {
    const body = String(text || '').trim();
    if (!body) {
      throw new BadRequestException('Message text is required');
    }

    const inquiry = await this.findAuthorizedInquiryByPo(userId, poNumber);
    await this.ensurePropertyInquiryChatTable();

    const sender = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
    if (!sender) {
      throw new NotFoundException('Sender user not found');
    }

    const messageId = randomUUID();
    const senderName = String(sender.name || sender.email || 'User');

    await this.prisma.$executeRaw`
      INSERT INTO property_inquiry_chats (id, inquiry_id, sender_user_id, sender_name, text, created_at)
      VALUES (${messageId}, ${inquiry.id}, ${sender.id}, ${senderName}, ${body}, NOW())
    `;

    const createdRows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        sender_user_id: string;
        sender_name: string;
        text: string;
        created_at: Date;
      }>
    >`
      SELECT id, sender_user_id, sender_name, text, created_at
      FROM property_inquiry_chats
      WHERE id = ${messageId}
      LIMIT 1
    `;

    const created = createdRows[0];
    if (!created) {
      throw new NotFoundException('Created chat message not found');
    }

    return {
      id: created.id,
      senderUserId: created.sender_user_id,
      senderName: created.sender_name,
      text: created.text,
      createdAt: created.created_at,
    };
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
      select: {
        id: true,
        email: true,
        name: true,
        fixer: { select: { id: true } },
      },
    });
    if (!customer) {
      throw new NotFoundException('Customer user not found');
    }

    // Property notify/inquiry is customer-only.
    if (customer.fixer) {
      throw new ForbiddenException(
        'This account is registered as a partner. Please use a customer account to send property inquiries.',
      );
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
            latitude: true,
            longitude: true,
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
            latitude: true,
            longitude: true,
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
