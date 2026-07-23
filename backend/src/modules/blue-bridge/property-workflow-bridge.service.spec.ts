import { PropertyInquiryStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PropertyService } from '../property/property.service';
import { PropertyWorkflowBridgeService } from './property-workflow-bridge.service';

const property = {
  id: 'property-1',
  userId: 'lister-1',
  title: 'Bangkok Office',
  propertyType: 'OFFICE',
  listingType: 'RENT',
  tier: 'STANDARD',
  price: 50000,
  province: 'Bangkok',
  district: 'Wang Thonglang',
  subdistrict: 'Saphansong',
  postalCode: '10310',
  addressLine: 'Private address',
  latitude: 13.79,
  longitude: 100.61,
  contactName: 'Lister',
  contactPhone: '0800000000',
  contactEmail: 'lister@example.com',
  createdAt: new Date('2026-07-12T00:00:00.000Z'),
  images: [
    {
      id: 'image-1',
      url: 'https://files.example/listing.jpg',
      key: 'listing.jpg',
      sortOrder: 0,
      isPrimary: true,
    },
  ],
  user: { id: 'lister-1', name: 'Lister', email: 'lister@example.com' },
};

function inquiry(status = PropertyInquiryStatus.NOTIFY_SENT) {
  return {
    id: 'inquiry-1',
    poNumber: 'PRE-2607-100001',
    propertyId: property.id,
    customerId: 'customer-1',
    listerUserId: 'lister-1',
    customerName: 'Customer',
    customerEmail: 'customer@example.com',
    listerName: 'Lister',
    status,
    step: status === PropertyInquiryStatus.NOTIFY_SENT ? 3 : 4,
    requestDetails: 'Please arrange an office viewing.',
    meetingDate: null,
    meetingTime: null,
    meetingVenue: null,
    meetingNote: null,
    customerRating: null,
    customerComment: null,
    listerRating: null,
    listerComment: null,
    property,
    attachments: [
      {
        id: 'file-1',
        label: 'Floor plan',
        url: 'https://files.example/floor.pdf',
        key: 'floor.pdf',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      },
    ],
    workflowEvents: [
      {
        action: 'inquiry-created',
        status: PropertyInquiryStatus.NOTIFY_SENT,
        step: 3,
        actorId: 'customer-1',
        isPrivate: false,
        note: null,
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      },
      {
        action: 'decline',
        status: PropertyInquiryStatus.DECLINED,
        step: 4,
        actorId: 'lister-1',
        isPrivate: true,
        note: 'Private lister note',
        createdAt: new Date('2026-07-12T01:00:00.000Z'),
      },
    ],
  };
}

function expectAuthoritativeSnapshot(snapshot: any) {
  expect(snapshot).toEqual(
    expect.objectContaining({
      sourceVersion: 'cblue-property-workflow-v1',
      totalSteps: 8,
      currentStep: expect.any(Number),
      actions: expect.any(Array),
    }),
  );
  expect(snapshot.currentStep).toBeGreaterThanOrEqual(1);
  expect(snapshot.currentStep).toBeLessThanOrEqual(8);
  expect([null, 'customer', 'lister']).toContain(snapshot.nextActionOwner);
  expect([null, expect.any(Number)]).toContainEqual(snapshot.nextActionStep);
  expect([null, expect.any(String)]).toContainEqual(snapshot.nextActionLabel);
  for (const action of snapshot.actions) {
    expect(action).toEqual(
      expect.objectContaining({
        key: expect.any(String),
        owner: expect.stringMatching(/^(customer|lister)$/),
        label: expect.any(String),
        actionStep: expect.any(Number),
      }),
    );
    expect(action.actionStep).toBeGreaterThanOrEqual(1);
    expect(action.actionStep).toBeLessThanOrEqual(8);
  }
}

describe('PropertyWorkflowBridgeService', () => {
  it('creates a CBLUE-owned inquiry and projects persisted data for both participants', async () => {
    const stored = inquiry();
    const prisma = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 'customer-1',
            name: 'Customer',
            email: 'customer@example.com',
          }),
      },
      property: { findFirst: jest.fn().mockResolvedValue(property) },
      propertyInquiry: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValue(stored),
        create: jest
          .fn()
          .mockResolvedValue({ id: stored.id, poNumber: stored.poNumber }),
      },
    } as unknown as PrismaService;
    const propertyService = { search: jest.fn() } as unknown as PropertyService;
    const service = new PropertyWorkflowBridgeService(prisma, propertyService);

    const customerSnapshot = await service.createInquiry('customer-1', {
      listingId: property.id,
      requestDetails: 'Please arrange an office viewing.',
      attachments: [
        {
          label: 'Floor plan',
          url: 'https://files.example/floor.pdf',
          key: 'floor.pdf',
        },
      ],
    });
    const listerSnapshot = await service.snapshot(stored.poNumber, 'lister-1');

    expect(prisma.propertyInquiry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          propertyId: property.id,
          customerId: 'customer-1',
          listerUserId: 'lister-1',
          status: PropertyInquiryStatus.NOTIFY_SENT,
          step: 4,
        }),
      }),
    );
    expectAuthoritativeSnapshot(customerSnapshot);
    expectAuthoritativeSnapshot(listerSnapshot);
    expect(customerSnapshot.currentStep).toBe(4);
    expect(listerSnapshot.currentStep).toBe(4);
    const createData = (prisma.propertyInquiry.create as jest.Mock).mock.calls[0][0].data;
    expect(createData.workflowEvents.create).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: 'match-selected', step: 1 }),
        expect.objectContaining({ action: 'listing-selected', step: 2 }),
        expect.objectContaining({
          action: 'partner-notified',
          step: 3,
          metadata: expect.objectContaining({
            audience: ['customer', 'lister'],
            notifications: {
              customer: expect.stringMatching(
                /^Bangkok Office Â· Order: PRE-\d{4}-\d{6}: Please wait for the selected lister to accept the inquiry\.$/,
              ),
              lister: expect.any(String),
            },
          }),
        }),
      ]),
    );
    expect(customerSnapshot.reference).toBe(stored.poNumber);
    expect(customerSnapshot.attachments).toHaveLength(1);
    expect(customerSnapshot.history).toHaveLength(1);
    expect(listerSnapshot.history).toHaveLength(2);
    expect(customerSnapshot.listing).not.toHaveProperty('contact');
  });

  it('keeps the interested customer anonymous to the lister before fee completion', async () => {
    const stored = inquiry(PropertyInquiryStatus.NOTIFY_SENT);
    const prisma = {
      propertyInquiry: { findUnique: jest.fn().mockResolvedValue(stored) },
    } as unknown as PrismaService;
    const service = new PropertyWorkflowBridgeService(prisma, {
      search: jest.fn(),
    } as unknown as PropertyService);

    const snapshot = await service.snapshot(stored.poNumber, 'lister-1');

    expect(snapshot.customer).toEqual({
      id: null,
      name: 'Anonymous',
      email: null,
    });
  });

  it('returns the persisted Step 3 notification event to both participants', async () => {
    const stored = inquiry(PropertyInquiryStatus.NOTIFY_SENT);
    const createdAt = new Date('2026-07-22T03:04:05.000Z');
    stored.workflowEvents = [
      {
        action: 'partner-notified',
        status: PropertyInquiryStatus.NOTIFY_SENT,
        step: 3,
        actorId: 'customer-1',
        isPrivate: false,
        note: null,
        metadata: {
          sourceVersion: 'cblue-property-workflow-v1',
          audience: ['customer', 'lister'],
          notifications: {
            customer:
              'Bangkok Office · Order: PRE-2607-7944: Please wait for the selected lister to accept the inquiry.',
            lister:
              'Bangkok Office · Order: PRE-2607-7944: A customer selected your listing. Please accept or decline the inquiry.',
          },
        },
        createdAt,
      },
    ];
    const prisma = {
      propertyInquiry: { findUnique: jest.fn().mockResolvedValue(stored) },
    } as unknown as PrismaService;
    const service = new PropertyWorkflowBridgeService(prisma, {
      search: jest.fn(),
    } as unknown as PropertyService);

    const customer = await service.snapshot(stored.poNumber, 'customer-1');
    const lister = await service.snapshot(stored.poNumber, 'lister-1');

    expect(customer.workflowEvents).toEqual([
      expect.objectContaining({
        action: 'partner-notified',
        audience: ['customer', 'lister'],
        message:
          'Bangkok Office · Order: PRE-2607-7944: Please wait for the selected lister to accept the inquiry.',
        createdAt,
      }),
    ]);
    expect(lister.workflowEvents[0].message).toContain(
      'Please accept or decline the inquiry.',
    );
  });

  it('projects legacy notified Step 3 records at the actionable Step 4 without changing audit history', async () => {
    const stored = inquiry(PropertyInquiryStatus.NOTIFY_SENT);
    const prisma = {
      propertyInquiry: { findUnique: jest.fn().mockResolvedValue(stored) },
    } as unknown as PrismaService;
    const service = new PropertyWorkflowBridgeService(prisma, {
      search: jest.fn(),
    } as unknown as PropertyService);

    const snapshot = await service.snapshot(stored.poNumber, 'customer-1');

    expect(stored.step).toBe(3);
    expect(snapshot.currentStep).toBe(4);
    expect(snapshot.history).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: 'inquiry-created', step: 3 }),
      ]),
    );
  });

  it('persists lister acceptance and returns the updated Step 4 snapshot', async () => {
    const before = inquiry();
    const after = {
      ...before,
      status: PropertyInquiryStatus.ACCEPTED,
      step: 4,
      workflowEvents: [
        ...before.workflowEvents,
        {
          action: 'accept',
          status: PropertyInquiryStatus.ACCEPTED,
          step: 4,
          actorId: 'lister-1',
          isPrivate: false,
          note: null,
          createdAt: new Date('2026-07-12T02:00:00.000Z'),
        },
      ],
    };
    const prisma = {
      propertyInquiry: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(before)
          .mockResolvedValueOnce(after),
        update: jest.fn().mockResolvedValue({ poNumber: before.poNumber }),
      },
    } as unknown as PrismaService;
    const service = new PropertyWorkflowBridgeService(prisma, {
      search: jest.fn(),
    } as unknown as PropertyService);

    const result = await service.action(
      before.poNumber,
      'lister-1',
      'partner-accept',
      {},
    );

    expect(prisma.propertyInquiry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PropertyInquiryStatus.ACCEPTED,
          step: 4,
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: PropertyInquiryStatus.ACCEPTED,
        currentStep: 4,
        actionOwner: 'customer',
        nextActionStep: 5,
        nextActionLabel: 'Fee or free pass',
        nextActionOwner: 'customer',
        actions: expect.arrayContaining([
          expect.objectContaining({
            key: 'fee-proceed',
            owner: 'customer',
            actionStep: 5,
            feeMode: 'payment',
          }),
          expect.objectContaining({
            key: 'free-pass',
            owner: 'customer',
            actionStep: 5,
            feeMode: 'free-pass',
          }),
        ]),
      }),
    );
  });

  it('returns only persisted public listing fields', async () => {
    const propertyService = {
      search: jest
        .fn()
        .mockResolvedValue({
          properties: [property],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        }),
    } as unknown as PropertyService;
    const service = new PropertyWorkflowBridgeService(
      {} as PrismaService,
      propertyService,
    );
    const result = await service.listings({ page: 1, limit: 20 });
    expect(result.listings).toHaveLength(1);
    expect(result.listings[0]).not.toHaveProperty('contact');
    expect(result.listings[0].attachments[0].url).toBe(
      'https://files.example/listing.jpg',
    );
  });
  it('persists the meeting invitation note and keeps meeting actions on Step 7', async () => {
    const before = {
      ...inquiry(PropertyInquiryStatus.PAID),
      status: PropertyInquiryStatus.PAID,
      step: 5,
    };
    const after = {
      ...before,
      status: PropertyInquiryStatus.MEETING_SENT,
      step: 7,
      meetingDate: '2026-07-20',
      meetingTime: '14:00',
      meetingVenue: 'Saphan Song',
      meetingNote: 'Please meet at the main lobby.',
    };
    const prisma = {
      propertyInquiry: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(before)
          .mockResolvedValueOnce(after),
        update: jest.fn().mockResolvedValue({ poNumber: before.poNumber }),
      },
    } as unknown as PrismaService;
    const service = new PropertyWorkflowBridgeService(prisma, {
      search: jest.fn(),
    } as unknown as PropertyService);

    const result = await service.action(
      before.poNumber,
      'customer-1',
      'viewing-invite',
      {
        meetingDate: '2026-07-20',
        meetingTime: '14:00',
        meetingVenue: 'Saphan Song',
        note: 'Please meet at the main lobby.',
      },
    );

    expect(prisma.propertyInquiry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          step: 7,
          meetingNote: 'Please meet at the main lobby.',
        }),
      }),
    );
    expect(result.currentStep).toBe(7);
    expect(result).toEqual(
      expect.objectContaining({
        nextActionStep: 7,
        nextActionLabel: 'Confirm meeting',
        nextActionOwner: 'lister',
        meeting: {
          date: '2026-07-20',
          time: '14:00',
          venue: 'Saphan Song',
          note: 'Please meet at the main lobby.',
        },
        actions: expect.arrayContaining([
          expect.objectContaining({
            key: 'viewing-confirm',
            owner: 'lister',
            label: 'Confirm meeting',
            actionStep: 7,
          }),
        ]),
      }),
    );
  });

  it('does not expose customer cancellation as a lister action', async () => {
    const stored = inquiry(PropertyInquiryStatus.ACCEPTED);
    const prisma = {
      propertyInquiry: { findUnique: jest.fn().mockResolvedValue(stored) },
    } as unknown as PrismaService;
    const service = new PropertyWorkflowBridgeService(prisma, {
      search: jest.fn(),
    } as unknown as PropertyService);

    const snapshot = await service.snapshot(stored.poNumber, 'lister-1');

    expect(snapshot.availableActions).not.toContain('customer-cancel');
    await expect(
      service.action(stored.poNumber, 'lister-1', 'cancel', {}),
    ).rejects.toThrow('Only the customer may perform this action');
  });
  it.each([
    [
      PropertyInquiryStatus.NOTIFY_SENT,
      'lister-1',
      4,
      'Respond to property inquiry',
      'lister',
    ],
    [
      PropertyInquiryStatus.PAID,
      'customer-1',
      7,
      'Send meeting invitation',
      'customer',
    ],
    [
      PropertyInquiryStatus.MEETING_CONFIRMED,
      'customer-1',
      8,
      'Rate lister',
      'customer',
    ],
    [PropertyInquiryStatus.CANCELLED, 'customer-1', null, null, null],
    [PropertyInquiryStatus.DECLINED, 'customer-1', null, null, null],
    [PropertyInquiryStatus.COMPLETED, 'customer-1', null, null, null],
  ])(
    'returns the authoritative next action for %s',
    async (status, userId, nextActionStep, nextActionLabel, nextActionOwner) => {
      const stored = inquiry(status as PropertyInquiryStatus);
      const prisma = {
        propertyInquiry: { findUnique: jest.fn().mockResolvedValue(stored) },
      } as unknown as PrismaService;
      const service = new PropertyWorkflowBridgeService(prisma, {
        search: jest.fn(),
      } as unknown as PropertyService);

      const snapshot = await service.snapshot(stored.poNumber, userId as string);

      expectAuthoritativeSnapshot(snapshot);
      expect(snapshot).toEqual(
        expect.objectContaining({
          nextActionStep,
          nextActionLabel,
          nextActionOwner,
        }),
      );
    },
  );
  it.each([
    [
      PropertyInquiryStatus.NOTIFY_SENT,
      'lister-1',
      [
        { key: 'partner-accept', owner: 'lister', actionStep: 4 },
        { key: 'partner-decline', owner: 'lister', actionStep: 4 },
      ],
    ],
    [
      PropertyInquiryStatus.ACCEPTED,
      'customer-1',
      [
        {
          key: 'fee-proceed',
          owner: 'customer',
          actionStep: 5,
          feeMode: 'payment',
        },
        {
          key: 'free-pass',
          owner: 'customer',
          actionStep: 5,
          feeMode: 'free-pass',
        },
      ],
    ],
    [
      PropertyInquiryStatus.PAID,
      'customer-1',
      [{ key: 'viewing-invite', owner: 'customer', actionStep: 7 }],
    ],
    [
      PropertyInquiryStatus.MEETING_SENT,
      'lister-1',
      [{ key: 'viewing-confirm', owner: 'lister', actionStep: 7 }],
    ],
    [
      PropertyInquiryStatus.MEETING_CONFIRMED,
      'customer-1',
      [
        { key: 'rate-partner', owner: 'customer', actionStep: 8 },
        { key: 'rate-customer', owner: 'lister', actionStep: 8 },
      ],
    ],
  ])(
    'returns server-owned actions for %s',
    async (status, userId, expectedActions) => {
      const stored = inquiry(status as PropertyInquiryStatus);
      const prisma = {
        propertyInquiry: { findUnique: jest.fn().mockResolvedValue(stored) },
      } as unknown as PrismaService;
      const service = new PropertyWorkflowBridgeService(prisma, {
        search: jest.fn(),
      } as unknown as PropertyService);

      const snapshot = await service.snapshot(stored.poNumber, userId as string);

      expect(snapshot.actions).toEqual(
        expect.arrayContaining(
          expectedActions.map((action) => expect.objectContaining(action)),
        ),
      );
      for (const action of snapshot.actions) {
        expect(['customer', 'lister']).toContain(action.owner);
      }
    },
  );
  it('normalizes malformed persisted steps into the authoritative 1-8 range', async () => {
    const stored = { ...inquiry(), step: 99 };
    const prisma = {
      propertyInquiry: { findUnique: jest.fn().mockResolvedValue(stored) },
    } as unknown as PrismaService;
    const service = new PropertyWorkflowBridgeService(prisma, {
      search: jest.fn(),
    } as unknown as PropertyService);

    const snapshot = await service.snapshot(stored.poNumber, 'customer-1');

    expectAuthoritativeSnapshot(snapshot);
    expect(snapshot.currentStep).toBe(4);
  });
  it.each([
    [
      'lister accepts',
      PropertyInquiryStatus.NOTIFY_SENT,
      'lister-1',
      'partner-accept',
      {},
      PropertyInquiryStatus.ACCEPTED,
      4,
    ],
    [
      'lister declines',
      PropertyInquiryStatus.NOTIFY_SENT,
      'lister-1',
      'partner-decline',
      {},
      PropertyInquiryStatus.DECLINED,
      4,
    ],
    [
      'customer proceeds with normal fee',
      PropertyInquiryStatus.ACCEPTED,
      'customer-1',
      'fee-proceed',
      {},
      PropertyInquiryStatus.PAID,
      5,
    ],
    [
      'customer uses free pass',
      PropertyInquiryStatus.ACCEPTED,
      'customer-1',
      'free-pass',
      {},
      PropertyInquiryStatus.PAID,
      5,
    ],
    [
      'customer sends viewing invitation',
      PropertyInquiryStatus.PAID,
      'customer-1',
      'viewing-invite',
      {
        meetingDate: '2026-07-20',
        meetingTime: '14:00',
        meetingVenue: 'Saphan Song',
      },
      PropertyInquiryStatus.MEETING_SENT,
      7,
    ],
    [
      'lister confirms viewing invitation',
      PropertyInquiryStatus.MEETING_SENT,
      'lister-1',
      'viewing-confirm',
      {},
      PropertyInquiryStatus.MEETING_CONFIRMED,
      7,
    ],
    [
      'customer rates lister',
      PropertyInquiryStatus.MEETING_CONFIRMED,
      'customer-1',
      'rate-partner',
      { rating: 5 },
      PropertyInquiryStatus.MEETING_CONFIRMED,
      8,
    ],
    [
      'lister rates customer',
      PropertyInquiryStatus.MEETING_CONFIRMED,
      'lister-1',
      'rate-customer',
      { rating: 5 },
      PropertyInquiryStatus.MEETING_CONFIRMED,
      8,
    ],
    [
      'customer cancels',
      PropertyInquiryStatus.ACCEPTED,
      'customer-1',
      'customer-cancel',
      {},
      PropertyInquiryStatus.CANCELLED,
      4,
    ],
  ])(
    'returns an authoritative snapshot after %s',
    async (
      _name,
      beforeStatus,
      userId,
      action,
      dto,
      afterStatus,
      afterStep,
    ) => {
      const before = {
        ...inquiry(beforeStatus as PropertyInquiryStatus),
        status: beforeStatus as PropertyInquiryStatus,
      };
      const after = {
        ...before,
        status: afterStatus as PropertyInquiryStatus,
        step: afterStep as number,
        workflowEvents: [
          ...before.workflowEvents,
          {
            action,
            status: afterStatus,
            step: afterStep,
            actorId: userId,
            isPrivate: false,
            note: null,
            metadata: action === 'free-pass' ? { freePass: true } : {},
            createdAt: new Date('2026-07-12T03:00:00.000Z'),
          },
        ],
      };
      const prisma = {
        propertyInquiry: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce(before)
            .mockResolvedValueOnce(after),
          update: jest.fn().mockResolvedValue({ poNumber: before.poNumber }),
        },
      } as unknown as PrismaService;
      const service = new PropertyWorkflowBridgeService(prisma, {
        search: jest.fn(),
      } as unknown as PropertyService);

      const result = await service.action(
        before.poNumber,
        userId as string,
        action as any,
        dto as any,
      );

      expect(result.status).toBe(afterStatus);
      expect(result.currentStep).toBe(afterStep);
      expectAuthoritativeSnapshot(result);
      if (
        [
          PropertyInquiryStatus.CANCELLED,
          PropertyInquiryStatus.DECLINED,
        ].includes(afterStatus as PropertyInquiryStatus)
      ) {
        expect(result.actions).toEqual([]);
        expect(result.activityBucket).toBe('history');
      }
      if (action === 'free-pass') {
        expect(result.feeState.freePass).toBe(true);
      }
    },
  );
  it('exposes Step 6 chat without inventing a shared action owner', async () => {
    const stored = {
      ...inquiry(PropertyInquiryStatus.PAID),
      status: PropertyInquiryStatus.PAID,
      step: 5,
      workflowEvents: [
        {
          action: 'free-pass',
          status: PropertyInquiryStatus.PAID,
          step: 5,
          actorId: 'customer-1',
          isPrivate: false,
          note: null,
          metadata: {
            freePass: true,
            audience: ['customer', 'lister'],
          },
          createdAt: new Date('2026-07-12T02:00:00.000Z'),
        },
      ],
    };
    const prisma = {
      propertyInquiry: { findUnique: jest.fn().mockResolvedValue(stored) },
    } as unknown as PrismaService;
    const service = new PropertyWorkflowBridgeService(prisma, {
      search: jest.fn(),
    } as unknown as PropertyService);

    const snapshot = await service.snapshot(stored.poNumber, 'customer-1');

    expectAuthoritativeSnapshot(snapshot);
    expect(snapshot.stepLabels[5]).toBe('Chat');
    expect(snapshot.chat).toEqual(
      expect.objectContaining({
        enabled: true,
        state: 'available',
        activatedAt: expect.any(Date),
      }),
    );
    expect(snapshot.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'viewing-invite',
          owner: 'customer',
          actionStep: 7,
        }),
      ]),
    );
  });

  it('returns the authoritative tier fee and Free Pass action at Step 5', async () => {
    const stored = {
      ...inquiry(PropertyInquiryStatus.ACCEPTED),
      status: PropertyInquiryStatus.ACCEPTED,
      step: 4,
      property: { ...property, tier: 'ECONOMY' },
    };
    const prisma = {
      propertyInquiry: { findUnique: jest.fn().mockResolvedValue(stored) },
    } as unknown as PrismaService;
    const service = new PropertyWorkflowBridgeService(prisma, {
      search: jest.fn(),
    } as unknown as PropertyService);

    const snapshot = await service.snapshot(stored.poNumber, 'customer-1');

    expect(snapshot.processingFee).toEqual(
      expect.objectContaining({
        amount: 100,
        currency: 'THB',
        displayLabel: expect.stringContaining('100'),
      }),
    );
    expect(snapshot.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'free-pass',
          label: 'Free Pass',
          feeMode: 'free-pass',
        }),
      ]),
    );
  });

  it.each([
    [
      PropertyInquiryStatus.NOTIFY_SENT,
      'lister-1',
      'partner-accept',
      {},
    ],
    [
      PropertyInquiryStatus.MEETING_SENT,
      'lister-1',
      'viewing-confirm',
      {},
    ],
  ])(
    'persists participant notifications for %s via %s',
    async (beforeStatus, userId, action, dto) => {
      const before = inquiry(beforeStatus as PropertyInquiryStatus);
      const after = {
        ...before,
        status:
          action === 'partner-accept'
            ? PropertyInquiryStatus.ACCEPTED
            : PropertyInquiryStatus.MEETING_CONFIRMED,
        step: action === 'partner-accept' ? 4 : 7,
      };
      const prisma = {
        propertyInquiry: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce(before)
            .mockResolvedValueOnce(after),
          update: jest.fn().mockResolvedValue({ poNumber: before.poNumber }),
        },
      } as unknown as PrismaService;
      const service = new PropertyWorkflowBridgeService(prisma, {
        search: jest.fn(),
      } as unknown as PropertyService);

      await service.action(
        before.poNumber,
        userId as string,
        action as any,
        dto,
      );

      expect(prisma.propertyInquiry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workflowEvents: {
              create: expect.objectContaining({
                metadata: expect.objectContaining({
                  sourceVersion: 'cblue-property-workflow-v1',
                  audience: ['customer', 'lister'],
                  notifications: {
                    customer: expect.any(String),
                    lister: expect.any(String),
                  },
                }),
              }),
            },
          }),
        }),
      );
    },
  );

  it('returns persisted participant alerts newest-first with their messages', async () => {
    const acceptedAt = new Date('2026-07-22T04:05:06.000Z');
    const stored = {
      ...inquiry(PropertyInquiryStatus.ACCEPTED),
      status: PropertyInquiryStatus.ACCEPTED,
      workflowEvents: [
        {
          action: 'partner-accept',
          status: PropertyInquiryStatus.ACCEPTED,
          step: 4,
          actorId: 'lister-1',
          isPrivate: false,
          note: null,
          metadata: {
            audience: ['customer', 'lister'],
            notifications: {
              customer: 'The selected lister accepted your inquiry.',
              lister: 'You accepted the property inquiry.',
            },
          },
          createdAt: acceptedAt,
        },
      ],
    };
    const prisma = {
      propertyInquiry: { findUnique: jest.fn().mockResolvedValue(stored) },
    } as unknown as PrismaService;
    const service = new PropertyWorkflowBridgeService(prisma, {
      search: jest.fn(),
    } as unknown as PropertyService);

    const snapshot = await service.snapshot(stored.poNumber, 'customer-1');

    expect(snapshot.alerts[0]).toEqual(
      expect.objectContaining({
        action: 'partner-accept',
        createdAt: acceptedAt,
        message: 'The selected lister accepted your inquiry.',
      }),
    );
  });

  it.each([
    [PropertyInquiryStatus.NOTIFY_SENT, 3, 'customer-1', 'active', [], 'lister'],
    [PropertyInquiryStatus.NOTIFY_SENT, 3, 'lister-1', 'request', ['partner-accept', 'partner-decline'], 'lister'],
    [PropertyInquiryStatus.ACCEPTED, 4, 'customer-1', 'request', ['fee-proceed', 'free-pass'], 'customer'],
    [PropertyInquiryStatus.ACCEPTED, 4, 'lister-1', 'active', [], 'customer'],
    [PropertyInquiryStatus.PAID, 5, 'customer-1', 'request', ['viewing-invite'], 'customer'],
    [PropertyInquiryStatus.PAID, 5, 'lister-1', 'active', [], 'customer'],
    [PropertyInquiryStatus.MEETING_SENT, 7, 'customer-1', 'active', [], 'lister'],
    [PropertyInquiryStatus.MEETING_SENT, 7, 'lister-1', 'request', ['viewing-confirm'], 'lister'],
  ])(
    'projects %s activity for %s from the primary action owner',
    async (status, step, userId, bucket, expectedPrimaryActions, nextOwner) => {
      const stored = {
        ...inquiry(status as PropertyInquiryStatus),
        status: status as PropertyInquiryStatus,
        step: step as number,
      };
      const prisma = {
        propertyInquiry: { findUnique: jest.fn().mockResolvedValue(stored) },
      } as unknown as PrismaService;
      const service = new PropertyWorkflowBridgeService(prisma, {
        search: jest.fn(),
      } as unknown as PropertyService);
      const snapshot = await service.snapshot(stored.poNumber, userId as string);
      const primaryActions = snapshot.availableActions.filter(
        (key: string) => key !== 'customer-cancel',
      );
      expect(snapshot.activityBucket).toBe(bucket);
      expect(primaryActions).toEqual(expectedPrimaryActions);
      expect(snapshot.nextActionOwner).toBe(nextOwner);
    },
  );

  it.each([
    ['customer-1', 5, null, 'lister-1', 'rate-partner', 'rate-customer', 'lister', 'Rate customer'],
    ['lister-1', null, 4, 'customer-1', 'rate-customer', 'rate-partner', 'customer', 'Rate lister'],
  ])(
    'removes the submitted rating action and assigns the remaining rating',
    async (ratedUserId, customerRating, listerRating, pendingUserId, completedAction, pendingAction, pendingOwner, pendingLabel) => {
      const stored = {
        ...inquiry(PropertyInquiryStatus.MEETING_CONFIRMED),
        status: PropertyInquiryStatus.MEETING_CONFIRMED,
        step: 8,
        customerRating,
        listerRating,
      };
      const prisma = {
        propertyInquiry: { findUnique: jest.fn().mockResolvedValue(stored) },
      } as unknown as PrismaService;
      const service = new PropertyWorkflowBridgeService(prisma, {
        search: jest.fn(),
      } as unknown as PropertyService);
      const ratedSnapshot = await service.snapshot(stored.poNumber, ratedUserId as string);
      const pendingSnapshot = await service.snapshot(stored.poNumber, pendingUserId as string);
      expect(ratedSnapshot.availableActions).not.toContain(completedAction);
      expect(ratedSnapshot.activityBucket).toBe('history');
      expect(ratedSnapshot.nextActionOwner).toBe(pendingOwner);
      expect(ratedSnapshot.nextActionLabel).toBe(pendingLabel);
      expect(pendingSnapshot.availableActions).toContain(pendingAction);
      expect(pendingSnapshot.activityBucket).toBe('request');
    },
  );

  it('projects persisted GPS coordinates as the authoritative location presentation', async () => {
    const stored = inquiry();
    const prisma = {
      propertyInquiry: { findUnique: jest.fn().mockResolvedValue(stored) },
    } as unknown as PrismaService;
    const service = new PropertyWorkflowBridgeService(prisma, {
      search: jest.fn(),
    } as unknown as PropertyService);

    const snapshot = await service.snapshot(stored.poNumber, 'customer-1');

    expect(snapshot.locationPresentation).toEqual({
      mode: 'gps',
      coordinates: { latitude: 13.79, longitude: 100.61 },
      siteSubdistrict: 'Saphansong',
      postalCode: '10310',
      province: 'Bangkok',
      modalDisplay: '13.790000, 100.610000',
      summaryDisplay: 'Saphansong',
    });
  });

  it.each([
    ['null coordinates', null, null],
    ['zero coordinates', 0, 0],
  ])(
    'falls back to administrative location presentation for %s',
    async (_label, latitude, longitude) => {
      const stored = {
        ...inquiry(),
        property: {
          ...property,
          latitude,
          longitude,
          subdistrict: 'Saphan Song',
        },
      };
      const prisma = {
        propertyInquiry: { findUnique: jest.fn().mockResolvedValue(stored) },
      } as unknown as PrismaService;
      const service = new PropertyWorkflowBridgeService(prisma, {
        search: jest.fn(),
      } as unknown as PropertyService);

      const snapshot = await service.snapshot(stored.poNumber, 'customer-1');

      expect(snapshot.locationPresentation).toEqual({
        mode: 'administrative',
        coordinates: null,
        siteSubdistrict: 'Saphan Song',
        postalCode: '10310',
        province: 'Bangkok',
        modalDisplay: 'Saphan Song',
        summaryDisplay: 'Saphan Song',
      });
    },
  );

  it('combines listing media and inquiry attachments into uploadedFiles and preserves legacy fields', async () => {
    const stored = {
      ...inquiry(),
      property: {
        ...property,
        images: [
          {
            id: 'image-1',
            url: 'https://files.example/listing.jpg',
            key: 'listing.jpg',
            sortOrder: 0,
            isPrimary: true,
          },
        ],
      },
      attachments: [
        {
          id: 'file-1',
          label: 'Floor plan',
          url: 'https://files.example/floor.pdf',
          key: 'floor.pdf',
          createdAt: new Date('2026-07-12T00:00:00.000Z'),
        },
      ],
    };
    const prisma = {
      propertyInquiry: { findUnique: jest.fn().mockResolvedValue(stored) },
    } as unknown as PrismaService;
    const service = new PropertyWorkflowBridgeService(prisma, {
      search: jest.fn(),
    } as unknown as PropertyService);

    const snapshot = await service.snapshot(stored.poNumber, 'customer-1');

    expect(snapshot.uploadedFiles).toEqual([
      expect.objectContaining({
        source: 'listing',
        key: 'listing.jpg',
        url: 'https://files.example/listing.jpg',
      }),
      expect.objectContaining({
        source: 'inquiry',
        key: 'floor.pdf',
        url: 'https://files.example/floor.pdf',
      }),
    ]);
    expect(snapshot.listing.attachments).toHaveLength(1);
    expect(snapshot.attachments).toHaveLength(1);
    // Pre-fee inquiries must not expose lister contact information.
    expect(snapshot.listing).not.toHaveProperty('contact');
  });

  it('deduplicates uploaded files by url and returns an empty list without persisted files', async () => {
    const dupUrl = 'https://files.example/shared.jpg';
    const stored = {
      ...inquiry(),
      property: {
        ...property,
        images: [
          {
            id: 'image-shared',
            url: dupUrl,
            key: 'shared.jpg',
            sortOrder: 0,
            isPrimary: true,
          },
        ],
      },
      attachments: [
        {
          id: 'file-shared',
          label: 'Shared',
          url: dupUrl,
          key: 'shared.jpg',
          createdAt: new Date('2026-07-12T00:00:00.000Z'),
        },
      ],
    };
    const prisma = {
      propertyInquiry: { findUnique: jest.fn().mockResolvedValue(stored) },
    } as unknown as PrismaService;
    const service = new PropertyWorkflowBridgeService(prisma, {
      search: jest.fn(),
    } as unknown as PropertyService);

    const snapshot = await service.snapshot(stored.poNumber, 'customer-1');

    expect(snapshot.uploadedFiles).toHaveLength(1);
    expect(snapshot.uploadedFiles[0].url).toBe(dupUrl);

    const empty = {
      ...inquiry(),
      property: { ...property, images: [] },
      attachments: [],
    };
    const emptyPrisma = {
      propertyInquiry: { findUnique: jest.fn().mockResolvedValue(empty) },
    } as unknown as PrismaService;
    const emptyService = new PropertyWorkflowBridgeService(emptyPrisma, {
      search: jest.fn(),
    } as unknown as PropertyService);
    const emptySnapshot = await emptyService.snapshot(empty.poNumber, 'customer-1');
    expect(emptySnapshot.uploadedFiles).toEqual([]);
  });
});
