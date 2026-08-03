import { ConflictException, NotFoundException } from '@nestjs/common';
import { QualificationEvaluationService } from './qualification-evaluation.service';

describe('QualificationEvaluationService', () => {
  const tx = {
    qualificationEvaluation: { create: jest.fn() },
    qualificationReviewTask: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    tierQualification: { findFirst: jest.fn(), create: jest.fn() },
    fixer: { update: jest.fn() },
    qualificationAuditLog: { create: jest.fn() },
    kycSubmission: { update: jest.fn() },
    $executeRawUnsafe: jest.fn(),
  } as any;
  const prisma = {
    kycSubmission: { findFirst: jest.fn(), findUnique: jest.fn() },
    qualificationEvaluation: { findMany: jest.fn() },
    $transaction: jest.fn(async (callback: (client: any) => unknown) =>
      callback(tx),
    ),
  } as any;
  const policy = { calculateTierCeiling: jest.fn() } as any;
  const config = { get: jest.fn().mockReturnValue(undefined) } as any;
  const service = new QualificationEvaluationService(prisma, policy, config);

  beforeEach(() => {
    jest.clearAllMocks();

    tx.$executeRawUnsafe.mockResolvedValue(0);
    tx.qualificationEvaluation.create.mockResolvedValue({ id: 'evaluation-1' });
    tx.qualificationReviewTask.findFirst.mockResolvedValue(null);
    tx.qualificationReviewTask.updateMany.mockResolvedValue({ count: 0 });
    tx.tierQualification.findFirst.mockResolvedValue(null);
    tx.tierQualification.create.mockResolvedValue({ id: 'qualification-1' });
    tx.fixer.update.mockResolvedValue({ id: 'fixer-1' });
    tx.qualificationAuditLog.create.mockResolvedValue({ id: 'audit-1' });
    tx.kycSubmission.update.mockResolvedValue({ id: 'submission-1' });
  });

  it('counts only validated evidence and auto-approves Economy without Typhoon', async () => {
    prisma.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-1',
      status: 'APPROVED',
      fixer: { id: 'fixer-1', yearsExperience: 4 },
      documents: [
        { id: 'front', documentType: 'id-front', evidenceStatus: 'VALIDATED' },
        { id: 'back', documentType: 'id-back', evidenceStatus: 'VALIDATED' },
        {
          id: 'cert',
          documentType: 'education-certificate',
          evidenceStatus: 'UNCHECKED',
        },
      ],
    });
    policy.calculateTierCeiling.mockImplementation((input: any) => ({
      maximumTier: input.relatedCertificateCount > 0 ? 'STANDARD' : 'ECONOMY',
      eligibilityScore: 50,
      reasonCodes: [],
    }));

    const result = await service.evaluateSubmissionForUser(
      'user-1',
      'submission-1',
    );

    expect(result.advisory).toBeNull();
    expect(result.reviewRequired).toBe(false);
    expect(result.status).toBe('APPROVED');
    expect(tx.qualificationEvaluation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          provider: 'DETERMINISTIC_POLICY',
          status: 'COMPLETED',
          recommendedTier: 'ECONOMY',
          inputHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      }),
    );
    expect(tx.qualificationReviewTask.create).not.toHaveBeenCalled();
    expect(tx.tierQualification.create).not.toHaveBeenCalled();
    expect(tx.fixer.update).not.toHaveBeenCalled();
    expect(tx.kycSubmission.update).not.toHaveBeenCalled();
  });

  it('allows an admin re-evaluation and records the admin actor', async () => {
    prisma.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-admin',
      status: 'APPROVED',
      fixer: { id: 'fixer-admin', yearsExperience: 4 },
      documents: [
        { id: 'front', documentType: 'id-front', evidenceStatus: 'VALIDATED' },
        { id: 'back', documentType: 'id-back', evidenceStatus: 'VALIDATED' },
      ],
    });
    policy.calculateTierCeiling.mockReturnValue({
      maximumTier: 'STANDARD',
      eligibilityScore: 50,
      reasonCodes: [],
    });

    await expect(
      service.evaluateSubmissionForAdmin('admin-1', 'submission-admin'),
    ).resolves.toEqual(
      expect.objectContaining({ submissionId: 'submission-admin' }),
    );
    expect(prisma.kycSubmission.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'submission-admin' },
      }),
    );
    expect(tx.qualificationAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: 'admin-1',
          action: 'QUALIFICATION_EVALUATED',
        }),
      }),
    );
  });
  it('does not duplicate an existing deterministic Economy qualification', async () => {
    prisma.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-1',
      status: 'APPROVED',
      fixer: { id: 'fixer-1', yearsExperience: 1 },
      documents: [
        { id: 'front', documentType: 'id-front', evidenceStatus: 'VALIDATED' },
        { id: 'back', documentType: 'id-back', evidenceStatus: 'VALIDATED' },
      ],
    });
    policy.calculateTierCeiling.mockReturnValue({
      maximumTier: 'ECONOMY',
      eligibilityScore: 50,
      reasonCodes: [],
    });
    tx.tierQualification.findFirst.mockResolvedValue({
      id: 'existing-qualification',
    });

    await service.evaluateSubmissionForUser('user-1', 'submission-1');

    expect(tx.tierQualification.create).not.toHaveBeenCalled();
    expect(tx.fixer.update).not.toHaveBeenCalled();
  });

  it('uses only validated extracted degree and project-value evidence in tier inputs', async () => {
    prisma.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-evidence',
      status: 'APPROVED',
      fixer: { id: 'fixer-evidence', yearsExperience: 6 },
      documents: [
        {
          id: 'front',
          documentType: 'id-front',
          evidenceStatus: 'VALIDATED',
          extractedFields: null,
        },
        {
          id: 'back',
          documentType: 'id-back',
          evidenceStatus: 'VALIDATED',
          extractedFields: null,
        },
        {
          id: 'degree',
          documentType: 'education-certificate',
          evidenceStatus: 'VALIDATED',
          extractedFields: { fields: { credentialLevel: 'master' } },
        },
        {
          id: 'project',
          documentType: 'project-completion-certificate',
          evidenceStatus: 'VALIDATED',
          extractedFields: { fields: { projectValue: 2500000 } },
          credentialVerifications: [
            {
              status: 'VERIFIED',
              issuerType: 'SET_LISTED_COMPANY',
              issuerName: 'Example Public Company',
              projectValueBaht: 2500000,
              corporateEndorsement: true,
              verifiedAt: new Date('2026-08-02T00:00:00.000Z'),
            },
          ],
        },
        {
          id: 'unchecked-project',
          documentType: 'project-completion-certificate',
          evidenceStatus: 'UNCHECKED',
          extractedFields: { fields: { projectValue: 9000000 } },
        },
      ],
    });
    policy.calculateTierCeiling.mockReturnValue({
      maximumTier: 'ECONOMY',
      eligibilityScore: 50,
      reasonCodes: [],
    });

    await service.evaluateSubmissionForAdmin('admin-1', 'submission-evidence');

    expect(policy.calculateTierCeiling).toHaveBeenCalledWith(
      expect.objectContaining({
        hasEligibleMastersOrDoctorate: true,
        millionBahtCompletionCertificateCount: 1,
        projectCompletionCertificateCount: 1,
      }),
    );
  });

  it('rejects evaluation of an incomplete draft submission', async () => {
    prisma.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-draft',
      status: 'DRAFT',
      fixer: { id: 'fixer-1', yearsExperience: 1 },
      documents: [],
    });

    await expect(
      service.evaluateSubmissionForUser('user-1', 'submission-draft'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('fails closed for a submission owned by another user', async () => {
    prisma.kycSubmission.findFirst.mockResolvedValue(null);
    await expect(
      service.evaluateSubmissionForUser('other-user', 'submission-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('requires KYC approval before tier evaluation', async () => {
    prisma.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-unapproved',
      status: 'NEEDS_REVIEW',
      fixer: { id: 'fixer-1', yearsExperience: 1 },
      documents: [],
    });

    await expect(service.evaluateTier('submission-unapproved')).rejects.toThrow(
      'KYC approval is required before tier evaluation',
    );
    expect(policy.calculateTierCeiling).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('creates a review task when evidence is incomplete or an upper tier is recommended', async () => {
    prisma.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-2',
      status: 'APPROVED',
      fixer: { id: 'fixer-2', yearsExperience: 12 },
      documents: [
        { id: 'front', documentType: 'id-front', evidenceStatus: 'UNCHECKED' },
        { id: 'back', documentType: 'id-back', evidenceStatus: 'UNCHECKED' },
        {
          id: 'award',
          documentType: 'international-award',
          evidenceStatus: 'VALIDATED',
        },
      ],
    });
    policy.calculateTierCeiling.mockReturnValue({
      maximumTier: 'EXPERT',
      eligibilityScore: 50,
      reasonCodes: [],
    });

    const result = await service.evaluateSubmissionForUser(
      'user-2',
      'submission-2',
    );

    expect(result.reviewRequired).toBe(true);
    expect(tx.qualificationReviewTask.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          submissionId: 'submission-2',
          status: 'OPEN',
          kind: 'TIER',
          priority: 10,
        }),
      }),
    );
    expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      'qualification-tier:fixer-2',
    );
    expect(tx.kycSubmission.update).not.toHaveBeenCalled();
  });

  it('reuses an existing open review task during re-evaluation', async () => {
    prisma.kycSubmission.findFirst.mockResolvedValue({
      id: 'submission-2',
      status: 'APPROVED',
      fixer: { id: 'fixer-2', yearsExperience: 0 },
      documents: [],
    });
    policy.calculateTierCeiling.mockReturnValue({
      maximumTier: 'ECONOMY',
      eligibilityScore: 50,
      reasonCodes: [],
    });
    tx.qualificationReviewTask.findFirst.mockResolvedValue({
      id: 'existing-task',
    });

    await service.evaluateSubmissionForAdmin('admin-1', 'submission-2');

    expect(tx.qualificationReviewTask.create).not.toHaveBeenCalled();
  });
  it('rejects legacy evaluation endpoints until KYC approval is committed', async () => {
    prisma.kycSubmission.findFirst
      .mockResolvedValueOnce({
        id: 'submission-user-unapproved',
        status: 'SUBMITTED',
        fixer: { id: 'fixer-1', yearsExperience: 1 },
        documents: [],
      })
      .mockResolvedValueOnce({
        id: 'submission-admin-unapproved',
        status: 'NEEDS_REVIEW',
        fixer: { id: 'fixer-1', yearsExperience: 1 },
        documents: [],
      });

    await expect(
      service.evaluateSubmissionForUser('user-1', 'submission-user-unapproved'),
    ).rejects.toThrow('KYC approval is required before tier evaluation');
    await expect(
      service.evaluateSubmissionForAdmin(
        'admin-1',
        'submission-admin-unapproved',
      ),
    ).rejects.toThrow('KYC approval is required before tier evaluation');

    expect(policy.calculateTierCeiling).not.toHaveBeenCalled();
    expect(prisma['$transaction']).not.toHaveBeenCalled();
    expect(tx.qualificationReviewTask.create).not.toHaveBeenCalled();
  });
});
