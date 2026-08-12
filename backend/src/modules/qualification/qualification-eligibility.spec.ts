import {
  COMPANY_KYC_DOCUMENT_TYPES,
  qualificationEligibilitySnapshot,
  qualificationEligibleFixerWhere,
} from './qualification-eligibility';

describe('qualification eligibility', () => {
  const base = {
    status: 'APPROVED',
    verified: true,
    verifiedCompanyName: null,
    qualificationEligibilityStatus: 'ELIGIBLE',
    kycValidUntil: new Date('2026-09-30T00:00:00.000Z'),
    kycReverificationRequiredAt: null,
    kycReverificationReasons: null,
    tierReevaluationRequestedAt: null,
    tierReevaluationCompletedAt: null,
  } as const;

  it('warns within 30 days while keeping the partner eligible', () => {
    const result = qualificationEligibilitySnapshot(
      base,
      new Date('2026-09-01T00:00:00.000Z'),
    );

    expect(result).toEqual(
      expect.objectContaining({
        status: 'EXPIRING',
        newJobEligible: true,
        daysUntilExpiry: 29,
      }),
    );
  });

  it('blocks new work at expiry even before the scheduler persists the transition', () => {
    const result = qualificationEligibilitySnapshot(
      base,
      new Date('2026-09-30T00:00:00.000Z'),
    );

    expect(result).toEqual(
      expect.objectContaining({ status: 'EXPIRED', newJobEligible: false }),
    );
    expect(qualificationEligibleFixerWhere(new Date())).toEqual(
      expect.objectContaining({
        verified: true,
        qualificationEligibilityStatus: {
          in: ['ELIGIBLE', 'REVERIFICATION_REQUIRED'],
        },
      }),
    );
  });

  it('keeps an approved partner eligible while sensitive profile changes await re-verification', () => {
    const result = qualificationEligibilitySnapshot(
      {
        ...base,
        qualificationEligibilityStatus: 'REVERIFICATION_REQUIRED',
        kycReverificationRequiredAt: new Date('2026-08-12T00:00:00.000Z'),
        kycReverificationReasons: ['PHONE_CHANGED'],
      },
      new Date('2026-08-12T01:00:00.000Z'),
    );

    expect(result).toEqual(
      expect.objectContaining({
        status: 'REVERIFICATION_REQUIRED',
        newJobEligible: true,
        reasons: ['PHONE_CHANGED'],
      }),
    );
  });

  it('still blocks an expired identity when profile re-verification is also pending', () => {
    const result = qualificationEligibilitySnapshot(
      {
        ...base,
        qualificationEligibilityStatus: 'REVERIFICATION_REQUIRED',
        kycValidUntil: new Date('2026-08-11T00:00:00.000Z'),
        kycReverificationRequiredAt: new Date('2026-08-10T00:00:00.000Z'),
        kycReverificationReasons: ['PHONE_CHANGED'],
      },
      new Date('2026-08-12T00:00:00.000Z'),
    );

    expect(result).toEqual(
      expect.objectContaining({ status: 'EXPIRED', newJobEligible: false }),
    );
  });

  it('blocks an administrator-suspended partner without erasing KYC approval', () => {
    const result = qualificationEligibilitySnapshot({
      ...base,
      status: 'SUSPENDED',
      suspendedAt: new Date('2026-08-12T00:00:00.000Z'),
      suspensionReason: 'Customer safety complaint under review',
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: 'SUSPENDED',
        newJobEligible: false,
        suspensionReason: 'Customer safety complaint under review',
      }),
    );
  });

  it('requires all four identity and authority files for a company partner', () => {
    const result = qualificationEligibilitySnapshot({
      ...base,
      verifiedCompanyName: 'Example Company Limited',
    });

    expect(result.requiredEvidence).toEqual(COMPANY_KYC_DOCUMENT_TYPES);
  });

  it('keeps KYC eligibility independent while tier re-evaluation is pending', () => {
    const result = qualificationEligibilitySnapshot({
      ...base,
      tierReevaluationRequestedAt: new Date('2026-08-10T00:00:00.000Z'),
    });

    expect(result).toEqual(
      expect.objectContaining({
        newJobEligible: true,
        tierReevaluationPending: true,
      }),
    );
  });
});
