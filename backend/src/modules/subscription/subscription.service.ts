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
import * as nodemailer from 'nodemailer';

import * as crypto from 'crypto';

type SessionJwtPayload = {
  sub?: string;
  email?: string;
  phone?: string;
  exp?: number;
};

type BridgeSubscriber = {
  id: string;
  email: string;
  phone: string;
  name: string;
  company: string | null;
};

type ResetEmailDeliveryPath = 'mailjet_v31' | 'mailjet_v3' | 'mailjet_smtp' | 'none';

type ResetEmailSendResult = {
  sent: boolean;
  path: ResetEmailDeliveryPath;
  fromEmail?: string;
};

type ForgotPasswordServiceResponse = {
  message: string;
  debug: {
    traceId: string;
    path: ResetEmailDeliveryPath;
    sent: boolean;
  };
};

@Injectable()
export class SubscriptionService {
  // How long after a 24h access token expires it may still be exchanged for a
  // fresh one via refresh-session (sliding session). 30 days keeps returning
  // users logged in without forcing a re-login on every visit.
  private static readonly REFRESH_GRACE_SECONDS = 30 * 24 * 60 * 60;

  private readonly logger = new Logger(SubscriptionService.name);
  private readonly SALT_ROUNDS = 12;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private normalizeEmail(value?: string | null) {
    return String(value || '')
      .trim()
      .toLowerCase();
  }

  private async findSubscriberByEmail(email?: string | null) {
    const normalizedEmail = this.normalizeEmail(email);
    if (!normalizedEmail) return null;

    const exact = await this.prisma.subscriber.findUnique({
      where: { email: normalizedEmail },
    });
    if (exact) return exact;

    const insensitiveMatch = await this.prisma.subscriber.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
    });
    if (insensitiveMatch) return insensitiveMatch;

    const containsMatch = await this.prisma.subscriber.findFirst({
      where: {
        email: {
          contains: normalizedEmail,
          mode: 'insensitive',
        },
      },
    });
    return this.normalizeEmail(containsMatch?.email) === normalizedEmail
      ? containsMatch
      : null;
  }

  private async findUserByEmail(email?: string | null) {
    const normalizedEmail = this.normalizeEmail(email);
    if (!normalizedEmail) return null;

    const exact = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (exact) return exact;

    return this.prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
    });
  }

  async register(dto: CreateSubscriberDto) {
    const normalizedEmail = this.normalizeEmail(dto.email);
    const existing = await this.findSubscriberByEmail(normalizedEmail);

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    // Use transaction to ensure Subscriber + User are created atomically
    const { subscriber, user } = await this.prisma.$transaction(async (tx) => {
      const subscriber = await tx.subscriber.create({
        data: {
          email: normalizedEmail,
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
        where: {
          email: {
            equals: normalizedEmail,
            mode: 'insensitive',
          },
        },
      });
      if (user) {
        user = await tx.user.update({
          where: { id: user.id },
          data: { subscriberId: subscriber.id },
        });
      } else {
        user = await tx.user.create({
          data: {
            email: normalizedEmail,
            name: dto.name,
            company: dto.company,
            subscriberId: subscriber.id,
            role: 'USER',
          },
        });
      }

      return { subscriber, user };
    });

    const token = await this.generateToken(
      user.id,
      subscriber.email,
      subscriber.phone,
    );

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
    const normalizedEmail = this.normalizeEmail(dto.email);
    const subscriber = await this.findSubscriberByEmail(normalizedEmail);

    if (!subscriber) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const password = String(dto.password || '');
    const passwordCandidates = Array.from(new Set([password, password.trim()]))
      .filter(Boolean);
    const isValid = await passwordCandidates.reduce(
      async (matchedPromise, candidate) =>
        (await matchedPromise) ||
        bcrypt.compare(candidate, subscriber.passwordHash),
      Promise.resolve(false),
    );
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
    const user = await this.ensureUserBridge(subscriber);
    if (!user) {
      throw new UnauthorizedException('Could not resolve your account session');
    }

    const token = await this.generateToken(
      user.id,
      subscriber.email,
      subscriber.phone,
    );

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

    let payload: SessionJwtPayload;
    try {
      // Sliding session: accept a still-valid token, OR one whose 24h window
      // has lapsed, so a returning user is not silently logged out. The token
      // signature must still be valid (forgery is rejected) and the account is
      // re-validated against the DB below, so security is preserved.
      payload = await this.jwtService.verifyAsync<SessionJwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('jwt.secret'),
        ignoreExpiration: true,
      });
    } catch (error) {
      this.logger.warn(
        `Rejected refresh-session token: ${error instanceof Error ? error.message : 'invalid token'}`,
      );
      throw new UnauthorizedException('Session expired. Please log in again.');
    }

    // Bound the sliding window: a token expired more than 30 days ago cannot be
    // refreshed and must re-authenticate. Tokens within the grace window slide.
    if (typeof payload.exp === 'number') {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const expiredForSeconds = nowSeconds - payload.exp;
      if (expiredForSeconds > SubscriptionService.REFRESH_GRACE_SECONDS) {
        throw new UnauthorizedException('Session expired. Please log in again.');
      }
    }

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

    const accessToken = await this.generateToken(
      user.id,
      subscriber.email,
      subscriber.phone,
    );
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

  async forgotPassword(dto: ForgotPasswordDto): Promise<ForgotPasswordServiceResponse> {
    const traceId = crypto.randomUUID();
    const genericMessage = 'If the email exists, a reset link has been sent.';
    const normalizedEmail = this.normalizeEmail(dto.email);
    let subscriber = normalizedEmail
      ? await this.findSubscriberByEmail(normalizedEmail)
      : null;

    if (!subscriber && normalizedEmail) {
      const bridgedUser = await this.findUserByEmail(normalizedEmail);

      if (bridgedUser) {
        const bridgePayload = {
          id: bridgedUser.id,
          subscriberId: bridgedUser.subscriberId,
          email: bridgedUser.email,
          phone: bridgedUser.phone,
        };
        subscriber = await this.findSubscriberByIdentity(
          normalizedEmail,
          bridgedUser.phone,
          bridgePayload,
        );

        if (subscriber) {
          this.logger.log(
            `forgotPassword bridge lookup matched user ${bridgedUser.id} -> subscriber ${subscriber.id}`,
          );
        }
      }
    }

    if (!subscriber && normalizedEmail) {
      const byEmailContains = await this.prisma.subscriber.findFirst({
        where: {
          email: {
            contains: normalizedEmail,
            mode: 'insensitive',
          },
        },
        select: { id: true },
      });

      if (byEmailContains) {
        subscriber = await this.prisma.subscriber.findUnique({
          where: { id: byEmailContains.id },
        });
        if (subscriber) {
          this.logger.log(
            `forgotPassword recovered subscriber ${subscriber.id} via contains(email) fallback`,
          );
        }
      }
    }

    if (!subscriber && normalizedEmail) {
      const legacyUser = await this.findUserByEmail(normalizedEmail);
      if (legacyUser) {
        try {
          const tempPasswordHash = await bcrypt.hash(
            crypto.randomBytes(24).toString('hex'),
            this.SALT_ROUNDS,
          );
          const createdSubscriber = await this.prisma.subscriber.create({
            data: {
              email: normalizedEmail,
              passwordHash: tempPasswordHash,
              name:
                String(legacyUser.name || '').trim() ||
                normalizedEmail.split('@')[0] ||
                'User',
              phone: String(legacyUser.phone || '').trim(),
              company: legacyUser.company || null,
              status: 'ACTIVE',
            },
          });

          await this.prisma.user.update({
            where: { id: legacyUser.id },
            data: { subscriberId: createdSubscriber.id },
          });

          subscriber = createdSubscriber;
          this.logger.log(
            `forgotPassword auto-created subscriber ${createdSubscriber.id} for legacy user ${legacyUser.id}`,
          );
        } catch (error) {
          this.logger.warn(
            `forgotPassword legacy bridge create failed for ${normalizedEmail}: ${error instanceof Error ? error.message : 'unknown error'}`,
          );
          // If another request created the subscriber first, recover it.
          subscriber = await this.findSubscriberByEmail(normalizedEmail);
        }
      }
    }

    if (!subscriber) {
      // Return success even if email not found (security best practice)
      if (normalizedEmail) {
        this.logger.warn(
          `forgotPassword: no subscriber match for ${normalizedEmail}`,
        );
      }
      this.logger.log(
        `[forgotPassword:${traceId}] no matching subscriber; returning generic response`,
      );
      return {
        message: genericMessage,
        debug: {
          traceId,
          path: 'none',
          sent: false,
        },
      };
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.subscriber.update({
      where: { id: subscriber.id },
      data: { resetToken, resetTokenExpiry },
    });

    const recipientCandidates = Array.from(
      new Set(
        [normalizedEmail, this.normalizeEmail(subscriber.email)].filter(
          Boolean,
        ),
      ),
    );
    if (recipientCandidates.length === 0) {
      this.logger.error(
        `Password reset skipped because subscriber ${subscriber.id} has invalid email`,
      );
      this.logger.warn(
        `[forgotPassword:${traceId}] recipient candidates empty; returning generic response`,
      );
      return {
        message: genericMessage,
        debug: {
          traceId,
          path: 'none',
          sent: false,
        },
      };
    }
    const recipientName = String(subscriber.name || '').trim() || 'User';

    // Send email via Mailjet (with API + SMTP fallback paths)
    let sent = false;
    let selectedPath: ResetEmailDeliveryPath = 'none';
    for (const recipientEmail of recipientCandidates) {
      const deliveryResult = await this.sendResetEmail(
        recipientEmail,
        recipientName,
        resetToken,
        traceId,
      );
      sent = deliveryResult.sent;
      selectedPath = deliveryResult.path;
      this.logger.log(
        `[forgotPassword:${traceId}] delivery attempt recipient=${recipientEmail} path=${deliveryResult.path} sent=${deliveryResult.sent}`,
      );
      if (sent) break;
    }
    if (!sent) {
      this.logger.error(
        `[forgotPassword:${traceId}] password reset delivery failed for ${recipientCandidates.join(', ')}`,
      );
    } else {
      this.logger.log(
        `[forgotPassword:${traceId}] password reset delivered using ${selectedPath}`,
      );
    }

    return {
      message: genericMessage,
      debug: {
        traceId,
        path: selectedPath,
        sent,
      },
    };
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

  private async generateToken(
    userId: string,
    email: string,
    phone?: string | null,
  ) {
    return this.jwtService.signAsync(
      { sub: userId, email, phone: phone || undefined },
      {
        secret: this.configService.getOrThrow<string>('jwt.secret'),
        expiresIn: '24h',
      },
    );
  }

  private async findSubscriberByIdentity(
    email?: string | null,
    phone?: string | null,
    preferredUser?: {
      subscriberId: string | null;
      email: string | null;
    } | null,
  ) {
    const preferredSubscriberId = preferredUser?.subscriberId?.trim() || '';
    if (preferredSubscriberId) {
      const byId = await this.prisma.subscriber.findUnique({
        where: { id: preferredSubscriberId },
      });
      if (byId) return byId;
    }

    const normalizedEmail =
      email?.trim().toLowerCase() ||
      preferredUser?.email?.trim().toLowerCase() ||
      '';
    if (normalizedEmail) {
      const byEmail = await this.findSubscriberByEmail(normalizedEmail);
      if (byEmail) return byEmail;
    }

    const normalizedPhone = phone?.trim() || '';
    if (!normalizedPhone) return null;

    const phoneMatches = await this.prisma.subscriber.findMany({
      where: { phone: normalizedPhone },
      take: 2,
    });

    if (phoneMatches.length > 1) {
      this.logger.warn(
        `Ambiguous subscriber phone match for ${normalizedPhone}; refusing phone-only bridge repair`,
      );
      return null;
    }

    return phoneMatches[0] ?? null;
  }

  private async findCanonicalUserForSubscriber(
    subscriber: BridgeSubscriber,
    preferredUserId?: string | null,
  ) {
    const normalizedEmail = subscriber.email.trim().toLowerCase();

    if (preferredUserId) {
      const preferred = await this.prisma.user.findUnique({
        where: { id: preferredUserId },
      });
      if (
        preferred &&
        (preferred.subscriberId === subscriber.id ||
          preferred.email?.trim().toLowerCase() === normalizedEmail)
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

    return null;
  }

  private async ensureUserBridge(
    subscriber: BridgeSubscriber,
    preferredUserId?: string | null,
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
          `User bridge create retry for subscriber ${subscriber.id}: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
        try {
          user = await this.prisma.user.create({
            data: {
              email: subscriber.email,
              name: subscriber.name,
              company: subscriber.company,
              subscriberId: subscriber.id,
              role: 'USER',
            },
          });
        } catch (retryError) {
          this.logger.warn(
            `User bridge create without phone retry for subscriber ${subscriber.id}: ${retryError instanceof Error ? retryError.message : 'unknown error'}`,
          );
          user = await this.findCanonicalUserForSubscriber(
            subscriber,
            preferredUserId,
          );
        }
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
        `User bridge update retry for subscriber ${subscriber.id}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      if (!user.phone && subscriber.phone) {
        try {
          return await this.prisma.user.update({
            where: { id: user.id },
            data: {
              subscriberId: subscriber.id,
              email: user.email || subscriber.email,
              name: user.name || subscriber.name,
              company: user.company || subscriber.company,
            },
          });
        } catch (retryError) {
          this.logger.warn(
            `User bridge update without phone retry for subscriber ${subscriber.id}: ${retryError instanceof Error ? retryError.message : 'unknown error'}`,
          );
        }
      }
      return this.findCanonicalUserForSubscriber(subscriber, preferredUserId);
    }
  }

  private async resolveBridgedUserFromPayload(payload: SessionJwtPayload) {
    const existingUser = payload.sub
      ? await this.prisma.user.findUnique({
          where: { id: payload.sub },
        })
      : null;

    const subscriber = await this.findSubscriberByIdentity(
      payload.email,
      payload.phone,
      existingUser,
    );
    if (subscriber) {
      return this.ensureUserBridge(subscriber, existingUser?.id || payload.sub);
    }

    if (existingUser) {
      return existingUser;
    }

    return null;
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

    return this.findSubscriberByIdentity(
      user.email || payload.email,
      user.phone || payload.phone,
      user,
    );
  }

  private async sendResetEmail(
    email: string,
    name: string,
    resetToken: string,
    traceId?: string,
  ): Promise<ResetEmailSendResult> {
    type SmtpSendMailOptions = {
      from: string;
      to: string;
      subject: string;
      text: string;
      html: string;
    };
    type SmtpTransporter = {
      sendMail: (options: SmtpSendMailOptions) => Promise<unknown>;
    };
    type MailjetMessageStatus = { Status?: string };
    type MailjetSendApiResponse = { Messages?: MailjetMessageStatus[] };

    const normalizedRecipientEmail = this.normalizeEmail(email);
    const tracePrefix = traceId ? `[forgotPassword:${traceId}] ` : '';
    if (!normalizedRecipientEmail) {
      this.logger.warn(
        `${tracePrefix}sendResetEmail received invalid recipient email`,
      );
      return { sent: false, path: 'none' };
    }
    const recipientName = String(name || '').trim() || 'User';

    const normalizeConfigString = (value?: string | null) =>
      String(value || '')
        .trim()
        .replace(/^['"]|['"]$/g, '');

    const mailjetApiKey = normalizeConfigString(
      this.configService.get<string>('mailjet.apiKey'),
    );
    const mailjetApiSecret = normalizeConfigString(
      this.configService.get<string>('mailjet.apiSecret'),
    );
    const configuredFromEmail =
      this.configService.get<string>('mailjet.fromEmail') ||
      'noreply@lblue.tech';
    const normalizedConfiguredFromEmail = normalizeConfigString(
      configuredFromEmail,
    );
    const fromCandidates = Array.from(
      new Set(
        [
          normalizedConfiguredFromEmail,
          'noreply@lblue.tech',
          'noreply@cblue.co.th',
        ]
          .map((v) => normalizeConfigString(v))
          .filter(Boolean),
      ),
    );

    if (!mailjetApiKey || !mailjetApiSecret) {
      this.logger.warn(
        `${tracePrefix}Mailjet not configured — skipping email send`,
      );
      this.logger.log(
        `[DEV] Password reset link for ${email}: /reset-password?token=${resetToken}`,
      );
      return { sent: false, path: 'none' };
    }

    const frontendUrl = (
      this.configService.get<string>('frontendUrl') || 'http://localhost:3000'
    ).replace(/\/$/, '');
    const resetUrl = `${frontendUrl}/en/subscription/reset-password?token=${resetToken}`;
    const subject = 'Reset your CBLUE password';
    const htmlPart = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; padding: 40px 0; min-height: 100vh;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.08);">
                <div style="background-color: #0c4a6e; padding: 32px 40px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">CBLUE.</h1>
                </div>
                <div style="padding: 40px;">
                  <h2 style="color: #1e293b; margin-top: 0; font-size: 20px; font-weight: 600;">Password Reset Request</h2>
                  <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                    Hello ${recipientName},
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
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                  <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0; text-align: center;">
                    If the button above is not working, copy and paste the following link into your browser:<br/>
                    <a href="${resetUrl}" style="color: #0284c7; text-decoration: none; word-break: break-all;">${resetUrl}</a>
                  </p>
                </div>
                <div style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="color: #94a3b8; font-size: 13px; margin: 0;">
                    &copy; ${new Date().getFullYear()} Construction Blue Co., Ltd. All rights reserved.
                  </p>
                </div>
              </div>
            </div>
          `;
    const textPart = `Hello ${recipientName},\n\nWe received a request to reset your password for your CBLUE account.\n\nClick the link below to reset your password (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, please ignore this email.\n\n© ${new Date().getFullYear()} Construction Blue Co., Ltd. All rights reserved.`;

    const smtpTransportFactory = nodemailer as unknown as {
      createTransport: (options: {
        host: string;
        port: number;
        secure: boolean;
        auth: { user: string; pass: string };
      }) => SmtpTransporter;
    };

    try {
      const transporter = smtpTransportFactory.createTransport({
        host: 'in-v3.mailjet.com',
        port: 587,
        secure: false,
        auth: {
          user: mailjetApiKey,
          pass: mailjetApiSecret,
        },
      });

      for (const fromEmail of fromCandidates) {
        try {
          await transporter.sendMail({
            from: `CBLUE <${fromEmail}>`,
            to: normalizedRecipientEmail,
            subject,
            text: textPart,
            html: htmlPart,
          });
          this.logger.log(
            `Password reset email sent to ${normalizedRecipientEmail} via Mailjet SMTP (${fromEmail})`,
          );
          this.logger.log(
            `[BACKUP-LINK] /en/subscription/reset-password?token=${resetToken}`,
          );
          return { sent: true, path: 'mailjet_smtp', fromEmail };
        } catch (smtpError) {
          const smtpErrorText =
            smtpError instanceof Error ? smtpError.message : String(smtpError);
          this.logger.error(
            `Mailjet SMTP send failed from ${fromEmail}: ${smtpErrorText}`,
          );
        }
      }
    } catch (smtpInitError) {
      const smtpErrorText =
        smtpInitError instanceof Error
          ? smtpInitError.message
          : String(smtpInitError);
      this.logger.error(`Mailjet SMTP transport init failed: ${smtpErrorText}`);
    }

    const isSenderConfigError = (errorText: string) => {
      const lower = errorText.toLowerCase();
      return (
        lower.includes('inactive') ||
        lower.includes('sender') ||
        lower.includes('from')
      );
    };

    const parseMailjetSendApiResponse = (
      raw: string,
    ): MailjetSendApiResponse | null => {
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== 'object') return null;

        const maybeMessages = (parsed as { Messages?: unknown }).Messages;
        if (!Array.isArray(maybeMessages)) return { Messages: [] };

        const messages: MailjetMessageStatus[] = maybeMessages.map(
          (message) => {
            if (!message || typeof message !== 'object') return {};
            const status = (message as { Status?: unknown }).Status;
            return { Status: typeof status === 'string' ? status : undefined };
          },
        );

        return { Messages: messages };
      } catch {
        return null;
      }
    };
    const parseMailjetLegacyResponse = (raw: string): number => {
      if (!raw) return 0;
      try {
        const parsed = JSON.parse(raw) as {
          Sent?: unknown;
          Messages?: unknown;
        };
        const sent = Number(parsed?.Sent ?? 0);
        if (Number.isFinite(sent) && sent > 0) return sent;
        if (Array.isArray(parsed?.Messages) && parsed.Messages.length > 0) {
          return parsed.Messages.length;
        }
      } catch {
        return 0;
      }
      return 0;
    };

    let apiError: string | null = null;
    for (const fromEmail of fromCandidates) {
      const body = {
        Messages: [
          {
            From: {
              Email: fromEmail,
              Name: 'CBLUE',
            },
            To: [{ Email: normalizedRecipientEmail, Name: recipientName }],
            Subject: subject,
            HTMLPart: htmlPart,
            TextPart: textPart,
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

        const rawResponse = await response.text();
        const parsedResponse = parseMailjetSendApiResponse(rawResponse);
        const messageStatuses = (parsedResponse?.Messages || []).map(
          (message) => String(message.Status || '').toLowerCase(),
        );
        const hasSuccessfulMessageStatus = messageStatuses.some((status) =>
          ['success', 'queued', 'sent'].includes(status),
        );

        if (response.ok && hasSuccessfulMessageStatus) {
          this.logger.log(
            `Password reset email sent to ${normalizedRecipientEmail} via Mailjet API (${fromEmail})`,
          );
          this.logger.log(
            `[BACKUP-LINK] /en/subscription/reset-password?token=${resetToken}`,
          );
          return { sent: true, path: 'mailjet_v31', fromEmail };
        }

        apiError =
          rawResponse ||
          (parsedResponse ? JSON.stringify(parsedResponse) : 'Unknown error');
        if (response.ok && !hasSuccessfulMessageStatus) {
          this.logger.error(
            `Mailjet API non-success message status from ${fromEmail}: ${apiError}`,
          );
          this.logger.warn(
            `Mailjet API returned 200 without success/queued status for ${fromEmail}; trying fallback sender.`,
          );
          continue;
        }
        this.logger.error(
          `Mailjet API error [${response.status}] from ${fromEmail}: ${apiError}`,
        );

        if (isSenderConfigError(apiError)) {
          this.logger.warn(
            `Mailjet sender '${fromEmail}' appears inactive; trying fallback sender.`,
          );
          continue;
        }

        break;
      } catch (error) {
        apiError = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Mailjet API send failed from ${fromEmail}: ${apiError}`,
        );
        break;
      }
    }

    if (apiError) {
      this.logger.warn(
        `Mailjet v3.1 send path failed for ${normalizedRecipientEmail}; trying Mailjet v3 legacy send endpoint.`,
      );
    }

    for (const fromEmail of fromCandidates) {
      const legacyBody = {
        FromEmail: fromEmail,
        FromName: 'CBLUE',
        Subject: subject,
        'Text-part': textPart,
        'Html-part': htmlPart,
        Recipients: [
          {
            Email: normalizedRecipientEmail,
            Name: recipientName,
          },
        ],
      };

      try {
        const response = await fetch('https://api.mailjet.com/v3/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization:
              'Basic ' +
              Buffer.from(`${mailjetApiKey}:${mailjetApiSecret}`).toString(
                'base64',
              ),
          },
          body: JSON.stringify(legacyBody),
        });

        const rawResponse = await response.text();
        const sentCount = parseMailjetLegacyResponse(rawResponse);

        if (response.ok && sentCount > 0) {
          this.logger.log(
            `Password reset email sent to ${normalizedRecipientEmail} via Mailjet legacy API (${fromEmail})`,
          );
          this.logger.log(
            `[BACKUP-LINK] /en/subscription/reset-password?token=${resetToken}`,
          );
          return { sent: true, path: 'mailjet_v3', fromEmail };
        }

        const legacyError = rawResponse || 'Unknown legacy Mailjet error';
        this.logger.error(
          `Mailjet legacy API error [${response.status}] from ${fromEmail}: ${legacyError}`,
        );
        if (isSenderConfigError(legacyError)) {
          this.logger.warn(
            `Mailjet legacy sender '${fromEmail}' appears inactive; trying fallback sender.`,
          );
          continue;
        }
      } catch (legacyError) {
        const legacyErrorText =
          legacyError instanceof Error
            ? legacyError.message
            : String(legacyError);
        this.logger.error(
          `Mailjet legacy API send failed from ${fromEmail}: ${legacyErrorText}`,
        );
      }
    }


    this.logger.error(`Password reset email could not be sent to ${normalizedRecipientEmail}`);
    if (apiError) {
      this.logger.error(`Last Mailjet API error: ${apiError}`);
    }
    this.logger.log(
      `[FALLBACK] Password reset link for ${normalizedRecipientEmail}: /en/subscription/reset-password?token=${resetToken}`,
    );
    return { sent: false, path: 'none' };
  }
}
