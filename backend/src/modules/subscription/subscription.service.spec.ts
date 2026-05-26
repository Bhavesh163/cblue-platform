import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionService } from './subscription.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('mock_hash'),
  compare: jest.fn().mockResolvedValue(false),
}));

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let prismaService: any;
  let jwtService: any;

  beforeEach(async () => {
    prismaService = {
      subscriber: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((callback) => {
        // mock the transaction object (tx)
        const tx = {
          user: prismaService.user,
          subscriber: prismaService.subscriber,
        };
        return Promise.resolve(callback(tx));
      }),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('test_token'),
      signAsync: jest.fn().mockResolvedValue('test_token'),
      verifyAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: PrismaService, useValue: prismaService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('dummy'),
            getOrThrow: jest.fn().mockReturnValue('dummy'),
          },
        },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue('mock_hash');
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should successfully register a new user and subscriber', async () => {
      // Mock no existing subscriber
      prismaService.subscriber.findUnique.mockResolvedValue(null);
      prismaService.subscriber.findFirst.mockResolvedValue(null);
      // Mock created subscriber inside transaction
      prismaService.subscriber.create.mockResolvedValue({
        id: 'sub-1',
        email: 'test@example.com',
      });
      // Mock no existing user
      prismaService.user.findFirst.mockResolvedValue(null);
      // Mock created user
      prismaService.user.create.mockResolvedValue({ id: 'user-1' });

      const result = await service.register({
        email: 'test@example.com',
        password: 'pass',
        name: 'Test',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('subscriber');
    });

    it('should throw conflict error if subscriber exists', async () => {
      prismaService.subscriber.findUnique.mockResolvedValue({ id: 'sub-1' });
      prismaService.subscriber.findFirst.mockResolvedValue({ id: 'sub-1' });

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'pass',
          name: 'Test',
        }),
      ).rejects.toThrow('Email already registered');
    });
  });

  describe('login', () => {
    it('should throw unauthorized for wrong password', async () => {
      prismaService.subscriber.findUnique.mockResolvedValue({
        id: 'sub-1',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
      });
      await expect(
        service.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow('Invalid email or password');
    });

    it('should create a bridge without phone when phone uniqueness blocks it', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prismaService.subscriber.findUnique.mockResolvedValue({
        id: 'sub-1',
        email: 'test@example.com',
        phone: '0819852846',
        name: 'Test User',
        company: null,
        status: 'ACTIVE',
      });
      prismaService.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      prismaService.user.create
        .mockRejectedValueOnce(new Error('Unique constraint failed on phone'))
        .mockResolvedValueOnce({
          id: 'user-1',
          email: 'test@example.com',
          phone: null,
          subscriberId: 'sub-1',
          isActive: true,
        });

      const result = await service.login({
        email: 'test@example.com',
        password: 'correct-password',
      });

      expect(result).toHaveProperty('accessToken', 'test_token');
      expect(prismaService.user.create).toHaveBeenCalledTimes(2);
      expect(prismaService.user.create.mock.calls[1][0]).toEqual({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          company: null,
          subscriberId: 'sub-1',
          role: 'USER',
        },
      });
    });
  });

  describe('refreshSession', () => {
    it('should reject ambiguous phone-only subscriber matches', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'stale-user',
        phone: '0819852846',
      });
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.subscriber.findMany.mockResolvedValue([
        {
          id: 'sub-1',
          email: 'first@example.com',
          phone: '0819852846',
          name: 'First',
          company: null,
        },
        {
          id: 'sub-2',
          email: 'second@example.com',
          phone: '0819852846',
          name: 'Second',
          company: null,
        },
      ]);

      await expect(
        service.refreshSession('Bearer stale-token'),
      ).rejects.toThrow('Session expired. Please log in again.');
    });
  });
});
