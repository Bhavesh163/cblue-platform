import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  phone?: string;
  role?: string;
  email?: string;
}

type BridgeSubscriber = {
  id: string;
  email: string;
  name: string;
  company: string | null;
  phone: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload) {
    try {
      let user = payload.sub
        ? await this.prisma.user.findUnique({
            where: { id: payload.sub },
          })
        : null;

      const subscriber = await this.findSubscriberByIdentity(
        payload.email,
        payload.phone,
      );

      if (subscriber) {
        user = await this.ensureUserBridge(subscriber, user?.id || payload.sub);
        if (user) {
          const normalizedEmail = payload.email?.trim().toLowerCase() || '';
          const normalizedPhone = payload.phone?.trim() || '';
          this.logger.warn(
            `Recovered stale JWT bridge for ${normalizedEmail || normalizedPhone}; using user ${user.id}`,
          );
        }
      }

      if (!user || !user.isActive) {
        throw new UnauthorizedException(
          'Session expired. Please log in again.',
        );
      }

      return {
        id: user.id,
        phone: user.phone ?? payload.phone ?? '',
        role: user.role,
        email: user.email ?? payload.email ?? '',
      };
    } catch (error) {
      this.logger.warn(
        `JWT validation failed for ${payload.email || payload.phone || payload.sub}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw new UnauthorizedException('Session expired. Please log in again.');
    }
  }

  private async findSubscriberByIdentity(
    email?: string | null,
    phone?: string | null,
  ) {
    const normalizedEmail = email?.trim().toLowerCase() || '';
    if (normalizedEmail) {
      const byEmail = await this.prisma.subscriber.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          email: true,
          name: true,
          company: true,
          phone: true,
        },
      });
      if (byEmail) return byEmail;
    }

    const normalizedPhone = phone?.trim() || '';
    if (!normalizedPhone) return null;

    return this.prisma.subscriber.findFirst({
      where: { phone: normalizedPhone },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        phone: true,
      },
    });
  }

  private async findCanonicalUserForSubscriber(
    subscriber: BridgeSubscriber,
    preferredUserId?: string,
  ) {
    const normalizedEmail = subscriber.email.trim().toLowerCase();
    const normalizedPhone = subscriber.phone?.trim() || '';

    if (preferredUserId) {
      const preferred = await this.prisma.user.findUnique({
        where: { id: preferredUserId },
      });
      if (
        preferred &&
        (preferred.subscriberId === subscriber.id ||
          preferred.email?.trim().toLowerCase() === normalizedEmail ||
          (!!normalizedPhone && preferred.phone === normalizedPhone))
      ) {
        return preferred;
      }
    }

    const bySubscriberId = await this.prisma.user.findUnique({
      where: { subscriberId: subscriber.id },
    });
    if (bySubscriberId) return bySubscriberId;

    const byEmail = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (byEmail) return byEmail;

    if (!normalizedPhone) return null;

    return this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });
  }

  private async ensureUserBridge(
    subscriber: BridgeSubscriber,
    preferredUserId?: string,
  ) {
    let user = await this.findCanonicalUserForSubscriber(
      subscriber,
      preferredUserId,
    );

    if (!user) {
      try {
        user = await this.prisma.user.create({
          data: {
            email: subscriber.email,
            phone: subscriber.phone || undefined,
            name: subscriber.name,
            company: subscriber.company,
            subscriberId: subscriber.id,
            role: 'USER',
          },
        });
      } catch (error) {
        this.logger.warn(
          `JWT bridge create retry for subscriber ${subscriber.id}: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
        user = await this.findCanonicalUserForSubscriber(
          subscriber,
          preferredUserId,
        );
      }
    }

    if (!user) return null;
    if (user.subscriberId === subscriber.id) return user;

    const bySubscriberId = await this.prisma.user.findUnique({
      where: { subscriberId: subscriber.id },
    });
    if (bySubscriberId) return bySubscriberId;

    try {
      return await this.prisma.user.update({
        where: { id: user.id },
        data: {
          subscriberId: subscriber.id,
          email: user.email || subscriber.email,
          phone: user.phone || subscriber.phone || undefined,
          name: user.name || subscriber.name,
          company: user.company || subscriber.company,
        },
      });
    } catch (error) {
      this.logger.warn(
        `JWT bridge update retry for subscriber ${subscriber.id}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return this.findCanonicalUserForSubscriber(subscriber, preferredUserId);
    }
  }
}
