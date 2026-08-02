import { QualificationRetentionWorker } from './qualification-retention.worker';

describe('QualificationRetentionWorker', () => {
  const prisma = {
    kycSubmission: { findMany: jest.fn(), updateMany: jest.fn() },
    order: { findMany: jest.fn(), updateMany: jest.fn() },
    user: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    kycDocument: {
      updateMany: jest.fn(),
    },
    qualificationAuditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (client: any) => unknown) =>
      callback(prisma),
    ),
  } as any;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(Date.parse('2026-08-02T00:00:00.000Z'));
    jest.clearAllMocks();
    prisma.kycSubmission.findMany.mockResolvedValue([]);
    prisma.order.findMany.mockResolvedValue([]);
    prisma.user.update.mockResolvedValue({});
    prisma.kycDocument.updateMany.mockResolvedValue({ count: 1 });
    prisma.qualificationAuditLog.create.mockResolvedValue({ id: 'audit-1' });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('schedules private evidence after 12 months of inactivity', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'user-1',
        lastActivityAt: new Date('2025-07-01T00:00:00.000Z'),
        inactiveNoticeAt: null,
        inactiveDeleteAt: null,
        fixer: {
          qualificationSubmissions: [
            {
              id: 'submission-1',
              documents: [{ id: 'document-1', lifecycleState: 'READY' }],
            },
          ],
        },
      },
    ]);
    const worker = new QualificationRetentionWorker(prisma);

    await expect(worker.runBatch()).resolves.toBe(1);

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          inactiveNoticeAt: expect.any(Date),
          inactiveDeleteAt: new Date('2026-07-01T00:00:00.000Z'),
        }),
      }),
    );
    expect(prisma.kycDocument.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lifecycleState: 'DELETE_PENDING',
          retentionDeleteAt: expect.any(Date),
        }),
      }),
    );
    expect(prisma.qualificationAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'RETENTION_DELETE_SCHEDULED',
        }),
      }),
    );
  });
});
