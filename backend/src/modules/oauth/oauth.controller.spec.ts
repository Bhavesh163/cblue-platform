import { OauthController } from './oauth.controller';
import { OauthService } from './oauth.service';

describe('OauthController', () => {
  let service: {
    discovery: jest.Mock;
    jwks: jest.Mock;
    exchangeToken: jest.Mock;
  };
  let controller: OauthController;

  beforeEach(() => {
    service = {
      discovery: jest.fn().mockReturnValue({ issuer: 'https://cblue.co.th' }),
      jwks: jest.fn().mockReturnValue({ keys: [] }),
      exchangeToken: jest.fn().mockReturnValue({ access_token: 'token' }),
    };
    controller = new OauthController(service as unknown as OauthService);
  });

  it('passes discovery and JWKS through without requiring bridge tokens', () => {
    expect(controller.discovery()).toEqual({ issuer: 'https://cblue.co.th' });
    expect(controller.jwks()).toEqual({ keys: [] });
    expect(service.discovery).toHaveBeenCalledTimes(1);
    expect(service.jwks).toHaveBeenCalledTimes(1);
  });

  it('accepts RFC8693 token exchange client credentials from HTTP Basic auth', () => {
    const body = {
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
      subject_token: 'blue.jwt.token',
      audience: 'CBLUE',
    };
    const basic = `Basic ${Buffer.from('blue-client:blue-secret').toString('base64')}`;

    const result = controller.token(body as any, basic);

    expect(result).toEqual({ access_token: 'token' });
    expect(service.exchangeToken).toHaveBeenCalledWith({
      ...body,
      client_id: 'blue-client',
      client_secret: 'blue-secret',
    });
  });

  it('keeps explicit client_secret_post credentials when both auth methods are sent', () => {
    const body = {
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
      subject_token: 'blue.jwt.token',
      audience: 'CBLUE',
      client_id: 'posted-client',
      client_secret: 'posted-secret',
    };
    const basic = `Basic ${Buffer.from('basic-client:basic-secret').toString('base64')}`;

    controller.token(body as any, basic);

    expect(service.exchangeToken).toHaveBeenCalledWith(body);
  });
});
