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
        qualificationEligibilityStatus: 'ELIGIBLE',
        kycReverificationRequiredAt: null,
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
