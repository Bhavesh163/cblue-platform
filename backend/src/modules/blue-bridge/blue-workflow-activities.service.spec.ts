import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { BlueBridgeService } from './blue-bridge.service';

const meeting = {
  meetingVenue: '13.794095, 100.609583',
  meetingDate: '2026-07-18',
  meetingTime: '14:30',
  meetingNote: 'Please bring the site drawings.',
};

const legacyMeeting = {
  meetingVenue: '0.000000, 0.000000',
  meetingDate: '2025-01-01',
  meetingTime: '00:00',
  meetingNote: 'Legacy payload must not override the order snapshot.',
};

function workflowOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-8879',
    description:
      'PO-2607-8879 | Meeting details in description must not become authoritative',
    userId: 'customer-1',
    fixerId: 'fixer-1',
    status: 'MEETING_REQUESTED',
    workflowPhase: 'MEETING_CONFIRM',
    chatEnabled: true,
    workflowRevision: 5,
    ...meeting,
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
        actorUserId: 'customer-1',
        payload: legacyMeeting,
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
  it('returns PO-2607-8879 with its authoritative meeting snapshot and site subdistrict', async () => {
    const { service } = createService(['customer-1']);

    const result = await (service as any).workflowActivities({
      legacySubjectId: 'ghiscafe@gmail.com',
      persona: 'customer',
      bridgeKey: 'bridge-key',
    });

    expect(result.requests).toEqual([]);
    expect(result.activeJobs).toEqual([
      expect.objectContaining({
        poNumber: 'PO-2607-8879',
        workflowVersion: 5,
        chat: { enabled: true },
        meeting: {
          venue: meeting.meetingVenue,
          date: meeting.meetingDate,
          time: meeting.meetingTime,
          note: meeting.meetingNote,
        },
        siteSubdistrict: 'Saphan Song',
        activityBucket: 'active',
        actionNeeded: false,
        availableActions: ['customer-cancel'],
        nextActionKey: null,
        nextActionLabel: null,
        nextActionOwner: null,
        nextActionStep: null,
      }),
    ]);
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
        activityBucket: 'request',
        actionNeeded: true,
      }),
    ]);
    expect(result.activeJobs).toEqual([]);
  });

  it.each([
    ['customer', 'customer-1'],
    ['partner', 'partner-1'],
  ] as const)(
    'returns persisted Step 9 meeting confirmation events to the %s',
    async (persona, viewerId) => {
      const { service } = createService(
        [viewerId],
        workflowOrder({
          status: 'IN_PROGRESS',
          workflowPhase: 'VARIATION',
          workflowRevision: 6,
          workflowActions: [
            {
              action: 'send-meeting-invitation',
              actorUserId: 'customer-1',
              payload: meeting,
              createdAt: new Date('2026-07-18T10:00:00.000Z'),
            },
            {
              action: 'confirm-meeting',
              actorUserId: 'partner-1',
              payload: {},
              createdAt: new Date('2026-07-19T10:30:00.000Z'),
            },
          ],
        }),
      );

      const result = await (service as any).workflowActivities({
        legacySubjectId: `${persona}@example.com`,
        persona,
        bridgeKey: 'bridge-key',
      });
      const activity = [...result.requests, ...result.activeJobs].find(
        (item: any) => item.poNumber === 'PO-2607-8879',
      );

      expect(activity).toMatchObject({
        currentStep: 9,
        workflowPhase: 'VARIATION',
        workflowEvents: [
          {
            action: 'send-meeting-invitation',
            createdAt: '2026-07-18T10:00:00.000Z',
            actorRole: 'customer',
          },
          {
            action: 'confirm-meeting',
            createdAt: '2026-07-19T10:30:00.000Z',
            actorRole: 'partner',
          },
        ],
      });
      expect(result.alerts).toContainEqual(
        expect.objectContaining({
          action: 'confirm-meeting',
          createdAt: '2026-07-19T10:30:00.000Z',
          currentStep: 9,
        }),
      );
    },
  );

  it('returns only the three oldest future persisted confirmed meetings', async () => {
    const makeConfirmedOrder = (
      poNumber: string,
      meetingDate: string,
      confirmed = true,
    ) => workflowOrder({
      id: `order-${poNumber}`,
      description: `${poNumber} | Authoritative service`,
      status: 'IN_PROGRESS',
      workflowPhase: 'VARIATION',
      meetingDate,
      meetingTime: '09:00',
      workflowActions: confirmed
        ? [{
            action: 'confirm-meeting',
            actorUserId: 'partner-1',
            payload: {},
            createdAt: new Date('2026-07-19T10:30:00.000Z'),
          }]
        : [],
    });
    const { service } = createService(['customer-1'], [
      makeConfirmedOrder('PO-2099-0004', '2099-07-24'),
      makeConfirmedOrder('PO-2099-0002', '2099-07-22'),
      makeConfirmedOrder('PO-2020-0001', '2020-07-20'),
      makeConfirmedOrder('PO-2099-0001', '2099-07-21'),
      makeConfirmedOrder('PO-2099-0003', '2099-07-23'),
      makeConfirmedOrder('PO-2099-9999', '2099-07-20', false),
    ]);

    const result = await (service as any).workflowActivities({
      legacySubjectId: 'customer@example.com',
      persona: 'customer',
      bridgeKey: 'bridge-key',
    });

    expect(result.upcomingMeetings.map((item: any) => item.poNumber)).toEqual([
      'PO-2099-0001',
      'PO-2099-0002',
      'PO-2099-0003',
    ]);
  });

  it('keeps a BLUE-originated ISO meeting separate from its confirmation event time', async () => {
    const confirmedAt = new Date('2026-07-19T10:30:00.000Z');
    const { service } = createService(
      ['customer-1'],
      workflowOrder({
        meetingDate: '2099-07-21T00:00:00.000Z',
        meetingTime: '14:30:00',
        workflowPhase: 'VARIATION',
        workflowActions: [
          {
            action: 'confirm-meeting',
            actorUserId: 'partner-1',
            payload: {},
            createdAt: confirmedAt,
          },
        ],
      }),
    );

    const result = await (service as any).workflowActivities({
      legacySubjectId: 'ghiscafe@gmail.com',
      persona: 'customer',
      bridgeKey: 'bridge-key',
    });

    expect(result.upcomingMeetings).toEqual([
      expect.objectContaining({
        poNumber: 'PO-2607-8879',
        meeting: expect.objectContaining({
          date: '2099-07-21',
          time: '14:30',
          confirmedAt: confirmedAt.toISOString(),
        }),
      }),
    ]);
  });

  it.each(['customer-1', 'partner-1'])(
    'returns the persisted Step 9 event from workflow detail to %s',
    async (viewerId) => {
      const { service } = createService(
        [viewerId],
        workflowOrder({
          status: 'IN_PROGRESS',
          workflowPhase: 'VARIATION',
          workflowRevision: 6,
          workflowActions: [
            {
              action: 'confirm-meeting',
              actorUserId: 'partner-1',
              payload: {},
              createdAt: new Date('2026-07-19T10:30:00.000Z'),
            },
          ],
        }),
      );

      const detail = await (service as any).workflowDetails({
        poNumber: 'PO-2607-8879',
        legacySubjectId: viewerId,
        bridgeKey: 'bridge-key',
      });

      expect(detail).toMatchObject({
        currentStep: 9,
        workflowPhase: 'VARIATION',
        workflowEvents: [
          {
            action: 'confirm-meeting',
            createdAt: '2026-07-19T10:30:00.000Z',
            actorRole: 'partner',
          },
        ],
      });
    },
  );

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

  it.each([
    ['customer', 'customer-1'],
    ['partner', 'partner-1'],
  ] as const)(
    'returns persisted Step 9-11 events and closed chat to the %s after completion confirmation',
    async (persona, viewerId) => {
      const eventRows = [
        ['send-variation', 'partner-1', '2026-07-20T01:00:00.000Z'],
        ['confirm-variation', 'customer-1', '2026-07-20T01:01:00.000Z'],
        ['send-completion', 'partner-1', '2026-07-20T01:02:00.000Z'],
        ['confirm-completion', 'customer-1', '2026-07-20T01:03:00.000Z'],
        ['rate-partner', 'customer-1', '2026-07-20T01:04:00.000Z'],
      ] as const;
      const { service } = createService(
        [viewerId],
        workflowOrder({
          status: 'COMPLETED',
          workflowPhase: 'RATING',
          workflowRevision: 10,
          chatEnabled: false,
          workflowActions: eventRows.map(([action, actorUserId, createdAt]) => ({
            action,
            actorUserId,
            payload: {},
            createdAt: new Date(createdAt),
          })),
        }),
      );

      const result = await (service as any).workflowActivities({
        legacySubjectId: `${persona}@example.com`,
        persona,
        bridgeKey: 'bridge-key',
      });
      const activity = [...result.requests, ...result.activeJobs].find(
        (item: any) => item.poNumber === 'PO-2607-8879',
      );

      expect(activity).toMatchObject({
        currentStep: 11,
        activityBucket: 'active',
        chat: { enabled: false },
        workflowEvents: eventRows.map(([action, actorUserId, createdAt]) => ({
          action,
          actorRole: actorUserId === 'customer-1' ? 'customer' : 'partner',
          createdAt,
        })),
      });
      expect(result.chatRooms).toEqual([]);
    },
  );

  it.each([
    ['send-variation', 'partner-1'],
    ['skip-variation', 'partner-1'],
    ['confirm-variation', 'customer-1'],
    ['send-completion', 'partner-1'],
    ['confirm-completion', 'customer-1'],
    ['rate-partner', 'customer-1'],
    ['rate-customer', 'partner-1'],
  ] as const)(
    'uses the persisted creation timestamp for the %s workflow event',
    async (action, actorUserId) => {
      const persistedAt = new Date('2026-07-20T02:03:04.567Z');
      const { service } = createService(
        ['customer-1'],
        workflowOrder({
          status: 'COMPLETED',
          workflowPhase: 'RATING',
          chatEnabled: false,
          workflowActions: [{
            action,
            actorUserId,
            payload: {},
            createdAt: persistedAt,
          }],
        }),
      );

      const detail = await service.workflowDetails({
        poNumber: 'PO-2607-8879',
        legacySubjectId: 'customer-1',
        bridgeKey: 'bridge-key',
      });

      expect(detail.workflowEvents).toContainEqual({
        action,
        actorRole: actorUserId === 'customer-1' ? 'customer' : 'partner',
        createdAt: persistedAt.toISOString(),
      });
    },
  );

  it('places legacy completed workflows without a persisted rating phase in history', async () => {
    const { service } = createService(
      ['partner-1'],
      workflowOrder({
        status: 'COMPLETED',
        workflowPhase: 'RATING',
        workflowRevision: 0,
        review: null,
        workflowActions: [],
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
    expect(result.history).toEqual([
      expect.objectContaining({
        poNumber: 'PO-2607-8879',
        lifecycleStatus: 'COMPLETED',
        activityBucket: 'history',
        actions: [],
        chat: { enabled: false },
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

  it('returns the same authoritative meeting snapshot and site subdistrict from workflow detail', async () => {
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
      note: meeting.meetingNote,
    });
    expect(result.siteSubdistrict).toBe('Saphan Song');
  });

  it('does not fill a partial authoritative meeting snapshot from a legacy payload', async () => {
    const { service } = createService(
      ['partner-1'],
      workflowOrder({
        meetingVenue: meeting.meetingVenue,
        meetingDate: null,
        meetingTime: null,
        meetingNote: null,
        workflowActions: [
          {
            action: 'send-meeting-invitation',
            payload: legacyMeeting,
            createdAt: new Date('2026-07-16T00:00:00.000Z'),
          },
        ],
      }),
    );

    const result = await service.workflowDetails({
      poNumber: 'PO-2607-8879',
      legacySubjectId: 'bhaveshfung@gmail.com',
      bridgeKey: 'bridge-key',
    });

    expect(result.meeting).toEqual({
      venue: meeting.meetingVenue,
      date: '',
      time: '',
      note: '',
    });
  });

  it('uses only the persisted invitation payload when a pre-migration order has no meeting snapshot', async () => {
    const { service } = createService(
      ['partner-1'],
      workflowOrder({
        meetingVenue: null,
        meetingDate: null,
        meetingTime: null,
        meetingNote: null,
        workflowActions: [
          {
            action: 'send-meeting-invitation',
            payload: legacyMeeting,
            createdAt: new Date('2026-07-16T00:00:00.000Z'),
          },
        ],
      }),
    );

    const result = await service.workflowDetails({
      poNumber: 'PO-2607-8879',
      legacySubjectId: 'bhaveshfung.com',
      bridgeKey: 'bridge-key',
    });

    expect(result.meeting).toEqual({
      venue: legacyMeeting.meetingVenue,
      date: legacyMeeting.meetingDate,
      time: legacyMeeting.meetingTime,
      note: legacyMeeting.meetingNote,
    });
  });

  it('does not derive a missing meeting or subdistrict from description text or GPS coordinates', async () => {
    const { service } = createService(
      ['partner-1'],
      workflowOrder({
        description:
          'PO-2607-8879 | 2026-07-18 14:30 at a description-derived venue',
        meetingVenue: null,
        meetingDate: null,
        meetingTime: null,
        meetingNote: null,
        workflowActions: [],
        address: {
          ...workflowOrder().address,
          subdistrict: null,
          latitude: 13.794095,
          longitude: 100.609583,
        },
      }),
    );

    const result = await service.workflowDetails({
      poNumber: 'PO-2607-8879',
      legacySubjectId: 'bhaveshfung@gmail.com',
      bridgeKey: 'bridge-key',
    });

    expect(result.meeting).toBeNull();
    expect(result.siteSubdistrict).toBe('');
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
