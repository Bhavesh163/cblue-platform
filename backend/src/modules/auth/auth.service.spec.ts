import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { RecaptchaService } from './recaptcha.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    otpCode: Record<string, jest.Mock>;
    user: Record<string, jest.Mock>;
  };
  let jwtService: { signAsync: jest.Mock; verify: jest.Mock };
  let configService: { get: jest.Mock; getOrThrow: jest.Mock };
  let recaptchaService: { verify: jest.Mock };

  beforeEach(async () => {
    prisma = {
      otpCode: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-token'),
      verify: jest.fn(),
    };
    configService = {
      get: jest.fn().mockReturnValue('development'),
      getOrThrow: jest.fn().mockReturnValue('30m'),
    };
    recaptchaService = {
      verify: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: RecaptchaService, useValue: recaptchaService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendOtp', () => {
    it('should throw BadRequestException if OTP requested too soon', async () => {
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'otp-1',
        createdAt: new Date(),
      });

      await expect(service.sendOtp({ phone: '0812345678' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create OTP and return success', async () => {
      prisma.otpCode.findFirst.mockResolvedValue(null);
      prisma.otpCode.create.mockResolvedValue({ id: 'otp-1' });
      configService.get.mockImplementation((key: string) => {
        if (key === 'otp.expiryMinutes') return 5;
        return 'development';
      });

      const result = await service.sendOtp({ phone: '0812345678' });
      expect(result.message).toBe('OTP sent successfully');
      expect(result.phone).toBe('+66812345678');
      expect(prisma.otpCode.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendAdminOtp', () => {
    it('should verify recaptcha before sending admin OTP', async () => {
      prisma.otpCode.findFirst.mockResolvedValue(null);
      prisma.otpCode.create.mockResolvedValue({ id: 'otp-1' });
      prisma.user.findUnique.mockResolvedValue({
        id: 'admin-1',
        phone: '+66812345678',
        role: 'ADMIN',
        isActive: true,
      });

      await service.sendAdminOtp({
        phone: '0812345678',
        recaptchaToken: 'captcha-token',
      });

      expect(recaptchaService.verify).toHaveBeenCalledWith(
        'captcha-token',
        'admin_login',
      );
      expect(prisma.otpCode.create).toHaveBeenCalledTimes(1);
    });

    it('should reject non-admin phones before creating an OTP', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        phone: '+66812345678',
        role: 'USER',
        isActive: true,
      });

      await expect(
        service.sendAdminOtp({
          phone: '0812345678',
          recaptchaToken: 'captcha-token',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.otpCode.create).not.toHaveBeenCalled();
    });
  });

  describe('verifyOtp', () => {
    it('should throw if OTP not found', async () => {
      prisma.otpCode.findFirst.mockResolvedValue(null);

      await expect(
        service.verifyOtp({ phone: '0812345678', code: '123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if max attempts exceeded', async () => {
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'otp-1',
        code: '123456',
        attempts: 5,
      });

      await expect(
        service.verifyOtp({ phone: '0812345678', code: '123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw and increment attempts for wrong code', async () => {
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'otp-1',
        code: '111111',
        attempts: 0,
      });
      prisma.otpCode.update.mockResolvedValue({});

      await expect(
        service.verifyOtp({ phone: '0812345678', code: '999999' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.otpCode.update).toHaveBeenCalledWith({
        where: { id: 'otp-1' },
        data: { attempts: { increment: 1 } },
      });
    });

    it('should verify OTP and return tokens for existing user', async () => {
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'otp-1',
        code: '123456',
        attempts: 0,
      });
      prisma.otpCode.update.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        phone: '+66812345678',
        role: 'USER',
        name: 'Test',
        isActive: true,
      });

      const result = await service.verifyOtp({
        phone: '0812345678',
        code: '123456',
      });

      expect(result.accessToken).toBe('mock-token');
      expect(result.user.id).toBe('user-1');
    });

    it('should create new user if not exists', async () => {
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'otp-1',
        code: '123456',
        attempts: 0,
      });
      prisma.otpCode.update.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user-new',
        phone: '+66812345678',
        role: 'USER',
        name: null,
        isActive: true,
      });

      const result = await service.verifyOtp({
        phone: '0812345678',
        code: '123456',
      });

      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      expect(result.user.id).toBe('user-new');
    });
  });

  describe('verifyAdminOtp', () => {
    it('should return tokens for an admin OTP verification', async () => {
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'otp-1',
        code: '123456',
        attempts: 0,
      });
      prisma.otpCode.update.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({
        id: 'admin-1',
        phone: '+66812345678',
        role: 'ADMIN',
        name: 'Admin',
        isActive: true,
      });

      const result = await service.verifyAdminOtp({
        phone: '0812345678',
        code: '123456',
      });

      expect(result.accessToken).toBe('mock-token');
      expect(result.user.role).toBe('ADMIN');
    });

    it('should reject non-admin OTP verification without creating a user', async () => {
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'otp-1',
        code: '123456',
        attempts: 0,
      });
      prisma.otpCode.update.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        phone: '+66812345678',
        role: 'USER',
        name: 'User',
        isActive: true,
      });

      await expect(
        service.verifyAdminOtp({ phone: '0812345678', code: '123456' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should throw for invalid refresh token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(
        service.refreshToken({ refreshToken: 'bad-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return new tokens for valid refresh token', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'user-1',
        phone: '+66812345678',
        role: 'USER',
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        phone: '+66812345678',
        role: 'USER',
        isActive: true,
      });

      const result = await service.refreshToken({
        refreshToken: 'valid-token',
      });

      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
    });
  });
});
