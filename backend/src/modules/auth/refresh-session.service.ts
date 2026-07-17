import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomUUID } from 'crypto';
import ms from 'ms';
import { PrismaService } from '../../prisma/prisma.service';

type IssueInput = {
  userId: string;
  clientId: string;
  audience: string;
  familyId?: string;
};

type RotateInput = {
  refreshToken: string;
  clientId?: string;
  audience?: string;
};

class RefreshTokenReplayError extends Error {}

@Injectable()
export class RefreshSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async issue(input: IssueInput) {
    return this.issueWithClient(this.prisma, input);
  }

  async rotate(input: RotateInput) {
    const existing = await this.prisma.refreshSession.findUnique({
      where: { tokenHash: this.hash(input.refreshToken) },
      include: { user: true },
    });
    if (!existing) this.invalid();
    if (existing.rotatedAt || existing.revokedAt) {
      await this.revokeFamilyById(existing.familyId, 'token_reuse');
      this.invalid();
    }
    if (
      existing.expiresAt <= new Date() ||
      !existing.user.isActive ||
      (input.clientId && existing.clientId !== input.clientId) ||
      (input.audience && existing.audience !== input.audience)
    ) {
      this.invalid();
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const now = new Date();
        const claimed = await tx.refreshSession.updateMany({
          where: { id: existing.id, rotatedAt: null, revokedAt: null },
          data: { rotatedAt: now, lastUsedAt: now },
        });
        if (claimed.count !== 1) {
          throw new RefreshTokenReplayError();
        }
        const next = await this.issueWithClient(tx, {
          userId: existing.userId,
          clientId: existing.clientId,
          audience: existing.audience,
          familyId: existing.familyId,
        });
        await tx.refreshSession.updateMany({
          where: { id: existing.id },
          data: { replacedById: next.session.id },
        });
        return { ...next, user: existing.user };
      });
    } catch (error) {
      if (error instanceof RefreshTokenReplayError) {
        await this.revokeFamilyById(existing.familyId, 'token_reuse');
        this.invalid();
      }
      throw error;
    }
  }

  async revokeFamily(refreshToken: string, reason: string): Promise<void> {
    const existing = await this.prisma.refreshSession.findUnique({
      where: { tokenHash: this.hash(refreshToken) },
    });
    if (!existing) return;
    await this.revokeFamilyById(existing.familyId, reason);
  }

  private async issueWithClient(tx: any, input: IssueInput) {
    const refreshToken = randomBytes(48).toString('base64url');
    const refreshTokenExpiresAt = new Date(Date.now() + this.refreshTtlMs());
    const session = await tx.refreshSession.create({
      data: {
        userId: input.userId,
        tokenHash: this.hash(refreshToken),
        familyId: input.familyId || randomUUID(),
        clientId: input.clientId,
        audience: input.audience,
        expiresAt: refreshTokenExpiresAt,
      },
    });
    return { refreshToken, refreshTokenExpiresAt, session };
  }

  private async revokeFamilyById(familyId: string, reason: string) {
    await this.prisma.refreshSession.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date(), revocationReason: reason },
    });
  }

  private refreshTtlMs(): number {
    const configured =
      this.configService.get<ms.StringValue>('jwt.refreshExpiration') || '7d';
    return ms(configured);
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private invalid(): never {
    throw new UnauthorizedException('Invalid refresh token');
  }
}
