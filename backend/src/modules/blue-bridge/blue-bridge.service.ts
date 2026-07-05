import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { BlueWorkflowDetailResponse } from './blue-bridge.controller';

interface WorkflowDetailInput {
  poNumber: string;
  legacySubjectId: string;
  bridgeKey?: string;
}

interface BudgetItem {
  service: string;
  qty: number;
  unit: string;
  unitRate: number;
  total: number;
}

@Injectable()
export class BlueBridgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async workflowDetails(
    input: WorkflowDetailInput,
  ): Promise<BlueWorkflowDetailResponse> {
    this.assertBridgeKey(input.bridgeKey);
    const poNumber = String(input.poNumber || '').trim();
    const legacySubjectId = String(input.legacySubjectId || '').trim();
    if (!poNumber || !legacySubjectId) {
      throw new NotFoundException('Workflow detail not found');
    }

    const linkedUserIds = await this.resolveLinkedUserIds(legacySubjectId);
    if (linkedUserIds.length === 0) {
      throw new NotFoundException('Workflow detail not found');
    }

    const order = await this.prisma.order.findFirst({
      where: {
        description: { contains: poNumber, mode: 'insensitive' },
        OR: [
          { userId: { in: linkedUserIds } },
          { fixer: { userId: { in: linkedUserIds } } },
        ],
      },
      include: {
        user: { select: { name: true, email: true } },
        address: true,
        images: {
          where: { type: { in: ['order_attachment', 'order_photo'] } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!order) {
      const inquiry = await this.prisma.propertyInquiry.findFirst({
        where: {
          poNumber,
          OR: [
            { customerId: { in: linkedUserIds } },
            { listerUserId: { in: linkedUserIds } },
            { property: { userId: { in: linkedUserIds } } },
          ],
        },
        include: {
          property: {
            include: {
              images: { orderBy: { sortOrder: 'asc' } },
            },
          },
        },
      });
      if (!inquiry) {
        throw new NotFoundException('Workflow detail not found');
      }
      return {
        detailRows: [
          { label: 'Customer', value: inquiry.customerName },
          { label: 'Property', value: inquiry.property.title },
          {
            label: 'Property Price',
            value: `฿${formatNumber(inquiry.property.price)}`,
          },
          {
            label: 'Property Location',
            value: [
              inquiry.property.addressLine,
              inquiry.property.subdistrict,
              inquiry.property.district,
              inquiry.property.province,
              inquiry.property.postalCode,
            ]
              .map((value) => String(value || '').trim())
              .filter(Boolean)
              .join(', '),
          },
          {
            label: 'Meeting Date',
            value: String(inquiry.meetingDate || '').trim(),
          },
          {
            label: 'Meeting Time',
            value: String(inquiry.meetingTime || '').trim(),
          },
          {
            label: 'Meeting Venue',
            value: String(inquiry.meetingVenue || '').trim(),
          },
          {
            label: 'Property Details',
            value: inquiry.property.description,
          },
        ].filter((row) => row.value.length > 0),
        budgetLines: [],
        budgetBreakdown: [],
        uploadedFiles: inquiry.property.images.map((image, index) => ({
          label: `Property image ${index + 1}`,
          url: image.url,
        })),
      };
    }

    const budgetItems = parseBudgetItems(order.budgetBreakdown);
    return {
      detailRows: [
        {
          label: 'Customer',
          value: String(order.user.name || order.user.email || '').trim(),
        },
        {
          label: 'Project Location',
          value: formatLocation(order.address),
        },
        {
          label: 'Project Details',
          value: cleanProjectDetails(order.description),
        },
      ].filter((row) => row.value.length > 0),
      budgetLines: formatBudgetLines(budgetItems),
      budgetBreakdown: budgetItems,
      uploadedFiles: order.images.map((image, index) => ({
        label: `Uploaded file ${index + 1}`,
        url: image.url,
      })),
    };
  }

  private assertBridgeKey(providedKey?: string): void {
    const expectedKey = String(
      this.config.get<string>('blueBridge.apiKey') || '',
    ).trim();
    if (!expectedKey || String(providedKey || '').trim() !== expectedKey) {
      throw new UnauthorizedException('Invalid BLUE bridge key');
    }
  }

  private async resolveLinkedUserIds(
    legacySubjectId: string,
  ): Promise<string[]> {
    const subscriber = await this.prisma.subscriber.findFirst({
      where: {
        OR: [
          { id: legacySubjectId },
          { email: { equals: legacySubjectId, mode: 'insensitive' } },
        ],
      },
      select: { id: true, email: true },
    });

    const email = String(subscriber?.email || legacySubjectId).trim();
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { id: legacySubjectId },
          { subscriberId: legacySubjectId },
          ...(subscriber?.id ? [{ subscriberId: subscriber.id }] : []),
          ...(email.includes('@')
            ? [{ email: { equals: email, mode: 'insensitive' as const } }]
            : []),
        ],
      },
      select: { id: true },
    });
    return Array.from(new Set(users.map((user) => user.id)));
  }
}

function parseBudgetItems(value: Prisma.JsonValue | null): BudgetItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const service = firstStringValue(item, [
      'service',
      'item',
      'name',
      'label',
    ]);
    const unit = firstStringValue(item, ['unit', 'unitLabel', 'uom']);
    const qty = firstNumberValue(item, ['qty', 'quantity', 'count']);
    const storedUnitRate = firstNumberValue(item, [
      'unitRate',
      'rate',
      'pricePerUnit',
    ]);
    const storedTotal = firstNumberValue(item, [
      'total',
      'amount',
      'lineTotal',
      'estimatedTotal',
    ]);
    const unitRate =
      storedUnitRate >= 0
        ? storedUnitRate
        : qty > 0 && storedTotal >= 0
          ? Math.round(storedTotal / qty)
          : -1;
    const total =
      storedTotal >= 0
        ? storedTotal
        : qty >= 0 && unitRate >= 0
          ? Math.round(qty * unitRate)
          : -1;
    if (!service || !unit || qty < 0 || unitRate < 0 || total < 0) return [];
    return [{ service, qty, unit, unitRate, total }];
  });
}

function formatBudgetLines(items: BudgetItem[]): string[] {
  if (items.length === 0) return [];
  const lines = items.flatMap((item, index) => [
    `${index + 1}) ${item.service} ${formatNumber(item.qty)} ${item.unit} × ฿${formatNumber(item.unitRate)}`,
    `= ฿${formatNumber(item.total)}`,
  ]);
  const total = items.reduce((sum, item) => sum + item.total, 0);
  return [...lines, 'Budget', `= ฿${formatNumber(total)}`];
}

function formatLocation(address: {
  street: string | null;
  building: string | null;
  unit: string | null;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  latitude?: number | null;
  longitude?: number | null;
}): string {
  if (typeof address.latitude === 'number' && typeof address.longitude === 'number') {
    return `${address.latitude}, ${address.longitude}`;
  }

  return [
    address.unit,
    address.building,
    address.street,
    address.subdistrict,
    address.district,
    address.province,
    address.postalCode,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(', ');
}

function stripWorkflowPrefix(description: string): string {
  return description
    .replace(/^PO-\d{4}-\d+\s*\|\s*/i, '')
    .replace(/^TIER:[^|]+\|\s*/i, '')
    .replace(/^LOC:[^|]+\|\s*/i, '')
    .trim();
}

function cleanProjectDetails(description: string): string {
  const cookedBudgetPattern = new RegExp(
    String.raw`\b\d+\)\s*[^=]*?\b(?:pages?|page|sq\.?m\.?|Baht|FAQ)\b[^=]*?=\s*[\d,]+\s*Baht`,
    'gi',
  );
  return stripWorkflowPrefix(description)
    .replace(cookedBudgetPattern, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstStringValue(
  record: Record<string, unknown>,
  keys: string[],
): string {
  for (const key of keys) {
    const value = stringValue(record[key]);
    if (value) return value;
  }
  return '';
}

function firstNumberValue(
  record: Record<string, unknown>,
  keys: string[],
): number {
  for (const key of keys) {
    const value = numberValue(record[key]);
    if (value >= 0) return value;
  }
  return -1;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function numberValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : -1;
  }
  return -1;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(
    value,
  );
}
