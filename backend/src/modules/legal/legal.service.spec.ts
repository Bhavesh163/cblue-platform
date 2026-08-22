import { ConfigService } from '@nestjs/config';
import { LegalService } from './legal.service';

describe('LegalService', () => {
  it('returns localized HTTPS URLs from the configured HTTPS web origin', () => {
    const config = {
      get: jest.fn().mockReturnValue('https://cblue.co.th/'),
    } as unknown as ConfigService;

    const service = new LegalService(config);

    expect(service.policies('zh')).toEqual({
      termsOfUseUrl: 'https://cblue.co.th/zh/terms',
      refundPolicyUrl: 'https://cblue.co.th/zh/refund-policy',
      retentionPolicyUrl: 'https://cblue.co.th/zh/retention-policy',
    });
  });

  it('uses the canonical HTTPS origin when deployment configuration is not HTTPS', () => {
    const config = {
      get: jest.fn().mockReturnValue('http://api-backend.cblue.co.th'),
    } as unknown as ConfigService;

    const service = new LegalService(config);

    expect(service.policies()).toEqual({
      termsOfUseUrl: 'https://www.cblue.co.th/en/terms',
      refundPolicyUrl: 'https://www.cblue.co.th/en/refund-policy',
      retentionPolicyUrl: 'https://www.cblue.co.th/en/retention-policy',
    });
  });
});
