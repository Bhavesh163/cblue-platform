import { QualificationExpiryWorker } from './qualification-expiry.worker';

describe('QualificationExpiryWorker', () => {
  const tx = {
    fixer: { updateMany: jest.fn() },
    notification: { createMany: jest.fn() },
  };
  const prisma = {
    fixer: { findMany: jest.fn() },
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };
  const notifications = {};
  const worker = new QualificationExpiryWorker(
    prisma as never,
    notifications as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    tx.fixer.updateMany.mockResolvedValue({ count: 1 });
    tx.notification.createMany.mockResolvedValue({ count: 1 });
  });

  it('queues one in-app and one email warning during the 30-day window', async () => {
    prisma.fixer.findMany
      .mockResolvedValueOnce([
        {
          id: 'fixer-1',
          userId: 'user-1',
          kycValidUntil: new Date('2026-08-30T00:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([]);

    await expect(worker.runBatch()).resolves.toBe(1);
    expect(tx.notification.createMany).toHaveBeenCalledTimes(2);
    expect(tx.fixer.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { kycExpiryWarningSentAt: expect.any(Date) },
      }),
    );
  });

  it('persists re-verification and blocks new matching after expiry', async () => {
    prisma.fixer.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 'fixer-2',
        userId: 'user-2',
        kycValidUntil: new Date('2026-07-01T00:00:00.000Z'),
        kycReverificationReasons: null,
      },
    ]);

    await expect(worker.runBatch()).resolves.toBe(1);
    expect(tx.fixer.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          qualificationEligibilityStatus: 'REVERIFICATION_REQUIRED',
          kycReverificationReasons: ['ID_EXPIRED'],
        }),
      }),
    );
    expect(tx.notification.createMany).toHaveBeenCalledTimes(2);
  });
});
