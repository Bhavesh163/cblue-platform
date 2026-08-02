import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { QualificationBridgeService } from './qualification-bridge.service';

describe('QualificationBridgeService', () => {
  const prisma = {
    subscriber: { findFirst: jest.fn() },
    user: { findMany: jest.fn() },
    fixer: { findFirst: jest.fn() },
  } as any;
  const config = { get: jest.fn().mockReturnValue('bridge-secret') } as any;
  const service = new QualificationBridgeService(prisma, config);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.fixer.findFirst.mockReset();
  });

  it('rejects missing or invalid bridge keys before resolving identity', async () => {
    await expect(service.getSnapshot('user-1')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(
      service.getSnapshot('user-1', 'wrong-secret'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.subscriber.findFirst).not.toHaveBeenCalled();
  });

  it('returns only the linked fixer qualification snapshot without private storage keys', async () => {
    prisma.subscriber.findFirst.mockResolvedValue({
      id: 'subscriber-1',
      email: 'partner@example.com',
    });
    prisma.user.findMany.mockResolvedValue([{ id: 'user-1' }]);
    prisma.fixer.findFirst.mockResolvedValue({
      id: 'fixer-1',
      status: 'APPROVED',
      verified: true,
      tier: 'STANDARD',
      yearsExperience: 5,
      aiScore: 78,
      aiTier: 'STANDARD',
      aiCredentialStatus: 'verified',
      user: { id: 'user-1', name: 'Partner' },
      qualificationSubmissions: [
        {
          id: 'submission-1',
          version: 1,
          status: 'NEEDS_REVIEW',
          policyVersion: 'cblue-fixer-qualification-v1',
          submittedAt: new Date('2026-07-24T00:00:00.000Z'),
          documents: [
            {
              id: 'document-1',
              documentType: 'id-front',
              contentType: 'image/jpeg',
              sizeBytes: 10,
              evidenceStatus: 'VALIDATED',
              extractedAt: new Date('2026-07-24T00:00:00.000Z'),
              credentialVerifiedAt: null,
              expiresAt: null,
              retentionDeleteAt: new Date('2029-07-24T00:00:00.000Z'),
              createdAt: new Date('2026-07-24T00:00:00.000Z'),
            },
          ],
          evaluations: [
            {
              id: 'evaluation-1',
              provider: 'DETERMINISTIC_POLICY',
              model: null,
              policyVersion: 'cblue-fixer-qualification-v1',
              status: 'COMPLETED',
              deterministicScore: 78,
              aiScore: null,
              risk: 'LOW',
              recommendedTier: 'STANDARD',
              confidence: 90,
              completedAt: new Date('2026-07-24T00:00:00.000Z'),
              createdAt: new Date('2026-07-24T00:00:00.000Z'),
            },
          ],
          reviewTasks: [
            {
              id: 'task-1',
              status: 'ASSIGNED',
              priority: 10,
              assignedAt: new Date('2026-07-24T00:00:00.000Z'),
              proposedDecision: 'APPROVE',
              proposedTier: 'STANDARD',
              proposedAt: new Date('2026-07-24T01:00:00.000Z'),
              checkedAt: null,
              decidedAt: null,
              createdAt: new Date('2026-07-24T00:00:00.000Z'),
            },
          ],
        },
      ],
      tierQualifications: [
        {
          id: 'tier-1',
          recommendedTier: 'STANDARD',
          approvedTier: null,
          source: 'DETERMINISTIC',
          policyVersion: 'cblue-fixer-qualification-v1',
          reason: 'Pending review',
          effectiveAt: null,
          expiresAt: null,
          createdAt: new Date('2026-07-24T00:00:00.000Z'),
        },
      ],
    });

    const result = await service.getSnapshot(
      'partner@example.com',
      'bridge-secret',
    );

    expect(result.sourceVersion).toBe('cblue-fixer-qualification-v3');
    expect(result.fixer.tier).toBe('STANDARD');
    expect(result.requiredEvidence).toEqual(['id-front', 'selfie-with-id']);
    expect(result.optionalEvidence).toEqual(['company-affidavit']);
    expect(result.kyc).toEqual(
      expect.objectContaining({
        status: 'NEEDS_REVIEW',
        humanReviewRequired: null,
      }),
    );
    expect(result.tier).toEqual(
      expect.objectContaining({
        recommendedTier: 'STANDARD',
        approvedTier: null,
      }),
    );
    expect(result.submission?.reviewTask?.status).toBe('ASSIGNED');
    expect(result.verification).toEqual(
      expect.objectContaining({
        documentCount: 1,
        validatedCount: 1,
        makerCheckerStatus: 'DECISION_IN_PROGRESS',
      }),
    );
    expect(result.submission?.documents[0]).not.toHaveProperty('storageKey');
    expect(result.submission?.evaluations[0]).not.toHaveProperty('provider');
    expect(JSON.stringify(result)).not.toMatch(
      /storageKey|signedUrl|rawOcr|providerSecret|assignedTo|reviewerId/,
    );
  });

  it('does not expose a qualification record for an unknown linked subject', async () => {
    prisma.subscriber.findFirst.mockResolvedValue(null);
    prisma.user.findMany.mockResolvedValue([]);
    prisma.fixer.findFirst.mockResolvedValue(null);
    await expect(
      service.getSnapshot('unknown@example.com', 'bridge-secret'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.fixer.findFirst).not.toHaveBeenCalled();
  });
});
