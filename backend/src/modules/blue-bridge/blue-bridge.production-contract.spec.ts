import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BlueBridgeService,
  resolvePersistedFixerWorkflowSnapshot,
} from './blue-bridge.service';

const address = {
  unit: null,
  building: null,
  street: null,
  subdistrict: 'Saphansong',
  district: 'Wang Thonglang',
  province: 'Bangkok',
  postalCode: '10310',
  latitude: null,
  longitude: null,
};

function createService(order: Record<string, unknown>) {
  const prisma = {
    subscriber: { findFirst: jest.fn().mockResolvedValue(null) },
    user: { findMany: jest.fn().mockResolvedValue([{ id: 'user-1' }]) },
    order: { findFirst: jest.fn().mockResolvedValue(order) },
  } as unknown as PrismaService;

  return new BlueBridgeService(
    prisma,
    new ConfigService({ blueBridge: { apiKey: 'bridge-key' } }),
  );
}

describe('BLUE workflow production contracts', () => {
  it('uses order meeting and subdistrict snapshots instead of description text, GPS, or legacy payload values', async () => {
    const service = createService({
      userId: 'customer-1',
      fixer: { userId: 'partner-1' },
      status: 'MEETING_REQUESTED',
      workflowPhase: 'MEETING_CONFIRM',
      statusHistory: [],
      review: null,
      description:
        'PO-2607-8879 | 2025-01-01 00:00 at a description-derived venue must be ignored',
      meetingDate: '2026-07-18',
      meetingTime: '14:30',
      meetingVenue: '13.794095, 100.609583',
      meetingNote: 'Please bring the site drawings.',
      workflowActions: [
        {
          action: 'send-meeting-invitation',
          payload: {
            meetingDate: '2025-01-01',
            meetingTime: '00:00',
            meetingVenue: '0.000000, 0.000000',
            meetingNote: 'Legacy payload must not override the order snapshot.',
          },
        },
      ],
      budgetBreakdown: null,
      user: { name: 'Customer', email: 'customer.com' },
      address: {
        ...address,
        subdistrict: ' Saphan Song ',
        latitude: 0,
        longitude: 0,
      },
      images: [],
    });

    const result = await service.workflowDetails({
      poNumber: 'PO-2607-8879',
      legacySubjectId: 'customer-1',
      bridgeKey: 'bridge-key',
    });

    expect(result).toEqual(
      expect.objectContaining({
        meeting: {
          date: '2026-07-18',
          time: '14:30',
          venue: '13.794095, 100.609583',
          note: 'Please bring the site drawings.',
        },
        siteSubdistrict: 'Saphan Song',
      }),
    );
  });

  it('returns the persisted Step-2 budget for PO-2607-8879', async () => {
    const service = createService({
      status: 'MATCHING',
      statusHistory: [],
      review: null,
      description: 'PO-2607-8879 | Persisted workflow details',
      budgetBreakdown: [
        {
          service: 'Fit-out',
          qty: 600,
          unit: 'sq.m.',
          unitRate: 30000,
          total: 18000000,
        },
        {
          service: 'Reinstatement',
          qty: 300,
          unit: 'sq.m.',
          unitRate: 10000,
          total: 3000000,
        },
        {
          service: 'Construction',
          qty: 700,
          unit: 'sq.m.',
          unitRate: 20000,
          total: 14000000,
        },
        {
          service: 'Website development',
          qty: 10,
          unit: 'page',
          unitRate: 1000,
          total: 10000,
        },
        {
          service: 'chatbot',
          qty: 100,
          unit: 'FAQ',
          unitRate: 100,
          total: 10000,
        },
      ],
      user: { name: 'Ghis Cafe', email: 'ghiscafe@gmail.com' },
      address,
      images: [],
    });

    const result = await service.workflowDetails({
      poNumber: 'PO-2607-8879',
      legacySubjectId: 'ghiscafe@gmail.com',
      bridgeKey: 'bridge-key',
    });

    expect(result.budgetBreakdown).toHaveLength(5);
    expect(result.budgetLines).toEqual([
      '1) Fit-out 600 sq.m. \u00d7 \u0e3f30,000',
      '= \u0e3f18,000,000',
      '2) Reinstatement 300 sq.m. \u00d7 \u0e3f10,000',
      '= \u0e3f3,000,000',
      '3) Construction 700 sq.m. \u00d7 \u0e3f20,000',
      '= \u0e3f14,000,000',
      '4) Website development 10 page \u00d7 \u0e3f1,000',
      '= \u0e3f10,000',
      '5) chatbot 100 FAQ \u00d7 \u0e3f100',
      '= \u0e3f10,000',
      'Budget',
      '= \u0e3f35,020,000',
    ]);
  });

  it('projects persisted PO-2605-2121 partner decline into history', async () => {
    const declinedAt = new Date('2026-07-11T12:00:00.000Z');
    const service = createService({
      status: 'CANCELLED',
      statusHistory: [
        {
          status: 'CANCELLED',
          note: 'Partner declined this order and cannot proceed.',
          createdAt: declinedAt,
        },
      ],
      review: null,
      description: 'PO-2605-2121 | Persisted workflow details',
      budgetBreakdown: null,
      user: { name: 'Customer', email: 'customer@example.com' },
      address,
      images: [],
    });

    const result = await service.workflowDetails({
      poNumber: 'PO-2605-2121',
      legacySubjectId: 'user-1',
      bridgeKey: 'bridge-key',
    });

    expect(result).toEqual(
      expect.objectContaining({
        activityBucket: 'history',
        lifecycleStatus: 'DECLINED',
        declinedAt: declinedAt.toISOString(),
        archivedAt: declinedAt.toISOString(),
      }),
    );
  });
  it('returns participant-owned actions after free pass and meeting invitation', async () => {
    const order = {
      userId: 'customer-1',
      fixer: { userId: 'partner-1' },
      status: 'IN_PROGRESS',
      statusHistory: [],
      review: null,
      description: 'PO-2607-9001 | UI text must not determine workflow state',
      budgetBreakdown: null,
      user: { name: 'Customer', email: 'customer@example.com' },
      address,
      images: [],
    };
    const createParticipantService = (
      viewerId: string,
      status: string,
      statusHistory: Array<Record<string, unknown>>,
    ) =>
      new BlueBridgeService(
        {
          subscriber: { findFirst: jest.fn().mockResolvedValue(null) },
          user: { findMany: jest.fn().mockResolvedValue([{ id: viewerId }]) },
          order: {
            findFirst: jest.fn().mockResolvedValue({
              ...order,
              status,
              statusHistory,
              workflowPhase:
                status === 'MEETING_REQUESTED' ? 'MEETING_CONFIRM' : 'CHAT',
            }),
          },
        } as unknown as PrismaService,
        new ConfigService({ blueBridge: { apiKey: 'bridge-key' } }),
      );

    const customer = await createParticipantService(
      'customer-1',
      'IN_PROGRESS',
      [],
    ).workflowDetails({
      poNumber: 'PO-2607-9001',
      legacySubjectId: 'customer-1',
      bridgeKey: 'bridge-key',
    });
    expect(customer).toEqual(
      expect.objectContaining({
        poNumber: 'PO-2607-9001',
        currentStep: 7,
        totalSteps: 11,
        status: 'IN_PROGRESS',
        activityBucket: 'active',
        availableActions: ['send-meeting-invitation', 'customer-cancel'],
        nextActionKey: 'send-meeting-invitation',
        nextActionOwner: 'customer',
        nextActionStep: 8,
      }),
    );

    const partner = await createParticipantService(
      'partner-1',
      'MEETING_REQUESTED',
      [{ status: 'MEETING_REQUESTED', createdAt: new Date() }],
    ).workflowDetails({
      poNumber: 'PO-2607-9001',
      legacySubjectId: 'partner-1',
      bridgeKey: 'bridge-key',
    });
    expect(partner).toEqual(
      expect.objectContaining({
        currentStep: 8,
        totalSteps: 11,
        status: 'MEETING_REQUESTED',
        activityBucket: 'request',
        availableActions: ['confirm-meeting'],
        nextActionKey: 'confirm-meeting',
        nextActionOwner: 'partner',
        nextActionStep: 8,
      }),
    );
  });

  it('keeps an invited meeting active for the customer with cancel as a secondary capability', async () => {
    const customer = resolvePersistedFixerWorkflowSnapshot({
      poNumber: 'PO-2607-9001',
      status: 'MEETING_REQUESTED',
      workflowPhase: 'MEETING_CONFIRM',
      workflowVersion: 3,
      chatEnabled: true,
      customerUserId: 'customer-1',
      fixerUserId: 'partner-1',
      viewerUserIds: ['customer-1'],
    });

    expect(customer).toEqual(
      expect.objectContaining({
        currentStep: 8,
        activityBucket: 'active',
        availableActions: ['customer-cancel'],
        nextActionKey: null,
        nextActionLabel: null,
        nextActionOwner: null,
        nextActionStep: null,
      }),
    );
  });
  it.each([
    [
      'PARTNER_DECISION',
      'MATCHING',
      'partner-1',
      ['partner-accept', 'partner-decline'],
      5,
      'request',
    ],
    [
      'FEE',
      'CONFIRMED',
      'customer-1',
      ['fee-proceed', 'free-pass', 'customer-cancel'],
      6,
      'active',
    ],
    [
      'CHAT',
      'IN_PROGRESS',
      'customer-1',
      ['send-meeting-invitation', 'customer-cancel'],
      7,
      'active',
    ],
    [
      'MEETING_CONFIRM',
      'MEETING_REQUESTED',
      'partner-1',
      ['confirm-meeting'],
      8,
      'request',
    ],
    [
      'VARIATION',
      'IN_PROGRESS',
      'partner-1',
      ['send-variation', 'skip-variation'],
      9,
      'active',
    ],
    [
      'VARIATION_CONFIRM',
      'IN_PROGRESS',
      'customer-1',
      ['confirm-variation', 'customer-cancel'],
      9,
      'active',
    ],
    [
      'COMPLETION',
      'IN_PROGRESS',
      'partner-1',
      ['send-completion'],
      10,
      'active',
    ],
    [
      'COMPLETION_CONFIRM',
      'IN_PROGRESS',
      'customer-1',
      ['confirm-completion', 'customer-cancel'],
      10,
      'active',
    ],
    [
      'RATING',
      'COMPLETED',
      'customer-1',
      ['rate-partner', 'customer-cancel'],
      11,
      'active',
    ],
    ['RATING', 'COMPLETED', 'partner-1', ['rate-customer'], 11, 'active'],
    ['TERMINAL', 'CANCELLED', 'customer-1', [], 11, 'history'],
  ])(
    'returns only the owning actions for %s',
    async (
      workflowPhase,
      status,
      viewerId,
      expectedActions,
      currentStep,
      activityBucket,
    ) => {
      const service = new BlueBridgeService(
        {
          subscriber: { findFirst: jest.fn().mockResolvedValue(null) },
          user: { findMany: jest.fn().mockResolvedValue([{ id: viewerId }]) },
          order: {
            findFirst: jest.fn().mockResolvedValue({
              userId: 'customer-1',
              fixer: { userId: 'partner-1' },
              status,
              workflowPhase,
              workflowRevision: workflowPhase === 'RATING' ? 1 : 0,
              workflowActions:
                workflowPhase === 'RATING'
                  ? [{ action: 'confirm-completion' }]
                  : [],
              statusHistory: [],
              review: null,
              description: 'PO-2607-9002 | never used for workflow actions',
              budgetBreakdown: null,
              user: { name: 'Customer', email: 'customer@example.com' },
              address,
              images: [],
            }),
          },
        } as unknown as PrismaService,
        new ConfigService({ blueBridge: { apiKey: 'bridge-key' } }),
      );
      const snapshot = await service.workflowDetails({
        poNumber: 'PO-2607-9002',
        legacySubjectId: viewerId,
        bridgeKey: 'bridge-key',
      });
      expect(snapshot).toEqual(
        expect.objectContaining({
          sourceVersion: 'cblue-fixer-workflow-v1',
          currentStep,
          totalSteps: 11,
          activityBucket,
          availableActions: expectedActions,
        }),
      );
      const otherViewer =
        viewerId === 'customer-1' ? 'partner-1' : 'customer-1';
      const other = new BlueBridgeService(
        {
          subscriber: { findFirst: jest.fn().mockResolvedValue(null) },
          user: {
            findMany: jest.fn().mockResolvedValue([{ id: otherViewer }]),
          },
          order: {
            findFirst: jest.fn().mockResolvedValue({
              userId: 'customer-1',
              fixer: { userId: 'partner-1' },
              status,
              workflowPhase,
              workflowRevision: workflowPhase === 'RATING' ? 1 : 0,
              workflowActions:
                workflowPhase === 'RATING'
                  ? [{ action: 'confirm-completion' }]
                  : [],
              statusHistory: [],
              review: null,
              description: 'PO-2607-9002',
              budgetBreakdown: null,
              user: { name: 'Customer', email: 'customer@example.com' },
              address,
              images: [],
            }),
          },
        } as unknown as PrismaService,
        new ConfigService({ blueBridge: { apiKey: 'bridge-key' } }),
      );
      if (workflowPhase !== 'RATING') {
        const expectedOtherActions =
          workflowPhase === 'TERMINAL' || otherViewer === 'partner-1'
            ? []
            : ['customer-cancel'];
        expect(
          (
            await other.workflowDetails({
              poNumber: 'PO-2607-9002',
              legacySubjectId: otherViewer,
              bridgeKey: 'bridge-key',
            })
          ).availableActions,
        ).toEqual(expectedOtherActions);
      }
    },
  );

  it.each(['customer-1', 'partner-1'])(
    'exposes persisted chat availability to %s after fee/free-plan activation',
    async (viewerId) => {
      const snapshot = await createService({
        userId: 'customer-1',
        fixer: { userId: 'partner-1' },
        status: 'MEETING_REQUESTED',
        workflowPhase: 'MEETING_CONFIRM',
        chatEnabled: true,
        workflowActions: [],
        statusHistory: [],
        review: null,
        description: 'PO-2607-8879 | persisted workflow state',
        budgetBreakdown: null,
        user: { name: 'Customer', email: 'customer@example.com' },
        address,
        images: [],
      }).workflowDetails({
        poNumber: 'PO-2607-8879',
        legacySubjectId: viewerId,
        bridgeKey: 'bridge-key',
      });

      expect(snapshot).toEqual(
        expect.objectContaining({
          currentStep: 8,
          status: 'MEETING_REQUESTED',
          chat: { enabled: true },
        }),
      );
    },
  );

  it('returns persisted chat availability independently of IN_PROGRESS status', async () => {
    const order = {
      userId: 'customer-1',
      fixer: { userId: 'partner-1' },
      status: 'IN_PROGRESS',
      workflowPhase: 'FEE',
      chatEnabled: false,
      workflowActions: [],
      statusHistory: [],
      review: null,
      description: 'PO-2607-9003 | text is not workflow state',
      budgetBreakdown: null,
      user: { name: 'Customer', email: 'customer' },
      address,
      images: [],
    };

    const beforeFee = await createService(order).workflowDetails({
      poNumber: 'PO-2607-9003',
      legacySubjectId: 'customer-1',
      bridgeKey: 'bridge-key',
    });
    expect(beforeFee).toEqual(
      expect.objectContaining({
        currentStep: 6,
        status: 'IN_PROGRESS',
        chat: { enabled: false },
        processingFee: {
          amount: 100,
          currency: 'THB',
          displayLabel: '฿100',
        },
      }),
    );

    const afterFee = await createService({
      ...order,
      workflowPhase: 'CHAT',
      chatEnabled: true,
    }).workflowDetails({
      poNumber: 'PO-2607-9003',
      legacySubjectId: 'customer-1',
      bridgeKey: 'bridge-key',
    });
    expect(afterFee.chat).toEqual({ enabled: true });
  });
});
