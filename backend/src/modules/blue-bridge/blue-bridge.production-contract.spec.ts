import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { BlueBridgeService } from './blue-bridge.service';

const address = {
  unit: null,
  building: null,
  street: null,
  subdistrict: 'Saphansong',
  district: 'Wang Thonglang',
  province: 'Bangkok',
  postalCode: '10310',
  latitude: null,
  longitude: null,
};

function createService(order: Record<string, unknown>) {
  const prisma = {
    subscriber: { findFirst: jest.fn().mockResolvedValue(null) },
    user: { findMany: jest.fn().mockResolvedValue([{ id: 'user-1' }]) },
    order: { findFirst: jest.fn().mockResolvedValue(order) },
  } as unknown as PrismaService;

  return new BlueBridgeService(
    prisma,
    new ConfigService({ blueBridge: { apiKey: 'bridge-key' } }),
  );
}

describe('BLUE workflow production contracts', () => {
  it('returns the persisted Step-2 budget for PO-2607-8879', async () => {
    const service = createService({
      status: 'MATCHING',
      statusHistory: [],
      review: null,
      description: 'PO-2607-8879 | Persisted workflow details',
      budgetBreakdown: [
        {
          service: 'Fit-out',
          qty: 600,
          unit: 'sq.m.',
          unitRate: 30000,
          total: 18000000,
        },
        {
          service: 'Reinstatement',
          qty: 300,
          unit: 'sq.m.',
          unitRate: 10000,
          total: 3000000,
        },
        {
          service: 'Construction',
          qty: 700,
          unit: 'sq.m.',
          unitRate: 20000,
          total: 14000000,
        },
        {
          service: 'Website development',
          qty: 10,
          unit: 'page',
          unitRate: 1000,
          total: 10000,
        },
        {
          service: 'chatbot',
          qty: 100,
          unit: 'FAQ',
          unitRate: 100,
          total: 10000,
        },
      ],
      user: { name: 'Ghis Cafe', email: 'ghiscafe@gmail.com' },
      address,
      images: [],
    });

    const result = await service.workflowDetails({
      poNumber: 'PO-2607-8879',
      legacySubjectId: 'ghiscafe@gmail.com',
      bridgeKey: 'bridge-key',
    });

    expect(result.budgetBreakdown).toHaveLength(5);
    expect(result.budgetLines).toEqual([
      '1) Fit-out 600 sq.m. \u00d7 \u0e3f30,000',
      '= \u0e3f18,000,000',
      '2) Reinstatement 300 sq.m. \u00d7 \u0e3f10,000',
      '= \u0e3f3,000,000',
      '3) Construction 700 sq.m. \u00d7 \u0e3f20,000',
      '= \u0e3f14,000,000',
      '4) Website development 10 page \u00d7 \u0e3f1,000',
      '= \u0e3f10,000',
      '5) chatbot 100 FAQ \u00d7 \u0e3f100',
      '= \u0e3f10,000',
      'Budget',
      '= \u0e3f35,020,000',
    ]);
  });

  it('projects persisted PO-2605-2121 partner decline into history', async () => {
    const declinedAt = new Date('2026-07-11T12:00:00.000Z');
    const service = createService({
      status: 'CANCELLED',
      statusHistory: [
        {
          status: 'CANCELLED',
          note: 'Partner declined this order and cannot proceed.',
          createdAt: declinedAt,
        },
      ],
      review: null,
      description: 'PO-2605-2121 | Persisted workflow details',
      budgetBreakdown: null,
      user: { name: 'Customer', email: 'customer@example.com' },
      address,
      images: [],
    });

    const result = await service.workflowDetails({
      poNumber: 'PO-2605-2121',
      legacySubjectId: 'user-1',
      bridgeKey: 'bridge-key',
    });

    expect(result).toEqual(
      expect.objectContaining({
        activityBucket: 'history',
        lifecycleStatus: 'DECLINED',
        declinedAt: declinedAt.toISOString(),
        archivedAt: declinedAt.toISOString(),
      }),
    );
  });
});
