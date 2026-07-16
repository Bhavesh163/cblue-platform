import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionService } from './subscription.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('mock_hash'),
  compare: jest.fn().mockResolvedValue(false),
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockRejectedValue(new Error('SMTP unavailable')),
  })),
}));

type SubscriberMock = {
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
};

type UserMock = {
  findFirst: jest.Mock;
  findUnique: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
};

type PrismaMock = {
  subscriber: SubscriberMock;
  user: UserMock;
  $transaction: jest.Mock;
};

type JwtMock = {
  sign: jest.Mock;
  signAsync: jest.Mock;
  verifyAsync: jest.Mock;
};

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let prismaService: PrismaMock;
  let jwtService: JwtMock;

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
      $transaction: jest.fn(
        (
          callback: (tx: {
            user: UserMock;
            subscriber: SubscriberMock;
          }) => unknown,
        ) => {
          // mock the transaction object (tx)
          const tx = {
            user: prismaService.user,
            subscriber: prismaService.subscriber,
          };
          return Promise.resolve(callback(tx));
        },
      ),
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
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: jest.fn().mockRejectedValue(new Error('SMTP unavailable')),
    });
    (bcrypt.hash as jest.Mock).mockResolvedValue('mock_hash');
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('uses Mailjet SMTP before the REST API for password reset email delivery', async () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: 'mail-1' });
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });
    const fetchSpy = jest.spyOn(global, 'fetch');

    const result = await (service as any).sendResetEmail(
      'person@example.com',
      'Person',
      'reset-token',
    );

    expect(result).toEqual(
      expect.objectContaining({ sent: true, path: 'mailjet_smtp' }),
    );
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
      }),
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'person@example.com' }),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
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

    it('should persist phone and PDPA consent timestamp during registration', async () => {
      prismaService.subscriber.findUnique.mockResolvedValue(null);
      prismaService.subscriber.findFirst.mockResolvedValue(null);
      prismaService.subscriber.create.mockResolvedValue({
        id: 'sub-2',
        email: 'person@example.com',
        phone: '0812345678',
      });
      prismaService.user.findFirst.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue({ id: 'user-2' });

      await service.register({
        email: 'person@example.com',
        password: 'pass',
        name: 'Person Name',
        phone: '0812345678',
        pdpaConsent: true,
      });

      expect(prismaService.subscriber.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          phone: '0812345678',
          pdpaConsentAt: expect.any(Date),
        }),
      });
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
      expect(prismaService.user.create).toHaveBeenNthCalledWith(2, {
        data: {
          email: 'test@example.com',
          name: 'Test User',
          company: null,
          subscriberId: 'sub-1',
          role: 'USER',
        },
      });
    });

    it('should recover login when subscriber email has stored whitespace and password input has surrounding whitespace', async () => {
      (bcrypt.compare as jest.Mock).mockImplementation(async (password) => password === 'correct-password');
      prismaService.subscriber.findUnique.mockResolvedValue(null);
      prismaService.subscriber.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'sub-1',
          email: ' ghiscafe@gmail.com ',
          phone: '',
          name: 'Ghis Cafe',
          company: null,
          status: 'ACTIVE',
          passwordHash: 'hash',
        });
      prismaService.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      prismaService.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'ghiscafe@gmail.com',
        subscriberId: 'sub-1',
        isActive: true,
      });

      const result = await service.login({
        email: 'ghiscafe@gmail.com',
        password: ' correct-password ',
      });

      expect(result).toHaveProperty('accessToken', 'test_token');
      expect(bcrypt.compare).toHaveBeenCalledWith('correct-password', 'hash');
      expect(prismaService.subscriber.findFirst).toHaveBeenNthCalledWith(2, {
        where: {
          email: {
            contains: 'ghiscafe@gmail.com',
            mode: 'insensitive',
          },
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

    it('rejects a token expired beyond the 30-day sliding window', async () => {
      const longExpiredSeconds =
        Math.floor(Date.now() / 1000) - 31 * 24 * 60 * 60;
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        email: 'ghis@example.com',
        exp: longExpiredSeconds,
      });

      await expect(
        service.refreshSession('Bearer long-expired-token'),
      ).rejects.toThrow('Session expired. Please log in again.');
    });

    it('refreshes a recently-expired token within the sliding window', async () => {
      const recentlyExpiredSeconds = Math.floor(Date.now() / 1000) - 60 * 60;
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        email: 'ghis@example.com',
        exp: recentlyExpiredSeconds,
      });
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'ghis@example.com',
        phone: null,
        isActive: true,
        subscriberId: 'sub-1',
      });
      prismaService.subscriber.findUnique.mockResolvedValue({
        id: 'sub-1',
        email: 'ghis@example.com',
        phone: null,
        name: 'Ghis',
        company: null,
        status: 'ACTIVE',
        serviceCategory: null,
      });

      const result = await service.refreshSession('Bearer recent-token');

      expect(result.accessToken).toBe('test_token');
      expect(result.subscriber.id).toBe('sub-1');
    });
  });
});
