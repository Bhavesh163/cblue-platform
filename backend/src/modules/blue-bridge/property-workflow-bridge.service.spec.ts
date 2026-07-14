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
          step: 3,
        }),
      }),
    );
    expectAuthoritativeSnapshot(customerSnapshot);
    expectAuthoritativeSnapshot(listerSnapshot);
    expect(customerSnapshot.currentStep).toBe(3);
    const createData = (prisma.propertyInquiry.create as jest.Mock).mock.calls[0][0].data;
    expect(createData.workflowEvents.create).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: 'match-selected', step: 1 }),
        expect.objectContaining({ action: 'listing-selected', step: 2 }),
        expect.objectContaining({ action: 'partner-notified', step: 3 }),
      ]),
    );
    expect(customerSnapshot.reference).toBe(stored.poNumber);
    expect(customerSnapshot.attachments).toHaveLength(1);
    expect(customerSnapshot.history).toHaveLength(1);
    expect(listerSnapshot.history).toHaveLength(2);
    expect(customerSnapshot.listing).not.toHaveProperty('contact');
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
  it('keeps the meeting invitation and confirmation on Step 7', async () => {
    const before = {
      ...inquiry(PropertyInquiryStatus.PAID),
      status: PropertyInquiryStatus.PAID,
      step: 5,
    };
    const after = {
      ...before,
      status: PropertyInquiryStatus.MEETING_SENT,
      step: 7,
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
      },
    );

    expect(prisma.propertyInquiry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ step: 7 }),
      }),
    );
    expect(result.currentStep).toBe(7);
    expect(result).toEqual(
      expect.objectContaining({
        nextActionStep: 7,
        nextActionLabel: 'Confirm viewing invitation',
        nextActionOwner: 'lister',
        actions: expect.arrayContaining([
          expect.objectContaining({
            key: 'viewing-confirm',
            owner: 'lister',
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
      'Send viewing invitation',
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
    expect(snapshot.currentStep).toBe(3);
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
      expect.objectContaining({ enabled: true, state: 'available' }),
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
});
