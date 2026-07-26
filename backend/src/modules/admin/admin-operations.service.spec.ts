import { BadRequestException } from '@nestjs/common';
import { DemandGapStatus, PaymentStatus } from '@prisma/client';
import { AdminOperationsService } from './admin-operations.service';

describe('AdminOperationsService', () => {
  const prisma = {
    payment: { findMany: jest.fn() },
    fixerWorkflowAction: { findMany: jest.fn() },
    propertyInquiryWorkflowEvent: { findMany: jest.fn() },
    unmatchedServiceDemand: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  let service: AdminOperationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminOperationsService(prisma as never);
    prisma.payment.findMany.mockResolvedValue([]);
    prisma.fixerWorkflowAction.findMany.mockResolvedValue([]);
    prisma.propertyInquiryWorkflowEvent.findMany.mockResolvedValue([]);
    prisma.unmatchedServiceDemand.findMany.mockResolvedValue([]);
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
    ]);

    const result = await service.getOverview(90);

    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: PaymentStatus.COMPLETED }),
      }),
    );
    expect(result.revenue.total).toBe(100);
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

  it('requires an auditable note before closing an unmatched demand gap', async () => {
    prisma.unmatchedServiceDemand.findUnique.mockResolvedValue({ id: 'gap-1' });

    await expect(
      service.updateDemandGap('gap-1', 'admin-1', {
        status: DemandGapStatus.RESOLVED,
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
