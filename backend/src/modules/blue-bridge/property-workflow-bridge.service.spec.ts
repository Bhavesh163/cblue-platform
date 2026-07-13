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
      'accept',
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
});
