import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { BlueBridgeService } from './blue-bridge.service';

describe('BlueBridgeService', () => {
  it('returns the exact persisted step-2 budget without parsing PO digits', async () => {
    const prisma = {
      subscriber: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'subscriber-1',
          email: 'bhavesh@example.com',
        }),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([{ id: 'user-1' }]),
      },
      order: {
        findFirst: jest.fn().mockResolvedValue({
          description:
            'PO-2606-4636 | TIER:STANDARD | LOC:Saphansong | Build project 1) website development 2606 pages x 1000 Baht = 2606000 Baht 2) Fit-out 4636 Baht x 30000 Baht = 139080 Baht',
          budgetBreakdown: [
            {
              service: 'Fit-out',
              qty: 20,
              unit: 'sq.m.',
              unitRate: 30000,
              total: 600000,
            },
            {
              service: 'Reinstatement',
              qty: 10,
              unit: 'sq.m.',
              unitRate: 10000,
              total: 100000,
            },
            {
              service: 'Construction',
              qty: 10,
              unit: 'sq.m.',
              unitRate: 20000,
              total: 200000,
            },
            {
              service: 'Website development',
              qty: 2000,
              unit: 'page',
              unitRate: 1000,
              total: 2000000,
            },
            {
              service: 'chatbot',
              qty: 100,
              unit: 'FAQ',
              unitRate: 100,
              total: 10000,
            },
          ],
          user: { name: 'Bhisashmintra', email: 'customer@example.com' },
          address: {
            unit: null,
            building: null,
            street: null,
            subdistrict: 'Saphansong',
            district: 'Wang Thonglang',
            province: 'Bangkok',
            postalCode: '10310',
            latitude: 13.793951,
            longitude: 100.609606,
          },
          images: [],
        }),
      },
    } as unknown as PrismaService;
    const service = new BlueBridgeService(
      prisma,
      new ConfigService({ blueBridge: { apiKey: 'bridge-key' } }),
    );

    const result = await service.workflowDetails({
      poNumber: 'PO-2606-4636',
      legacySubjectId: 'subscriber-1',
      bridgeKey: 'bridge-key',
    });

    expect(result.detailRows[0]).toEqual({
      label: 'Customer',
      value: 'Bhisashmintra',
    });
    expect(result.detailRows).toContainEqual({
      label: 'Project Location',
      value: '13.793951, 100.609606',
    });
    expect(result.budgetBreakdown).toEqual([
      {
        service: 'Fit-out',
        qty: 20,
        unit: 'sq.m.',
        unitRate: 30000,
        total: 600000,
      },
      {
        service: 'Reinstatement',
        qty: 10,
        unit: 'sq.m.',
        unitRate: 10000,
        total: 100000,
      },
      {
        service: 'Construction',
        qty: 10,
        unit: 'sq.m.',
        unitRate: 20000,
        total: 200000,
      },
      {
        service: 'Website development',
        qty: 2000,
        unit: 'page',
        unitRate: 1000,
        total: 2000000,
      },
      {
        service: 'chatbot',
        qty: 100,
        unit: 'FAQ',
        unitRate: 100,
        total: 10000,
      },
    ]);
    expect(result.budgetLines).toEqual([
      '1) Fit-out 20 sq.m. × ฿30,000',
      '= ฿600,000',
      '2) Reinstatement 10 sq.m. × ฿10,000',
      '= ฿100,000',
      '3) Construction 10 sq.m. × ฿20,000',
      '= ฿200,000',
      '4) Website development 2,000 page × ฿1,000',
      '= ฿2,000,000',
      '5) chatbot 100 FAQ × ฿100',
      '= ฿10,000',
      'Budget',
      '= ฿2,910,000',
    ]);
    expect(result.budgetLines.join(' ')).not.toContain('2,606');
    expect(result.budgetLines.join(' ')).not.toContain('4,636');
    expect(result.detailRows.map((row) => row.value).join(' ')).not.toContain(
      '2606 pages',
    );
    expect(result.detailRows.map((row) => row.value).join(' ')).not.toContain(
      '139080 Baht',
    );
  });

  it('returns an empty budget when Order.budgetBreakdown is missing instead of cooking values from text', async () => {
    const prisma = {
      subscriber: { findFirst: jest.fn().mockResolvedValue(null) },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'user-1' }]) },
      order: {
        findFirst: jest.fn().mockResolvedValue({
          description:
            'PO-2606-9845 | 1) website development 2606 pages x 1000 Baht = 2606000 Baht',
          budgetBreakdown: null,
          user: { name: 'Customer', email: 'customer@example.com' },
          address: {
            unit: null,
            building: null,
            street: null,
            subdistrict: 'Saphansong',
            district: 'Wang Thonglang',
            province: 'Bangkok',
            postalCode: '10310',
            latitude: null,
            longitude: null,
          },
          images: [],
        }),
      },
    } as unknown as PrismaService;
    const service = new BlueBridgeService(
      prisma,
      new ConfigService({ blueBridge: { apiKey: 'bridge-key' } }),
    );

    const result = await service.workflowDetails({
      poNumber: 'PO-2606-9845',
      legacySubjectId: 'user-1',
      bridgeKey: 'bridge-key',
    });

    expect(result.budgetBreakdown).toEqual([]);
    expect(result.budgetLines).toEqual([]);
  });

  it('normalizes stored modal-style budget rows without cooking PO-like values from text', async () => {
    const prisma = {
      subscriber: { findFirst: jest.fn().mockResolvedValue(null) },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'user-1' }]) },
      order: {
        findFirst: jest.fn().mockResolvedValue({
          description:
            'PO-2606-4636 | Project details mention 2606 pages and 4636 sq.m. but stored budget is authoritative',
          budgetBreakdown: [
            {
              item: 'Fit-out',
              quantity: '20',
              unit: 'sq.m.',
              rate: '30000',
              amount: '600000',
            },
            {
              item: 'Reinstatement',
              quantity: '10',
              unit: 'sq.m.',
              rate: '10000',
              amount: '100000',
            },
            {
              item: 'Construction',
              quantity: '10',
              unit: 'sq.m.',
              rate: '20000',
              amount: '200000',
            },
            {
              item: 'Website development',
              quantity: '2000',
              unit: 'page',
              rate: '1000',
              amount: '2000000',
            },
            {
              item: 'chatbot',
              quantity: '100',
              unit: 'FAQ',
              rate: '100',
              amount: '10000',
            },
          ],
          user: { name: 'Bhisashmintra', email: 'customer@example.com' },
          address: {
            unit: null,
            building: null,
            street: null,
            subdistrict: 'Saphansong',
            district: 'Wang Thonglang',
            province: 'Bangkok',
            postalCode: '10310',
            latitude: null,
            longitude: null,
          },
          images: [],
        }),
      },
    } as unknown as PrismaService;
    const service = new BlueBridgeService(
      prisma,
      new ConfigService({ blueBridge: { apiKey: 'bridge-key' } }),
    );

    const result = await service.workflowDetails({
      poNumber: 'PO-2606-4636',
      legacySubjectId: 'user-1',
      bridgeKey: 'bridge-key',
    });

    expect(result.budgetBreakdown).toEqual([
      {
        service: 'Fit-out',
        qty: 20,
        unit: 'sq.m.',
        unitRate: 30000,
        total: 600000,
      },
      {
        service: 'Reinstatement',
        qty: 10,
        unit: 'sq.m.',
        unitRate: 10000,
        total: 100000,
      },
      {
        service: 'Construction',
        qty: 10,
        unit: 'sq.m.',
        unitRate: 20000,
        total: 200000,
      },
      {
        service: 'Website development',
        qty: 2000,
        unit: 'page',
        unitRate: 1000,
        total: 2000000,
      },
      {
        service: 'chatbot',
        qty: 100,
        unit: 'FAQ',
        unitRate: 100,
        total: 10000,
      },
    ]);
    expect(result.budgetLines).toEqual([
      '1) Fit-out 20 sq.m. × ฿30,000',
      '= ฿600,000',
      '2) Reinstatement 10 sq.m. × ฿10,000',
      '= ฿100,000',
      '3) Construction 10 sq.m. × ฿20,000',
      '= ฿200,000',
      '4) Website development 2,000 page × ฿1,000',
      '= ฿2,000,000',
      '5) chatbot 100 FAQ × ฿100',
      '= ฿10,000',
      'Budget',
      '= ฿2,910,000',
    ]);
    expect(result.budgetLines.join(' ')).not.toContain('2,606');
    expect(result.budgetLines.join(' ')).not.toContain('4,636');
  });
  it('uses wrapped stored selection budget items without parsing title or description', async () => {
    const prisma = {
      subscriber: { findFirst: jest.fn().mockResolvedValue(null) },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'user-1' }]) },
      order: {
        findFirst: jest.fn().mockResolvedValue({
          description:
            'PO-2607-0001 | Title says 2607 pages and 4636 sq.m. but must not be parsed',
          budgetBreakdown: {
            source: 'step-2-selection',
            items: [
              {
                service: 'Fit-out',
                quantity: 600,
                unit: 'sq.m.',
                unitPrice: 28000,
                total: 16800000,
              },
            ],
          },
          user: { name: 'Customer', email: 'customer@example.com' },
          address: {
            unit: null,
            building: null,
            street: null,
            subdistrict: 'Saphansong',
            district: 'Wang Thonglang',
            province: 'Bangkok',
            postalCode: '10310',
            latitude: null,
            longitude: null,
          },
          images: [],
        }),
      },
    } as unknown as PrismaService;
    const service = new BlueBridgeService(
      prisma,
      new ConfigService({ blueBridge: { apiKey: 'bridge-key' } }),
    );

    const result = await service.workflowDetails({
      poNumber: 'PO-2607-0001',
      legacySubjectId: 'user-1',
      bridgeKey: 'bridge-key',
    });

    expect(result.budgetBreakdown).toEqual([
      {
        service: 'Fit-out',
        qty: 600,
        unit: 'sq.m.',
        unitRate: 28000,
        total: 16800000,
      },
    ]);
    expect(result.budgetLines).toEqual([
      '1) Fit-out 600 sq.m. \u00d7 \u0e3f28,000',
      '= \u0e3f16,800,000',
      'Budget',
      '= \u0e3f16,800,000',
    ]);
    expect(result.budgetLines.join(' ')).not.toContain('2,607');
    expect(result.budgetLines.join(' ')).not.toContain('4,636');
  });

});
