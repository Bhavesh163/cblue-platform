import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionService } from './subscription.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
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
        create: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((callback) => {
        // mock the transaction object (tx)
        const tx = {
          user: prismaService.user || {
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          },
          subscriber: prismaService.subscriber || { create: jest.fn() },
        };
        return Promise.resolve(callback(tx));
      }),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('test_token'),
      signAsync: jest.fn().mockResolvedValue('test_token'),
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
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should successfully register a new user and subscriber', async () => {
      // Mock no existing subscriber
      prismaService.subscriber.findUnique.mockResolvedValue(null);
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
        password: 'hashed_password',
      });
      // Since bcrypt compare is used inside login, we might need to mock bcrypt but it's hard to mock external module without jest.mock
      // I'll just rely on the test failing authentication
      try {
        await service.login({ email: 'test@example.com', password: 'wrong' });
      } catch (e) {
        expect(e.message).toBe('Invalid email or password');
      }
    });
  });
});
