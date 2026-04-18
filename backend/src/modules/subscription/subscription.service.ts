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
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const resetToken = Array.from(array, (b) =>
      b.toString(16).padStart(2, '0'),
    ).join('');
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

    const frontendUrl =
      this.configService.get<string>('frontendUrl') || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/en/subscription/reset-password?token=${resetToken}`;

    const body = {
      Messages: [
        {
          From: {
            Email:
              this.configService.get<string>('mailjet.fromEmail') ||
              'noreply@cblue.co.th',
            Name: 'CBLUE',
          },
          To: [{ Email: email, Name: name }],
          Subject: 'CBLUE - Password Reset / รีเซ็ตรหัสผ่าน / 重置密码',
          HTMLPart: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #0284c7;">CBLUE - Password Reset</h2>
              <p>Hello ${name},</p>
              <p>You requested a password reset. Click the button below to set a new password:</p>
              <p>คุณได้ร้องขอการรีเซ็ตรหัสผ่าน กรุณากดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่:</p>
              <p>您已请求重置密码。请点击下方按钮设置新密码：</p>
              <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0284c7; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
                Reset Password / ตั้งรหัสผ่านใหม่ / 重置密码
              </a>
              <p style="color: #666; font-size: 14px;">This link expires in 1 hour. / ลิงก์นี้จะหมดอายุใน 1 ชั่วโมง / 此链接将在1小时后失效。</p>
              <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email. / หากคุณไม่ได้ร้องขอ กรุณาเพิกเฉยอีเมลนี้</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="color: #999; font-size: 12px;">© Construction Blue Co., Ltd.</p>
            </div>
          `,
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
      } else {
        this.logger.log(`Password reset email sent to ${email}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send email: ${error}`);
    }
  }
}
