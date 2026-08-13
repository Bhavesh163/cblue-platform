import { BadRequestException } from '@nestjs/common';
import { DemandGapStatus, PaymentStatus } from '@prisma/client';
import { AdminOperationsService } from './admin-operations.service';

describe('AdminOperationsService', () => {
  const prisma = {
    payment: { findMany: jest.fn() },
    fixerWorkflowAction: { findMany: jest.fn() },
    propertyInquiryWorkflowEvent: { findMany: jest.fn() },
    orderStatusHistory: { findMany: jest.fn() },
    unmatchedServiceDemand: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    unmatchedServiceDemandOccurrence: { findMany: jest.fn() },
  };
  let service: AdminOperationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminOperationsService(prisma as never);
    prisma.payment.findMany.mockResolvedValue([]);
    prisma.fixerWorkflowAction.findMany.mockResolvedValue([]);
    prisma.propertyInquiryWorkflowEvent.findMany.mockResolvedValue([]);
    prisma.orderStatusHistory.findMany.mockResolvedValue([]);
    prisma.unmatchedServiceDemand.findMany.mockResolvedValue([]);
    prisma.unmatchedServiceDemandOccurrence.findMany.mockResolvedValue([]);
  });

  it('reports only persisted completed payment revenue by day, week, and month', async () => {
    prisma.payment.findMany.mockResolvedValue([
      {
        id: 'payment-1',
        orderId: 'order-1',
        amount: 100,
        method: 'PROMPTPAY',
        status: PaymentStatus.COMPLETED,
        transactionRef: 'txn-1',
        paidAt: new Date('2026-07-20T20:00:00.000Z'),
        createdAt: new Date('2026-07-20T20:00:00.000Z'),
        order: {
          orderType: 'HOUSEHOLD',
          serviceCategory: 'PLUMBING',
          user: { id: 'customer-1', name: 'Customer', email: null },
          fixer: { user: { id: 'partner-1', name: 'Partner', email: null } },
        },
      },
      {
        id: 'payment-pending',
        orderId: 'order-2',
        amount: 250,
        method: 'BANK_TRANSFER',
        status: PaymentStatus.PENDING,
        transactionRef: null,
        paidAt: null,
        createdAt: new Date('2026-07-20T21:00:00.000Z'),
        order: {
          orderType: 'PROJECT',
          serviceCategory: 'FITOUT',
          user: { id: 'customer-2', name: 'Customer 2', email: null },
          fixer: { user: { id: 'partner-2', name: 'Partner 2', email: null } },
        },
      },
    ]);

    const result = await service.getOverview(90);

    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
      }),
    );
    expect(result.revenue.total).toBe(100);
    expect(result.revenue.paymentRecords).toBe(2);
    expect(result.revenue.statusCounts).toEqual({
      completed: 1,
      pending: 1,
      failed: 0,
      refunded: 0,
    });
    expect(result.revenue.daily).toEqual([
      { period: '2026-07-21', amount: 100, count: 1 },
    ]);
    expect(result.revenue.weekly[0]).toEqual(
      expect.objectContaining({ amount: 100, count: 1 }),
    );
    expect(result.revenue.monthly).toEqual([
      { period: '2026-07', amount: 100, count: 1 },
    ]);
  });

  it('keeps persisted decline and cancellation actions with their real reasons and timestamps', async () => {
    const createdAt = new Date('2026-07-21T06:30:00.000Z');
    prisma.fixerWorkflowAction.findMany.mockResolvedValue([
      {
        id: 'event-1',
        actorUserId: 'partner-1',
        action: 'partner-decline',
        payload: { reason: 'Schedule conflict for the requested date' },
        createdAt,
        order: {
          id: 'order-1',
          serviceCategory: 'ELECTRICAL',
          userId: 'customer-1',
          user: { name: 'Customer', email: null },
          fixer: {
            userId: 'partner-1',
            user: { name: 'Partner', email: null },
          },
        },
      },
    ]);

    const result = await service.getOverview(90);

    expect(result.incidents).toEqual([
      expect.objectContaining({
        eventType: 'PARTNER_DECLINE',
        actorName: 'Partner',
        reason: 'Schedule conflict for the requested date',
        createdAt,
      }),
    ]);
  });

  it('groups persisted declines and cancellations into daily incident series', async () => {
    const createdAt = new Date('2026-07-21T06:30:00.000Z');
    prisma.fixerWorkflowAction.findMany.mockResolvedValue([
      {
        id: 'event-1',
        actorUserId: 'partner-1',
        action: 'partner-decline',
        payload: { reason: 'Schedule conflict' },
        createdAt,
        order: {
          id: 'order-1',
          serviceCategory: 'ELECTRICAL',
          userId: 'customer-1',
          user: { name: 'Customer', email: null },
          fixer: {
            userId: 'partner-1',
            user: { name: 'Partner', email: null },
          },
        },
      },
    ]);

    const result = await service.getOverview(90);

    expect(result.incidentSeries.daily).toEqual([
      {
        period: '2026-07-21',
        partnerDeclines: 1,
        customerCancellations: 0,
        total: 1,
      },
    ]);
  });

  it('recovers a customer cancellation reason from persisted status history', async () => {
    const createdAt = new Date('2026-07-16T12:41:00.000Z');
    prisma.fixerWorkflowAction.findMany.mockResolvedValue([
      {
        id: 'action-1',
        actorUserId: 'customer-1',
        action: 'customer-cancel',
        payload: null,
        createdAt,
        order: {
          id: 'order-1',
          serviceCategory: 'LANDSCAPING',
          userId: 'customer-1',
          user: { name: 'Customer', email: null },
          fixer: {
            userId: 'partner-1',
            user: { name: 'Partner', email: null },
          },
        },
      },
    ]);
    prisma.orderStatusHistory.findMany.mockResolvedValue([
      {
        id: 'history-1',
        changedBy: 'customer-1',
        note: 'Customer cancelled. Reason: Project scope changed',
        createdAt,
        order: {
          id: 'order-1',
          userId: 'customer-1',
          user: { name: 'Customer', email: null },
          fixer: {
            userId: 'partner-1',
            user: { name: 'Partner', email: null },
          },
        },
      },
    ]);

    const result = await service.getOverview(90);

    expect(result.incidents).toEqual([
      expect.objectContaining({
        eventType: 'CUSTOMER_CANCEL',
        actorId: 'customer-1',
        reason: 'Project scope changed',
      }),
    ]);
  });

  it('ignores incident records not authored by the owning participant', async () => {
    const createdAt = new Date('2026-07-16T12:41:00.000Z');
    prisma.fixerWorkflowAction.findMany.mockResolvedValue([
      {
        id: 'action-1',
        actorUserId: 'other-user',
        action: 'partner-decline',
        payload: { reason: 'Must not appear' },
        createdAt,
        order: {
          id: 'order-1',
          serviceCategory: 'LANDSCAPING',
          userId: 'customer-1',
          user: { name: 'Customer', email: null },
          fixer: {
            userId: 'partner-1',
            user: { name: 'Partner', email: null },
          },
        },
      },
    ]);
    prisma.orderStatusHistory.findMany.mockResolvedValue([
      {
        id: 'history-1',
        changedBy: 'other-user',
        note: 'Customer cancelled. Reason: Must not appear',
        createdAt,
        order: {
          id: 'order-1',
          userId: 'customer-1',
          user: { name: 'Customer', email: null },
          fixer: {
            userId: 'partner-1',
            user: { name: 'Partner', email: null },
          },
        },
      },
    ]);

    const result = await service.getOverview(90);

    expect(result.incidents).toEqual([]);
  });
  it('requires an auditable note before closing an unmatched demand gap', async () => {
    prisma.unmatchedServiceDemand.findUnique.mockResolvedValue({ id: 'gap-1' });

    await expect(
      service.updateDemandGap('gap-1', 'admin-1', {
        status: DemandGapStatus.RESOLVED,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.unmatchedServiceDemand.update).not.toHaveBeenCalled();
  });

  it('requires an auditable note before assigning an unmatched demand gap', async () => {
    prisma.unmatchedServiceDemand.findUnique.mockResolvedValue({ id: 'gap-1' });

    await expect(
      service.updateDemandGap('gap-1', 'admin-1', {
        status: DemandGapStatus.IN_PROGRESS,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.unmatchedServiceDemand.update).not.toHaveBeenCalled();
  });

  it('assigns an administrator and persists a demand-gap resolution', async () => {
    prisma.unmatchedServiceDemand.findUnique.mockResolvedValue({ id: 'gap-1' });
    prisma.unmatchedServiceDemand.update.mockResolvedValue({
      id: 'gap-1',
      status: DemandGapStatus.RESOLVED,
    });

    await service.updateDemandGap('gap-1', 'admin-1', {
      status: DemandGapStatus.RESOLVED,
      note: 'Provider recruited for this district',
    });

    expect(prisma.unmatchedServiceDemand.update).toHaveBeenCalledWith({
      where: { id: 'gap-1' },
      data: expect.objectContaining({
        status: DemandGapStatus.RESOLVED,
        assignedAdminId: 'admin-1',
        resolutionNote: 'Provider recruited for this district',
        resolvedAt: expect.any(Date),
      }),
    });
  });
});
