import { Logger } from '@nestjs/common';
import { QualificationDocumentCleanupWorker } from './qualification-document-cleanup.worker';

describe('QualificationDocumentCleanupWorker', () => {
  const prisma = {
    $queryRaw: jest.fn(),
  } as any;
  const qualification = {
    retryPendingDocumentCleanup: jest.fn(),
    retryStorageCleanupIntent: jest.fn(),
  } as any;
  let worker: QualificationDocumentCleanupWorker;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(Date.parse('2026-07-30T12:00:00.000Z'));
    jest.clearAllMocks();
    prisma.$queryRaw
      .mockReset()
      .mockResolvedValueOnce([{ id: 'document-1' }])
      .mockResolvedValueOnce([]);
    qualification.retryPendingDocumentCleanup.mockReset();
    qualification.retryStorageCleanupIntent.mockReset();
    qualification.retryPendingDocumentCleanup.mockResolvedValue({
      cleaned: true,
      lifecycleState: 'FAILED',
    });
    qualification.retryStorageCleanupIntent.mockResolvedValue({
      cleaned: true,
      status: 'COMPLETED',
    });
    worker = new QualificationDocumentCleanupWorker(prisma, qualification);
  });

  afterEach(async () => {
    await worker?.onModuleDestroy();
    jest.useRealTimers();
  });

  it('claims a bounded batch with skip-locked and processes successful cleanup', async () => {
    await expect(worker.runBatch()).resolves.toBe(1);

    const query = prisma.$queryRaw.mock.calls[0][0];
    expect(String(query.sql)).toContain('FOR UPDATE SKIP LOCKED');
    expect(String(query.sql)).toContain('LIMIT');
    expect(query.values).toContain(10);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    expect(qualification.retryPendingDocumentCleanup).toHaveBeenCalledWith(
      'document-1',
      expect.any(String),
    );
  });

  it('leaves failed deletion retryable with persisted backoff', async () => {
    qualification.retryPendingDocumentCleanup.mockResolvedValue({
      cleaned: false,
      lifecycleState: 'DELETE_PENDING',
      nextAttemptAt: new Date('2026-07-30T12:00:30.000Z'),
    });

    await expect(worker.runBatch()).resolves.toBe(1);

    expect(qualification.retryPendingDocumentCleanup).toHaveBeenCalledTimes(1);
    expect(
      qualification.retryPendingDocumentCleanup.mock.results[0].value,
    ).resolves.toEqual(
      expect.objectContaining({
        lifecycleState: 'DELETE_PENDING',
        nextAttemptAt: new Date('2026-07-30T12:00:30.000Z'),
      }),
    );
  });

  it('coalesces concurrent local runs so claimed work is not duplicated', async () => {
    let signalCleanupStarted!: () => void;
    const cleanupStarted = new Promise<void>((resolve) => {
      signalCleanupStarted = resolve;
    });
    let releaseCleanup!: () => void;
    qualification.retryPendingDocumentCleanup.mockImplementation(
      () => {
        signalCleanupStarted();
        return new Promise((resolve) => {
          releaseCleanup = () =>
            resolve({ cleaned: true, lifecycleState: 'FAILED' });
        });
      },
    );

    const first = worker.runBatch();
    const second = worker.runBatch();
    await cleanupStarted;
    releaseCleanup();

    await expect(Promise.all([first, second])).resolves.toEqual([1, 1]);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    expect(qualification.retryPendingDocumentCleanup).toHaveBeenCalledTimes(1);
  });

  it('claims and processes independent orphan intents in the same bounded batch', async () => {
    prisma.$queryRaw
      .mockReset()
      .mockResolvedValueOnce([{ id: 'document-1' }])
      .mockResolvedValueOnce([{ id: 'cleanup-1' }]);

    await expect(worker.runBatch()).resolves.toBe(2);

    const query = prisma.$queryRaw.mock.calls[1][0];
    expect(String(query.sql)).toContain(
      'qualification_storage_cleanup_intents',
    );
    expect(String(query.sql)).toContain('FOR UPDATE SKIP LOCKED');
    expect(query.values).toContain(10);
    expect(qualification.retryStorageCleanupIntent).toHaveBeenCalledWith(
      'cleanup-1',
      expect.any(String),
    );
  });

  it('waits for in-flight work and does not reschedule after shutdown', async () => {
    let releaseClaim!: () => void;
    prisma.$queryRaw.mockReset().mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseClaim = () => resolve([]);
        }),
    );
    prisma.$queryRaw.mockResolvedValueOnce([]);

    worker.onModuleInit();
    await jest.advanceTimersByTimeAsync(0);
    const shutdown = worker.onModuleDestroy();
    let stopped = false;
    void shutdown.then(() => {
      stopped = true;
    });
    await Promise.resolve();
    expect(stopped).toBe(false);

    releaseClaim();
    await shutdown;
    await jest.advanceTimersByTimeAsync(60_000);

    expect(stopped).toBe(true);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('logs only sanitized worker error metadata', async () => {
    prisma.$queryRaw.mockReset();
    prisma.$queryRaw.mockRejectedValue(
      new Error('storageKey=private/original-passport.jpg'),
    );

    await expect(worker.runBatch()).resolves.toBe(0);

    const logged = (Logger.prototype.error as jest.Mock).mock.calls
      .flat()
      .join(' ');
    expect(logged).toContain('code=CLEANUP_BATCH_FAILED');
    expect(logged).not.toContain('storageKey');
    expect(logged).not.toContain('passport');
  });
});
