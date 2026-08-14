import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { BlueBridgeController } from './blue-bridge.controller';
import { BlueBridgeService } from './blue-bridge.service';
import { FixerWorkflowBridgeService } from './fixer-workflow-bridge.service';
import { UserService } from '../user/user.service';

describe('BlueBridgeController', () => {
  let app: INestApplication;
  const bridge = {
    workflowDetails: jest.fn().mockResolvedValue({
      detailRows: [{ label: 'Customer', value: 'Bhisashmintra' }],
      budgetLines: ['Budget', '= ฿2,910,000'],
      budgetBreakdown: [],
      uploadedFiles: [],
    }),
    workflowActivities: jest.fn().mockResolvedValue({
      sourceVersion: 'cblue-fixer-workflow-activities-v1',
      requests: [],
      activeJobs: [],
      history: [],
      chatRooms: [],
      alerts: [],
      upcomingMeetings: [],
    }),
    workflowChat: jest.fn().mockResolvedValue({
      poNumber: 'PO-2607-8879',
      chat: { enabled: true, messageItems: [] },
    }),
    postWorkflowChat: jest.fn().mockResolvedValue({
      poNumber: 'PO-2607-8879',
      chat: { enabled: true, messageItems: [] },
    }),
    assertBridgeKey: jest.fn(),
    resolveBridgeCustomer: jest.fn().mockResolvedValue({ id: 'customer-1' }),
  };
  const fixerWorkflow = { action: jest.fn() };
  const users = {
    getContactProfile: jest.fn().mockResolvedValue({
      id: 'customer-1',
      name: 'Customer',
      legalName: 'Customer',
      email: 'customer@example.com',
      phone: '0812345678',
      role: 'USER',
      createdAt: '2026-08-14T00:00:00.000Z',
      companyIdentityVerified: false,
      profileComplete: true,
    }),
    updateProfile: jest.fn(),
  };

  beforeEach(async () => {
    bridge.workflowDetails.mockClear();
    bridge.workflowActivities.mockClear();
    bridge.workflowChat.mockClear();
    bridge.postWorkflowChat.mockClear();
    bridge.assertBridgeKey.mockClear();
    bridge.resolveBridgeCustomer.mockClear();
    fixerWorkflow.action.mockClear();
    users.getContactProfile.mockClear();
    users.updateProfile.mockClear();
    const moduleRef = await Test.createTestingModule({
      controllers: [BlueBridgeController],
      providers: [
        { provide: BlueBridgeService, useValue: bridge },
        { provide: FixerWorkflowBridgeService, useValue: fixerWorkflow },
        { provide: UserService, useValue: users },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  it('returns and updates the server-owned customer profile for BLUE', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/blue/customer-profile')
      .query({ legacySubjectId: 'blue-customer-1' })
      .set('x-blue-bridge-key', 'bridge-key')
      .expect(200)
      .expect(({ body }) => {
        expect(body.phone).toBe('0812345678');
        expect(body.createdAt).toBe('2026-08-14T00:00:00.000Z');
      });

    await request(app.getHttpServer())
      .put('/api/v1/blue/customer-profile/phone')
      .set('x-blue-bridge-key', 'bridge-key')
      .send({ legacySubjectId: 'blue-customer-1', phone: '0822222222' })
      .expect(200);

    expect(bridge.assertBridgeKey).toHaveBeenCalledWith('bridge-key');
    expect(bridge.resolveBridgeCustomer).toHaveBeenCalledWith(
      'blue-customer-1',
    );
    expect(users.updateProfile).toHaveBeenCalledWith('customer-1', {
      phone: '0822222222',
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it('registers the BLUE workflow detail endpoint under /api/v1 and returns 200', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/blue/workflow-details/PO-2606-4636')
      .query({ legacySubjectId: 'linked-cblue-user-id' })
      .set('x-blue-bridge-key', 'bridge-key')
      .expect(200)
      .expect(({ body }) => {
        expect(body.detailRows).toEqual([
          { label: 'Customer', value: 'Bhisashmintra' },
        ]);
      });

    expect(bridge.workflowDetails).toHaveBeenCalledWith({
      poNumber: 'PO-2606-4636',
      legacySubjectId: 'linked-cblue-user-id',
      bridgeKey: 'bridge-key',
    });
  });
  it('registers actor-scoped workflow activities and forwards the bridge key', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/blue/workflow-activities')
      .query({ legacySubjectId: 'ghiscafe@gmail.com', persona: 'customer' })
      .set('x-blue-bridge-key', 'bridge-key')
      .expect(200)
      .expect(({ body }) => {
        expect(body.sourceVersion).toBe('cblue-fixer-workflow-activities-v1');
      });

    expect(bridge.workflowActivities).toHaveBeenCalledWith({
      legacySubjectId: 'ghiscafe@gmail.com',
      persona: 'customer',
      bridgeKey: 'bridge-key',
    });
  });

  it('registers persisted workflow chat routes and forwards the actor identity', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/blue/workflow-details/PO-2607-8879/chat')
      .query({ legacySubjectId: 'ghiscafe@gmail.com' })
      .set('x-blue-bridge-key', 'bridge-key')
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/blue/workflow-details/PO-2607-8879/chat')
      .query({ legacySubjectId: 'ghiscafe@gmail.com' })
      .set('x-blue-bridge-key', 'bridge-key')
      .send({ text: 'Persist this message' })
      .expect(201);

    expect(bridge.workflowChat).toHaveBeenCalledWith({
      poNumber: 'PO-2607-8879',
      legacySubjectId: 'ghiscafe@gmail.com',
      bridgeKey: 'bridge-key',
    });
    expect(bridge.postWorkflowChat).toHaveBeenCalledWith({
      poNumber: 'PO-2607-8879',
      legacySubjectId: 'ghiscafe@gmail.com',
      bridgeKey: 'bridge-key',
      text: 'Persist this message',
    });
  });
});
