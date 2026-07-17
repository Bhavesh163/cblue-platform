import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateKeyPairSync, createSign } from 'crypto';

import { PrismaService } from '../../prisma/prisma.service';
import { OauthService } from './oauth.service';
import { RefreshSessionService } from '../auth/refresh-session.service';

function base64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signJwt(
  privateKey: string,
  kid: string,
  payload: Record<string, unknown>,
) {
  const header = base64url(JSON.stringify({ alg: 'RS256', kid, typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const signingInput = `${header}.${body}`;
  const signature = createSign('RSA-SHA256')
    .update(signingInput)
    .end()
    .sign(privateKey);
  return `${signingInput}.${base64url(signature)}`;
}

describe('OauthService', () => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const blueKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const cblueKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const bluePrivateKey = blueKeys.privateKey.export({
    type: 'pkcs8',
    format: 'pem',
  }) as string;
  const bluePublicJwk = blueKeys.publicKey.export({
    format: 'jwk',
  }) as JsonWebKey;
  const cbluePrivateKey = cblueKeys.privateKey.export({
    type: 'pkcs8',
    format: 'pem',
  }) as string;
  const cbluePublicKey = cblueKeys.publicKey.export({
    type: 'spki',
    format: 'pem',
  }) as string;

  let service: OauthService;
  let prisma: {
    user: Record<string, jest.Mock>;
    subscriber: Record<string, jest.Mock>;
  };
  let refreshSessions: { issue: jest.Mock; rotate: jest.Mock };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      subscriber: {
        findUnique: jest.fn(),
      },
    };
    refreshSessions = {
      issue: jest.fn().mockResolvedValue({
        refreshToken: 'opaque-refresh-token',
        refreshTokenExpiresAt: new Date(Date.now() + 60_000),
      }),
      rotate: jest.fn().mockResolvedValue({
        refreshToken: 'rotated-refresh-token',
        refreshTokenExpiresAt: new Date(Date.now() + 60_000),
        session: { audience: 'CBLUE' },
        user: { id: 'user-1' },
      }),
    };
    const configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          frontendUrl: 'https://cblue.co.th',
          'jwt.secret': 'cblue-access-secret',
          'jwt.refreshSecret': 'cblue-refresh-secret',
          'jwt.refreshExpiration': '7d',
          'oauth.issuer': 'https://cblue.co.th',
          'oauth.blueIssuer': 'https://blue.test',
          'oauth.blueAudience': 'blue-user-api',
          'oauth.blueClientId': 'blue-client',
          'oauth.blueClientSecret': 'blue-secret',
          'oauth.blueJwksJson': JSON.stringify({
            keys: [
              { ...bluePublicJwk, kid: 'blue-key', alg: 'RS256', use: 'sig' },
            ],
          }),
          'oauth.privateKeyPem': cbluePrivateKey,
          'oauth.publicKeyPem': cbluePublicKey,
          'oauth.keyId': 'cblue-key',
          'oauth.accessTokenTtlSeconds': 900,
          'oauth.refreshEnabled': true,
          'oauth.allowedAudiences': ['CBLUE', 'LBLUE'],
        };
        return values[key];
      }),
      getOrThrow: jest.fn((key: string) => {
        const value = configService.get(key);
        if (value === undefined || value === null || value === '') {
          throw new Error(`Missing config ${key}`);
        }
        return value;
      }),
    } as unknown as ConfigService;

    service = new OauthService(
      prisma as unknown as PrismaService,
      configService,
      refreshSessions as unknown as RefreshSessionService,
    );
  });

  function validBlueToken(overrides: Record<string, unknown> = {}) {
    return signJwt(bluePrivateKey, 'blue-key', {
      iss: 'https://blue.test',
      aud: 'blue-user-api',
      sub: 'blue-user-1',
      email: 'Partner@Example.com',
      email_verified: true,
      name: 'Partner User',
      iat: nowSeconds,
      exp: nowSeconds + 300,
      ...overrides,
    });
  }

  it('advertises both Basic and POST client authentication for token exchange', () => {
    expect(service.discovery()).toEqual(
      expect.objectContaining({
        grant_types_supported: [
          'urn:ietf:params:oauth:grant-type:token-exchange',
          'refresh_token',
        ],
        token_endpoint_auth_methods_supported: [
          'client_secret_basic',
          'client_secret_post',
        ],
      }),
    );
  });

  it('exchanges a valid BLUE token for this user scoped CBLUE token', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'partner@example.com',
      name: 'Partner User',
      phone: '+66810000000',
      role: 'USER',
      isActive: true,
      subscriberId: null,
      fixer: null,
    });

    const result = await service.exchangeToken({
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
      subject_token: validBlueToken(),
      audience: 'CBLUE',
      client_id: 'blue-client',
      client_secret: 'blue-secret',
    });

    expect(result.token_type).toBe('Bearer');
    expect(result.subject_id).toBe('user-1');
    expect(result.email).toBe('partner@example.com');
    expect(result.display_name).toBe('Partner User');
    expect(result.expires_in).toBe(900);
    expect(result.access_token).toMatch(/^[^.]+\.[^.]+\.[^.]+$/);
    expect(result.capabilities).toContain('cblue:workflow:self:read');
    expect(result).not.toHaveProperty('serviceToken');
  });

  it('rejects a verified BLUE user that cannot be mapped locally', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.subscriber.findUnique.mockResolvedValue(null);

    await expect(
      service.exchangeToken({
        grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
        subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
        subject_token: validBlueToken(),
        audience: 'CBLUE',
        client_id: 'blue-client',
        client_secret: 'blue-secret',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('persists an offline-access refresh token bound to BLUE client and audience', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'partner@example.com',
      name: 'Partner User',
      phone: null,
      role: 'USER',
      isActive: true,
      subscriberId: null,
      fixer: null,
    });
    const result = await service.token({
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
      subject_token: validBlueToken(),
      audience: 'CBLUE',
      client_id: 'blue-client',
      client_secret: 'blue-secret',
      scope: 'offline_access',
    });
    expect(refreshSessions.issue).toHaveBeenCalledWith({
      userId: 'user-1',
      clientId: 'blue-client',
      audience: 'CBLUE',
    });
    expect(result.refresh_token).toBe('opaque-refresh-token');
    expect(result.refresh_token_expires_at).toEqual(expect.any(String));
  });

  it('rotates a BLUE-client-bound refresh grant and preserves capabilities', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'partner@example.com',
      name: 'Partner User',
      phone: null,
      role: 'FIXER',
      isActive: true,
      subscriberId: null,
      fixer: { id: 'fixer-1', status: 'APPROVED', verified: true },
    });
    const result = await service.token({
      grant_type: 'refresh_token',
      refresh_token: 'old-refresh-token',
      audience: 'CBLUE',
      client_id: 'blue-client',
      client_secret: 'blue-secret',
    });
    expect(refreshSessions.rotate).toHaveBeenCalledWith({
      refreshToken: 'old-refresh-token',
      clientId: 'blue-client',
      audience: 'CBLUE',
    });
    expect(result.refresh_token).toBe('rotated-refresh-token');
    expect(result.capabilities).toContain('cblue:fixer:workflow:write');
  });

  it('rejects refresh grants with an invalid BLUE client before rotation', async () => {
    await expect(
      service.token({
        grant_type: 'refresh_token',
        refresh_token: 'old-refresh-token',
        client_id: 'blue-client',
        client_secret: 'wrong-secret',
      }),
    ).rejects.toThrow(UnauthorizedException);
    expect(refreshSessions.rotate).not.toHaveBeenCalled();
  });

  it('rejects a verified BLUE user that cannot be mapped locally', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.subscriber.findUnique.mockResolvedValue(null);

    await expect(
      service.exchangeToken({
        grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
        subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
        subject_token: validBlueToken(),
        audience: 'CBLUE',
        client_id: 'blue-client',
        client_secret: 'blue-secret',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects BLUE subject tokens without a verified email', async () => {
    await expect(
      service.exchangeToken({
        grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
        subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
        subject_token: validBlueToken({ email_verified: false }),
        audience: 'CBLUE',
        client_id: 'blue-client',
        client_secret: 'blue-secret',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects invalid BLUE token signatures', async () => {
    const otherKey = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const invalidToken = signJwt(
      otherKey.privateKey.export({ type: 'pkcs8', format: 'pem' }) as string,
      'blue-key',
      {
        iss: 'https://blue.test',
        aud: 'blue-user-api',
        sub: 'blue-user-1',
        email: 'partner@example.com',
        email_verified: true,
        exp: nowSeconds + 300,
      },
    );

    await expect(
      service.exchangeToken({
        grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
        subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
        subject_token: invalidToken,
        audience: 'CBLUE',
        client_id: 'blue-client',
        client_secret: 'blue-secret',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects invalid BLUE client credentials', async () => {
    await expect(
      service.exchangeToken({
        grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
        subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
        subject_token: validBlueToken(),
        audience: 'CBLUE',
        client_id: 'blue-client',
        client_secret: 'wrong-secret',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('maps by an existing legacy subscriber link when present', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'linked-user',
      email: 'partner@example.com',
      name: 'Linked User',
      phone: '+66810000000',
      role: 'USER',
      isActive: true,
      subscriberId: 'legacy-sub-1',
      fixer: null,
    });

    const result = await service.exchangeToken({
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
      subject_token: validBlueToken({ legacySubjectId: 'legacy-sub-1' }),
      audience: 'CBLUE',
      client_id: 'blue-client',
      client_secret: 'blue-secret',
    });

    expect(result.subject_id).toBe('linked-user');
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { subscriberId: 'legacy-sub-1' },
      }),
    );
  });

  it('maps partner and admin capabilities from the matched CBLUE user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'admin-fixer',
      email: 'partner@example.com',
      name: 'Admin Fixer',
      phone: '+66810000000',
      role: 'ADMIN',
      isActive: true,
      subscriberId: null,
      fixer: {
        id: 'fixer-1',
        status: 'APPROVED',
        verified: true,
      },
    });

    const result = await service.exchangeToken({
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
      subject_token: validBlueToken(),
      audience: 'LBLUE',
      client_id: 'blue-client',
      client_secret: 'blue-secret',
      scope: 'offline_access',
    });

    expect(result.capabilities).toEqual(
      expect.arrayContaining([
        'cblue:admin:read',
        'cblue:admin:write',
        'cblue:fixer:self:read',
        'cblue:fixer:workflow:write',
      ]),
    );
    expect(result.refresh_token).toBe('opaque-refresh-token');
    expect(refreshSessions.issue).toHaveBeenCalledWith({
      userId: 'admin-fixer',
      clientId: 'blue-client',
      audience: 'LBLUE',
    });
  });
});
