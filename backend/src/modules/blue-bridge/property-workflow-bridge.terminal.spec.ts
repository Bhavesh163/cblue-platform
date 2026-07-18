import { PropertyInquiryStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PropertyService } from '../property/property.service';
import { PropertyWorkflowBridgeService } from './property-workflow-bridge.service';
describe('Property workflow terminal snapshots', () => {
  it('moves cancelled persisted inquiries to history and clears chat and alerts', async () => {
    const inquiry = {
      id: 'inquiry-1',
      poNumber: 'PRE-2605-5354',
      customerId: 'customer-1',
      customerName: 'Customer',
      customerEmail: 'customer@example.com',
      listerUserId: 'lister-1',
      listerName: 'Lister',
      status: PropertyInquiryStatus.CANCELLED,
      step: 6,
      requestDetails: '',
      meetingDate: null,
      meetingTime: null,
      meetingVenue: null,
      customerRating: null,
      customerComment: null,
      listerRating: null,
      listerComment: null,
      createdAt: new Date('2026-07-12T00:00:00.000Z'),
      updatedAt: new Date('2026-07-12T03:00:00.000Z'),
      property: {
        id: 'property-1',
        title: 'Bangkok Office',
        propertyType: 'OFFICE',
        listingType: 'RENT',
        tier: 'STANDARD',
        price: 50000,
        province: 'Bangkok',
        district: 'Wang Thonglang',
        subdistrict: null,
        postalCode: null,
        addressLine: null,
        latitude: null,
        longitude: null,
        images: [],
      },
      attachments: [],
      workflowEvents: [
        {
          action: 'customer-cancel',
          status: PropertyInquiryStatus.CANCELLED,
          step: 6,
          actorId: 'customer-1',
          isPrivate: false,
          note: 'Customer cancelled',
          metadata: null,
          createdAt: new Date('2026-07-12T03:00:00.000Z'),
        },
      ],
    };
    const prisma = {
      propertyInquiry: { findUnique: jest.fn().mockResolvedValue(inquiry) },
    } as unknown as PrismaService;
    const service = new PropertyWorkflowBridgeService(prisma, {
      search: jest.fn(),
    } as unknown as PropertyService);
    const snapshot = await service.snapshot(inquiry.poNumber, 'customer-1');
    expect(snapshot).toEqual(
      expect.objectContaining({
        activityBucket: 'history',
        terminalState: PropertyInquiryStatus.CANCELLED,
        availableActions: [],
        alerts: [],
      }),
    );
    expect(snapshot.chat).toEqual(
      expect.objectContaining({ state: 'closed', messages: [] }),
    );
    expect(snapshot.history).toHaveLength(1);
  });
});
