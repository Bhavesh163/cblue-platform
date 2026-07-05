import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { BlueBridgeController } from './blue-bridge.controller';
import { BlueBridgeService } from './blue-bridge.service';

describe('BlueBridgeController', () => {
  let app: INestApplication;
  const bridge = {
    workflowDetails: jest.fn().mockResolvedValue({
      detailRows: [{ label: 'Customer', value: 'Bhisashmintra' }],
      budgetLines: ['Budget', '= ฿2,910,000'],
      budgetBreakdown: [],
      uploadedFiles: [],
    }),
  };

  beforeEach(async () => {
    bridge.workflowDetails.mockClear();
    const moduleRef = await Test.createTestingModule({
      controllers: [BlueBridgeController],
      providers: [{ provide: BlueBridgeService, useValue: bridge }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
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
});
