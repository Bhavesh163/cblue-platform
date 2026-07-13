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
});
