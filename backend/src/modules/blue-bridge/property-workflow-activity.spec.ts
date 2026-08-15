import { PropertyInquiryStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PropertyService } from '../property/property.service';
import { PropertyWorkflowBridgeService } from './property-workflow-bridge.service';

describe('property workflow activity projection', () => {
  it('returns the persisted property inquiry in the actor-scoped activity feed', async () => {
    const inquiry = {
      id: 'inquiry-1',
      poNumber: 'PRE-2608-688050',
      propertyId: 'property-1',
      customerId: 'customer-1',
      listerUserId: 'lister-1',
      customerName: 'Test1',
      customerEmail: 'test1@example.com',
      listerName: 'Ghis Cafe',
      status: PropertyInquiryStatus.ACCEPTED,
      step: 4,
      requestDetails: 'Please arrange a viewing.',
      meetingDate: null,
      meetingTime: null,
      meetingVenue: null,
      meetingNote: null,
      customerRating: null,
      customerComment: null,
      listerRating: null,
      listerComment: null,
      createdAt: new Date('2026-08-15T07:00:00.000Z'),
      updatedAt: new Date('2026-08-15T08:00:00.000Z'),
      property: {
        id: 'property-1',
        userId: 'lister-1',
        title: 'Townhouse for Sale/Rent at Fountain circle in Hat Yai',
        propertyType: 'TOWNHOUSE',
        listingType: 'SALE',
        tier: 'STANDARD',
        price: 7500000,
        province: 'Songkhla',
        district: 'Hat Yai',
        subdistrict: 'Hat Yai',
        postalCode: '90110',
        addressLine: 'Fountain circle',
        latitude: 7.008,
        longitude: 100.474,
        contactName: 'Ghis Cafe',
        contactPhone: '0800000000',
        contactEmail: 'ghis@example.com',
        images: [],
      },
      attachments: [],
      workflowEvents: [
        {
          action: 'accept',
          status: PropertyInquiryStatus.ACCEPTED,
          step: 4,
          actorId: 'lister-1',
          isPrivate: false,
          note: null,
          metadata: {},
          createdAt: new Date('2026-08-15T08:00:00.000Z'),
        },
      ],
    };
    const prisma = {
      propertyInquiry: {
        findMany: jest.fn().mockResolvedValue([inquiry]),
      },
    } as unknown as PrismaService;
    const service = new PropertyWorkflowBridgeService(prisma, {
      search: jest.fn(),
    } as unknown as PropertyService);

    const activities = await service.activitiesForUserIds(
      ['customer-1'],
      'customer',
    );

    expect(prisma.propertyInquiry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { customerId: { in: ['customer-1'] } },
        orderBy: { createdAt: 'desc' },
      }),
    );
    expect(activities[0]).toEqual(
      expect.objectContaining({
        poNumber: 'PRE-2608-688050',
        currentStep: 4,
        totalSteps: 8,
        activityBucket: 'request',
      }),
    );
  });
});
