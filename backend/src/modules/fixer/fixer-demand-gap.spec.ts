import { DemandGapStatus } from '@prisma/client';
import { FixerService } from './fixer.service';

describe('FixerService unmatched demand persistence', () => {
  const demandStore = {
    updateMany: jest.fn(),
    upsert: jest.fn(),
  };
  const occurrenceStore = {
    create: jest.fn(),
  };
  let service: FixerService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = Object.create(FixerService.prototype) as FixerService;
    (service as unknown as { prisma: unknown }).prisma = {
      unmatchedServiceDemand: demandStore,
      unmatchedServiceDemandOccurrence: occurrenceStore,
    };
  });

  it('persists a zero-result request with location and parsed requested services', async () => {
    demandStore.updateMany.mockResolvedValue({ count: 0 });
    demandStore.upsert.mockResolvedValue({ id: 'gap-1' });

    await (
      service as unknown as {
        persistMatchDemand(
          input: Record<string, unknown>,
          count: number,
        ): Promise<void>;
      }
    ).persistMatchDemand(
      {
        service: 'project',
        district: 'Pathum Wan',
        province: 'Bangkok',
        postalCode: '10330',
        description: 'Need 100 sq.m. office fit out',
        bookingType: 'project',
      },
      0,
    );

    expect(occurrenceStore.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        demandId: 'gap-1',
        service: 'project',
        district: 'Pathum Wan',
        province: 'Bangkok',
      }),
    });
    expect(demandStore.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          service: 'project',
          district: 'Pathum Wan',
          province: 'Bangkok',
          postalCode: '10330',
          requestText: 'Need 100 sq.m. office fit out',
          requestedServices: expect.any(Array),
          expiresAt: expect.any(Date),
        }),
        update: expect.objectContaining({
          occurrenceCount: { increment: 1 },
          lastSeenAt: expect.any(Date),
        }),
      }),
    );
  });

  it('closes an open demand gap after eligible partners become available', async () => {
    demandStore.updateMany.mockResolvedValue({ count: 1 });

    await (
      service as unknown as {
        persistMatchDemand(
          input: Record<string, unknown>,
          count: number,
        ): Promise<void>;
      }
    ).persistMatchDemand(
      {
        service: 'project',
        district: 'Pathum Wan',
        province: 'Bangkok',
        description: 'Need 100 sq.m. office fit out',
      },
      2,
    );

    expect(demandStore.updateMany).toHaveBeenCalledWith({
      where: {
        fingerprint: expect.any(String),
        status: {
          in: [DemandGapStatus.OPEN, DemandGapStatus.IN_PROGRESS],
        },
      },
      data: {
        status: DemandGapStatus.RESOLVED,
        resolvedAt: expect.any(Date),
        resolutionNote:
          'Resolved automatically after eligible providers became available',
      },
    });
    expect(demandStore.upsert).not.toHaveBeenCalled();
  });
});
