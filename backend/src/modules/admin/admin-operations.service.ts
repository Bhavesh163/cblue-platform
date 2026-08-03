import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DemandGapStatus,
  OrderStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateDemandGapDto } from './dto/update-demand-gap.dto';

const INCIDENT_ACTIONS = ['partner-decline', 'customer-cancel'] as const;

type RevenuePoint = { period: string; amount: number; count: number };
type IncidentPoint = {
  period: string;
  partnerDeclines: number;
  customerCancellations: number;
  total: number;
};
type IncidentRow = {
  id: string;
  reference: string;
  workflowType: 'FIXER' | 'PROPERTY';
  eventType: 'PARTNER_DECLINE' | 'CUSTOMER_CANCEL';
  actorId: string;
  actorName: string;
  reason: string | null;
  createdAt: Date;
};

@Injectable()
export class AdminOperationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(days = 90) {
    const safeDays = Math.min(365, Math.max(7, Math.trunc(days) || 90));
    const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);

    const [
      payments,
      fixerActions,
      propertyEvents,
      demandGaps,
      demandOccurrences,
      orderStatusEvents,
    ] = await Promise.all([
      this.prisma.payment.findMany({
        where: { status: PaymentStatus.COMPLETED, paidAt: { gte: since } },
        orderBy: { paidAt: 'desc' },
        take: 5000,
        select: {
          id: true,
          orderId: true,
          amount: true,
          method: true,
          transactionRef: true,
          paidAt: true,
          createdAt: true,
          order: {
            select: {
              orderType: true,
              serviceCategory: true,
              user: { select: { id: true, name: true, email: true } },
              fixer: {
                select: {
                  user: { select: { id: true, name: true, email: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.fixerWorkflowAction.findMany({
        where: {
          action: { in: [...INCIDENT_ACTIONS] },
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'desc' },
        take: 2000,
        select: {
          id: true,
          actorUserId: true,
          action: true,
          payload: true,
          createdAt: true,
          order: {
            select: {
              id: true,
              serviceCategory: true,
              userId: true,
              user: { select: { name: true, email: true } },
              fixer: {
                select: {
                  userId: true,
                  user: { select: { name: true, email: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.propertyInquiryWorkflowEvent.findMany({
        where: {
          action: { in: [...INCIDENT_ACTIONS] },
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'desc' },
        take: 2000,
        select: {
          id: true,
          actorId: true,
          action: true,
          note: true,
          metadata: true,
          createdAt: true,
          inquiry: {
            select: {
              poNumber: true,
              customerId: true,
              customerName: true,
              listerUserId: true,
              listerName: true,
            },
          },
        },
      }),
      this.prisma.unmatchedServiceDemand.findMany({
        where: { expiresAt: { gt: new Date() } },
        orderBy: [{ status: 'asc' }, { lastSeenAt: 'desc' }],
        take: 200,
      }),
      this.prisma.unmatchedServiceDemandOccurrence.findMany({
        where: { occurredAt: { gte: since } },
        orderBy: { occurredAt: 'desc' },
        take: 5000,
        select: {
          id: true,
          demandId: true,
          fingerprint: true,
          service: true,
          bookingType: true,
          district: true,
          province: true,
          postalCode: true,
          occurredAt: true,
        },
      }),
      this.prisma.orderStatusHistory.findMany({
        where: {
          status: OrderStatus.CANCELLED,
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'desc' },
        take: 2000,
        select: {
          id: true,
          changedBy: true,
          note: true,
          createdAt: true,
          order: {
            select: {
              id: true,
              userId: true,
              user: { select: { name: true, email: true } },
              fixer: {
                select: {
                  userId: true,
                  user: { select: { name: true, email: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    const actionIncidents: IncidentRow[] = [
      ...fixerActions.flatMap((event) => {
        const partnerAuthored =
          event.action === 'partner-decline' &&
          event.order.fixer?.userId === event.actorUserId;
        const customerAuthored =
          event.action === 'customer-cancel' &&
          event.order.userId === event.actorUserId;
        if (!partnerAuthored && !customerAuthored) return [];
        const actor = partnerAuthored
          ? event.order.fixer?.user
          : event.order.user;
        return [
          {
            id: event.id,
            reference: event.order.id,
            workflowType: 'FIXER' as const,
            eventType: partnerAuthored
              ? ('PARTNER_DECLINE' as const)
              : ('CUSTOMER_CANCEL' as const),
            actorId: event.actorUserId,
            actorName: actor?.name || actor?.email || 'CBLUE user',
            reason: this.readReason(event.payload),
            createdAt: event.createdAt,
          },
        ];
      }),
      ...propertyEvents.flatMap((event) => {
        const partnerAuthored =
          event.action === 'partner-decline' &&
          event.inquiry.listerUserId === event.actorId;
        const customerAuthored =
          event.action === 'customer-cancel' &&
          event.inquiry.customerId === event.actorId;
        if (!partnerAuthored && !customerAuthored) return [];
        return [
          {
            id: event.id,
            reference: event.inquiry.poNumber,
            workflowType: 'PROPERTY' as const,
            eventType: partnerAuthored
              ? ('PARTNER_DECLINE' as const)
              : ('CUSTOMER_CANCEL' as const),
            actorId: event.actorId,
            actorName: partnerAuthored
              ? event.inquiry.listerName
              : event.inquiry.customerName,
            reason: event.note?.trim() || this.readReason(event.metadata),
            createdAt: event.createdAt,
          },
        ];
      }),
    ];
    const historyIncidents: IncidentRow[] = orderStatusEvents.flatMap(
      (event) => {
        const partnerAuthored = event.order.fixer?.userId === event.changedBy;
        const customerAuthored = event.order.userId === event.changedBy;
        if (!event.changedBy || (!partnerAuthored && !customerAuthored))
          return [];
        const actor = partnerAuthored
          ? event.order.fixer?.user
          : event.order.user;
        return [
          {
            id: event.id,
            reference: event.order.id,
            workflowType: 'FIXER' as const,
            eventType: partnerAuthored
              ? ('PARTNER_DECLINE' as const)
              : ('CUSTOMER_CANCEL' as const),
            actorId: event.changedBy,
            actorName: actor?.name || actor?.email || 'CBLUE user',
            reason: this.readStatusReason(event.note),
            createdAt: event.createdAt,
          },
        ];
      },
    );
    const incidentKey = (event: IncidentRow) =>
      `${event.workflowType}:${event.reference}:${event.eventType}`;
    const historyByKey = new Map(
      historyIncidents.map((event) => [incidentKey(event), event]),
    );
    const actionKeys = new Set(actionIncidents.map(incidentKey));
    const incidents = [
      ...actionIncidents.map((event) => ({
        ...event,
        reason:
          event.reason || historyByKey.get(incidentKey(event))?.reason || null,
      })),
      ...historyIncidents.filter(
        (event) => !actionKeys.has(incidentKey(event)),
      ),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const revenueDetails = payments.map((payment) => ({
      id: payment.id,
      orderId: payment.orderId,
      sourceType: 'ORDER_PAYMENT' as const,
      sourceLabel: `${payment.order.orderType} / ${payment.order.serviceCategory}`,
      amount: payment.amount,
      currency: 'THB' as const,
      method: payment.method,
      transactionRef: payment.transactionRef,
      customer: payment.order.user.name || payment.order.user.email || null,
      partner:
        payment.order.fixer?.user.name ||
        payment.order.fixer?.user.email ||
        null,
      paidAt: payment.paidAt || payment.createdAt,
    }));

    return {
      generatedAt: new Date().toISOString(),
      windowDays: safeDays,
      demandGaps,
      incidents,
      incidentSeries: {
        daily: this.groupIncidents(incidents, 'daily'),
        weekly: this.groupIncidents(incidents, 'weekly'),
        monthly: this.groupIncidents(incidents, 'monthly'),
      },
      repeatRisk: this.buildRepeatRisk(incidents),
      demandOccurrences,
      revenue: {
        currency: 'THB',
        total: revenueDetails.reduce((sum, item) => sum + item.amount, 0),
        daily: this.groupRevenue(revenueDetails, 'daily'),
        weekly: this.groupRevenue(revenueDetails, 'weekly'),
        monthly: this.groupRevenue(revenueDetails, 'monthly'),
        details: revenueDetails.slice(0, 200),
      },
    };
  }

  async updateDemandGap(id: string, adminId: string, dto: UpdateDemandGapDto) {
    const status = dto.status as DemandGapStatus;
    const note = dto.note?.trim() || null;
    const closesGap =
      status === DemandGapStatus.RESOLVED ||
      status === DemandGapStatus.DISMISSED;
    if (closesGap && !note) {
      throw new BadRequestException(
        'A resolution note is required when closing a demand gap',
      );
    }
    const existing = await this.prisma.unmatchedServiceDemand.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Demand gap not found');
    return this.prisma.unmatchedServiceDemand.update({
      where: { id },
      data: {
        status,
        resolutionNote: note,
        assignedAdminId: status === DemandGapStatus.OPEN ? null : adminId,
        resolvedAt: closesGap ? new Date() : null,
      },
    });
  }

  private readReason(value: Prisma.JsonValue | null): string | null {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      return null;
    const record = value;
    for (const key of ['reason', 'note', 'privateNote']) {
      const candidate = record[key];
      if (typeof candidate === 'string' && candidate.trim())
        return candidate.trim();
    }
    return null;
  }

  private readStatusReason(note: string | null): string | null {
    const value = note?.trim();
    if (!value) return null;
    const reason = value
      .replace(/^Customer cancelled\.\s*Reason:\s*/i, '')
      .replace(/^Partner declined\.\s*Reason:\s*/i, '')
      .trim();
    return reason || null;
  }
  private buildRepeatRisk(incidents: IncidentRow[]) {
    const byActor = new Map<string, IncidentRow[]>();
    for (const incident of incidents) {
      const rows = byActor.get(incident.actorId) || [];
      rows.push(incident);
      byActor.set(incident.actorId, rows);
    }
    return [...byActor.entries()]
      .map(([actorId, rows]) => {
        const count = rows.length;
        return {
          actorId,
          actorName: rows[0]?.actorName || 'CBLUE user',
          count,
          partnerDeclines: rows.filter(
            (row) => row.eventType === 'PARTNER_DECLINE',
          ).length,
          customerCancellations: rows.filter(
            (row) => row.eventType === 'CUSTOMER_CANCEL',
          ).length,
          lastOccurredAt: rows[0]?.createdAt || null,
          reviewLevel: count >= 5 ? 'HIGH' : count >= 3 ? 'REVIEW' : 'MONITOR',
          recommendation:
            count >= 5
              ? 'Require an administrator to review recent reasons and contact the account before any restriction.'
              : count >= 3
                ? 'Review the recent reasons and completion history; contact the account if the pattern is avoidable.'
                : 'Monitor only. Do not penalize isolated declines or cancellations.',
        };
      })
      .sort((a, b) => b.count - a.count);
  }

  private groupIncidents(
    rows: IncidentRow[],
    grain: 'daily' | 'weekly' | 'monthly',
  ): IncidentPoint[] {
    const groups = new Map<string, IncidentPoint>();
    for (const row of rows) {
      const date = new Date(row.createdAt.getTime() + 7 * 60 * 60 * 1000);
      const period =
        grain === 'daily'
          ? date.toISOString().slice(0, 10)
          : grain === 'monthly'
            ? date.toISOString().slice(0, 7)
            : this.startOfIsoWeek(date).toISOString().slice(0, 10);
      const current = groups.get(period) || {
        period,
        partnerDeclines: 0,
        customerCancellations: 0,
        total: 0,
      };
      current.total += 1;
      if (row.eventType === 'PARTNER_DECLINE') current.partnerDeclines += 1;
      if (row.eventType === 'CUSTOMER_CANCEL')
        current.customerCancellations += 1;
      groups.set(period, current);
    }
    return [...groups.values()].sort((a, b) =>
      a.period.localeCompare(b.period),
    );
  }

  private groupRevenue(
    rows: Array<{ amount: number; paidAt: Date }>,
    grain: 'daily' | 'weekly' | 'monthly',
  ): RevenuePoint[] {
    const groups = new Map<string, RevenuePoint>();
    for (const row of rows) {
      const date = new Date(row.paidAt);
      const bangkokDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
      const period =
        grain === 'daily'
          ? bangkokDate.toISOString().slice(0, 10)
          : grain === 'monthly'
            ? bangkokDate.toISOString().slice(0, 7)
            : this.startOfIsoWeek(bangkokDate).toISOString().slice(0, 10);
      const current = groups.get(period) || { period, amount: 0, count: 0 };
      current.amount += row.amount;
      current.count += 1;
      groups.set(period, current);
    }
    return [...groups.values()].sort((a, b) =>
      a.period.localeCompare(b.period),
    );
  }

  private startOfIsoWeek(value: Date) {
    const date = new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() - day + 1);
    return date;
  }
}
