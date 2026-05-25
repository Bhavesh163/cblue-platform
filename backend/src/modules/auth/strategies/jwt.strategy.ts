import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  phone: string;
  role: string;
  email?: string;
}

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
    let user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user && payload.email) {
      const normalizedEmail = payload.email.trim().toLowerCase();
      const subscriber = await this.prisma.subscriber.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          email: true,
          name: true,
          company: true,
        },
      });

      if (subscriber) {
        user = await this.prisma.user.findFirst({
          where: {
            OR: [
              { subscriberId: subscriber.id },
              { email: normalizedEmail },
            ],
          },
        });

        if (!user) {
          user = await this.prisma.user.create({
            data: {
              email: subscriber.email,
              name: subscriber.name,
              company: subscriber.company,
              subscriberId: subscriber.id,
              role: 'USER',
            },
          });
        } else if (!user.subscriberId || user.subscriberId !== subscriber.id) {
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: { subscriberId: subscriber.id },
          });
        }

        this.logger.warn(
          `Recovered stale JWT bridge for ${normalizedEmail}; using user ${user.id}`,
        );
      }
    }

    if (!user || !user.isActive) {
      return null;
    }
    return {
      id: user.id,
      phone: user.phone ?? '',
      role: user.role,
      email: user.email ?? payload.email ?? '',
    };
  }
}
