import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { webcrypto } from 'crypto';
import * as nodemailer from 'nodemailer';
import ms from 'ms';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RecaptchaService } from './recaptcha.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { SendAdminOtpDto } from './dto/send-admin-otp.dto';
import { VerifyAdminOtpDto } from './dto/verify-admin-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { MAX_OTP_ATTEMPTS, OTP_COOLDOWN_SECONDS } from '../../common/constants';
import { JwtPayload } from './strategies/jwt.strategy';

const ADMIN_OTP_EMAIL_ALLOWLIST = new Set([
  'suppadesh@hotmail.com',
  'ghiscafe@gmail.com',
  'bhaveshfung@gmail.com',
]);

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private recaptchaService: RecaptchaService,
  ) {}

  async sendOtp(dto: SendOtpDto) {
    const phone = this.normalizePhone(dto.phone);
    return this.createOtp(phone, 'OTP sent successfully');
  }

  async sendAdminOtp(dto: SendAdminOtpDto) {
    const email = this.normalizeEmail(dto.email);
    await this.recaptchaService.verify(dto.recaptchaToken, 'admin_login');

    this.assertApprovedAdminOtpEmail(email);

    const admin = await this.prisma.user.findUnique({ where: { email } });
    if (!admin || !admin.isActive || admin.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('Admin access required');
    }

    return this.createOtp(email, 'Admin OTP sent successfully', {
      email,
      purpose: 'admin_login',
    });
  }

  private assertApprovedAdminOtpEmail(email: string): void {
    if (!ADMIN_OTP_EMAIL_ALLOWLIST.has(email)) {
      throw new UnauthorizedException('Admin access required');
    }
  }

  private async createOtp(
    phone: string,
    message: string,
    delivery?: { email: string; purpose: 'admin_login' },
  ) {
    // Check cooldown - prevent rapid OTP requests
    const recentOtp = await this.prisma.otpCode.findFirst({
      where: {
        phone,
        createdAt: {
          gte: new Date(Date.now() - OTP_COOLDOWN_SECONDS * 1000),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentOtp) {
      throw new BadRequestException(
        `Please wait ${OTP_COOLDOWN_SECONDS} seconds before requesting a new OTP`,
      );
    }

    const code = this.generateOtp();
    const expiryMinutes =
      this.configService.get<number>('otp.expiryMinutes') ?? 5;

    const otpRecord = await this.prisma.otpCode.create({
      data: {
        phone,
        code,
        expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
      },
    });

    if (delivery?.email) {
      try {
        await this.sendAdminOtpEmail(delivery.email, code);
      } catch (error) {
        await this.prisma.otpCode.delete({ where: { id: otpRecord.id } }).catch(
          () => {
            this.logger.warn(
              'Admin OTP delivery failed and its OTP record could not be removed',
            );
          },
        );
        throw error;
      }
    } else if (this.configService.get('nodeEnv') === 'development') {
      this.logger.log(`[DEV] OTP for ${phone}: ${code}`);
    } else {
      // TODO: Integrate SMS provider (Twilio / AWS SNS)
      this.logger.log(`OTP sent to ${phone}`);
    }

    return { message, phone };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const phone = this.normalizePhone(dto.phone);
    await this.verifyOtpCode(phone, dto.code);

    // Find or create user
    let user = await this.prisma.user.findUnique({ where: { phone } });

    if (!user) {
      user = await this.prisma.user.create({
        data: { phone },
      });
    }

    // Generate tokens
    const tokens = await this.generateTokens(
      user.id,
      user.phone ?? '',
      user.role,
    );

    return {
      ...tokens,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        name: user.name,
      },
    };
  }

  async verifyAdminOtp(dto: VerifyAdminOtpDto) {
    const email = this.normalizeEmail(dto.email);
    this.assertApprovedAdminOtpEmail(email);
    await this.verifyOtpCode(email, dto.code);

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive || user.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('Admin access required');
    }

    const tokens = await this.generateTokens(
      user.id,
      user.phone ?? '',
      user.role,
    );

    return {
      ...tokens,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        role: user.role,
        name: user.name,
      },
    };
  }

  private async verifyOtpCode(phone: string, code: string) {
    const otpRecord = await this.prisma.otpCode.findFirst({
      where: {
        phone,
        verified: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new UnauthorizedException('OTP expired or not found');
    }

    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      throw new UnauthorizedException(
        'Maximum OTP attempts exceeded. Request a new OTP.',
      );
    }

    if (otpRecord.code !== code) {
      await this.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid OTP');
    }

    // Mark OTP as verified
    await this.prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });
  }

  private async sendAdminOtpEmail(email: string, code: string) {
    const normalizeConfigString = (value?: string | null) =>
      String(value || '')
        .trim()
        .replace(/^['"]|['"]$/g, '');
    const apiKey = normalizeConfigString(
      this.configService.get<string>('mailjet.apiKey'),
    );
    const apiSecret = normalizeConfigString(
      this.configService.get<string>('mailjet.apiSecret'),
    );
    const configuredFromEmail = normalizeConfigString(
      this.configService.get<string>('mailjet.fromEmail'),
    );
    const nodeEnv = this.configService.get<string>('nodeEnv') || 'development';

    if (!apiKey || !apiSecret) {
      if (nodeEnv === 'production') {
        throw new BadRequestException('Admin OTP email is not configured');
      }
      this.logger.log(`[DEV] Admin OTP for ${email}: ${code}`);
      return;
    }

    const senderCandidates = Array.from(
      new Set(
        [
          configuredFromEmail,
          'noreply@cblue.co.th',
          'noreply@lblue.tech',
        ].filter(Boolean),
      ),
    );

    const smtpTransportFactory = nodemailer as unknown as {
      createTransport: (options: {
        host: string;
        port: number;
        secure: boolean;
        connectionTimeout: number;
        greetingTimeout: number;
        socketTimeout: number;
        auth: { user: string; pass: string };
      }) => {
        sendMail: (options: {
          from: string;
          to: string;
          subject: string;
          text: string;
          html: string;
        }) => Promise<unknown>;
      };
    };

    try {
      const transporter = smtpTransportFactory.createTransport({
        host: 'in-v3.mailjet.com',
        port: 587,
        secure: false,
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
        auth: { user: apiKey, pass: apiSecret },
      });

      const smtpFromEmail = senderCandidates[0];
      if (smtpFromEmail) {
        try {
          await transporter.sendMail({
            from: `blue AI <${smtpFromEmail}>`,
            to: email,
            subject: 'CBLUE admin login OTP',
            text: `Your CBLUE admin login OTP is ${code}. It expires in a few minutes.`,
            html: `<p>Your CBLUE admin login OTP is <strong>${code}</strong>.</p><p>It expires in a few minutes.</p>`,
          });
          this.logger.log('Admin OTP email accepted by Mailjet SMTP');
          return;
        } catch {
          this.logger.warn('Admin OTP Mailjet SMTP delivery request failed');
        }
      }
    } catch {
      this.logger.warn('Admin OTP Mailjet SMTP transport init failed');
    }

    const mailjetHeaders = {
      Authorization:
        'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64'),
      'Content-Type': 'application/json',
    };
    for (const fromEmail of senderCandidates) {
      try {
        const response = await fetch('https://api.mailjet.com/v3.1/send', {
          method: 'POST',
          headers: mailjetHeaders,
          body: JSON.stringify({
            Messages: [
              {
                From: { Email: fromEmail, Name: 'blue AI' },
                To: [{ Email: email }],
                Subject: 'CBLUE admin login OTP',
                TextPart: `Your CBLUE admin login OTP is ${code}. It expires in a few minutes.`,
                HTMLPart: `<p>Your CBLUE admin login OTP is <strong>${code}</strong>.</p><p>It expires in a few minutes.</p>`,
              },
            ],
          }),
        });
        const rawResponse = await response.text();
        let messageStatuses: string[] = [];
        try {
          const parsed = JSON.parse(rawResponse) as {
            Messages?: Array<{ Status?: string }>;
          };
          messageStatuses = (parsed.Messages || []).map((message) =>
            String(message.Status || '').toLowerCase(),
          );
        } catch {
          messageStatuses = [];
        }

        if (
          response.ok &&
          messageStatuses.some((status) =>
            ['success', 'sent'].includes(status),
          )
        ) {
          return;
        }

        this.logger.warn(
          `Admin OTP Mailjet delivery was rejected (status ${response.status})`,
        );
        if (response.status === 401 || response.status === 403) {
          break;
        }
      } catch {
        this.logger.warn('Admin OTP Mailjet delivery request failed');
      }
    }

    for (const fromEmail of senderCandidates) {
      try {
        const response = await fetch('https://api.mailjet.com/v3/send', {
          method: 'POST',
          headers: mailjetHeaders,
          body: JSON.stringify({
            FromEmail: fromEmail,
            FromName: 'blue AI',
            Subject: 'CBLUE admin login OTP',
            'Text-part':
              'Your CBLUE admin login OTP is ' +
              code +
              '. It expires in a few minutes.',
            'Html-part':
              '<p>Your CBLUE admin login OTP is <strong>' +
              code +
              '</strong>.</p><p>It expires in a few minutes.</p>',
            Recipients: [{ Email: email, Name: 'CBLUE Administrator' }],
          }),
        });
        const rawResponse = await response.text();
        let sentCount = 0;
        try {
          const parsed = JSON.parse(rawResponse) as {
            Sent?: unknown;
            Messages?: unknown;
          };
          const sent = Number(parsed.Sent || 0);
          sentCount = Number.isFinite(sent) && sent > 0
            ? sent
            : Array.isArray(parsed.Messages)
              ? parsed.Messages.length
              : 0;
        } catch {
          sentCount = 0;
        }

        if (response.ok && sentCount > 0) {
          this.logger.log('Admin OTP email accepted by Mailjet legacy API');
          return;
        }

        this.logger.warn(
          'Admin OTP Mailjet legacy delivery was rejected (status ' +
            response.status +
            ')',
        );
      } catch {
        this.logger.warn('Admin OTP Mailjet legacy delivery request failed');
      }
    }

    throw new BadRequestException('Unable to send admin OTP email');
  }

  async refreshToken(dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(dto.refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      return this.generateTokens(user.id, user.phone ?? '', user.role);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async generateTokens(userId: string, phone: string, role: string) {
    const payload: JwtPayload = { sub: userId, phone, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('jwt.secret'),
        expiresIn:
          this.configService.getOrThrow<ms.StringValue>('jwt.expiration'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: this.configService.getOrThrow<ms.StringValue>(
          'jwt.refreshExpiration',
        ),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private generateOtp(): string {
    const length = this.configService.get<number>('otp.length') || 6;
    const digits = '0123456789';
    let otp = '';
    const array = new Uint32Array(length);
    const cryptoApi = globalThis.crypto ?? webcrypto;
    cryptoApi.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      otp += digits[array[i] % 10];
    }
    return otp;
  }

  private normalizePhone(phone: string): string {
    // Convert 0xx format to +66xx
    if (phone.startsWith('0')) {
      return '+66' + phone.slice(1);
    }
    return phone;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
