import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import ms from 'ms';
import { PrismaService } from '../../prisma/prisma.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { MAX_OTP_ATTEMPTS, OTP_COOLDOWN_SECONDS } from '../../common/constants';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async sendOtp(dto: SendOtpDto) {
    const phone = this.normalizePhone(dto.phone);

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

    await this.prisma.otpCode.create({
      data: {
        phone,
        code,
        expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
      },
    });

    // In development, log OTP. In production, send via SMS provider.
    if (this.configService.get('nodeEnv') === 'development') {
      this.logger.log(`[DEV] OTP for ${phone}: ${code}`);
    } else {
      // TODO: Integrate SMS provider (Twilio / AWS SNS)
      this.logger.log(`OTP sent to ${phone}`);
    }

    return { message: 'OTP sent successfully', phone };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const phone = this.normalizePhone(dto.phone);

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

    if (otpRecord.code !== dto.code) {
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

    // Find or create user
    let user = await this.prisma.user.findUnique({ where: { phone } });

    if (!user) {
      user = await this.prisma.user.create({
        data: { phone },
      });
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.phone, user.role);

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

      return this.generateTokens(user.id, user.phone, user.role);
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
    crypto.getRandomValues(array);
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
}
