import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { BlueBridgeService } from './blue-bridge.service';

const meeting = {
  meetingVenue: '13.794095, 100.609583',
  meetingDate: '2026-07-16',
  meetingTime: '14:30',
};

function workflowOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-8879',
    description: 'PO-2607-8879 | persisted workflow reference',
    userId: 'customer-1',
    fixerId: 'fixer-1',
    status: 'MEETING_REQUESTED',
    workflowPhase: 'MEETING_CONFIRM',
    chatEnabled: true,
    workflowRevision: 5,
    budgetBreakdown: [],
    images: [],
    createdAt: new Date('2026-07-10T00:00:00.000Z'),
    updatedAt: new Date('2026-07-16T00:00:00.000Z'),
    user: { id: 'customer-1', name: 'Ghis Cafe', email: 'ghiscafe@gmail.com' },
    fixer: {
      userId: 'partner-1',
      user: {
        id: 'partner-1',
        name: 'Bhavesh Fungprasertsuk',
        email: 'bhaveshfung@gmail.com',
      },
    },
    address: {
      unit: null,
      building: null,
      street: null,
      subdistrict: 'Saphan Song',
      district: 'Wang Thonglang',
      province: 'Bangkok',
      postalCode: '10310',
      latitude: 13.794095,
      longitude: 100.609583,
    },
    review: null,
    statusHistory: [],
    workflowActions: [
      {
        action: 'send-meeting-invitation',
        payload: meeting,
        createdAt: new Date('2026-07-16T00:00:00.000Z'),
      },
    ],
    chatMessages: [
      {
        id: 'message-1',
        senderUserId: 'customer-1',
        senderRole: 'CUSTOMER',
        text: 'Hello from persisted chat',
        createdAt: new Date('2026-07-16T00:01:00.000Z'),
        senderUser: { name: 'Ghis Cafe', email: 'ghiscafe@gmail.com' },
      },
    ],
    ...overrides,
  };
}

function createService(
  userIds: string[],
  orderOrOrders:
    | Record<string, unknown>
    | Record<string, unknown>[] = workflowOrder(),
) {
  const orders = Array.isArray(orderOrOrders) ? orderOrOrders : [orderOrOrders];
  const prisma = {
    subscriber: { findFirst: jest.fn().mockResolvedValue(null) },
    user: {
      findMany: jest.fn().mockResolvedValue(userIds.map((id) => ({ id }))),
    },
    order: {
      findMany: jest.fn().mockResolvedValue(orders),
      findFirst: jest.fn().mockResolvedValue(orders[0] || null),
    },
    notification: { findMany: jest.fn().mockResolvedValue([]) },
    orderChatMessage: {
      create: jest.fn().mockResolvedValue({
        id: 'message-2',
        senderUserId: userIds[0],
        senderRole: 'CUSTOMER',
        text: 'Persist a new chat message',
        createdAt: new Date('2026-07-16T00:02:00.000Z'),
        senderUser: { name: 'Ghis Cafe', email: 'ghiscafe@gmail.com' },
      }),
    },
  } as unknown as PrismaService;

  return {
    prisma,
    service: new BlueBridgeService(
      prisma,
      new ConfigService({ blueBridge: { apiKey: 'bridge-key' } }),
    ),
  };
}

describe('BlueBridgeService workflow activities', () => {
  it('returns PO-2607-8879 as an actor-visible chat-enabled activity with the exact persisted meeting values', async () => {
    const { service } = createService(['customer-1']);

    const result = await (service as any).workflowActivities({
      legacySubjectId: 'ghiscafe@gmail.com',
      persona: 'customer',
      bridgeKey: 'bridge-key',
    });

    expect(result.requests).toEqual([
      expect.objectContaining({
        poNumber: 'PO-2607-8879',
        workflowVersion: 5,
        chat: { enabled: true },
        meeting: {
          venue: meeting.meetingVenue,
          date: meeting.meetingDate,
          time: meeting.meetingTime,
        },
      }),
    ]);
    expect(result.activeJobs).toEqual([]);
    expect(result.chatRooms).toEqual([
      expect.objectContaining({
        poNumber: 'PO-2607-8879',
        messageItems: [
          expect.objectContaining({ text: 'Hello from persisted chat' }),
        ],
      }),
    ]);
  });

  it('returns the same persisted PO for its selected partner', async () => {
    const { service } = createService(['partner-1']);

    const result = await (service as any).workflowActivities({
      legacySubjectId: 'bhaveshfung@gmail.com',
      persona: 'partner',
      bridgeKey: 'bridge-key',
    });

    expect(result.requests).toEqual([
      expect.objectContaining({
        poNumber: 'PO-2607-8879',
        chat: { enabled: true },
      }),
    ]);
    expect(result.activeJobs).toEqual([]);
  });

  it('places terminal persisted workflows in history only', async () => {
    const { service } = createService(
      ['customer-1'],
      workflowOrder({
        status: 'CANCELLED',
        workflowPhase: 'TERMINAL',
        chatEnabled: false,
      }),
    );

    const result = await (service as any).workflowActivities({
      legacySubjectId: 'ghiscafe@gmail.com',
      persona: 'customer',
      bridgeKey: 'bridge-key',
    });

    expect(result.requests).toEqual([]);
    expect(result.activeJobs).toEqual([]);
    expect(result.history).toEqual([
      expect.objectContaining({ poNumber: 'PO-2607-8879' }),
    ]);
  });

  it('keeps Step 11 active for the partner after only the customer rating is persisted', async () => {
    const { service } = createService(
      ['partner-1'],
      workflowOrder({
        status: 'COMPLETED',
        workflowPhase: 'RATING',
        review: { createdAt: new Date('2026-07-15T08:00:00.000Z') },
        workflowActions: [
          {
            action: 'rate-partner',
            payload: { rating: 5 },
            createdAt: new Date('2026-07-15T08:00:00.000Z'),
          },
        ],
      }),
    );

    const result = await (service as any).workflowActivities({
      legacySubjectId: 'partner@example.com',
      persona: 'partner',
      bridgeKey: 'bridge-key',
    });

    expect(result.history).toEqual([]);
    expect(result.activeJobs).toEqual([
      expect.objectContaining({
        poNumber: 'PO-2607-8879',
        currentStep: 11,
        activityBucket: 'active',
        availableActions: ['rate-customer'],
        ratedAt: null,
      }),
    ]);
  });

  it('uses the newest persisted order as the canonical duplicate PO record', async () => {
    const archivedAt = new Date('2026-07-10T08:00:00.000Z');
    const olderArchived = workflowOrder({
      id: 'older-archived',
      status: 'ASSIGNED',
      workflowPhase: 'TERMINAL',
      archivedAt,
      createdAt: new Date('2026-07-10T00:00:00.000Z'),
      updatedAt: archivedAt,
    });
    const newerActive = workflowOrder({
      id: 'newer-active',
      status: 'IN_PROGRESS',
      workflowPhase: 'CHAT',
      archivedAt: null,
      createdAt: new Date('2026-07-16T00:00:00.000Z'),
      updatedAt: new Date('2026-07-16T01:00:00.000Z'),
    });
    const { service } = createService(
      ['partner-1'],
      [olderArchived, newerActive],
    );

    const result = await (service as any).workflowActivities({
      legacySubjectId: 'partner@example.com',
      persona: 'partner',
      bridgeKey: 'bridge-key',
    });

    expect(result.history).toEqual([]);
    expect(result.activeJobs).toEqual([
      expect.objectContaining({
        poNumber: 'PO-2607-8879',
        activityBucket: 'active',
        status: 'IN_PROGRESS',
      }),
    ]);
  });

  it.each([
    { status: 'CANCELLED', workflowPhase: 'TERMINAL', review: null },
    { status: 'DECLINED', workflowPhase: 'TERMINAL', review: null },
    { status: 'FINISHED', workflowPhase: 'TERMINAL', review: null },
    { status: 'DONE', workflowPhase: 'TERMINAL', review: null },
    { status: 'RATED', workflowPhase: 'TERMINAL', review: null },
    {
      status: 'COMPLETED',
      workflowPhase: 'RATING',
      review: { createdAt: new Date('2026-07-15T08:00:00.000Z') },
      workflowActions: [
        {
          action: 'rate-partner',
          payload: { rating: 5 },
          createdAt: new Date('2026-07-15T08:00:00.000Z'),
        },
        {
          action: 'rate-customer',
          payload: { rating: 5 },
          createdAt: new Date('2026-07-15T09:00:00.000Z'),
        },
      ],
    },
  ])(
    'never exposes fully terminal $status workflows in requests, active jobs, or chat rooms',
    async ({ status, workflowPhase, review, workflowActions }) => {
      const { service } = createService(
        ['partner-1'],
        workflowOrder({
          status,
          workflowPhase,
          review,
          workflowActions,
          chatEnabled: true,
        }),
      );

      const result = await (service as any).workflowActivities({
        legacySubjectId: 'partner@example.com',
        persona: 'partner',
        bridgeKey: 'bridge-key',
      });

      expect(result.requests).toEqual([]);
      expect(result.activeJobs).toEqual([]);
      expect(result.chatRooms).toEqual([]);
      expect(result.history).toHaveLength(1);
    },
  );

  it('uses persisted archival for Suppadesh and deduplicates each PO across every activity bucket', async () => {
    const archivedAt = new Date('2026-07-15T08:00:00.000Z');
    const archived = workflowOrder({
      id: 'archived-order',
      description: 'PO-2605-2747 | legacy test workflow',
      status: 'IN_PROGRESS',
      workflowPhase: 'CHAT',
      chatEnabled: true,
      archivedAt,
      fixer: {
        userId: 'suppadesh-user',
        user: {
          id: 'suppadesh-user',
          name: 'Suppadesh',
          email: 'suppadesh@yahoo.com',
        },
      },
    });
    const duplicate = workflowOrder({
      ...archived,
      id: 'older-duplicate',
      updatedAt: new Date('2026-07-14T08:00:00.000Z'),
    });
    const { service } = createService(
      ['suppadesh-user'],
      [archived, duplicate],
    );

    const result = await (service as any).workflowActivities({
      legacySubjectId: 'suppadesh@yahoo.com',
      persona: 'partner',
      bridgeKey: 'bridge-key',
    });

    expect(result.requests).toEqual([]);
    expect(result.activeJobs).toEqual([]);
    expect(result.chatRooms).toEqual([]);
    expect(result.history).toEqual([
      expect.objectContaining({
        poNumber: 'PO-2605-2747',
        lifecycleStatus: 'ARCHIVED',
        activityBucket: 'history',
        archivedAt: archivedAt.toISOString(),
        actions: [],
        chat: { enabled: false },
      }),
    ]);
  });

  it('returns the same persisted archive lifecycle from workflow detail', async () => {
    const archivedAt = new Date('2026-07-15T08:00:00.000Z');
    const { service } = createService(
      ['suppadesh-user'],
      workflowOrder({
        description: 'PO-2605-2747 | legacy test workflow',
        status: 'ASSIGNED',
        workflowPhase: 'FEE',
        chatEnabled: true,
        archivedAt,
        fixer: {
          userId: 'suppadesh-user',
          user: {
            id: 'suppadesh-user',
            name: 'Suppadesh',
            email: 'suppadesh@yahoo.com',
          },
        },
      }),
    );

    const result = await service.workflowDetails({
      poNumber: 'PO-2605-2747',
      legacySubjectId: 'suppadesh@yahoo.com',
      bridgeKey: 'bridge-key',
    });

    expect(result).toEqual(
      expect.objectContaining({
        lifecycleStatus: 'ARCHIVED',
        activityBucket: 'history',
        archivedAt: archivedAt.toISOString(),
        actions: [],
        chat: { enabled: false },
      }),
    );
  });

  it('rejects an invalid bridge key before exposing activities', async () => {
    const { service } = createService(['customer-1']);

    await expect(
      (service as any).workflowActivities({
        legacySubjectId: 'ghiscafe@gmail.com',
        persona: 'customer',
        bridgeKey: 'wrong-key',
      }),
    ).rejects.toThrow('Invalid BLUE bridge key');
  });

  it('persists a chat message for the visible customer and returns the message snapshot', async () => {
    const { service, prisma } = createService(['customer-1']);

    const result = await (service as any).postWorkflowChat({
      poNumber: 'PO-2607-8879',
      legacySubjectId: 'ghiscafe@gmail.com',
      bridgeKey: 'bridge-key',
      text: 'Persist a new chat message',
    });

    expect((prisma as any).orderChatMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ orderId: 'order-8879' }),
      }),
    );
    expect(result.chat.messageItems).toContainEqual(
      expect.objectContaining({ text: 'Persist a new chat message' }),
    );
  });

  it('returns the same exact persisted meeting values from workflow detail for the selected partner', async () => {
    const { service } = createService(['partner-1']);

    const result = await service.workflowDetails({
      poNumber: 'PO-2607-8879',
      legacySubjectId: 'bhaveshfung@gmail.com',
      bridgeKey: 'bridge-key',
    });

    expect(result.meeting).toEqual({
      venue: meeting.meetingVenue,
      date: meeting.meetingDate,
      time: meeting.meetingTime,
    });
  });

  it('lets the selected partner read the persisted customer chat message', async () => {
    const { service } = createService(['partner-1']);

    const result = await (service as any).workflowChat({
      poNumber: 'PO-2607-8879',
      legacySubjectId: 'bhaveshfung@gmail.com',
      bridgeKey: 'bridge-key',
    });

    expect(result.chat).toEqual(
      expect.objectContaining({
        enabled: true,
        messageItems: [
          expect.objectContaining({ text: 'Hello from persisted chat' }),
        ],
      }),
    );
  });

  it('does not expose workflow chat to an unlinked actor', async () => {
    const { service } = createService([]);

    await expect(
      (service as any).workflowChat({
        poNumber: 'PO-2607-8879',
        legacySubjectId: 'other@example.com',
        bridgeKey: 'bridge-key',
      }),
    ).rejects.toThrow('Workflow chat not found');
  });
});
