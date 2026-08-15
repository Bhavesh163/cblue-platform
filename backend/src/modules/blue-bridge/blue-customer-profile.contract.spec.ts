import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request, { type Response } from 'supertest';
import { PrismaService } from '../../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { BlueBridgeController } from './blue-bridge.controller';
import { BlueBridgeService } from './blue-bridge.service';
import { FixerWorkflowBridgeService } from './fixer-workflow-bridge.service';

type DataRow = Record<string, unknown>;
type QueryArgs = { select?: Record<string, unknown> };
type UpdateArgs = { data: Record<string, unknown> };
type FakePrisma = {
  $transaction: jest.Mock;
  user: Record<string, jest.Mock>;
  subscriber: Record<string, jest.Mock>;
  fixer: Record<string, jest.Mock>;
  notification: Record<string, jest.Mock>;
};
type CustomerProfileResponse = {
  email: string;
  phone: string;
  createdAt: string;
};

describe('BLUE customer profile contract', () => {
  let app: INestApplication;
  let userRow: DataRow;
  let subscriberRow: DataRow;
  let prisma: FakePrisma;

  const selectFields = (
    row: DataRow,
    select: Record<string, unknown> | undefined,
  ): DataRow => {
    if (!select) return { ...row };
    return Object.fromEntries(
      Object.entries(select).map(([key]) => {
        if (key === 'fixer') return [key, null];
        if (key === 'addresses') return [key, []];
        return [key, row[key]];
      }),
    );
  };

  const httpServer = (): Parameters<typeof request>[0] =>
    app.getHttpServer() as Parameters<typeof request>[0];

  beforeEach(async () => {
    userRow = {
      id: 'user-test1',
      subscriberId: 'subscriber-test1',
      name: 'test1',
      email: 'test1@gmail.com',
      phone: '0812345678',
      company: null,
      role: 'USER',
      isActive: true,
      createdAt: new Date('2026-08-14T00:00:00.000Z'),
    };
    subscriberRow = {
      id: 'subscriber-test1',
      email: 'test1@gmail.com',
      phone: '0812345678',
    };
    prisma = {
      $transaction: jest.fn(
        async (callback: (tx: FakePrisma) => Promise<unknown>) =>
          callback(prisma),
      ),
      user: {
        findMany: jest.fn().mockResolvedValue([{ id: 'user-test1' }]),
        findFirst: jest
          .fn()
          .mockImplementation(({ select }: QueryArgs) =>
            Promise.resolve(selectFields(userRow, select)),
          ),
        findUnique: jest
          .fn()
          .mockImplementation(({ select }: QueryArgs) =>
            Promise.resolve(selectFields(userRow, select)),
          ),
        update: jest.fn().mockImplementation(({ data }: UpdateArgs) => {
          userRow = { ...userRow, ...data };
          return Promise.resolve({ id: userRow.id });
        }),
      },
      subscriber: {
        findFirst: jest
          .fn()
          .mockImplementation(({ select }: QueryArgs) =>
            Promise.resolve(selectFields(subscriberRow, select)),
          ),
        updateMany: jest.fn().mockImplementation(({ data }: UpdateArgs) => {
          subscriberRow = { ...subscriberRow, ...data };
          return Promise.resolve({ count: 1 });
        }),
      },
      fixer: { update: jest.fn() },
      notification: { createMany: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [BlueBridgeController],
      providers: [
        BlueBridgeService,
        UserService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'blueBridge.apiKey' ? 'bridge-key' : undefined,
            ),
          },
        },
        { provide: PrismaService, useValue: prisma },
        {
          provide: FixerWorkflowBridgeService,
          useValue: { action: jest.fn() },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it.each(['test1@gmail.com', 'subscriber-test1'])(
    'returns and updates authoritative profile data for %s',
    async (legacySubjectId) => {
      await request(httpServer())
        .get('/api/v1/blue/customer-profile')
        .query({ legacySubjectId })
        .set('x-blue-bridge-key', 'bridge-key')
        .expect(200)
        .expect((response: Response) => {
          const profile = response.body as CustomerProfileResponse;
          expect(profile).toMatchObject({
            email: 'test1@gmail.com',
            phone: '0812345678',
            createdAt: '2026-08-14T00:00:00.000Z',
          });
        });

      await request(httpServer())
        .put('/api/v1/blue/customer-profile/phone')
        .set('x-blue-bridge-key', 'bridge-key')
        .send({ legacySubjectId, phone: '0822222222' })
        .expect(200)
        .expect((response: Response) => {
          const profile = response.body as CustomerProfileResponse;
          expect(profile.phone).toBe('0822222222');
          expect(profile.createdAt).toBe('2026-08-14T00:00:00.000Z');
        });

      expect(userRow.phone).toBe('0822222222');
      expect(subscriberRow.phone).toBe('0822222222');
    },
  );

  it('rejects requests without the BLUE bridge key', async () => {
    await request(httpServer())
      .get('/api/v1/blue/customer-profile')
      .query({ legacySubjectId: 'test1@gmail.com' })
      .expect(401);
  });
});
