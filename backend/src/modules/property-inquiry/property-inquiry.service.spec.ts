import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PropertyInquiryStatus } from '@prisma/client';
import { PropertyInquiryService } from './property-inquiry.service';
import { PrismaService } from '../../prisma/prisma.service';

function buildInquiry(status: PropertyInquiryStatus) {
  return {
    id: 'inquiry-1',
    poNumber: 'PRE-2607-100001',
    customerId: 'customer-1',
    listerUserId: 'lister-1',
    customerEmail: 'customer@example.com',
    customer: { email: 'customer@example.com' },
    lister: { email: 'lister@example.com' },
    property: { user: { email: 'lister@example.com' } },
    status,
    step: 5,
    meetingDate: null,
    meetingTime: null,
    meetingVenue: null,
    customerRating: null,
    customerComment: null,
    listerRating: null,
    listerComment: null,
    reselectedOnce: false,
  };
}

describe('PropertyInquiryService workflow guards', () => {
  let service: PropertyInquiryService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      propertyInquiry: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new PropertyInquiryService(prisma as PrismaService);
  });

  it('persists the actionable Step 4 after the Step 3 partner notification event', async () => {
    const createPrisma = {
      property: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'property-1',
          userId: 'lister-1',
          contactName: 'Lister',
          title: 'House',
        }),
      },
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: 'lister-1', name: 'Lister' })
          .mockResolvedValueOnce({
            id: 'customer-1',
            name: 'Customer',
            email: 'customer@example.com',
            fixer: null,
          }),
      },
      propertyInquiry: {
        create: jest.fn().mockResolvedValue({
          id: 'inquiry-1',
          poNumber: 'PRE-2607-7944',
        }),
      },
    } as unknown as PrismaService;
    const createService = new PropertyInquiryService(createPrisma);

    await createService.create('customer-1', {
      poNumber: 'PRE-2607-7944',
      propertyId: 'property-1',
      customerName: 'Customer',
      customerEmail: 'customer@example.com',
      listerName: 'Lister',
    });

    expect(createPrisma.propertyInquiry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PropertyInquiryStatus.NOTIFY_SENT,
          step: 4,
          workflowEvents: {
            create: expect.objectContaining({
              action: 'partner-notified',
              step: 3,
              metadata: {
                sourceVersion: 'cblue-property-workflow-v1',
                audience: ['customer', 'lister'],
                notifications: {
                  customer:
                    'House \u00b7 Order: PRE-2607-7944: Please wait for the selected lister to accept the inquiry.',
                  lister:
                    'House \u00b7 Order: PRE-2607-7944: A customer selected your listing. Please accept or decline the inquiry.',
                },
              },
            }),
          },
        }),
      }),
    );
  });

  it('does not allow a lister to cancel a property inquiry', async () => {
    prisma.propertyInquiry.findUnique.mockResolvedValue(
      buildInquiry(PropertyInquiryStatus.ACCEPTED),
    );
    jest
      .spyOn(service as any, 'resolveLinkedUserIds')
      .mockResolvedValue(['lister-1']);
    jest.spyOn(service as any, 'resolveLinkedEmails').mockResolvedValue([]);

    await expect(
      service.update('inquiry-1', 'lister-1', {
        status: PropertyInquiryStatus.CANCELLED,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('forces a customer viewing invitation onto Step 7', async () => {
    prisma.propertyInquiry.findUnique.mockResolvedValue(
      buildInquiry(PropertyInquiryStatus.PAID),
    );
    prisma.propertyInquiry.update.mockResolvedValue({
      id: 'inquiry-1',
      status: PropertyInquiryStatus.MEETING_SENT,
      step: 7,
    });
    jest
      .spyOn(service as any, 'resolveLinkedUserIds')
      .mockResolvedValue(['customer-1']);
    jest.spyOn(service as any, 'resolveLinkedEmails').mockResolvedValue([]);

    await service.update('inquiry-1', 'customer-1', {
      status: PropertyInquiryStatus.MEETING_SENT,
      step: 6,
      meetingDate: '2026-07-20',
      meetingTime: '14:00',
      meetingVenue: 'Saphan Song',
    });

    expect(prisma.propertyInquiry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PropertyInquiryStatus.MEETING_SENT,
          step: 7,
        }),
      }),
    );
  });

  it('blocks property chat until Fee & Proceed succeeds', async () => {
    jest.spyOn(service as any, 'findAuthorizedInquiryByPo').mockResolvedValue({
      id: 'inquiry-1',
      poNumber: 'PRE-2607-100001',
      status: PropertyInquiryStatus.NOTIFY_SENT,
    });

    await expect(
      service.sendChatByPo('customer-1', 'PRE-2607-100001', 'Hello'),
    ).rejects.toThrow(BadRequestException);
  });

  it('includes ordered inquiry attachments alongside property images in findByCustomer', async () => {
    const listPrisma = {
      propertyInquiry: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: { findMany: jest.fn().mockResolvedValue([]) },
      subscriber: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    const listService = new PropertyInquiryService(listPrisma);
    jest
      .spyOn(listService as any, 'resolveLinkedUserIds')
      .mockResolvedValue(['customer-1']);
    jest
      .spyOn(listService as any, 'resolveLinkedEmails')
      .mockResolvedValue(['customer@example.com']);

    await listService.findByCustomer('customer-1');

    expect(listPrisma.propertyInquiry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          attachments: { orderBy: { createdAt: 'asc' } },
          workflowEvents: { orderBy: { createdAt: 'asc' } },
        }),
      }),
    );
  });

  it('includes ordered inquiry attachments alongside property images in findByLister', async () => {
    const listPrisma = {
      propertyInquiry: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: { findMany: jest.fn().mockResolvedValue([]) },
      subscriber: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    const listService = new PropertyInquiryService(listPrisma);
    jest
      .spyOn(listService as any, 'resolveLinkedUserIds')
      .mockResolvedValue(['lister-1']);
    jest
      .spyOn(listService as any, 'resolveLinkedEmails')
      .mockResolvedValue(['lister@example.com']);

    await listService.findByLister('lister-1');

    expect(listPrisma.propertyInquiry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          attachments: { orderBy: { createdAt: 'asc' } },
          workflowEvents: { orderBy: { createdAt: 'asc' } },
        }),
      }),
    );
  });
});
