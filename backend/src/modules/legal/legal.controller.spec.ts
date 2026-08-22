import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { LegalController } from './legal.controller';
import { LegalService } from './legal.service';

describe('LegalController', () => {
  let app: INestApplication;
  const legal = {
    policies: jest.fn().mockReturnValue({
      termsOfUseUrl: 'https://www.cblue.co.th/en/terms',
      refundPolicyUrl: 'https://www.cblue.co.th/en/refund-policy',
      retentionPolicyUrl: 'https://www.cblue.co.th/en/retention-policy',
    }),
  };

  beforeEach(async () => {
    legal.policies.mockClear();
    const moduleRef = await Test.createTestingModule({
      controllers: [LegalController],
      providers: [{ provide: LegalService, useValue: legal }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('serves localized HTTPS policy URLs without authentication', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/legal/policies')
      .query({ locale: 'zh' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.termsOfUseUrl).toBe('https://www.cblue.co.th/en/terms');
        expect(body.refundPolicyUrl).toBe('https://www.cblue.co.th/en/refund-policy');
        expect(body.retentionPolicyUrl).toBe('https://www.cblue.co.th/en/retention-policy');
      });

    expect(legal.policies).toHaveBeenCalledWith('zh');
  });
});
