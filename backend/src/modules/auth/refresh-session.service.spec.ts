import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RefreshSessionService } from './refresh-session.service';

describe('RefreshSessionService', () => {
  const user = { id: 'user-1', isActive: true };
  let rows: any[];
  let prisma: any;
  let service: RefreshSessionService;

  beforeEach(() => {
    user.isActive = true;
    rows = [];
    prisma = {
      refreshSession: {
        create: jest.fn(({ data }) => {
          const row = {
            id: `session-${rows.length + 1}`,
            rotatedAt: null,
            replacedById: null,
            revokedAt: null,
            revocationReason: null,
            lastUsedAt: null,
            ...data,
          };
          rows.push(row);
          return row;
        }),
        findUnique: jest.fn(({ where }) => {
          const row = rows.find((item) => item.tokenHash === where.tokenHash);
          return row ? { ...row, user } : null;
        }),
        updateMany: jest.fn(({ where, data }) => {
          const matching = rows.filter((item) => {
            if (where.id && item.id !== where.id) return false;
            if (where.familyId && item.familyId !== where.familyId) return false;
            if (where.rotatedAt === null && item.rotatedAt !== null) return false;
            if (where.revokedAt === null && item.revokedAt !== null) return false;
            return true;
          });
          matching.forEach((item) => Object.assign(item, data));
          return { count: matching.length };
        }),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };
    const config = {
      get: jest.fn((key: string) =>
        key === 'jwt.refreshExpiration' ? '7d' : undefined,
      ),
    } as unknown as ConfigService;
    service = new RefreshSessionService(prisma, config);
  });

  it('stores only a hash and rotates a token once', async () => {
    const issued = await service.issue({
      userId: user.id,
      clientId: 'blue-client',
      audience: 'CBLUE',
    });
    expect(rows[0].tokenHash).not.toContain(issued.refreshToken);
    const rotated = await service.rotate({
      refreshToken: issued.refreshToken,
      clientId: 'blue-client',
      audience: 'CBLUE',
    });
    expect(rotated.user.id).toBe(user.id);
    expect(rotated.refreshToken).not.toBe(issued.refreshToken);
    expect(rows).toHaveLength(2);
    expect(rows[0].rotatedAt).toBeInstanceOf(Date);
    expect(rows[0].replacedById).toBe(rows[1].id);
  });

  it('revokes the family when a rotated token is replayed', async () => {
    const issued = await service.issue({
      userId: user.id,
      clientId: 'blue-client',
      audience: 'CBLUE',
    });
    await service.rotate({
      refreshToken: issued.refreshToken,
      clientId: 'blue-client',
      audience: 'CBLUE',
    });
    await expect(
      service.rotate({
        refreshToken: issued.refreshToken,
        clientId: 'blue-client',
        audience: 'CBLUE',
      }),
    ).rejects.toThrow(UnauthorizedException);
    expect(rows.every((row) => row.revokedAt instanceof Date)).toBe(true);
    expect(rows.every((row) => row.revocationReason === 'token_reuse')).toBe(true);
  });

  it.each([
    ['wrong-client', 'CBLUE'],
    ['blue-client', 'LBLUE'],
  ])('rejects another client or audience', async (clientId, audience) => {
    const issued = await service.issue({
      userId: user.id,
      clientId: 'blue-client',
      audience: 'CBLUE',
    });
    await expect(
      service.rotate({ refreshToken: issued.refreshToken, clientId, audience }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects expired and inactive-user sessions', async () => {
    const issued = await service.issue({
      userId: user.id,
      clientId: 'blue-client',
      audience: 'CBLUE',
    });
    rows[0].expiresAt = new Date(Date.now() - 1);
    await expect(service.rotate({ refreshToken: issued.refreshToken })).rejects.toThrow(
      UnauthorizedException,
    );
    rows[0].expiresAt = new Date(Date.now() + 60_000);
    user.isActive = false;
    await expect(service.rotate({ refreshToken: issued.refreshToken })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('revokes logout idempotently', async () => {
    const issued = await service.issue({
      userId: user.id,
      clientId: 'cblue-web',
      audience: 'CBLUE',
    });
    await service.revokeFamily(issued.refreshToken, 'logout');
    await service.revokeFamily(issued.refreshToken, 'logout');
    expect(rows[0].revokedAt).toBeInstanceOf(Date);
    expect(rows[0].revocationReason).toBe('logout');
  });
});
