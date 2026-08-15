import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { BlueBridgeService } from './blue-bridge.service';

describe('BLUE property activity compatibility', () => {
  it('includes the accepted property inquiry in the customer activity feed', async () => {
    const prisma = {
      subscriber: { findFirst: jest.fn().mockResolvedValue(null) },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'customer-1' }]) },
      order: { findMany: jest.fn().mockResolvedValue([]) },
      notification: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    const propertyWorkflow = {
      activitiesForUserIds: jest.fn().mockResolvedValue([
        {
          sourceVersion: 'cblue-property-workflow-v1',
          poNumber: 'PRE-2608-688050',
          currentStep: 4,
          totalSteps: 8,
          workflowVersion: 0,
          workflowPhase: 'ACCEPTED',
          workflowEvents: [
            {
              action: 'accept',
              actorRole: 'partner',
              step: 4,
              createdAt: '2026-08-15T08:00:00.000Z',
            },
          ],
          status: 'ACCEPTED',
          lifecycleStatus: 'ACCEPTED',
          activityBucket: 'request',
          title: 'Townhouse for Sale/Rent at Fountain circle in Hat Yai',
          serviceCategory: 'TOWNHOUSE',
          createdAt: '2026-08-15T07:00:00.000Z',
          updatedAt: '2026-08-15T08:00:00.000Z',
          location: 'Hat Yai',
          customer: { id: 'customer-1', displayName: 'Test1' },
          partner: { id: 'lister-1', displayName: 'Ghis Cafe' },
          actions: [
            {
              key: 'fee-proceed',
              owner: 'customer',
              label: 'Proceed with fee',
              actionStep: 5,
            },
          ],
          availableActions: ['fee-proceed'],
          actionNeeded: true,
          actionOwner: 'customer',
          nextActionKey: 'fee-proceed',
          nextActionLabel: 'Fee or free pass',
          nextActionOwner: 'customer',
          nextActionStep: 5,
          processingFee: null,
          chat: { enabled: false, messageItems: [] },
          meeting: null,
          messageItems: [],
        },
      ]),
    };
    const service = new BlueBridgeService(
      prisma,
      new ConfigService({ blueBridge: { apiKey: 'bridge-key' } }),
      propertyWorkflow as any,
    );

    const result = await service.workflowActivities({
      legacySubjectId: 'customer-1',
      persona: 'customer',
      bridgeKey: 'bridge-key',
    });

    expect(propertyWorkflow.activitiesForUserIds).toHaveBeenCalledWith(
      ['customer-1'],
      'customer',
    );
    expect(result.requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          poNumber: 'PRE-2608-688050',
          currentStep: 4,
          totalSteps: 8,
          activityBucket: 'request',
        }),
      ]),
    );
    expect(result.alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'PROPERTY_WORKFLOW',
          action: 'accept',
          currentStep: 4,
        }),
      ]),
    );
  });
});
