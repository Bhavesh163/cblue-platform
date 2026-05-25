import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { LoginSubscriberDto } from './dto/login-subscriber.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';

import * as crypto from 'crypto';

type SessionJwtPayload = {
  sub?: string;
  email?: string;
  phone?: string;
};

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly SALT_ROUNDS = 12;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: CreateSubscriberDto) {
    const existing = await this.prisma.subscriber.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    // Use transaction to ensure Subscriber + User are created atomically
    const { subscriber, user } = await this.prisma.$transaction(async (tx) => {
      const subscriber = await tx.subscriber.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          name: dto.name,
          phone: dto.phone ?? '',
          company: dto.company,
          serviceCategory: dto.serviceCategory,
          description: dto.description,
          status: 'ACTIVE',
          pdpaConsentAt: dto.pdpaConsent ? new Date() : null,
        },
      });

      // Bridge: find or create a User record linked to this Subscriber so JwtAuthGuard works
      let user = await tx.user.findFirst({
        where: { email: dto.email.toLowerCase() },
      });
      if (user) {
        user = await tx.user.update({
          where: { id: user.id },
          data: { subscriberId: subscriber.id },
        });
      } else {
        user = await tx.user.create({
          data: {
            email: dto.email.toLowerCase(),
            name: dto.name,
            company: dto.company,
            subscriberId: subscriber.id,
            role: 'USER',
          },
        });
      }

      return { subscriber, user };
    });

    const token = await this.generateToken(user.id, subscriber.email);

    return {
      accessToken: token,
      subscriber: {
        id: subscriber.id,
        email: subscriber.email,
        name: subscriber.name,
        status: subscriber.status,
      },
    };
  }

  async login(dto: LoginSubscriberDto) {
    const subscriber = await this.prisma.subscriber.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!subscriber) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await bcrypt.compare(dto.password, subscriber.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (
      subscriber.status === 'SUSPENDED' ||
      subscriber.status === 'CANCELLED'
    ) {
      throw new UnauthorizedException('Account is suspended or cancelled');
    }

    // Bridge: find or create User record for this subscriber
    let user = await this.prisma.user.findFirst({
      where: { subscriberId: subscriber.id },
    });
    if (!user) {
      // Legacy subscriber without a User — create one
      user = await this.prisma.user.create({
        data: {
          email: subscriber.email,
          name: subscriber.name,
          company: subscriber.company,
          subscriberId: subscriber.id,
          role: 'USER',
        },
      });
    }

    const token = await this.generateToken(user.id, subscriber.email);

    return {
      accessToken: token,
      subscriber: {
        id: subscriber.id,
        email: subscriber.email,
        name: subscriber.name,
        phone: subscriber.phone,
        company: subscriber.company,
        status: subscriber.status,
        serviceCategory: subscriber.serviceCategory,
      },
    };
  }

  async refreshSession(authorization?: string) {
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    if (!token) {
      throw new UnauthorizedException('Missing authorization token');
    }

    const payload = await this.jwtService.verifyAsync<SessionJwtPayload>(
      token,
      {
        secret: this.configService.getOrThrow<string>('jwt.secret'),
      },
    );

    const user = await this.resolveBridgedUserFromPayload(payload);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Session expired. Please log in again.');
    }

    const subscriber = await this.resolveSubscriberForUser(user, payload);
    if (!subscriber) {
      throw new UnauthorizedException('Subscriber account not found');
    }

    if (!user.subscriberId || user.subscriberId !== subscriber.id) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { subscriberId: subscriber.id },
      });
    }

    const accessToken = await this.generateToken(user.id, subscriber.email);
    return {
      accessToken,
      subscriber: {
        id: subscriber.id,
        email: subscriber.email,
        name: subscriber.name,
        phone: subscriber.phone,
        company: subscriber.company,
        status: subscriber.status,
        serviceCategory: subscriber.serviceCategory,
      },
    };
  }

  async getProfile(subscriberId: string) {
    const subscriber = await this.prisma.subscriber.findUnique({
      where: { id: subscriberId },
    });

    if (!subscriber) {
      throw new NotFoundException('Subscriber not found');
    }

    return {
      id: subscriber.id,
      email: subscriber.email,
      name: subscriber.name,
      phone: subscriber.phone,
      company: subscriber.company,
      status: subscriber.status,
      serviceCategory: subscriber.serviceCategory,
      description: subscriber.description,
      createdAt: subscriber.createdAt,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const subscriber = await this.prisma.subscriber.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!subscriber) {
      // Return success even if email not found (security best practice)
      return { message: 'If the email exists, a reset link has been sent.' };
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.subscriber.update({
      where: { id: subscriber.id },
      data: { resetToken, resetTokenExpiry },
    });

    // Send email via Mailjet
    await this.sendResetEmail(subscriber.email, subscriber.name, resetToken);

    return { message: 'If the email exists, a reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const subscriber = await this.prisma.subscriber.findFirst({
      where: {
        resetToken: dto.token,
        resetTokenExpiry: { gte: new Date() },
      },
    });

    if (!subscriber) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, this.SALT_ROUNDS);

    await this.prisma.subscriber.update({
      where: { id: subscriber.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { message: 'Password reset successfully' };
  }

  async listSubscribers() {
    return this.prisma.subscriber.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        company: true,
        status: true,
        serviceCategory: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async generateToken(userId: string, email: string) {
    return this.jwtService.signAsync(
      { sub: userId, email },
      {
        secret: this.configService.getOrThrow<string>('jwt.secret'),
        expiresIn: '24h',
      },
    );
  }

  private async resolveBridgedUserFromPayload(payload: SessionJwtPayload) {
    if (payload.sub) {
      const byId = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (byId) return byId;
    }

    const normalizedEmail = payload.email?.trim().toLowerCase() || '';
    const normalizedPhone = payload.phone?.trim() || '';

    let subscriber = normalizedEmail
      ? await this.prisma.subscriber.findUnique({
          where: { email: normalizedEmail },
        })
      : null;

    if (!subscriber && normalizedPhone) {
      subscriber = await this.prisma.subscriber.findFirst({
        where: { phone: normalizedPhone },
      });
    }

    const userSearch: Array<Record<string, string>> = [];
    if (subscriber?.id) userSearch.push({ subscriberId: subscriber.id });
    if (normalizedEmail) userSearch.push({ email: normalizedEmail });
    if (normalizedPhone) userSearch.push({ phone: normalizedPhone });
    if (userSearch.length === 0) return null;

    let user = await this.prisma.user.findFirst({
      where: { OR: userSearch },
    });

    if (!user && subscriber) {
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
    } else if (user && subscriber && user.subscriberId !== subscriber.id) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { subscriberId: subscriber.id },
      });
    }

    return user;
  }

  private async resolveSubscriberForUser(
    user: {
      subscriberId: string | null;
      email: string | null;
      phone: string | null;
      id: string;
    },
    payload: SessionJwtPayload,
  ) {
    if (user.subscriberId) {
      const byId = await this.prisma.subscriber.findUnique({
        where: { id: user.subscriberId },
      });
      if (byId) return byId;
    }

    const email = user.email || payload.email?.trim().toLowerCase() || '';
    if (email) {
      const byEmail = await this.prisma.subscriber.findUnique({
        where: { email },
      });
      if (byEmail) return byEmail;
    }

    const phone = user.phone || payload.phone?.trim() || '';
    if (phone) {
      return this.prisma.subscriber.findFirst({ where: { phone } });
    }

    return null;
  }

  private async sendResetEmail(
    email: string,
    name: string,
    resetToken: string,
  ) {
    const mailjetApiKey = this.configService.get<string>('mailjet.apiKey');
    const mailjetApiSecret =
      this.configService.get<string>('mailjet.apiSecret');

    if (!mailjetApiKey || !mailjetApiSecret) {
      this.logger.warn('Mailjet not configured — skipping email send');
      this.logger.log(
        `[DEV] Password reset link for ${email}: /reset-password?token=${resetToken}`,
      );
      return;
    }

    const frontendUrl = (
      this.configService.get<string>('frontendUrl') || 'http://localhost:3000'
    ).replace(/\/$/, '');
    const resetUrl = `${frontendUrl}/en/subscription/reset-password?token=${resetToken}`;

    const body = {
      Messages: [
        {
          From: {
            Email: 'noreply@lblue.tech',
            Name: 'CBLUE',
          },
          To: [{ Email: email, Name: name }],
          Subject: 'Reset your CBLUE password',
          HTMLPart: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; padding: 40px 0; min-height: 100vh;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.08);">
                
                <!-- Header with Logo Area -->
                <div style="background-color: #0c4a6e; padding: 32px 40px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">CBLUE.</h1>
                </div>

                <!-- Body content -->
                <div style="padding: 40px;">
                  <h2 style="color: #1e293b; margin-top: 0; font-size: 20px; font-weight: 600;">Password Reset Request</h2>
                  <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                    Hello ${name},
                  </p>
                  <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                    We received a request to reset your password for your CBLUE account. This link is valid for the next <strong>1 hour</strong>.
                    <br/><span style="font-size: 14px; color: #64748b; margin-top: 4px; display: inline-block;">(คุณได้ร้องขอการรีเซ็ตรหัสผ่าน บัญชี CBLUE ของคุณ. ลิงก์นี้จะหมดอายุใน 1 ชั่วโมง / 您已请求重置CBLUE账户密码。此链接将在1小时后失效)</span>
                  </p>
                  
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background-color: #0284c7; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; text-align: center; transition: background-color 0.2s;">
                      Reset Password
                    </a>
                  </div>

                  <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                    If you did not request a password reset, please ignore this email or contact support if you have concerns.
                    <br/><span style="font-size: 14px; color: #64748b; margin-top: 4px; display: inline-block;">(หากคุณไม่ได้ร้องขอ กรุณาเพิกเฉยอีเมลนี้ / 若非本人操作，请忽略此邮件)</span>
                  </p>

                  <!-- Divider -->
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

                  <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0; text-align: center;">
                    If the button above is not working, copy and paste the following link into your browser:<br/>
                    <a href="${resetUrl}" style="color: #0284c7; text-decoration: none; word-break: break-all;">${resetUrl}</a>
                  </p>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="color: #94a3b8; font-size: 13px; margin: 0;">
                    &copy; ${new Date().getFullYear()} Construction Blue Co., Ltd. All rights reserved.
                  </p>
                </div>

              </div>
            </div>
          `,
          TextPart: `Hello ${name},\n\nWe received a request to reset your password for your CBLUE account.\n\nClick the link below to reset your password (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, please ignore this email.\n\n© ${new Date().getFullYear()} Construction Blue Co., Ltd. All rights reserved.`,
        },
      ],
    };

    try {
      const response = await fetch('https://api.mailjet.com/v3.1/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:
            'Basic ' +
            Buffer.from(`${mailjetApiKey}:${mailjetApiSecret}`).toString(
              'base64',
            ),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Mailjet error: ${errorText}`);
        this.logger.log(
          `[FALLBACK] Password reset link for ${email}: /en/subscription/reset-password?token=${resetToken}`,
        );
      } else {
        this.logger.log(`Password reset email sent to ${email}`);
        this.logger.log(
          `[BACKUP-LINK] /en/subscription/reset-password?token=${resetToken}`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to send email: ${error}`);
    }
  }
}
