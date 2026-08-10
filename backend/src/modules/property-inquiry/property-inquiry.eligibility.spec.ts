import { ConflictException } from '@nestjs/common';
import { PropertyInquiryService } from './property-inquiry.service';

describe('PropertyInquiryService qualification eligibility', () => {
  it('rejects a new inquiry when the lister identity has expired', async () => {
    const prisma = {
      property: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'property-1',
          userId: 'lister-1',
          title: 'House',
          contactName: 'Lister',
          user: {
            fixer: {
              status: 'APPROVED',
              verified: true,
              verifiedCompanyName: null,
              qualificationEligibilityStatus: 'ELIGIBLE',
              kycValidUntil: new Date('2026-01-01T00:00:00.000Z'),
              kycReverificationRequiredAt: null,
              kycReverificationReasons: null,
              tierReevaluationRequestedAt: null,
              tierReevaluationCompletedAt: null,
            },
          },
        }),
      },
      user: { findUnique: jest.fn() },
      propertyInquiry: { create: jest.fn() },
    };
    const service = new PropertyInquiryService(prisma as never);

    await expect(
      service.create('customer-1', {
        poNumber: 'PRE-2608-1001',
        propertyId: 'property-1',
        customerName: 'Customer',
        customerEmail: 'customer@example.com',
        listerName: 'Lister',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.propertyInquiry.create).not.toHaveBeenCalled();
  });
});
