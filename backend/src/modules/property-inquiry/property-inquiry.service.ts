import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PropertyInquiryStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePropertyInquiryDto,
  UpdatePropertyInquiryDto,
} from './dto/property-inquiry.dto';
import { propertyInquiryNotifiedMetadata } from './property-workflow-notification';

@Injectable()
export class PropertyInquiryService {
  private readonly logger = new Logger(PropertyInquiryService.name);
  private propertyInquiryChatTableReady = false;

  constructor(private readonly prisma: PrismaService) {}

  private normalizeEmail(value?: string | null) {
    return String(value || '')
      .trim()
      .toLowerCase();
  }

  private async resolveLinkedUserIds(userId: string) {
    const fallbackId = String(userId || '').trim();
    if (!fallbackId) return [] as string[];

    try {
    const user = await this.prisma.user.findUnique({
      where: { id: fallbackId },
      select: { id: true, subscriberId: true, email: true },
    });

    if (!user) {
      const linkedIds = new Set<string>();

      const bySubscriberId = await this.prisma.user.findMany({
        where: { subscriberId: fallbackId },
        select: { id: true },
      });
      bySubscriberId.forEach((item) => linkedIds.add(item.id));

      const normalizedFallbackEmail = this.normalizeEmail(fallbackId);
      if (normalizedFallbackEmail) {
        const byEmail = await this.prisma.user.findMany({
          where: {
            email: {
              equals: normalizedFallbackEmail,
              mode: 'insensitive',
            },
          },
          select: { id: true },
        });
        byEmail.forEach((item) => linkedIds.add(item.id));
      }

      if (linkedIds.size === 0) linkedIds.add(fallbackId);
      return Array.from(linkedIds);
    }

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
    } catch (error) {
      this.logger.warn(
        `Falling back to single linked user id for ${fallbackId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return [fallbackId];
    }
  }

  private async resolveLinkedEmails(userId: string, linkedIds?: string[]) {
    const fallbackId = String(userId || '').trim();
    if (!fallbackId) return [] as string[];

    try {
    const emails = new Set<string>();
    const addEmail = (value?: string | null) => {
      const normalized = this.normalizeEmail(value);
      if (normalized) emails.add(normalized);
    };

    const requesterIds =
      linkedIds && linkedIds.length > 0
        ? linkedIds
        : await this.resolveLinkedUserIds(fallbackId);

    if (requesterIds.length > 0) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: requesterIds } },
        select: { email: true, subscriberId: true },
      });

      const subscriberIds = new Set<string>();
      users.forEach((item) => {
        addEmail(item.email);
        if (item.subscriberId) subscriberIds.add(item.subscriberId);
      });

      if (subscriberIds.size > 0) {
        const subscribers = await this.prisma.subscriber.findMany({
          where: { id: { in: Array.from(subscriberIds) } },
          select: { email: true },
        });
        subscribers.forEach((item) => addEmail(item.email));
      }
    }

    const fallbackSubscriber = await this.prisma.subscriber.findUnique({
      where: { id: fallbackId },
      select: { email: true },
    });
    addEmail(fallbackSubscriber?.email);

    if (fallbackId.includes('@')) addEmail(fallbackId);

    return Array.from(emails);
    } catch (error) {
      this.logger.warn(
        `Falling back to empty linked emails for ${fallbackId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      if (fallbackId.includes('@')) return [this.normalizeEmail(fallbackId)].filter(Boolean);
      return [];
    }
  }

  private hasAnyLinkedEmail(
    requesterEmails: string[],
    candidates: Array<string | null | undefined>,
  ) {
    if (requesterEmails.length === 0) return false;
    const requesterEmailSet = new Set(
      requesterEmails
        .map((value) => this.normalizeEmail(value))
        .filter(Boolean),
    );
    return candidates.some((value) => {
      const normalized = this.normalizeEmail(value);
      return normalized ? requesterEmailSet.has(normalized) : false;
    });
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
    const requesterEmails = await this.resolveLinkedEmails(
      userId,
      requesterIds,
    );
    if (requesterIds.length === 0 && requesterEmails.length === 0) {
      throw new ForbiddenException('Not authorized for this inquiry');
    }

    const customerEmailFilters = requesterEmails.flatMap((email) => [
      { customerEmail: { equals: email, mode: 'insensitive' as const } },
      { customer: { email: { equals: email, mode: 'insensitive' as const } } },
    ]);
    const listerEmailFilters = requesterEmails.flatMap((email) => [
      { lister: { email: { equals: email, mode: 'insensitive' as const } } },
      {
        property: {
          user: {
            email: { equals: email, mode: 'insensitive' as const },
          },
        },
      },
    ]);

    const inquiry = await this.prisma.propertyInquiry.findFirst({
      where: {
        poNumber: normalizedPo,
        OR: [
          { customerId: { in: requesterIds } },
          { listerUserId: { in: requesterIds } },
          { property: { userId: { in: requesterIds } } },
          ...customerEmailFilters,
          ...listerEmailFilters,
        ],
      },
      select: { id: true, poNumber: true, status: true },
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
    const chatEnabledStatuses: PropertyInquiryStatus[] = [
      PropertyInquiryStatus.PAID,
      PropertyInquiryStatus.MEETING_SENT,
      PropertyInquiryStatus.MEETING_CONFIRMED,
    ];
    if (!chatEnabledStatuses.includes(inquiry.status)) {
      throw new BadRequestException(
        'Chat is available after Fee & Proceed and closes when the workflow is completed',
      );
    }
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

  async updateByPo(poNumber: string, userId: string, dto: UpdatePropertyInquiryDto) {
    const inquiry = await this.findAuthorizedInquiryByPo(userId, poNumber);
    return this.update(inquiry.id, userId, dto);
  }

  async create(customerId: string, dto: CreatePropertyInquiryDto) {
    // Verify property exists
    const property = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
      select: {
        id: true,
        userId: true,
        title: true,
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

    return this.prisma.propertyInquiry.create({
      data: {
        poNumber: dto.poNumber,
        propertyId: dto.propertyId,
        customerId,
        listerUserId: property.userId,
        customerName: dto.customerName || customer.name || '',
        customerEmail: this.normalizeEmail(dto.customerEmail || customer.email),
        listerName: dto.listerName || lister.name || property.contactName || '',
        status: PropertyInquiryStatus.NOTIFY_SENT,
        step: 4,
        workflowEvents: {
          create: {
            action: 'partner-notified',
            status: PropertyInquiryStatus.NOTIFY_SENT,
            step: 3,
            actorId: customerId,
            metadata: propertyInquiryNotifiedMetadata(
              property.title,
              dto.poNumber,
            ),
          },
        },
      },
    });
  }

  async findByCustomer(customerId: string) {
    try {
    const customerIds = await this.resolveLinkedUserIds(customerId);
    const customerEmails = await this.resolveLinkedEmails(
      customerId,
      customerIds,
    );
    if (customerIds.length === 0 && customerEmails.length === 0) return [];

    const customerEmailFilters = customerEmails.flatMap((email) => [
      { customerEmail: { equals: email, mode: 'insensitive' as const } },
      { customer: { email: { equals: email, mode: 'insensitive' as const } } },
    ]);

    const where = {
      OR: [{ customerId: { in: customerIds } }, ...customerEmailFilters],
    };

    try {
      return await this.prisma.propertyInquiry.findMany({
        where,
        include: {
          attachments: { orderBy: { createdAt: 'asc' } },
          workflowEvents: { orderBy: { createdAt: 'asc' } },
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
                  key: true,
                  sortOrder: true,
                },
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });
    } catch {
      try {
        const rows = await this.prisma.propertyInquiry.findMany({
          where,
          include: {
            property: true,
            attachments: { orderBy: { createdAt: 'asc' } },
            workflowEvents: { orderBy: { createdAt: 'asc' } },
          },
          orderBy: { updatedAt: 'desc' },
        });
        return rows.map((row) => ({
          ...row,
          property: row.property ? { ...row.property, images: [] } : null,
        }));
      } catch {
        return [];
      }
    }
    } catch (error) {
      this.logger.warn(
        `Returning empty customer inquiry list after lookup failed for ${customerId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return [];
    }
  }

  async findByLister(listerUserId: string) {
    try {
    const listerIds = await this.resolveLinkedUserIds(listerUserId);
    const listerEmails = await this.resolveLinkedEmails(
      listerUserId,
      listerIds,
    );
    if (listerIds.length === 0 && listerEmails.length === 0) return [];

    const listerEmailFilters = listerEmails.flatMap((email) => [
      { lister: { email: { equals: email, mode: 'insensitive' as const } } },
      {
        property: {
          user: {
            email: { equals: email, mode: 'insensitive' as const },
          },
        },
      },
    ]);

    const where = {
      OR: [
        { listerUserId: { in: listerIds } },
        { property: { userId: { in: listerIds } } },
        ...listerEmailFilters,
      ],
    };

    try {
      return await this.prisma.propertyInquiry.findMany({
        where,
        include: {
          attachments: { orderBy: { createdAt: 'asc' } },
          workflowEvents: { orderBy: { createdAt: 'asc' } },
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
                  key: true,
                  sortOrder: true,
                },
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });
    } catch {
      try {
        const rows = await this.prisma.propertyInquiry.findMany({
          where,
          include: {
            property: true,
            attachments: { orderBy: { createdAt: 'asc' } },
            workflowEvents: { orderBy: { createdAt: 'asc' } },
          },
          orderBy: { updatedAt: 'desc' },
        });
        return rows.map((row) => ({
          ...row,
          property: row.property ? { ...row.property, images: [] } : null,
        }));
      } catch {
        return [];
      }
    }
    } catch (error) {
      this.logger.warn(
        `Returning empty lister inquiry list after lookup failed for ${listerUserId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return [];
    }
  }

  async update(id: string, userId: string, dto: UpdatePropertyInquiryDto) {
    const inquiry = await this.prisma.propertyInquiry.findUnique({
      where: { id },
      include: {
        customer: { select: { email: true } },
        lister: { select: { email: true } },
        property: {
          select: {
            user: { select: { email: true } },
          },
        },
      },
    });
    if (!inquiry) {
      throw new NotFoundException('Inquiry not found');
    }

    const requesterIds = await this.resolveLinkedUserIds(userId);
    const requesterEmails = await this.resolveLinkedEmails(userId, requesterIds);
    const isCustomer =
      requesterIds.includes(inquiry.customerId) ||
      this.hasAnyLinkedEmail(requesterEmails, [
        inquiry.customerEmail,
        inquiry.customer?.email,
      ]);
    const isLister =
      requesterIds.includes(inquiry.listerUserId) ||
      this.hasAnyLinkedEmail(requesterEmails, [
        inquiry.lister?.email,
        inquiry.property?.user?.email,
      ]);
    if (!isCustomer && !isLister) {
      throw new ForbiddenException('Not authorized to update this inquiry');
    }

    const requireCustomer = () => {
      if (!isCustomer) throw new ForbiddenException('Only the customer may perform this action');
    };
    const requireLister = () => {
      if (!isLister) throw new ForbiddenException('Only the selected lister may perform this action');
    };
    const requireStatus = (...statuses: PropertyInquiryStatus[]) => {
      if (!statuses.includes(inquiry.status)) {
        throw new BadRequestException(
          'Action is invalid while inquiry is ' + inquiry.status,
        );
      }
    };

    let nextStatus: PropertyInquiryStatus;
    let nextStep: number;
    let action: string;
    let privateNote: string | null = null;
    let customerRating = inquiry.customerRating;
    let customerComment = inquiry.customerComment;
    let listerRating = inquiry.listerRating;
    let listerComment = inquiry.listerComment;
    let meetingDate = inquiry.meetingDate;
    let meetingTime = inquiry.meetingTime;
    let meetingVenue = inquiry.meetingVenue;
    let reselectedOnce = inquiry.reselectedOnce;

    if (dto.status === PropertyInquiryStatus.ACCEPTED) {
      requireLister();
      requireStatus(PropertyInquiryStatus.NOTIFY_SENT);
      nextStatus = PropertyInquiryStatus.ACCEPTED;
      nextStep = 4;
      action = 'partner-accept';
    } else if (dto.status === PropertyInquiryStatus.DECLINED) {
      requireLister();
      requireStatus(PropertyInquiryStatus.NOTIFY_SENT);
      nextStatus = PropertyInquiryStatus.DECLINED;
      nextStep = 4;
      action = 'partner-decline';
      privateNote = String(dto.listerComment || '').trim() || null;
    } else if (dto.status === PropertyInquiryStatus.PAID) {
      requireCustomer();
      requireStatus(PropertyInquiryStatus.ACCEPTED);
      nextStatus = PropertyInquiryStatus.PAID;
      nextStep = 5;
      action = 'fee-proceed';
    } else if (dto.status === PropertyInquiryStatus.MEETING_SENT) {
      requireCustomer();
      requireStatus(PropertyInquiryStatus.PAID);
      if (!dto.meetingDate || !dto.meetingTime || !dto.meetingVenue) {
        throw new BadRequestException('Viewing date, time, and venue are required');
      }
      nextStatus = PropertyInquiryStatus.MEETING_SENT;
      nextStep = 7;
      action = 'viewing-invite';
      meetingDate = dto.meetingDate;
      meetingTime = dto.meetingTime;
      meetingVenue = dto.meetingVenue;
    } else if (dto.status === PropertyInquiryStatus.MEETING_CONFIRMED) {
      requireLister();
      requireStatus(PropertyInquiryStatus.MEETING_SENT);
      nextStatus = PropertyInquiryStatus.MEETING_CONFIRMED;
      nextStep = 7;
      action = 'viewing-confirmation';
    } else if (dto.status === PropertyInquiryStatus.CANCELLED) {
      requireCustomer();
      requireStatus(
        PropertyInquiryStatus.NOTIFY_SENT,
        PropertyInquiryStatus.ACCEPTED,
        PropertyInquiryStatus.PAID,
        PropertyInquiryStatus.MEETING_SENT,
        PropertyInquiryStatus.MEETING_CONFIRMED,
      );
      nextStatus = PropertyInquiryStatus.CANCELLED;
      nextStep = inquiry.step;
      action = 'customer-cancel';
      reselectedOnce = dto.reselectedOnce ?? inquiry.reselectedOnce;
    } else if (dto.customerRating !== undefined || dto.listerRating !== undefined) {
      requireStatus(PropertyInquiryStatus.MEETING_CONFIRMED);
      if (dto.customerRating !== undefined) {
        requireCustomer();
        customerRating = dto.customerRating;
        customerComment = dto.customerComment || null;
        action = 'customer-rating';
      } else {
        requireLister();
        listerRating = dto.listerRating ?? null;
        listerComment = dto.listerComment || null;
        action = 'lister-rating';
      }
      nextStatus =
        customerRating != null && listerRating != null
          ? PropertyInquiryStatus.COMPLETED
          : PropertyInquiryStatus.MEETING_CONFIRMED;
      nextStep = 8;
    } else {
      throw new BadRequestException('Unsupported property workflow update');
    }

    return this.prisma.propertyInquiry.update({
      where: { id },
      data: {
        status: nextStatus,
        step: nextStep,
        meetingDate,
        meetingTime,
        meetingVenue,
        customerRating,
        customerComment,
        listerRating,
        listerComment,
        reselectedOnce,
        workflowEvents: {
          create: {
            action,
            status: nextStatus,
            step: nextStep,
            actorId: userId,
            isPrivate: action === 'partner-decline',
            note: privateNote,
          },
        },
      },
    });
  }
}
