import {
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { BlueBridgeService } from './blue-bridge.service';
import { FixerWorkflowBridgeService } from './fixer-workflow-bridge.service';

const cases: Array<
  [
    string,
    string,
    OrderStatus,
    string,
    string,
    OrderStatus,
    string,
  ]
> = [
  ['partner-accept', 'PARTNER_DECISION', OrderStatus.MATCHING, 'partner-1', 'partner-accept', OrderStatus.CONFIRMED, 'FEE'],
  ['partner-decline', 'PARTNER_DECISION', OrderStatus.MATCHING, 'partner-1', 'partner-decline', OrderStatus.CANCELLED, 'TERMINAL'],
  ['fee-proceed', 'FEE', OrderStatus.CONFIRMED, 'customer-1', 'fee-proceed', OrderStatus.IN_PROGRESS, 'CHAT'],
  ['free-pass', 'FEE', OrderStatus.CONFIRMED, 'customer-1', 'free-pass', OrderStatus.IN_PROGRESS, 'CHAT'],
  ['send-meeting-invitation', 'CHAT', OrderStatus.IN_PROGRESS, 'customer-1', 'send-meeting-invitation', OrderStatus.MEETING_REQUESTED, 'MEETING_CONFIRM'],
  ['confirm-meeting', 'MEETING_CONFIRM', OrderStatus.MEETING_REQUESTED, 'partner-1', 'confirm-meeting', OrderStatus.IN_PROGRESS, 'VARIATION'],
  ['send-variation', 'VARIATION', OrderStatus.IN_PROGRESS, 'partner-1', 'send-variation', OrderStatus.IN_PROGRESS, 'VARIATION_CONFIRM'],
  ['skip-variation', 'VARIATION', OrderStatus.IN_PROGRESS, 'partner-1', 'skip-variation', OrderStatus.IN_PROGRESS, 'COMPLETION'],
  ['confirm-variation', 'VARIATION_CONFIRM', OrderStatus.IN_PROGRESS, 'customer-1', 'confirm-variation', OrderStatus.IN_PROGRESS, 'COMPLETION'],
  ['send-completion', 'COMPLETION', OrderStatus.IN_PROGRESS, 'partner-1', 'send-completion', OrderStatus.IN_PROGRESS, 'COMPLETION_CONFIRM'],
  ['confirm-completion', 'COMPLETION_CONFIRM', OrderStatus.IN_PROGRESS, 'customer-1', 'confirm-completion', OrderStatus.COMPLETED, 'RATING'],
  ['rate-partner', 'RATING', OrderStatus.COMPLETED, 'customer-1', 'rate-partner', OrderStatus.COMPLETED, 'RATING'],
  ['rate-customer', 'RATING', OrderStatus.COMPLETED, 'partner-1', 'rate-customer', OrderStatus.COMPLETED, 'RATING'],
  ['customer-cancel', 'CHAT', OrderStatus.IN_PROGRESS, 'customer-1', 'customer-cancel', OrderStatus.CANCELLED, 'TERMINAL'],
];

describe('FixerWorkflowBridgeService', () => {
  function createHarness(
    workflowPhase = 'CHAT',
    status: OrderStatus = OrderStatus.IN_PROGRESS,
    workflowActions: Array<{ action: string }> = [],
  ) {
    const order = {
      id: 'order-1',
      userId: 'customer-1',
      fixerId: 'fixer-1',
      fixer: { userId: 'partner-1' },
      status,
      workflowPhase,
      workflowRevision: 0,
      workflowActions,
      review: null,
    };
    const prisma: any = {
      order: {
        findFirst: jest.fn().mockResolvedValue(order),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      fixerWorkflowAction: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'event-1' }),
      },
      orderStatusHistory: { create: jest.fn().mockResolvedValue({}) },
      review: { create: jest.fn().mockResolvedValue({ id: 'review-1' }) },
    };
    prisma.$transaction = jest.fn((callback) => callback(prisma));
    const bridge = {
      authenticatedWorkflowDetails: jest.fn().mockResolvedValue({
        sourceVersion: 'cblue-fixer-workflow-v1',
        poNumber: 'PO-2607-9001',
        currentStep: 7,
        totalSteps: 11,
        status: 'IN_PROGRESS',
        activityBucket: 'active',
        actions: [],
        availableActions: [],
        nextActionLabel: null,
        nextActionOwner: null,
        workflowVersion: 1,
      }),
    };
    return {
      prisma,
      bridge,
      service: new FixerWorkflowBridgeService(
        prisma,
        bridge as unknown as BlueBridgeService,
      ),
    };
  }

  it.each(cases)(
    'persists the %s action as a server-owned transition',
    async (
      _name,
      workflowPhase,
      status,
      userId,
      action,
      expectedStatus,
      expectedPhase,
    ) => {
      const persistedActions =
        workflowPhase === 'RATING'
          ? [{ action: 'confirm-completion' }]
          : [];
      const { service, prisma } = createHarness(
        workflowPhase,
        status,
        persistedActions,
      );
      const dto: any = { workflowVersion: 0 };
      if (action === 'send-meeting-invitation') {
        Object.assign(dto, {
          meetingDate: '2026-07-15',
          meetingTime: '10:00',
          meetingVenue: 'Office',
        });
      }
      if (action === 'rate-partner' || action === 'rate-customer') {
        dto.rating = 5;
      }

      await service.action('PO-2607-9001', userId, action, dto, 'idempotency-1');

      expect(prisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: 'order-1', workflowRevision: 0 },
        data: {
          status: expectedStatus,
          workflowPhase: expectedPhase,
          ...(action === 'fee-proceed' || action === 'free-pass'
            ? { chatEnabled: true }
            : {}),
          workflowRevision: { increment: 1 },
          ...(action === 'send-meeting-invitation'
            ? {
                meetingDate: '2026-07-15',
                meetingTime: '10:00',
                meetingVenue: 'Office',
                meetingNote: null,
              }
            : {}),
        },
      });
    },
  );
  it('persists the meeting invitation snapshot with the Step 8 transition', async () => {
    const { service, prisma } = createHarness();

    await service.action(
      'PO-2607-9001',
      'customer-1',
      'send-meeting-invitation',
      {
        workflowVersion: 0,
        meetingDate: '2026-07-18',
        meetingTime: '14:30',
        meetingVenue: '13.794095, 100.609583',
        note: 'Please bring the site drawings.',
      },
      'idempotency-1',
    );

    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'order-1', workflowRevision: 0 },
      data: {
        status: OrderStatus.MEETING_REQUESTED,
        workflowPhase: 'MEETING_CONFIRM',
        meetingDate: '2026-07-18',
        meetingTime: '14:30',
        meetingVenue: '13.794095, 100.609583',
        meetingNote: 'Please bring the site drawings.',
        workflowRevision: { increment: 1 },
      },
    });
  });

  it('normalizes a whitespace-only meeting note to null', async () => {
    const { service, prisma } = createHarness();

    await service.action(
      'PO-2607-9001',
      'customer-1',
      'send-meeting-invitation',
      {
        workflowVersion: 0,
        meetingDate: '2026-07-18',
        meetingTime: '14:30',
        meetingVenue: '13.794095, 100.609583',
        note: '   ',
      },
      'idempotency-1',
    );

    expect(prisma.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ meetingNote: null }),
      }),
    );
  });

  it('rejects a stale workflow version without changing state', async () => {
    const { service, prisma } = createHarness('FEE', OrderStatus.CONFIRMED);

    await expect(
      service.action(
        'PO-2607-9001',
        'customer-1',
        'fee-proceed',
        { workflowVersion: 3 },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });

  it('rejects actions that are not owned by the authenticated participant', async () => {
    const { service, prisma } = createHarness('FEE', OrderStatus.CONFIRMED);

    await expect(
      service.action(
        'PO-2607-9001',
        'partner-1',
        'fee-proceed',
        { workflowVersion: 0 },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });

  it('returns the persisted snapshot for an idempotent replay', async () => {
    const { service, prisma, bridge } = createHarness('FEE', OrderStatus.CONFIRMED);
    prisma.fixerWorkflowAction.findUnique.mockResolvedValue({
      id: 'event-1',
      action: 'fee-proceed',
    });

    const result = await service.action(
      'PO-2607-9001',
      'customer-1',
      'fee-proceed',
      { workflowVersion: 0 },
      'idempotency-1',
    );

    expect(prisma.order.updateMany).not.toHaveBeenCalled();
    expect(bridge.authenticatedWorkflowDetails).toHaveBeenCalledWith(
      'PO-2607-9001',
      'customer-1',
    );
    expect(result.workflowVersion).toBe(1);
  });

  it('returns the persisted Step 9 confirm-meeting event from the action response', async () => {
    const persistedCreatedAt = '2026-07-19T10:30:00.000Z';
    const { service, prisma, bridge } = createHarness(
      'MEETING_CONFIRM',
      OrderStatus.MEETING_REQUESTED,
    );
    bridge.authenticatedWorkflowDetails.mockResolvedValue({
      sourceVersion: 'cblue-fixer-workflow-v1',
      poNumber: 'PO-2607-9001',
      currentStep: 9,
      totalSteps: 11,
      status: 'IN_PROGRESS',
      activityBucket: 'active',
      workflowPhase: 'VARIATION',
      workflowVersion: 1,
      workflowEvents: [
        {
          action: 'confirm-meeting',
          createdAt: persistedCreatedAt,
          actorRole: 'partner',
        },
      ],
      actions: [],
      availableActions: [],
      nextActionLabel: null,
      nextActionOwner: null,
    });

    const result = await service.action(
      'PO-2607-9001',
      'partner-1',
      'confirm-meeting',
      { workflowVersion: 0 },
      'confirm-meeting-1',
    );

    expect(prisma.fixerWorkflowAction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 'order-1',
        actorUserId: 'partner-1',
        action: 'confirm-meeting',
      }),
    });
    expect(result).toMatchObject({
      currentStep: 9,
      workflowPhase: 'VARIATION',
      workflowEvents: [
        {
          action: 'confirm-meeting',
          createdAt: persistedCreatedAt,
          actorRole: 'partner',
        },
      ],
    });
    expect(bridge.authenticatedWorkflowDetails).toHaveBeenCalledWith(
      'PO-2607-9001',
      'partner-1',
    );
  });
});
