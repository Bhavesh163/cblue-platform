import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('SubscriptionService', () => {
  let service: SubscriptionService;

  const mockPrisma = {
    subscriber: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        subscriber: {
          create: mockPrisma.subscriber.create,
          update: mockPrisma.subscriber.update,
        },
        user: {
          findUnique: mockPrisma.user.findUnique,
          findFirst: mockPrisma.user.findFirst,
          create: mockPrisma.user.create,
          update: mockPrisma.user.update,
        },
      } as unknown),
    ),
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('mock-token'),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        'mailjet.apiKey': '',
        'mailjet.apiSecret': '',
        frontendUrl: 'http://localhost:3000',
        'mailjet.fromEmail': 'test@cblue.co.th',
      };
      return config[key];
    }),
    getOrThrow: jest.fn().mockReturnValue('test-secret'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new subscriber', async () => {
      mockPrisma.subscriber.findUnique.mockResolvedValue(null);
      mockPrisma.subscriber.create.mockResolvedValue({
        id: 'sub-1',
        email: 'test@example.com',
        name: 'Test User',
        status: 'ACTIVE',
      });
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        subscriberId: 'sub-1',
      });

      const result = await service.register({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        phone: '0812345678',
      });

      expect(result.accessToken).toBe('mock-token');
      expect(result.subscriber.email).toBe('test@example.com');
    });

    it('should throw ConflictException for duplicate email', async () => {
      mockPrisma.subscriber.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          name: 'Test',
          email: 'existing@example.com',
          password: 'password123',
          phone: '0812345678',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      const hash = await bcrypt.hash('password123', 12);
      mockPrisma.subscriber.findUnique.mockResolvedValue({
        id: 'sub-1',
        email: 'test@example.com',
        passwordHash: hash,
        name: 'Test User',
        phone: '0812345678',
        company: null,
        status: 'ACTIVE',
        serviceCategory: null,
      });

      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        subscriberId: 'sub-1',
      });

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.accessToken).toBe('mock-token');
      expect(result.subscriber.email).toBe('test@example.com');
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const hash = await bcrypt.hash('correctpassword', 12);
      mockPrisma.subscriber.findUnique.mockResolvedValue({
        id: 'sub-1',
        email: 'test@example.com',
        passwordHash: hash,
        status: 'ACTIVE',
      });

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for non-existent email', async () => {
      mockPrisma.subscriber.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'nonexistent@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for suspended account', async () => {
      const hash = await bcrypt.hash('password123', 12);
      mockPrisma.subscriber.findUnique.mockResolvedValue({
        id: 'sub-1',
        email: 'test@example.com',
        passwordHash: hash,
        status: 'SUSPENDED',
      });

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('should return success message even if email not found', async () => {
      mockPrisma.subscriber.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword({
        email: 'nonexistent@example.com',
      });

      expect(result.message).toContain('If the email exists');
    });

    it('should generate reset token and update subscriber', async () => {
      mockPrisma.subscriber.findUnique.mockResolvedValue({
        id: 'sub-1',
        email: 'test@example.com',
        name: 'Test User',
      });
      mockPrisma.subscriber.update.mockResolvedValue({});

      const result = await service.forgotPassword({
        email: 'test@example.com',
      });

      expect(result.message).toContain('If the email exists');
      expect(mockPrisma.subscriber.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sub-1' },
          data: expect.objectContaining({
            resetToken: expect.any(String),
            resetTokenExpiry: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      mockPrisma.subscriber.findFirst.mockResolvedValue({
        id: 'sub-1',
        resetToken: 'valid-token',
        resetTokenExpiry: new Date(Date.now() + 3600000),
      });
      mockPrisma.subscriber.update.mockResolvedValue({});

      const result = await service.resetPassword({
        token: 'valid-token',
        newPassword: 'newpassword123',
      });

      expect(result.message).toBe('Password reset successfully');
      expect(mockPrisma.subscriber.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resetToken: null,
            resetTokenExpiry: null,
          }),
        }),
      );
    });

    it('should throw for expired/invalid token', async () => {
      mockPrisma.subscriber.findFirst.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          token: 'invalid-token',
          newPassword: 'newpassword123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('listSubscribers', () => {
    it('should return all subscribers', async () => {
      mockPrisma.subscriber.findMany.mockResolvedValue([
        { id: 'sub-1', email: 'a@b.com', name: 'A', status: 'ACTIVE' },
      ]);

      const result = await service.listSubscribers();
      expect(result).toHaveLength(1);
    });
  });
});
