import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PropertyInquiryStatus, Prisma, UserRole } from '@prisma/client';
import { randomInt } from 'crypto';
import { PropertyInquiryService } from '../property-inquiry/property-inquiry.service';
import {
  PROPERTY_WORKFLOW_SOURCE_VERSION,
  propertyWorkflowActionMetadata,
  propertyInquiryNotifiedMetadata,
} from '../property-inquiry/property-workflow-notification';
import { PrismaService } from '../../prisma/prisma.service';
import { PropertyService } from '../property/property.service';
import {
  CreatePropertyWorkflowInquiryDto,
  PropertyWorkflowActionDto,
  PropertyWorkflowListingQueryDto,
} from './dto/property-workflow.dto';

const TOTAL_STEPS = 8;
const SOURCE_VERSION = PROPERTY_WORKFLOW_SOURCE_VERSION;

type PropertyWorkflowActionKey =
  | 'partner-accept'
  | 'partner-decline'
  | 'fee-proceed'
  | 'free-pass'
  | 'viewing-invite'
  | 'viewing-confirm'
  | 'rate-partner'
  | 'rate-customer'
  | 'customer-cancel';

type WorkflowAction =
  | 'accept'
  | 'partner-accept'
  | 'decline'
  | 'partner-decline'
  | 'fee'
  | 'fee-proceed'
  | 'free-pass'
  | 'viewing-invite'
  | 'viewing-confirmation'
  | 'viewing-confirm'
  | 'customer-rating'
  | 'rate-partner'
  | 'lister-rating'
  | 'rate-customer'
  | 'cancel'
  | 'customer-cancel';

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
        step: 4,
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
              metadata: propertyInquiryNotifiedMetadata(
                property.title,
                reference,
              ),
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
        ...(transition.meetingNote !== undefined && {
          meetingNote: transition.meetingNote,
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
            metadata: {
              ...transition.metadata,
              ...propertyWorkflowActionMetadata(
                action,
                inquiry.property?.title,
                inquiry.poNumber,
              ),
            } as Prisma.InputJsonValue,
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
      case 'partner-accept':
        requireActor('lister');
        requireStatus(PropertyInquiryStatus.NOTIFY_SENT);
        return {
          status: PropertyInquiryStatus.ACCEPTED,
          step: 4,
          metadata: {},
        };
      case 'decline':
      case 'partner-decline':
        requireActor('lister');
        requireStatus(PropertyInquiryStatus.NOTIFY_SENT);
        return {
          status: PropertyInquiryStatus.DECLINED,
          step: 4,
          metadata: {},
        };
      case 'fee':
      case 'fee-proceed':
      case 'free-pass':
        requireActor('customer');
        requireStatus(PropertyInquiryStatus.ACCEPTED);
        return {
          status: PropertyInquiryStatus.PAID,
          step: 5,
          metadata: { freePass: action === 'free-pass' || Boolean(dto.freePass) },
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
          meetingNote: String(dto.note || '').trim() || null,
          metadata: {},
        };
      case 'viewing-confirmation':
      case 'viewing-confirm':
        requireActor('lister');
        requireStatus(PropertyInquiryStatus.MEETING_SENT);
        return {
          status: PropertyInquiryStatus.MEETING_CONFIRMED,
          step: 7,
          metadata: {},
        };
      case 'customer-rating':
      case 'rate-partner':
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
      case 'rate-customer':
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
      case 'cancel':
      case 'customer-cancel': {
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
      (event: any) =>
        ['fee', 'fee-proceed', 'free-pass'].includes(event.action),
    );
    const currentStep = this.currentStep(inquiry.status, inquiry.step);
    const actions = this.actions(
      inquiry.status,
      currentStep,
      inquiry.customerRating,
      inquiry.listerRating,
    );
    const nextAction = this.nextAction(
      inquiry.status,
      actor,
      inquiry.customerRating,
      inquiry.listerRating,
    );
    // Persona-aware activity placement: the participant who owns an outstanding
    // primary action (excluding the customer's secondary cancel capability)
    // sees the inquiry in "request"; the waiting participant sees "active". A
    // participant who has already submitted their rating moves to "history"
    // even while the other rating is still pending. Terminal inquiries are
    // always "history".
    const actorPrimaryActions = actions.filter(
      (action) => action.owner === actor && action.key !== 'customer-cancel',
    );
    const actorAlreadyRated =
      (actor === 'customer' && inquiry.customerRating != null) ||
      (actor === 'lister' && inquiry.listerRating != null);
    const workflowEvents = events.map((event: any) => {
      const metadata =
        event.metadata && typeof event.metadata === 'object'
          ? event.metadata
          : {};
      const audience = Array.isArray(metadata.audience)
        ? metadata.audience.filter(
            (role: unknown) => role === 'customer' || role === 'lister',
          )
        : [];
      const notifications =
        metadata.notifications && typeof metadata.notifications === 'object'
          ? metadata.notifications
          : {};
      const message =
        actor === 'customer' || actor === 'lister'
          ? audience.includes(actor)
            ? String(notifications[actor] || '').trim() || null
            : null
          : null;

      return {
        action: event.action,
        status: event.status,
        step: event.step,
        actorRole:
          event.actorId === inquiry.customerId
            ? 'customer'
            : event.actorId === inquiry.listerUserId
              ? 'lister'
              : null,
        audience,
        message,
        createdAt: event.createdAt,
      };
    });
    return {
      reference: inquiry.poNumber,
      status: inquiry.status,
      poNumber: inquiry.poNumber,
      currentStep,
      totalSteps: TOTAL_STEPS,
      actionOwner: this.actionOwner(inquiry.status),
      actions,
      availableActions: this.availableActions(actions, actor),
      nextActionStep: nextAction.step,
      nextActionLabel: nextAction.label,
      nextActionOwner: nextAction.owner,
      activityBucket:
        terminal || actorAlreadyRated
          ? 'history'
          : actorPrimaryActions.length > 0
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
        'Meeting invitation and confirmation',
        'Ratings',
      ],
      sourceVersion: SOURCE_VERSION,
      listing: this.publicListing(inquiry.property, postFee),
      locationPresentation: this.locationPresentation(inquiry.property),
      uploadedFiles: this.combinedFiles(
        inquiry.property?.images,
        inquiry.attachments,
      ),
      selectedLister: { id: inquiry.listerUserId, name: inquiry.listerName },
      customer:
        actor === 'lister' && !postFee
          ? { id: null, name: 'Anonymous', email: null }
          : {
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
      processingFee: this.processingFee(inquiry.property?.tier),
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
        note: inquiry.meetingNote,
      },
      chat: {
        reference: inquiry.poNumber,
        enabled: postFee && !terminal,
        state: terminal ? 'closed' : postFee ? 'available' : 'locked',
        activatedAt: feeEvent?.createdAt ?? null,
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
      workflowEvents,
      timestamps: {
        createdAt: inquiry.createdAt,
        updatedAt: inquiry.updatedAt,
      },
      alerts: terminal || actor === 'admin'
        ? []
        : workflowEvents
            .filter((event: any) => Boolean(event.message))
            .sort(
              (left: any, right: any) =>
                new Date(right.createdAt).getTime() -
                new Date(left.createdAt).getTime(),
            )
            .map((event: any) => ({
              action: event.action,
              status: event.status,
              step: event.step,
              message: event.message,
              createdAt: event.createdAt,
            })),
    };
  }

  private currentStep(
    status: PropertyInquiryStatus,
    persistedStep: unknown,
  ): number {
    // NOTIFY_SENT is a transitional audit state: Steps 1-3 are recorded as
    // workflow events, but the actionable step the dashboards must render is
    // Step 4 (lister accept/decline). Legacy records persisted at step 3 are
    // normalized here without rewriting their audit history.
    if (status === PropertyInquiryStatus.NOTIFY_SENT) return 4;

    const step = Number(persistedStep);
    if (Number.isInteger(step) && step >= 1 && step <= TOTAL_STEPS) {
      return step;
    }

    switch (status) {
      case PropertyInquiryStatus.ACCEPTED:
        return 4;
      case PropertyInquiryStatus.PAID:
        return 5;
      case PropertyInquiryStatus.MEETING_SENT:
      case PropertyInquiryStatus.MEETING_CONFIRMED:
        return 7;
      case PropertyInquiryStatus.COMPLETED:
        return 8;
      case PropertyInquiryStatus.DECLINED:
        return 4;
      default:
        return 1;
    }
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
  private nextAction(
    status: PropertyInquiryStatus,
    actor: 'customer' | 'lister' | 'admin',
    customerRating: number | null,
    listerRating: number | null,
  ): {
    step: number | null;
    label: string | null;
    owner: 'customer' | 'lister' | null;
  } {
    if (actor === 'admin') return { step: null, label: null, owner: null };
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
          step: 7,
          label: 'Send meeting invitation',
          owner: 'customer',
        };
      case PropertyInquiryStatus.MEETING_SENT:
        return {
          step: 7,
          label: 'Confirm meeting',
          owner: 'lister',
        };
      case PropertyInquiryStatus.MEETING_CONFIRMED:
        // The next responsible party is the participant who has not yet rated.
        // This stays globally informative so a monitoring participant can still
        // see who owns the outstanding rating; availableActions/activityBucket
        // remain persona-specific.
        if (customerRating == null) {
          return { step: 8, label: 'Rate lister', owner: 'customer' };
        }
        if (listerRating == null) {
          return { step: 8, label: 'Rate customer', owner: 'lister' };
        }
        return { step: null, label: null, owner: null };
      default:
        return { step: null, label: null, owner: null };
    }
  }

  private actions(
    status: PropertyInquiryStatus,
    currentStep: number,
    customerRating: number | null,
    listerRating: number | null,
  ): Array<{
    key: PropertyWorkflowActionKey;
    owner: 'customer' | 'lister';
    label: string;
    actionStep: number;
    feeMode?: 'payment' | 'free-pass';
  }> {
    const cancel = {
      key: 'customer-cancel' as const,
      owner: 'customer' as const,
      label: 'Cancel property inquiry',
      actionStep: currentStep,
    };
    switch (status) {
      case PropertyInquiryStatus.NOTIFY_SENT:
        return [
          {
            key: 'partner-accept',
            owner: 'lister',
            label: 'Accept property inquiry',
            actionStep: 4,
          },
          {
            key: 'partner-decline',
            owner: 'lister',
            label: 'Decline property inquiry',
            actionStep: 4,
          },
          cancel,
        ];
      case PropertyInquiryStatus.ACCEPTED:
        return [
          {
            key: 'fee-proceed',
            owner: 'customer',
            label: 'Proceed with fee',
            actionStep: 5,
            feeMode: 'payment',
          },
          {
            key: 'free-pass',
            owner: 'customer',
            label: 'Free Pass',
            actionStep: 5,
            feeMode: 'free-pass',
          },
          cancel,
        ];
      case PropertyInquiryStatus.PAID:
        return [
          {
            key: 'viewing-invite',
            owner: 'customer',
            label: 'Send meeting invitation',
            actionStep: 7,
          },
          cancel,
        ];
      case PropertyInquiryStatus.MEETING_SENT:
        return [
          {
            key: 'viewing-confirm',
            owner: 'lister',
            label: 'Confirm meeting',
            actionStep: 7,
          },
          cancel,
        ];
      case PropertyInquiryStatus.MEETING_CONFIRMED:
        return [
          // Each rating action is only available to the participant who has
          // not yet submitted their rating. A participant who has already rated
          // has no outstanding primary action and moves to history.
          ...(customerRating == null
            ? [
                {
                  key: 'rate-partner' as const,
                  owner: 'customer' as const,
                  label: 'Rate lister',
                  actionStep: 8,
                },
              ]
            : []),
          ...(listerRating == null
            ? [
                {
                  key: 'rate-customer' as const,
                  owner: 'lister' as const,
                  label: 'Rate customer',
                  actionStep: 8,
                },
              ]
            : []),
        ];
      default:
        return [];
    }
  }

  private availableActions(
    actions: Array<{
      key: PropertyWorkflowActionKey;
      owner: 'customer' | 'lister';
    }>,
    actor: 'customer' | 'lister' | 'admin',
  ) {
    if (actor === 'admin') return [];
    return actions
      .filter((action) => action.owner === actor)
      .map((action) => action.key);
  }

  private processingFee(tier: unknown) {
    const fees: Record<string, number> = {
      ECONOMY: 100,
      STANDARD: 400,
      UPPER: 600,
      LUXURY: 800,
      GRANDEUR: 1000,
    };
    const normalizedTier = String(tier || 'ECONOMY').trim().toUpperCase();
    const amount = fees[normalizedTier] ?? fees.ECONOMY;
    return {
      amount,
      currency: 'THB',
      displayLabel: `\u0e3f${amount.toLocaleString('en-US')}`,
    };
  }

  // Server-owned location presentation. When GPS coordinates are present the
  // workflow action modals render the persisted coordinates; summary cards and
  // request/active-job rows render the persisted subdistrict. When GPS is
  // absent (or zero) both surfaces render the persisted subdistrict. This never
  // inspects titles, descriptions, PRE numbers, modal text, or localStorage.
  private locationPresentation(property: any) {
    const latitude = Number(property?.latitude);
    const longitude = Number(property?.longitude);
    const hasGps =
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      !(Math.abs(latitude) < 0.000001 && Math.abs(longitude) < 0.000001);
    const summaryDisplay = String(
      property?.subdistrict ||
        property?.district ||
        property?.province ||
        '',
    ).trim();
    return {
      mode: hasGps ? 'gps' : 'administrative',
      coordinates: hasGps ? { latitude, longitude } : null,
      siteSubdistrict: String(property?.subdistrict || '').trim(),
      postalCode: String(property?.postalCode || '').trim(),
      province: String(property?.province || '').trim(),
      modalDisplay: hasGps
        ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        : summaryDisplay,
      summaryDisplay,
    };
  }

  // Deduplicated combined file list: listing media first, inquiry attachments
  // second. Deduplicates by id, then key, then url so BLUE can consume one
  // authoritative list without guessing file sources. Never parses filenames or
  // text to derive files.
  private combinedFiles(listingImages: any, inquiryAttachments: any) {
    const seen = new Set<string>();
    const items: Array<{
      id: string;
      label: string;
      url: string;
      key: string;
      source: 'listing' | 'inquiry';
      createdAt: any;
    }> = [];
    const push = (source: 'listing' | 'inquiry', file: any) => {
      if (!file) return;
      const id = String(file.id || '').trim();
      const key = String(file.key || '').trim();
      const url = String(file.url || '').trim();
      if (!url && !key && !id) return;
      // A file is a duplicate if any of its authoritative identifiers (id, key,
      // url) has already been seen. This collapses listing media and inquiry
      // attachments that reference the same underlying asset.
      const identifiers = [id, key, url].filter(Boolean);
      if (identifiers.some((identifier) => seen.has(identifier))) return;
      identifiers.forEach((identifier) => seen.add(identifier));
      items.push({
        id: id || key || url,
        label:
          String(file.label || '').trim() ||
          (source === 'listing' ? 'Listing photo' : 'Uploaded file'),
        url,
        key,
        source,
        createdAt: file.createdAt,
      });
    };
    (Array.isArray(listingImages) ? listingImages : []).forEach((image: any) =>
      push('listing', image),
    );
    (Array.isArray(inquiryAttachments) ? inquiryAttachments : []).forEach(
      (file: any) => push('inquiry', file),
    );
    return items;
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
        createdAt: image.createdAt,
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
