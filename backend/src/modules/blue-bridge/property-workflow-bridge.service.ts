import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PropertyInquiryStatus, Prisma, UserRole } from '@prisma/client';
import { randomInt } from 'crypto';
import { PropertyInquiryService } from '../property-inquiry/property-inquiry.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PropertyService } from '../property/property.service';
import {
  CreatePropertyWorkflowInquiryDto,
  PropertyWorkflowActionDto,
  PropertyWorkflowListingQueryDto,
} from './dto/property-workflow.dto';

const TOTAL_STEPS = 8;
const SOURCE_VERSION = 'cblue-property-workflow-v1';

type WorkflowAction =
  | 'accept'
  | 'decline'
  | 'fee'
  | 'viewing-invite'
  | 'viewing-confirmation'
  | 'customer-rating'
  | 'lister-rating'
  | 'cancel';

@Injectable()
export class PropertyWorkflowBridgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly propertyService: PropertyService,
    private readonly propertyInquiryService?: PropertyInquiryService,
  ) {}

  async listings(query: PropertyWorkflowListingQueryDto) {
    const result = await this.propertyService.search({
      page: query.page || 1,
      limit: query.limit || 20,
      propertyType: query.propertyType,
      listingType: query.listingType,
      province: query.province,
      district: query.district,
      subdistrict: query.subdistrict,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      keyword: query.keyword,
    });
    return {
      ...result,
      sourceVersion: SOURCE_VERSION,
      listings: result.properties.map((property) =>
        this.publicListing(property),
      ),
      properties: undefined,
    };
  }

  async createInquiry(userId: string, dto: CreatePropertyWorkflowInquiryDto) {
    const customer = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const property = await this.prisma.property.findFirst({
      where: { id: dto.listingId, status: 'ACTIVE' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!property) throw new NotFoundException('Listing not found');

    const reference = await this.nextReference();
    const attachments = (dto.attachments || []).filter(
      (file) => file.url && file.key,
    );
    const inquiry = await this.prisma.propertyInquiry.create({
      data: {
        poNumber: reference,
        propertyId: property.id,
        customerId: customer.id,
        listerUserId: property.userId,
        customerName: customer.name || customer.email || 'Customer',
        customerEmail: String(customer.email || '')
          .trim()
          .toLowerCase(),
        listerName: property.user.name || property.contactName,
        requestDetails: String(dto.requestDetails || '').trim() || null,
        status: PropertyInquiryStatus.NOTIFY_SENT,
        step: 3,
        ...(attachments.length > 0
          ? {
              attachments: {
                create: attachments.map((file) => ({
                  uploadedBy: customer.id,
                  label: file.label || null,
                  url: file.url,
                  key: file.key,
                })),
              },
            }
          : {}),
        workflowEvents: {
          create: [
            {
              action: 'match-selected',
              status: PropertyInquiryStatus.NOTIFY_SENT,
              step: 1,
              actorId: customer.id,
              metadata: { sourceVersion: SOURCE_VERSION },
            },
            {
              action: 'listing-selected',
              status: PropertyInquiryStatus.NOTIFY_SENT,
              step: 2,
              actorId: customer.id,
              metadata: { sourceVersion: SOURCE_VERSION },
            },
            {
              action: 'partner-notified',
              status: PropertyInquiryStatus.NOTIFY_SENT,
              step: 3,
              actorId: customer.id,
              metadata: { sourceVersion: SOURCE_VERSION },
            },
          ],
        },
      },
    });

    return this.snapshot(inquiry.poNumber, customer.id);
  }

  async snapshot(reference: string, userId: string, callerRole?: UserRole) {
    const inquiry = await this.loadInquiry(reference);
    const actor = this.actorFor(inquiry, userId, callerRole);
    if (!actor) throw new ForbiddenException('Not authorized for this inquiry');
    const messages = await this.loadChat(userId, inquiry.poNumber);
    return this.projectSnapshot(inquiry, actor, messages);
  }

  private async loadChat(userId: string, reference: string) {
    try {
      if (!this.propertyInquiryService) return [];
      return await this.propertyInquiryService.listChatByPo(userId, reference);
    } catch {
      return [];
    }
  }

  async action(
    reference: string,
    userId: string,
    action: WorkflowAction,
    dto: PropertyWorkflowActionDto,
  ) {
    const inquiry = await this.loadInquiry(reference);
    const actor = this.actorFor(inquiry, userId);
    if (!actor) throw new ForbiddenException('Not authorized for this inquiry');
    if (actor === 'admin') {
      throw new ForbiddenException('Administrators may review but not advance this inquiry');
    }

    const transition = this.transition(action, actor, inquiry, dto);
    const updated = await this.prisma.propertyInquiry.update({
      where: { id: inquiry.id },
      data: {
        status: transition.status,
        step: transition.step,
        ...(transition.meetingDate !== undefined && {
          meetingDate: transition.meetingDate,
        }),
        ...(transition.meetingTime !== undefined && {
          meetingTime: transition.meetingTime,
        }),
        ...(transition.meetingVenue !== undefined && {
          meetingVenue: transition.meetingVenue,
        }),
        ...(transition.customerRating !== undefined && {
          customerRating: transition.customerRating,
        }),
        ...(transition.customerComment !== undefined && {
          customerComment: transition.customerComment,
        }),
        ...(transition.listerRating !== undefined && {
          listerRating: transition.listerRating,
        }),
        ...(transition.listerComment !== undefined && {
          listerComment: transition.listerComment,
        }),
        workflowEvents: {
          create: {
            action,
            status: transition.status,
            step: transition.step,
            actorId: userId,
            isPrivate: action === 'decline',
            note: String(dto.note || '').trim() || null,
            metadata: transition.metadata as Prisma.InputJsonValue,
          },
        },
      },
    });
    return this.snapshot(updated.poNumber, userId);
  }

  private async loadInquiry(reference: string) {
    const poNumber = String(reference || '').trim();
    if (!poNumber)
      throw new BadRequestException('Inquiry reference is required');
    const inquiry = await this.prisma.propertyInquiry.findUnique({
      where: { poNumber },
      include: {
        property: { include: { images: { orderBy: { sortOrder: 'asc' } } } },
        attachments: { orderBy: { createdAt: 'asc' } },
        workflowEvents: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!inquiry) throw new NotFoundException('Inquiry not found');
    return inquiry;
  }

  private actorFor(
    inquiry: { customerId: string; listerUserId: string },
    userId: string,
    callerRole?: UserRole,
  ) {
    if (callerRole === UserRole.ADMIN) return 'admin' as const;
    if (inquiry.customerId === userId) return 'customer' as const;
    if (inquiry.listerUserId === userId) return 'lister' as const;
    return null;
  }

  private transition(
    action: WorkflowAction,
    actor: 'customer' | 'lister',
    inquiry: {
      status: PropertyInquiryStatus;
      step: number;
      customerRating: number | null;
      listerRating: number | null;
    },
    dto: PropertyWorkflowActionDto,
  ) {
    const requireActor = (expected: 'customer' | 'lister') => {
      if (actor !== expected)
        throw new ForbiddenException(
          `Only the ${expected} may perform this action`,
        );
    };
    const requireStatus = (...statuses: PropertyInquiryStatus[]) => {
      if (!statuses.includes(inquiry.status))
        throw new BadRequestException(
          `Action is invalid while inquiry is ${inquiry.status}`,
        );
    };
    switch (action) {
      case 'accept':
        requireActor('lister');
        requireStatus(PropertyInquiryStatus.NOTIFY_SENT);
        return {
          status: PropertyInquiryStatus.ACCEPTED,
          step: 4,
          metadata: {},
        };
      case 'decline':
        requireActor('lister');
        requireStatus(PropertyInquiryStatus.NOTIFY_SENT);
        return {
          status: PropertyInquiryStatus.DECLINED,
          step: 4,
          metadata: {},
        };
      case 'fee':
        requireActor('customer');
        requireStatus(PropertyInquiryStatus.ACCEPTED);
        return {
          status: PropertyInquiryStatus.PAID,
          step: 5,
          metadata: { freePass: Boolean(dto.freePass) },
        };
      case 'viewing-invite':
        requireActor('customer');
        requireStatus(PropertyInquiryStatus.PAID);
        if (!dto.meetingDate || !dto.meetingTime || !dto.meetingVenue)
          throw new BadRequestException(
            'Viewing date, time, and venue are required',
          );
        return {
          status: PropertyInquiryStatus.MEETING_SENT,
          step: 7,
          meetingDate: dto.meetingDate,
          meetingTime: dto.meetingTime,
          meetingVenue: dto.meetingVenue,
          metadata: {},
        };
      case 'viewing-confirmation':
        requireActor('lister');
        requireStatus(PropertyInquiryStatus.MEETING_SENT);
        return {
          status: PropertyInquiryStatus.MEETING_CONFIRMED,
          step: 7,
          metadata: {},
        };
      case 'customer-rating':
        requireActor('customer');
        requireStatus(PropertyInquiryStatus.MEETING_CONFIRMED);
        if (!dto.rating) throw new BadRequestException('Rating is required');
        return {
          status: inquiry.listerRating
            ? PropertyInquiryStatus.COMPLETED
            : PropertyInquiryStatus.MEETING_CONFIRMED,
          step: 8,
          customerRating: dto.rating,
          customerComment: dto.note,
          metadata: {},
        };
      case 'lister-rating':
        requireActor('lister');
        requireStatus(PropertyInquiryStatus.MEETING_CONFIRMED);
        if (!dto.rating) throw new BadRequestException('Rating is required');
        return {
          status: inquiry.customerRating
            ? PropertyInquiryStatus.COMPLETED
            : PropertyInquiryStatus.MEETING_CONFIRMED,
          step: 8,
          listerRating: dto.rating,
          listerComment: dto.note,
          metadata: {},
        };
      case 'cancel': {
        requireActor('customer');
        const closedStatuses: PropertyInquiryStatus[] = [
          PropertyInquiryStatus.COMPLETED,
          PropertyInquiryStatus.CANCELLED,
          PropertyInquiryStatus.DECLINED,
        ];
        if (closedStatuses.includes(inquiry.status))
          throw new BadRequestException('Inquiry is already closed');
        return {
          status: PropertyInquiryStatus.CANCELLED,
          step: inquiry.step,
          metadata: {},
        };
      }
    }
  }

  private projectSnapshot(
    inquiry: any,
    actor: 'customer' | 'lister' | 'admin',
    messages: Array<Record<string, unknown>>,
  ) {
    const terminal = [
      PropertyInquiryStatus.CANCELLED,
      PropertyInquiryStatus.DECLINED,
      PropertyInquiryStatus.COMPLETED,
    ].includes(inquiry.status);
    const postFee = [
      PropertyInquiryStatus.PAID,
      PropertyInquiryStatus.MEETING_SENT,
      PropertyInquiryStatus.MEETING_CONFIRMED,
      PropertyInquiryStatus.COMPLETED,
    ].includes(inquiry.status);
    const events = inquiry.workflowEvents.filter(
      (event: any) => actor === 'lister' || actor === 'admin' || !event.isPrivate,
    );
    const feeEvent = inquiry.workflowEvents.find(
      (event: any) => event.action === 'fee',
    );
    const nextAction = this.nextAction(inquiry.status);
    return {
      reference: inquiry.poNumber,
      status: inquiry.status,
      poNumber: inquiry.poNumber,
      currentStep: inquiry.step,
      totalSteps: TOTAL_STEPS,
      actionOwner: this.actionOwner(inquiry.status),
      availableActions: this.availableActions(inquiry.status, actor),
      nextActionStep: nextAction.step,
      nextActionLabel: nextAction.label,
      nextActionOwner: nextAction.owner,
      activityBucket: terminal
        ? 'history'
        : inquiry.step <= 4
          ? 'request'
          : 'active',
      terminalState: terminal ? inquiry.status : null,
      stepLabels: [
        'Match listing',
        'Select listing',
        'Inquiry issued',
        'Lister decision',
        'Fee or free pass',
        'Chat',
        'Viewing invitation and confirmation',
        'Ratings',
      ],
      sourceVersion: SOURCE_VERSION,
      listing: this.publicListing(inquiry.property, postFee),
      selectedLister: { id: inquiry.listerUserId, name: inquiry.listerName },
      customer: {
        id: inquiry.customerId,
        name: inquiry.customerName,
        email: inquiry.customerEmail,
      },
      requestDetails: inquiry.requestDetails || '',
      feeState: {
        required: inquiry.status === PropertyInquiryStatus.ACCEPTED,
        paid: postFee,
        freePass: Boolean((feeEvent?.metadata as any)?.freePass),
      },
      attachments: inquiry.attachments.map((file: any) => ({
        id: file.id,
        label: file.label || 'Uploaded file',
        url: file.url,
        key: file.key,
        createdAt: file.createdAt,
      })),
      meeting: {
        date: inquiry.meetingDate,
        time: inquiry.meetingTime,
        venue: inquiry.meetingVenue,
      },
      chat: {
        reference: inquiry.poNumber,
        enabled: postFee && !terminal,
        state: terminal ? 'closed' : postFee ? 'available' : 'locked',
        messages: terminal ? [] : messages,
      },
      chatHistory: terminal ? messages : [],
      ratings: {
        customer: inquiry.customerRating
          ? { score: inquiry.customerRating, comment: inquiry.customerComment }
          : null,
        lister: inquiry.listerRating
          ? { score: inquiry.listerRating, comment: inquiry.listerComment }
          : null,
      },
      history: events.map((event: any) => ({
        action: event.action,
        status: event.status,
        step: event.step,
        note: event.note,
        private: event.isPrivate,
        createdAt: event.createdAt,
      })),
      timestamps: {
        createdAt: inquiry.createdAt,
        updatedAt: inquiry.updatedAt,
      },
      alerts: terminal || actor === 'admin'
        ? []
        : events
            .filter(
              (event: any) =>
                event.actorId !==
                (actor === 'customer'
                  ? inquiry.customerId
                  : inquiry.listerUserId),
            )
            .map((event: any) => ({
              action: event.action,
              status: event.status,
              step: event.step,
              createdAt: event.createdAt,
            })),
    };
  }

  private actionOwner(status: PropertyInquiryStatus) {
    if (status === PropertyInquiryStatus.NOTIFY_SENT) return 'lister';
    if (status === PropertyInquiryStatus.ACCEPTED) return 'customer';
    if (status === PropertyInquiryStatus.PAID) return 'customer';
    if (status === PropertyInquiryStatus.MEETING_SENT) return 'lister';
    if (status === PropertyInquiryStatus.MEETING_CONFIRMED) {
      return 'customer-and-lister';
    }
    return 'none';
  }
  private nextAction(status: PropertyInquiryStatus): {
    step: number | null;
    label: string | null;
    owner: 'customer' | 'lister' | 'customer-and-lister' | null;
  } {
    switch (status) {
      case PropertyInquiryStatus.NOTIFY_SENT:
        return {
          step: 4,
          label: 'Respond to property inquiry',
          owner: 'lister',
        };
      case PropertyInquiryStatus.ACCEPTED:
        return {
          step: 5,
          label: 'Fee or free pass',
          owner: 'customer',
        };
      case PropertyInquiryStatus.PAID:
        return {
          step: 6,
          label: 'Chat is available; customer may send a viewing invitation at Step 7',
          owner: 'customer-and-lister',
        };
      case PropertyInquiryStatus.MEETING_SENT:
        return {
          step: 7,
          label: 'Confirm viewing invitation',
          owner: 'lister',
        };
      case PropertyInquiryStatus.MEETING_CONFIRMED:
        return {
          step: 8,
          label: 'Submit ratings',
          owner: 'customer-and-lister',
        };
      default:
        return { step: null, label: null, owner: null };
    }
  }

  private availableActions(
    status: PropertyInquiryStatus,
    actor: 'customer' | 'lister' | 'admin',
  ) {
    const terminalStatuses: PropertyInquiryStatus[] = [
      PropertyInquiryStatus.CANCELLED,
      PropertyInquiryStatus.DECLINED,
      PropertyInquiryStatus.COMPLETED,
    ];
    if (actor === 'admin' || terminalStatuses.includes(status)) {
      return [];
    }
    if (status === PropertyInquiryStatus.NOTIFY_SENT) {
      return actor === 'lister'
        ? ['partner-accept', 'partner-decline']
        : ['customer-cancel'];
    }
    if (status === PropertyInquiryStatus.ACCEPTED) {
      return actor === 'customer'
        ? ['fee-proceed', 'free-pass', 'customer-cancel']
        : [];
    }
    if (status === PropertyInquiryStatus.PAID) {
      return actor === 'customer'
        ? ['viewing-invite', 'customer-cancel']
        : [];
    }
    if (status === PropertyInquiryStatus.MEETING_SENT) {
      return actor === 'lister'
        ? ['viewing-confirm']
        : ['customer-cancel'];
    }
    return actor === 'customer' ? ['rate-partner'] : ['rate-customer'];
  }

  private publicListing(property: any, includeContact = false) {
    return {
      id: property.id,
      title: property.title,
      propertyType: property.propertyType,
      listingType: property.listingType,
      tier: property.tier,
      price: property.price,
      location: {
        province: property.province,
        district: property.district,
        subdistrict: property.subdistrict,
        postalCode: property.postalCode,
        addressLine: property.addressLine,
        latitude: property.latitude,
        longitude: property.longitude,
      },
      attachments: (property.images || []).map((image: any) => ({
        id: image.id,
        url: image.url,
        key: image.key,
        sortOrder: image.sortOrder,
        isPrimary: image.isPrimary,
      })),
      createdAt: property.createdAt,
      ...(includeContact
        ? {
            contact: {
              name: property.contactName,
              phone: property.contactPhone,
              email: property.contactEmail,
            },
          }
        : {}),
    };
  }

  private async nextReference() {
    const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const reference = `PRE-${String(now.getUTCFullYear()).slice(-2)}${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(randomInt(0, 1_000_000)).padStart(6, '0')}`;
      const existing = await this.prisma.propertyInquiry.findUnique({
        where: { poNumber: reference },
        select: { id: true },
      });
      if (!existing) return reference;
    }
    throw new BadRequestException('Unable to issue a unique inquiry reference');
  }
}
