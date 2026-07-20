import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { BlueWorkflowDetailResponse } from './blue-bridge.controller';

interface WorkflowDetailInput {
  poNumber: string;
  legacySubjectId: string;
  bridgeKey?: string;
}

interface WorkflowActivitiesInput {
  legacySubjectId: string;
  persona: 'customer' | 'partner';
  bridgeKey?: string;
}

interface WorkflowChatInput {
  poNumber: string;
  legacySubjectId: string;
  bridgeKey?: string;
}

interface BudgetItem {
  service: string;
  qty: number;
  unit: string;
  unitRate: number;
  total: number;
}

interface PersistedStatusEvent {
  status: string;
  note?: string | null;
  createdAt: Date | string;
}

interface WorkflowLifecycle {
  activityBucket: 'request' | 'active' | 'history';
  lifecycleStatus: string;
  archivedAt: string | null;
  cancelledAt: string | null;
  declinedAt: string | null;
  ratedAt: string | null;
}

interface WorkflowActionForm {
  kind: 'price-list';
  maxItems: number;
  fields: Array<{
    key: 'service' | 'quantity' | 'unit' | 'unitRate' | 'total';
    label: string;
    type: 'text' | 'number';
    required?: boolean;
    readOnly?: boolean;
    min?: number;
  }>;
}

interface WorkflowAction {
  key: string;
  owner: 'customer' | 'partner';
  label: string;
  actionStep: number;
  feeMode?: 'payment' | 'free-pass';
  form?: WorkflowActionForm;
}
interface ProcessingFee {
  amount: number;
  currency: string;
  displayLabel: string;
}
interface OrderWorkflowSnapshot {
  poNumber: string;
  currentStep: number;
  totalSteps: 11;
  status: string;
  actions: WorkflowAction[];
  availableActions: string[];
  actionNeeded: boolean;
  actionOwner: WorkflowAction['owner'] | null;
  nextActionKey: string | null;
  nextActionLabel: string | null;
  nextActionOwner: WorkflowAction['owner'] | null;
  nextActionStep: number | null;
  sourceVersion: 'cblue-fixer-workflow-v1';
  activityBucket: 'request' | 'active' | 'history';
  workflowVersion: number;
  chat: {
    enabled: boolean;
  };
  processingFee: ProcessingFee | null;
}
@Injectable()
export class BlueBridgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async authenticatedWorkflowDetails(
    poNumber: string,
    userId: string,
  ): Promise<BlueWorkflowDetailResponse> {
    return this.workflowDetails({
      poNumber,
      legacySubjectId: userId,
      bridgeKey: this.config.get<string>('blueBridge.apiKey'),
    });
  }
  async authenticatedWorkflowDetailsByOrderId(
    orderId: string,
    poNumber: string,
    userId: string,
  ): Promise<BlueWorkflowDetailResponse> {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        OR: [{ userId }, { fixer: { userId } }],
      },
      include: {
        user: { select: { name: true, email: true } },
        address: true,
        images: {
          where: { type: { in: ['order_attachment', 'order_photo'] } },
          orderBy: { createdAt: 'asc' },
        },
        statusHistory: { orderBy: { createdAt: 'desc' } },
        review: { select: { createdAt: true } },
        fixer: {
          select: {
            userId: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
        workflowActions: {
          select: {
            action: true,
            actorUserId: true,
            payload: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!order) {
      throw new NotFoundException('Workflow detail not found');
    }
    return this.projectFixerWorkflowDetails(order, [userId], poNumber);
  }


  async workflowDetails(
    input: WorkflowDetailInput,
  ): Promise<BlueWorkflowDetailResponse> {
    this.assertBridgeKey(input.bridgeKey);
    const poNumber = String(input.poNumber || '').trim();
    const legacySubjectId = String(input.legacySubjectId || '').trim();
    if (!poNumber || !legacySubjectId) {
      throw new NotFoundException('Workflow detail not found');
    }

    const linkedUserIds = await this.resolveLinkedUserIds(legacySubjectId);
    if (linkedUserIds.length === 0) {
      throw new NotFoundException('Workflow detail not found');
    }

    const order = await this.prisma.order.findFirst({
      where: {
        description: { contains: poNumber, mode: 'insensitive' },
        OR: [
          { userId: { in: linkedUserIds } },
          { fixer: { userId: { in: linkedUserIds } } },
        ],
      },
      include: {
        user: { select: { name: true, email: true } },
        address: true,
        images: {
          where: { type: { in: ['order_attachment', 'order_photo'] } },
          orderBy: { createdAt: 'asc' },
        },
        statusHistory: { orderBy: { createdAt: 'desc' } },
        review: { select: { createdAt: true } },
        fixer: {
          select: {
            userId: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
        workflowActions: {
          select: {
            action: true,
            actorUserId: true,
            payload: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!order) {
      const inquiry = await this.prisma.propertyInquiry.findFirst({
        where: {
          poNumber,
          OR: [
            { customerId: { in: linkedUserIds } },
            { listerUserId: { in: linkedUserIds } },
            { property: { userId: { in: linkedUserIds } } },
          ],
        },
        include: {
          property: {
            include: {
              images: { orderBy: { sortOrder: 'asc' } },
            },
          },
        },
      });
      if (!inquiry) {
        throw new NotFoundException('Workflow detail not found');
      }
      const lifecycle = resolvePropertyLifecycle(inquiry);
      return {
        detailRows: [
          { label: 'Customer', value: inquiry.customerName },
          { label: 'Property', value: inquiry.property.title },
          {
            label: 'Property Price',
            value: `฿${formatNumber(inquiry.property.price)}`,
          },
          {
            label: 'Property Location',
            value: [
              inquiry.property.addressLine,
              inquiry.property.subdistrict,
              inquiry.property.district,
              inquiry.property.province,
              inquiry.property.postalCode,
            ]
              .map((value) => String(value || '').trim())
              .filter(Boolean)
              .join(', '),
          },
          {
            label: 'Meeting Date',
            value: String(inquiry.meetingDate || '').trim(),
          },
          {
            label: 'Meeting Time',
            value: String(inquiry.meetingTime || '').trim(),
          },
          {
            label: 'Meeting Venue',
            value: String(inquiry.meetingVenue || '').trim(),
          },
          {
            label: 'Property Details',
            value: inquiry.property.description,
          },
        ].filter((row) => row.value.length > 0),
        budgetLines: [],
        budgetBreakdown: [],
        uploadedFiles: inquiry.property.images.map((image, index) => ({
          label: `Property image ${index + 1}`,
          url: image.url,
        })),
        ...lifecycle,
      };
    }

    return this.projectFixerWorkflowDetails(order, linkedUserIds, poNumber);
  }
  private projectFixerWorkflowDetails(
    order: any,
    viewerUserIds: string[],
    poNumber: string,
  ): BlueWorkflowDetailResponse {
    const budgetItems = parseBudgetItems(order.budgetBreakdown);
    const lifecycle = resolveOrderLifecycle({
      status: order.status,
      statusHistory: order.statusHistory,
      workflowPhase: order.workflowPhase,
      archivedAt: order.archivedAt,
      ratedAt: fullyRatedAt(order),
      completedActionKeys: (order.workflowActions || []).map(
        (event: any) => event.action,
      ),
    });
    const workflow = resolvePersistedFixerWorkflowSnapshot({
      poNumber,
      ratedAt: fullyRatedAt(order),
      status: order.status,
      workflowPhase: order.workflowPhase,
      archivedAt: order.archivedAt,
      workflowVersion: order.workflowRevision,
      chatEnabled: order.chatEnabled,
      completedActionKeys: (order.workflowActions || []).map(
        (event: any) => event.action,
      ),
      customerUserId: order.userId,
      fixerUserId: order.fixer?.userId,
      viewerUserIds,
      processingFee: this.processingFee(),
    });
    return {
      detailRows: [
        {
          label: 'Customer',
          value: String(order.user.name || order.user.email || '').trim(),
        },
        {
          label: 'Project Location',
          value: formatLocation(order.address),
        },
        {
          label: 'Project Details',
          value: cleanProjectDetails(order.description),
        },
      ].filter((row) => row.value.length > 0),
      budgetLines: formatBudgetLines(budgetItems),
      budgetBreakdown: budgetItems,
      uploadedFiles: order.images.map((image: any, index: number) => ({
        label: `Uploaded file ${index + 1}`,
        url: image.url,
      })),
      ...lifecycle,
      ...workflow,
      workflowPhase: order.workflowPhase,
      workflowEvents: persistedFixerWorkflowEvents(order),
      title: String(order.serviceCategory || '').replace(/_/g, ' ').trim(),
      serviceCategory: order.serviceCategory,
      customer: identity(order.user),
      partner: identity(order.fixer?.user),
      location: order.address ? formatLocation(order.address) : '',
      meeting: projectPersistedFixerMeeting(order),
      siteSubdistrict: persistedSubdistrict(order.address),
      variation: projectPersistedFixerVariation(order),
    };
  }


  async workflowActivities(input: WorkflowActivitiesInput) {
    this.assertBridgeKey(input.bridgeKey);
    const legacySubjectId = String(input.legacySubjectId || '').trim();
    if (!legacySubjectId || !['customer', 'partner'].includes(input.persona)) {
      throw new BadRequestException('A valid actor and persona are required');
    }

    const viewerUserIds = await this.resolveLinkedUserIds(legacySubjectId);
    if (viewerUserIds.length === 0) {
      throw new NotFoundException('Workflow activities not found');
    }

    const orders = (await this.prisma.order.findMany({
      where:
        input.persona === 'customer'
          ? { userId: { in: viewerUserIds } }
          : { fixer: { userId: { in: viewerUserIds } } },
      include: {
        user: { select: { id: true, name: true, email: true } },
        fixer: {
          select: {
            userId: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
        address: true,
        review: { select: { createdAt: true } },
        statusHistory: { orderBy: { createdAt: 'desc' } },
        workflowActions: {
          select: {
            action: true,
            actorUserId: true,
            payload: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        chatMessages: {
          include: { senderUser: { select: { name: true, email: true } } },
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
      orderBy: { createdAt: 'desc' },
    })) as any[];

    const activities = deduplicateWorkflowActivities(
      orders
        .map((order) => this.workflowActivity(order, viewerUserIds))
        .filter(Boolean) as Array<Record<string, any>>,
    );
    const notifications = await this.prisma.notification.findMany({
      where: { userId: { in: viewerUserIds } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const eventAlerts = activities.flatMap((activity) =>
      (activity.workflowEvents || []).flatMap((event: any) => {
        const base = {
          id: `workflow-event:${activity.poNumber}:${event.action}:${event.createdAt}`,
          type: 'FIXER_WORKFLOW',
          status: 'SENT',
          action: event.action,
          currentStep: 9,
          createdAt: event.createdAt,
          readAt: null,
        };
        if (event.action === 'confirm-meeting') {
          return [{
            ...base,
            title: `${activity.poNumber} Meeting confirmed`,
            body: `${activity.poNumber}: Meeting confirmed. Step 9 variation is ready.`,
          }];
        }
        if (event.action !== 'send-variation') return [];
        return input.persona === 'customer'
          ? [{
              ...base,
              title: `${activity.poNumber} Variation approval required`,
              body: `${activity.poNumber}: Partner submitted a variation. Review and approve it in Requests.`,
            }]
          : [{
              ...base,
              title: `${activity.poNumber} Variation submitted`,
              body: `${activity.poNumber}: Variation submitted. Waiting for customer approval.`,
            }];
      }),
    );

    return {
      sourceVersion: 'cblue-fixer-workflow-activities-v1' as const,
      requests: activities.filter(
        (activity) => activity.activityBucket === 'request',
      ),
      activeJobs: activities.filter(
        (activity) => activity.activityBucket === 'active',
      ),
      history: activities.filter(
        (activity) => activity.activityBucket === 'history',
      ),
      chatRooms: activities
        .filter(
          (activity) =>
            activity.activityBucket !== 'history' && activity.chat.enabled,
        )
        .map((activity) => ({
          poNumber: activity.poNumber,
          title: activity.title,
          customer: activity.customer,
          partner: activity.partner,
          messageItems: activity.messageItems,
        })),
      alerts: [
        ...eventAlerts,
        ...notifications.map((notification) => ({
          id: notification.id,
          type: notification.type,
          status: notification.status,
          title: notification.title,
          body: notification.body,
          createdAt: toIsoTimestamp(notification.createdAt),
          readAt: toIsoTimestamp(notification.readAt),
        })),
      ].sort(
        (left, right) =>
          Date.parse(right.createdAt || '') - Date.parse(left.createdAt || ''),
      ),
      upcomingMeetings: confirmedUpcomingMeetings(activities),
    };
  }

  async workflowChat(input: WorkflowChatInput) {
    const context = await this.visibleWorkflowChat(input);
    return this.workflowChatSnapshot(context.order, context.poNumber);
  }

  async postWorkflowChat(input: WorkflowChatInput & { text: string }) {
    const text = String(input.text || '').trim();
    if (!text || text.length > 4000) {
      throw new BadRequestException(
        'Chat text must be between 1 and 4000 characters',
      );
    }

    const context = await this.visibleWorkflowChat(input);
    const snapshot = resolvePersistedFixerWorkflowSnapshot({
      poNumber: context.poNumber,
      ratedAt: fullyRatedAt(context.order),
      status: context.order.status,
      workflowPhase: context.order.workflowPhase,
      workflowVersion: context.order.workflowRevision,
      chatEnabled: context.order.chatEnabled,
      completedActionKeys: (context.order.workflowActions || []).map(
        (event: any) => event.action,
      ),
      customerUserId: context.order.userId,
      fixerUserId: context.order.fixer?.userId,
      viewerUserIds: context.viewerUserIds,
      processingFee: this.processingFee(),
    });
    if (!snapshot.chat.enabled || snapshot.activityBucket === 'history') {
      throw new BadRequestException('Chat is not available for this workflow');
    }

    const senderRole =
      context.order.userId === context.actorUserId ? 'USER' : 'FIXER';
    const created = await this.prisma.orderChatMessage.create({
      data: {
        orderId: context.order.id,
        senderUserId: context.actorUserId,
        senderRole,
        text,
      },
    });
    const result = this.workflowChatSnapshot(context.order, context.poNumber);
    return {
      ...result,
      chat: {
        ...result.chat,
        messageItems: [
          ...result.chat.messageItems,
          messageItem({
            ...created,
            senderUser:
              context.order.userId === context.actorUserId
                ? context.order.user
                : context.order.fixer?.user,
          }),
        ],
      },
    };
  }

  private async visibleWorkflowChat(input: WorkflowChatInput) {
    this.assertBridgeKey(input.bridgeKey);
    const poNumber = String(input.poNumber || '').trim();
    const legacySubjectId = String(input.legacySubjectId || '').trim();
    if (!poNumber || !legacySubjectId) {
      throw new NotFoundException('Workflow chat not found');
    }
    const viewerUserIds = await this.resolveLinkedUserIds(legacySubjectId);
    if (viewerUserIds.length === 0) {
      throw new NotFoundException('Workflow chat not found');
    }
    const order = await this.prisma.order.findFirst({
      where: {
        description: { contains: poNumber, mode: 'insensitive' },
        OR: [
          { userId: { in: viewerUserIds } },
          { fixer: { userId: { in: viewerUserIds } } },
        ],
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        fixer: {
          select: {
            userId: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
        review: { select: { createdAt: true } },
        workflowActions: {
          select: {
            action: true,
            actorUserId: true,
            payload: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        chatMessages: {
          include: { senderUser: { select: { name: true, email: true } } },
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
    });
    if (!order) {
      throw new NotFoundException('Workflow chat not found');
    }
    const actorUserId = viewerUserIds.find(
      (id) => id === order.userId || id === order.fixer?.userId,
    );
    if (!actorUserId) {
      throw new NotFoundException('Workflow chat not found');
    }
    return { order: order as any, poNumber, viewerUserIds, actorUserId };
  }

  private workflowChatSnapshot(order: any, poNumber: string) {
    const lifecycle = resolveOrderLifecycle({
      status: order.status,
      statusHistory: order.statusHistory || [],
      workflowPhase: order.workflowPhase,
      archivedAt: order.archivedAt,
      ratedAt: fullyRatedAt(order),
      completedActionKeys: (order.workflowActions || []).map(
        (event: any) => event.action,
      ),
    });
    const workflow = resolvePersistedFixerWorkflowSnapshot({
      poNumber,
      ratedAt: fullyRatedAt(order),
      status: order.status,
      workflowPhase: order.workflowPhase,
      archivedAt: order.archivedAt,
      workflowVersion: order.workflowRevision,
      chatEnabled: order.chatEnabled,
      completedActionKeys: (order.workflowActions || []).map(
        (event: any) => event.action,
      ),
      customerUserId: order.userId,
      fixerUserId: order.fixer?.userId,
      viewerUserIds: [],
      processingFee: this.processingFee(),
    });
    return {
      ...lifecycle,
      ...workflow,
      meeting: projectPersistedFixerMeeting(order),
      chat: {
        enabled: workflow.chat.enabled,
        messageItems: (order.chatMessages || []).map(messageItem),
      },
    };
  }

  private workflowActivity(order: any, viewerUserIds: string[]) {
    const poNumber = persistedWorkflowReference(order.description);
    if (!poNumber) return null;
    const lifecycle = resolveOrderLifecycle({
      status: order.status,
      statusHistory: order.statusHistory || [],
      workflowPhase: order.workflowPhase,
      archivedAt: order.archivedAt,
      ratedAt: fullyRatedAt(order),
      completedActionKeys: (order.workflowActions || []).map(
        (event: any) => event.action,
      ),
    });
    const workflow = resolvePersistedFixerWorkflowSnapshot({
      poNumber,
      ratedAt: fullyRatedAt(order),
      status: order.status,
      workflowPhase: order.workflowPhase,
      archivedAt: order.archivedAt,
      workflowVersion: order.workflowRevision,
      chatEnabled: order.chatEnabled,
      completedActionKeys: (order.workflowActions || []).map(
        (event: any) => event.action,
      ),
      customerUserId: order.userId,
      fixerUserId: order.fixer?.userId,
      viewerUserIds,
      processingFee: this.processingFee(),
    });
    return {
      poNumber,
      currentStep: workflow.currentStep,
      totalSteps: workflow.totalSteps,
      workflowVersion: workflow.workflowVersion,
      workflowPhase: order.workflowPhase,
      workflowEvents: persistedFixerWorkflowEvents(order),
      status: workflow.status,
      lifecycleStatus: lifecycle.lifecycleStatus,
      activityBucket: workflow.activityBucket,
      archivedAt: lifecycle.archivedAt,
      cancelledAt: lifecycle.cancelledAt,
      declinedAt: lifecycle.declinedAt,
      ratedAt: lifecycle.ratedAt,
      title: order.serviceCategory,
      serviceCategory: order.serviceCategory,
      createdAt: toIsoTimestamp(order.createdAt),
      updatedAt: toIsoTimestamp(order.updatedAt),
      location: order.address ? formatLocation(order.address) : '',
      customer: identity(order.user),
      partner: identity(order.fixer?.user),
      actions: workflow.actions,
      availableActions: workflow.availableActions,
      actionNeeded: workflow.actionNeeded,
      actionOwner: workflow.actionOwner,
      nextActionKey: workflow.nextActionKey,
      nextActionLabel: workflow.nextActionLabel,
      nextActionOwner: workflow.nextActionOwner,
      nextActionStep: workflow.nextActionStep,
      processingFee: workflow.processingFee,
      chat: workflow.chat,
      meeting: projectPersistedFixerMeeting(order),
      siteSubdistrict: persistedSubdistrict(order.address),
      variation: projectPersistedFixerVariation(order),
      messageItems: (order.chatMessages || []).map(messageItem),
    };
  }

  private processingFee(): ProcessingFee {
    const configured = Number(this.config.get<number>('processingFee.amount'));
    const amount =
      Number.isFinite(configured) && configured >= 0 ? configured : 100;
    const currency =
      String(this.config.get<string>('processingFee.currency') || 'THB')
        .trim()
        .toUpperCase() || 'THB';
    const symbol = currency === 'THB' ? '฿' : `${currency} `;
    return {
      amount,
      currency,
      displayLabel: `${symbol}${amount.toLocaleString('en-US')}`,
    };
  }

  private assertBridgeKey(providedKey?: string): void {
    const expectedKey = String(
      this.config.get<string>('blueBridge.apiKey') || '',
    ).trim();
    if (!expectedKey || String(providedKey || '').trim() !== expectedKey) {
      throw new UnauthorizedException('Invalid BLUE bridge key');
    }
  }

  private async resolveLinkedUserIds(
    legacySubjectId: string,
  ): Promise<string[]> {
    const subscriber = await this.prisma.subscriber.findFirst({
      where: {
        OR: [
          { id: legacySubjectId },
          { email: { equals: legacySubjectId, mode: 'insensitive' } },
        ],
      },
      select: { id: true, email: true },
    });

    const email = String(subscriber?.email || legacySubjectId).trim();
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { id: legacySubjectId },
          { subscriberId: legacySubjectId },
          ...(subscriber?.id ? [{ subscriberId: subscriber.id }] : []),
          ...(email.includes('@')
            ? [{ email: { equals: email, mode: 'insensitive' as const } }]
            : []),
        ],
      },
      select: { id: true },
    });
    return Array.from(new Set(users.map((user) => user.id)));
  }
}

function persistedWorkflowReference(description: unknown): string | null {
  const match = /^\s*(PO-\d{4}-\d+)\s*(?:\||$)/i.exec(
    String(description || ''),
  );
  return match ? match[1].toUpperCase() : null;
}

function normalizedMeetingDate(value: unknown): string {
  const date = stringValue(value);
  const iso = /^(\d{4}-\d{2}-\d{2})(?:T|\s|$)/.exec(date);
  if (iso) return iso[1];
  return /^\d{2}\/\d{2}\/\d{4}$/.test(date) ? date : '';
}

function normalizedMeetingTime(value: unknown): string {
  const time = stringValue(value);
  const match = /^(\d{1,2}:\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/.exec(time);
  return match ? match[1] : '';
}

export function projectPersistedFixerMeeting(order: {
  meetingVenue?: unknown;
  meetingDate?: unknown;
  meetingTime?: unknown;
  meetingNote?: unknown;
  workflowActions?: Array<{
    action?: string;
    payload?: unknown;
    createdAt?: unknown;
  }>;
}): {
  venue: string;
  date: string;
  time: string;
  note: string;
  scheduledAt?: string | null;
  confirmedAt?: string | null;
} | null {
  const venue = stringValue(order.meetingVenue);
  const date = normalizedMeetingDate(order.meetingDate);
  const time = normalizedMeetingTime(order.meetingTime);
  const confirmedAt = [...(order.workflowActions || [])]
    .reverse()
    .find((event) => event.action === 'confirm-meeting')?.createdAt;
  const confirmedAtIso =
    confirmedAt instanceof Date || typeof confirmedAt === 'string'
      ? toIsoTimestamp(confirmedAt) || null
      : null;
  const hasPersistedSnapshot = [
    order.meetingVenue,
    order.meetingDate,
    order.meetingTime,
    order.meetingNote,
  ].some((value) => value !== null && value !== undefined);
  if (hasPersistedSnapshot) {
    const scheduledTimestamp = persistedMeetingTimestamp(date, time);
    return {
      venue,
      date,
      time,
      note: stringValue(order.meetingNote),
      ...(confirmedAtIso
        ? {
            scheduledAt: scheduledTimestamp ? new Date(scheduledTimestamp).toISOString() : null,
            confirmedAt: confirmedAtIso,
          }
        : {}),
    };
  }

  const action = [...(order.workflowActions || [])]
    .reverse()
    .find((event) => event.action === 'send-meeting-invitation');
  if (!action || !isRecord(action.payload)) return null;
  const legacyVenue = stringValue(action.payload.meetingVenue);
  const legacyDate = normalizedMeetingDate(action.payload.meetingDate);
  const legacyTime = normalizedMeetingTime(action.payload.meetingTime);
  const scheduledTimestamp = persistedMeetingTimestamp(
    legacyDate,
    legacyTime,
  );
  return legacyVenue && legacyDate && legacyTime
    ? {
        venue: legacyVenue,
        date: legacyDate,
        time: legacyTime,
        note: stringValue(action.payload.meetingNote),
        ...(confirmedAtIso
          ? {
              scheduledAt: scheduledTimestamp ? new Date(scheduledTimestamp).toISOString() : null,
              confirmedAt: confirmedAtIso,
            }
          : {}),
      }
    : null;
}

function persistedSubdistrict(
  address: { subdistrict?: unknown } | null | undefined,
): string {
  return stringValue(address?.subdistrict);
}

interface PersistedVariationItem {
  service: string;
  quantity: number;
  unit: string;
  unitRate: number;
  total: number;
}

function persistedVariationItems(payload: unknown): PersistedVariationItem[] {
  if (!isRecord(payload) || !Array.isArray(payload.variationItems)) return [];
  return payload.variationItems.flatMap((item) => {
    if (!isRecord(item)) return [];
    const service = stringValue(item.service);
    const unit = stringValue(item.unit);
    const quantity = numberValue(item.quantity);
    const unitRate = numberValue(item.unitRate);
    const total = numberValue(item.total);
    if (!service || !unit || quantity < 0 || unitRate < 0 || total < 0) return [];
    return [{ service, quantity, unit, unitRate, total }];
  });
}

export function projectPersistedFixerVariation(order: any): {
  note: string;
  items: PersistedVariationItem[];
  total: number;
  createdAt: string;
  actorRole: 'partner';
} | null {
  const event = [...(order.workflowActions || [])]
    .reverse()
    .find((candidate: any) => candidate?.action === 'send-variation');
  if (
    !event ||
    String(event.actorUserId || '') !== String(order.fixer?.userId || '')
  ) {
    return null;
  }
  const createdAt = toIsoTimestamp(event.createdAt);
  if (!createdAt) return null;
  const payload = isRecord(event.payload) ? event.payload : {};
  const items = persistedVariationItems(payload);
  return {
    note: stringValue(payload.note),
    items,
    total: items.reduce((sum, item) => sum + item.total, 0),
    createdAt,
    actorRole: 'partner',
  };
}

function persistedFixerWorkflowEvents(order: any): Array<{
  action: string;
  createdAt: string;
  actorRole: 'customer' | 'partner';
  note?: string;
  rating?: number;
  variationItems?: PersistedVariationItem[];
}> {
  return (order.workflowActions || []).flatMap((event: any) => {
    const actorUserId = String(event?.actorUserId || '');
    const actorRole =
      actorUserId && actorUserId === String(order.userId || '')
        ? ('customer' as const)
        : actorUserId && actorUserId === String(order.fixer?.userId || '')
          ? ('partner' as const)
          : null;
    const action = String(event?.action || '').trim();
    const createdAt = toIsoTimestamp(event?.createdAt);
    if (!actorRole || !action || !createdAt) return [];
    const payload = isRecord(event?.payload) ? event.payload : {};
    const note = stringValue(payload.note);
    const rating =
      Number.isInteger(payload.rating) &&
      Number(payload.rating) >= 1 &&
      Number(payload.rating) <= 5
        ? Number(payload.rating)
        : null;
    return [
      {
        action,
        createdAt,
        actorRole,
        ...(note ? { note } : {}),
        ...(rating ? { rating } : {}),
        ...(persistedVariationItems(payload).length
          ? { variationItems: persistedVariationItems(payload) } : {}),
      },
    ];
  });
}

function identity(
  user:
    | { id?: string; name?: string | null; email?: string | null }
    | null
    | undefined,
) {
  if (!user) return null;
  return {
    id: String(user.id || ''),
    displayName: String(user.name || user.email || '').trim(),
  };
}

function messageItem(message: {
  id?: string;
  senderUserId?: string;
  senderRole?: string | null;
  text?: string;
  createdAt?: Date | string | null;
  senderUser?: { name?: string | null; email?: string | null } | null;
}) {
  return {
    id: String(message.id || ''),
    senderUserId: String(message.senderUserId || ''),
    senderRole: message.senderRole || null,
    senderName: String(
      message.senderUser?.name || message.senderUser?.email || 'User',
    ).trim(),
    text: String(message.text || ''),
    createdAt: toIsoTimestamp(message.createdAt),
  };
}

function resolveOrderLifecycle({
  status,
  statusHistory,
  workflowPhase,
  archivedAt,
  ratedAt,
  completedActionKeys = [],
}: {
  status?: string | null;
  statusHistory?: PersistedStatusEvent[];
  workflowPhase?: string | null;
  archivedAt?: Date | string | null;
  ratedAt?: Date | string | null;
  completedActionKeys?: string[];
}): WorkflowLifecycle {
  return resolveLifecycle({
    status,
    statusHistory,
    workflowPhase,
    archivedAt,
    ratedAt,
    completedActionKeys,
  });
}

function resolveOrderWorkflowSnapshot({
  poNumber,
  status,
  statusHistory = [],
  customerUserId,
  fixerUserId,
  viewerUserIds,
  processingFee = { amount: 100, currency: 'THB', displayLabel: '฿100' },
}: {
  poNumber: string;
  status?: string | null;
  statusHistory?: PersistedStatusEvent[];
  customerUserId?: string | null;
  fixerUserId?: string | null;
  viewerUserIds: string[];
  processingFee?: ProcessingFee;
}): OrderWorkflowSnapshot {
  const normalizedStatus =
    String(status || '')
      .trim()
      .toUpperCase() || 'UNKNOWN';
  const viewerIsCustomer = viewerUserIds.includes(String(customerUserId || ''));
  const viewerIsPartner = viewerUserIds.includes(String(fixerUserId || ''));
  const meetingWasConfirmed =
    normalizedStatus === 'IN_PROGRESS' &&
    statusHistory.some(
      (event) =>
        String(event?.status || '')
          .trim()
          .toUpperCase() === 'MEETING_REQUESTED',
    );
  let currentStep = 3;
  let actions: WorkflowAction[] = [];
  switch (normalizedStatus) {
    case 'MATCHING':
      currentStep = 5;
      actions = [
        {
          key: 'partner-accept',
          owner: 'partner',
          label: 'Accept PO',
          actionStep: 5,
        },
        {
          key: 'partner-decline',
          owner: 'partner',
          label: 'Decline PO',
          actionStep: 5,
        },
      ];
      break;
    case 'ASSIGNED':
    case 'DEPOSIT_PENDING':
    case 'CONFIRMED':
      currentStep = 6;
      actions = [
        {
          key: 'fee-proceed',
          owner: 'customer',
          label: 'Fee & Proceed',
          actionStep: 6,
          feeMode: 'payment',
        },
        {
          key: 'free-pass',
          owner: 'customer',
          label: 'Testing Period / Free Pass',
          actionStep: 6,
          feeMode: 'free-pass',
        },
      ];
      break;
    case 'IN_PROGRESS':
      currentStep = meetingWasConfirmed ? 9 : 7;
      if (!meetingWasConfirmed)
        actions = [
          {
            key: 'send-meeting-invitation',
            owner: 'customer',
            label: 'Send Meeting Invitation',
            actionStep: 8,
          },
        ];
      break;
    case 'MEETING_REQUESTED':
      currentStep = 8;
      actions = [
        {
          key: 'confirm-meeting',
          owner: 'partner',
          label: 'Confirm Meeting',
          actionStep: 8,
        },
      ];
      break;
    case 'COMPLETED':
    case 'CANCELLED':
      currentStep = 11;
      break;
  }
  const actorActions = actions.filter(
    (action) =>
      (action.owner === 'customer' && viewerIsCustomer) ||
      (action.owner === 'partner' && viewerIsPartner),
  );
  const nextAction = actorActions[0] || null;
  return {
    sourceVersion: 'cblue-fixer-workflow-v1',
    activityBucket: currentStep === 11 ? 'history' : 'active',
    poNumber,
    workflowVersion: 0,
    chat: { enabled: false },
    processingFee: currentStep === 6 ? processingFee : null,
    currentStep,
    totalSteps: 11,
    status: normalizedStatus,
    actions: actorActions,
    availableActions: actorActions.map((action) => action.key),
    actionNeeded: nextAction !== null,
    actionOwner: nextAction?.owner || null,
    nextActionKey: nextAction?.key || null,
    nextActionLabel: nextAction?.label || null,
    nextActionOwner: nextAction?.owner || null,
    nextActionStep: nextAction?.actionStep || null,
  };
}
export function resolvePersistedFixerWorkflowSnapshot({
  poNumber,
  status,
  workflowPhase,
  archivedAt,
  workflowVersion,
  chatEnabled,
  completedActionKeys = [],
  customerUserId,
  ratedAt,
  fixerUserId,
  viewerUserIds,
  processingFee = { amount: 100, currency: 'THB', displayLabel: '฿100' },
}: {
  poNumber: string;
  status?: string | null;
  workflowPhase?: string | null;
  archivedAt?: Date | string | null;
  workflowVersion?: number | null;
  chatEnabled?: boolean | null;
  completedActionKeys?: string[];
  customerUserId?: string | null;
  ratedAt?: Date | string | null;
  fixerUserId?: string | null;
  viewerUserIds: string[];
  processingFee?: ProcessingFee;
}): OrderWorkflowSnapshot {
  const normalizedStatus =
    String(status || '')
      .trim()
      .toUpperCase() || 'UNKNOWN';
  const lifecycle = resolveLifecycle({
    status,
    workflowPhase,
    archivedAt,
    ratedAt,
    completedActionKeys,
  });
  const phase =
    lifecycle.activityBucket === 'history'
      ? 'TERMINAL'
      : String(workflowPhase || '')
          .trim()
          .toUpperCase() ||
        (normalizedStatus === 'IN_PROGRESS'
          ? 'UNKNOWN_ACTIVE'
          : normalizedStatus === 'MEETING_REQUESTED'
            ? 'MEETING_CONFIRM'
            : ['ASSIGNED', 'DEPOSIT_PENDING', 'CONFIRMED'].includes(
                  normalizedStatus,
                )
              ? 'FEE'
              : normalizedStatus === 'MATCHING'
                ? 'PARTNER_DECISION'
                : normalizedStatus === 'COMPLETED'
                  ? ratedAt
                    ? 'TERMINAL'
                    : 'RATING'
                  : normalizedStatus === 'CANCELLED'
                    ? 'TERMINAL'
                    : 'DRAFT');
  const viewerIsCustomer = viewerUserIds.includes(String(customerUserId || ''));
  const viewerIsPartner = viewerUserIds.includes(String(fixerUserId || ''));
  const definition: Record<
    string,
    {
      step: number;
      bucket: 'request' | 'active' | 'history';
      actions: WorkflowAction[];
    }
  > = {
    PARTNER_DECISION: {
      step: 5,
      bucket: 'request',
      actions: [
        {
          key: 'partner-accept',
          owner: 'partner',
          label: 'Accept PO',
          actionStep: 5,
        },
        {
          key: 'partner-decline',
          owner: 'partner',
          label: 'Decline PO',
          actionStep: 5,
        },
      ],
    },
    FEE: {
      step: 6,
      bucket: 'active',
      actions: [
        {
          key: 'fee-proceed',
          owner: 'customer',
          label: 'Fee & Proceed',
          actionStep: 6,
          feeMode: 'payment',
        },
        {
          key: 'free-pass',
          owner: 'customer',
          label: 'Testing Period / Free Pass',
          actionStep: 6,
          feeMode: 'free-pass',
        },
      ],
    },
    CHAT: {
      step: 7,
      bucket: 'active',
      actions: [
        {
          key: 'send-meeting-invitation',
          owner: 'customer',
          label: 'Send Meeting Invitation',
          actionStep: 8,
        },
      ],
    },
    MEETING_CONFIRM: {
      step: 8,
      bucket: 'request',
      actions: [
        {
          key: 'confirm-meeting',
          owner: 'partner',
          label: 'Confirm Meeting',
          actionStep: 8,
        },
      ],
    },
    VARIATION: {
      step: 9,
      bucket: 'active',
      actions: [
        {
          key: 'send-variation',
          owner: 'partner',
          label: 'Send Variation',
          actionStep: 9,
          form: {
            kind: 'price-list',
            maxItems: 30,
            fields: [
              { key: 'service', label: 'Item', type: 'text', required: true },
              {
                key: 'quantity',
                label: 'Qty',
                type: 'number',
                required: true,
                min: 0.000001,
              },
              { key: 'unit', label: 'Unit', type: 'text', required: true },
              {
                key: 'unitRate',
                label: 'Rate (THB)',
                type: 'number',
                required: true,
                min: 0,
              },
              {
                key: 'total',
                label: 'Amount (THB)',
                type: 'number',
                readOnly: true,
                min: 0,
              },
            ],
          },
        },
        {
          key: 'skip-variation',
          owner: 'partner',
          label: 'Skip Variation',
          actionStep: 9,
        },
      ],
    },
    VARIATION_CONFIRM: {
      step: 9,
      bucket: 'active',
      actions: [
        {
          key: 'confirm-variation',
          owner: 'customer',
          label: 'Confirm Variation',
          actionStep: 9,
        },
      ],
    },
    COMPLETION: {
      step: 10,
      bucket: 'active',
      actions: [
        {
          key: 'send-completion',
          owner: 'partner',
          label: 'Send Completion',
          actionStep: 10,
        },
      ],
    },
    COMPLETION_CONFIRM: {
      step: 10,
      bucket: 'active',
      actions: [
        {
          key: 'confirm-completion',
          owner: 'customer',
          label: 'Confirm Completion',
          actionStep: 10,
        },
      ],
    },
    RATING: {
      step: 11,
      bucket: 'active',
      actions: [
        {
          key: 'rate-partner',
          owner: 'customer',
          label: 'Rate Partner',
          actionStep: 11,
        },
        {
          key: 'rate-customer',
          owner: 'partner',
          label: 'Rate Customer',
          actionStep: 11,
        },
      ],
    },
    TERMINAL: { step: 11, bucket: 'history', actions: [] },
    UNKNOWN_ACTIVE: { step: 7, bucket: 'active', actions: [] },
    DRAFT: { step: 3, bucket: 'request', actions: [] },
  };
  const state = definition[phase] || definition.UNKNOWN_ACTIVE;
  const completed = new Set(completedActionKeys);
  const actionsForPhase =
    phase === 'TERMINAL'
      ? state.actions
      : [
          ...state.actions,
          {
            key: 'customer-cancel',
            owner: 'customer' as const,
            label: 'Cancel Job',
            actionStep: state.step,
          },
        ];
  const actions = actionsForPhase.filter(
    (action) =>
      !completed.has(action.key) &&
      ((action.owner === 'customer' && viewerIsCustomer) ||
        (action.owner === 'partner' && viewerIsPartner)),
  );
  const invitedCustomer = phase === 'MEETING_CONFIRM' && viewerIsCustomer;
  const activityBucket = invitedCustomer ? 'active' : state.bucket;
  const nextAction = invitedCustomer
    ? null
    : actions.find((action) => action.key !== 'customer-cancel') || null;
  return {
    sourceVersion: 'cblue-fixer-workflow-v1',
    poNumber,
    currentStep: state.step,
    totalSteps: 11,
    status: normalizedStatus,
    activityBucket,
    workflowVersion: Number(workflowVersion || 0),
    chat: {
      enabled: activityBucket !== 'history' && chatEnabled === true,
    },
    processingFee: state.step === 6 ? processingFee : null,
    actions,
    availableActions: actions.map((action) => action.key),
    actionNeeded: nextAction !== null,
    actionOwner: nextAction?.owner || null,
    nextActionKey: nextAction?.key || null,
    nextActionLabel: nextAction?.label || null,
    nextActionOwner: nextAction?.owner || null,
    nextActionStep: nextAction?.actionStep || null,
  };
}
function fullyRatedAt(order: any): Date | string | null {
  const ratingActions = (order.workflowActions || []).filter((event: any) =>
    ['rate-partner', 'rate-customer'].includes(String(event?.action || '')),
  );
  const completedRatings = new Set(
    ratingActions.map((event: any) => String(event.action)),
  );
  if (
    completedRatings.has('rate-partner') &&
    completedRatings.has('rate-customer')
  ) {
    return (
      [...ratingActions].reverse().find((event: any) => event?.createdAt)
        ?.createdAt ||
      order.review?.createdAt ||
      null
    );
  }

  const workflowPhase = String(order.workflowPhase || '')
    .trim()
    .toUpperCase();
  if (!workflowPhase || workflowPhase === 'TERMINAL') {
    return order.review?.createdAt || null;
  }
  return null;
}

function deduplicateWorkflowActivities(
  activities: Array<Record<string, any>>,
): Array<Record<string, any>> {
  const newestFirst = [...activities].sort((left, right) => {
    const leftCreatedAt = Date.parse(String(left.createdAt || ''));
    const rightCreatedAt = Date.parse(String(right.createdAt || ''));
    return (
      (Number.isFinite(rightCreatedAt) ? rightCreatedAt : 0) -
      (Number.isFinite(leftCreatedAt) ? leftCreatedAt : 0)
    );
  });
  const byPo = new Map<string, Record<string, any>>();
  for (const activity of newestFirst) {
    const poNumber = String(activity.poNumber || '')
      .trim()
      .toUpperCase();
    if (poNumber && !byPo.has(poNumber)) {
      byPo.set(poNumber, activity);
    }
  }
  return [...byPo.values()];
}

function resolvePropertyLifecycle(inquiry: {
  status?: string | null;
  customerRating?: number | null;
  listerRating?: number | null;
  updatedAt?: Date | string | null;
}): WorkflowLifecycle {
  const hasPersistedRating =
    Number(inquiry.customerRating || 0) > 0 ||
    Number(inquiry.listerRating || 0) > 0;
  return resolveLifecycle({
    status: inquiry.status,
    ratedAt: hasPersistedRating ? inquiry.updatedAt : null,
  });
}

function resolveLifecycle({
  status,
  statusHistory = [],
  workflowPhase,
  archivedAt,
  ratedAt,
  completedActionKeys = [],
}: {
  status?: string | null;
  statusHistory?: PersistedStatusEvent[];
  workflowPhase?: string | null;
  archivedAt?: Date | string | null;
  ratedAt?: Date | string | null;
  completedActionKeys?: string[];
}): WorkflowLifecycle {
  const normalizedStatus =
    String(status || '')
      .trim()
      .toUpperCase() || 'UNKNOWN';
  const latestEventForStatus = (targetStatus: string) =>
    statusHistory.find(
      (event) =>
        String(event?.status || '')
          .trim()
          .toUpperCase() === targetStatus,
    );
  const cancelledEvent = latestEventForStatus('CANCELLED');
  const completedEvent = latestEventForStatus('COMPLETED');
  const persistedRatedAt = toIsoTimestamp(ratedAt);
  const persistedArchivedAt = toIsoTimestamp(archivedAt);
  const terminalPhase =
    String(workflowPhase || '')
      .trim()
      .toUpperCase() === 'TERMINAL';
  const isDeclined =
    normalizedStatus === 'DECLINED' ||
    (normalizedStatus === 'CANCELLED' &&
      isPersistedPartnerDecline(cancelledEvent?.note));
  const cancelledAt =
    normalizedStatus === 'CANCELLED' && !isDeclined
      ? toIsoTimestamp(cancelledEvent?.createdAt)
      : null;
  const declinedAt = isDeclined
    ? toIsoTimestamp(cancelledEvent?.createdAt)
    : null;
  const completedAt =
    normalizedStatus === 'COMPLETED'
      ? toIsoTimestamp(completedEvent?.createdAt)
      : null;
  const isTerminalStatus = [
    'CANCELLED',
    'CANCELED',
    'DECLINED',
    'FINISHED',
    'DONE',
    'RATED',
    'ARCHIVED',
  ].includes(normalizedStatus);
  const isArchived =
    Boolean(persistedArchivedAt) ||
    terminalPhase ||
    normalizedStatus === 'ARCHIVED';
  const isPersistedRatingPhase =
    String(workflowPhase || '')
      .trim()
      .toUpperCase() === 'RATING' &&
    completedActionKeys.some((action) =>
      ['confirm-completion', 'rate-partner', 'rate-customer'].includes(action),
    );
  const isLegacyCompleted =
    normalizedStatus === 'COMPLETED' && !isPersistedRatingPhase;
  const isHistory =
    isArchived ||
    isTerminalStatus ||
    isLegacyCompleted ||
    Boolean(persistedRatedAt);
  const activityBucket: WorkflowLifecycle['activityBucket'] = isHistory
    ? 'history'
    : ['CREATED', 'MATCHING', 'MEETING_REQUESTED', 'NOTIFY_SENT'].includes(
          normalizedStatus,
        )
      ? 'request'
      : 'active';

  return {
    activityBucket,
    lifecycleStatus: persistedRatedAt
      ? 'RATED'
      : isDeclined
        ? 'DECLINED'
        : isArchived && !isTerminalStatus
          ? 'ARCHIVED'
          : normalizedStatus,
    archivedAt:
      activityBucket === 'history'
        ? persistedArchivedAt ||
          persistedRatedAt ||
          declinedAt ||
          cancelledAt ||
          completedAt
        : null,
    cancelledAt,
    declinedAt,
    ratedAt: persistedRatedAt,
  };
}

function isPersistedPartnerDecline(note?: string | null): boolean {
  const text = String(note || '').trim();
  return /\b(?:partner|service provider|fixer|professional|project team)\b[\s\S]{0,160}\b(?:declin(?:e|ed)|unavailable|cannot proceed|busy)\b/i.test(
    text,
  );
}

function toIsoTimestamp(value?: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function parseBudgetItems(value: Prisma.JsonValue | null): BudgetItem[] {
  return budgetItemRows(value).flatMap((item) => {
    if (!isRecord(item)) return [];
    const service = firstStringValue(item, [
      'service',
      'item',
      'name',
      'label',
    ]);
    const unit = firstStringValue(item, ['unit', 'unitLabel', 'uom']);
    const qty = firstNumberValue(item, ['qty', 'quantity', 'count']);
    const storedUnitRate = firstNumberValue(item, [
      'unitRate',
      'unitPrice',
      'rate',
      'pricePerUnit',
    ]);
    const storedTotal = firstNumberValue(item, [
      'total',
      'amount',
      'lineTotal',
      'estimatedTotal',
    ]);
    const unitRate =
      storedUnitRate >= 0
        ? storedUnitRate
        : qty > 0 && storedTotal >= 0
          ? Math.round(storedTotal / qty)
          : -1;
    const total =
      storedTotal >= 0
        ? storedTotal
        : qty >= 0 && unitRate >= 0
          ? Math.round(qty * unitRate)
          : -1;
    if (!service || !unit || qty < 0 || unitRate < 0 || total < 0) return [];
    return [{ service, qty, unit, unitRate, total }];
  });
}

function budgetItemRows(value: Prisma.JsonValue | null): Prisma.JsonValue[] {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return [];

  for (const key of [
    'items',
    'budgetBreakdown',
    'breakdown',
    'lineItems',
    'estimatedBreakdown',
  ]) {
    const candidate = value[key];
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function formatBudgetLines(items: BudgetItem[]): string[] {
  if (items.length === 0) return [];
  const lines = items.flatMap((item, index) => [
    `${index + 1}) ${item.service} ${formatNumber(item.qty)} ${item.unit} × ฿${formatNumber(item.unitRate)}`,
    `= ฿${formatNumber(item.total)}`,
  ]);
  const total = items.reduce((sum, item) => sum + item.total, 0);
  return [...lines, 'Budget', `= ฿${formatNumber(total)}`];
}

function formatLocation(address: {
  street: string | null;
  building: string | null;
  unit: string | null;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  latitude?: number | null;
  longitude?: number | null;
}): string {
  if (
    typeof address.latitude === 'number' &&
    typeof address.longitude === 'number'
  ) {
    return `${address.latitude}, ${address.longitude}`;
  }

  return [
    address.unit,
    address.building,
    address.street,
    address.subdistrict,
    address.district,
    address.province,
    address.postalCode,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(', ');
}

function stripWorkflowPrefix(description: string): string {
  return description
    .replace(/^PO-\d{4}-\d+\s*\|\s*/i, '')
    .replace(/^TIER:[^|]+\|\s*/i, '')
    .replace(/^LOC:[^|]+\|\s*/i, '')
    .trim();
}

function cleanProjectDetails(description: string): string {
  const cookedBudgetPattern = new RegExp(
    String.raw`\b\d+\)\s*[^=]*?\b(?:pages?|page|sq\.?m\.?|Baht|FAQ)\b[^=]*?=\s*[\d,]+\s*Baht`,
    'gi',
  );
  return stripWorkflowPrefix(description)
    .replace(cookedBudgetPattern, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstStringValue(
  record: Record<string, unknown>,
  keys: string[],
): string {
  for (const key of keys) {
    const value = stringValue(record[key]);
    if (value) return value;
  }
  return '';
}

function firstNumberValue(
  record: Record<string, unknown>,
  keys: string[],
): number {
  for (const key of keys) {
    const value = numberValue(record[key]);
    if (value >= 0) return value;
  }
  return -1;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function numberValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : -1;
  }
  return -1;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(
    value,
  );
}

function confirmedUpcomingMeetings(activities: any[], now = Date.now()) {
  return activities
    .flatMap((activity) => {
      if (activity?.activityBucket === 'history' || !activity?.meeting) return [];
      const confirmed = (Array.isArray(activity.workflowEvents)
        ? activity.workflowEvents
        : []
      ).some(
        (event: any) =>
          String(event?.action || '').trim() === 'confirm-meeting' &&
          String(event?.actorRole || '').trim() === 'partner' &&
          Number.isFinite(Date.parse(String(event?.createdAt || ''))),
      );
      if (!confirmed) return [];
      const meetingAt = persistedMeetingTimestamp(
        activity.meeting.date,
        activity.meeting.time,
      );
      if (!meetingAt || meetingAt <= now) return [];
      return [{
        poNumber: activity.poNumber,
        title: activity.title,
        meeting: activity.meeting,
        customer: activity.customer,
        partner: activity.partner,
        meetingAt,
      }];
    })
    .sort((left, right) => left.meetingAt - right.meetingAt)
    .slice(0, 3)
    .map(({ meetingAt: _meetingAt, ...meeting }) => meeting);
}

function persistedMeetingTimestamp(dateValue: unknown, timeValue: unknown) {
  const date = String(dateValue || '').trim();
  const time = String(timeValue || '').trim() || '00:00';
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const localized = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);
  const timeParts = /^(\d{1,2}):(\d{2})$/.exec(time);
  if ((!iso && !localized) || !timeParts) return 0;
  const [year, month, day] = iso
    ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
    : [Number(localized![3]), Number(localized![2]), Number(localized![1])];
  const timestamp = Date.UTC(
    year,
    month - 1,
    day,
    Number(timeParts[1]) - 7,
    Number(timeParts[2]),
  );
  return Number.isFinite(timestamp) ? timestamp : 0;
}
