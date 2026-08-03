import { FixerTier } from '@prisma/client';
import {
  QUALIFICATION_POLICY_VERSION,
  QualificationPolicyService,
} from './qualification-policy.service';

const base = {
  kycApproved: true,
  yearsExperience: 0,
  relatedCertificateCount: 0,
  corporateCertificateCount: 0,
  corporateEndorsedCompletionCertificateCount: 0,
  projectCompletionCertificateCount: 0,
  millionBahtCompletionCertificateCount: 0,
  hasEligibleMastersOrDoctorate: false,
  hasInternationalAward: false,
  corporateEvidenceVerified: false,
};

describe('QualificationPolicyService', () => {
  const service = new QualificationPolicyService();

  it('calculates a versioned deterministic tier ceiling', () => {
    const result = service.calculateTierCeiling({
      ...base,
      corporateEvidenceVerified: true,
      corporateEndorsedCompletionCertificateCount: 2,
    });

    expect(QUALIFICATION_POLICY_VERSION).toBe('cblue-fixer-qualification-v5');
    expect(result.maximumTier).toBe(FixerTier.CORPORATE);
    expect(result.eligibilityScore).toBeGreaterThan(0);
    expect(result.reasonCodes).toEqual(expect.any(Array));
  });

  it('keeps unapproved KYC at Economy and blocks promotion', () => {
    const result = service.evaluate({ ...base, kycApproved: false });
    expect(result).toMatchObject({
      policyVersion: QUALIFICATION_POLICY_VERSION,
      recommendedTier: FixerTier.ECONOMY,
      eligibleTiers: [FixerTier.ECONOMY],
      publicPromotionAllowed: false,
    });
  });

  it('qualifies Standard from more than three years of experience alone', () => {
    const result = service.evaluate({
      ...base,
      yearsExperience: 4,
    });
    expect(result.recommendedTier).toBe(FixerTier.STANDARD);
    expect(result.eligibleTiers).toEqual([
      FixerTier.ECONOMY,
      FixerTier.STANDARD,
    ]);
  });

  it('qualifies Standard from two related credentials alone', () => {
    const result = service.evaluate({
      ...base,
      relatedCertificateCount: 2,
    });
    expect(result.recommendedTier).toBe(FixerTier.STANDARD);
    expect(result.eligibleTiers).toEqual([
      FixerTier.ECONOMY,
      FixerTier.STANDARD,
    ]);
  });

  it('qualifies Standard from one verified corporate certificate alone', () => {
    const result = service.evaluate({
      ...base,
      corporateCertificateCount: 1,
    });
    expect(result.recommendedTier).toBe(FixerTier.STANDARD);
  });

  it('qualifies Standard from one verified million-baht completion certificate alone', () => {
    const result = service.evaluate({
      ...base,
      millionBahtCompletionCertificateCount: 1,
    });
    expect(result.recommendedTier).toBe(FixerTier.STANDARD);
  });

  it('does not promote Corporate without verified corporate evidence', () => {
    const result = service.evaluate({
      ...base,
      corporateEndorsedCompletionCertificateCount: 2,
    });
    expect(result.recommendedTier).toBe(FixerTier.ECONOMY);
    expect(result.humanReviewRequired).toBe(false);
  });

  it('requires human review for Corporate and higher tiers', () => {
    const result = service.evaluate({
      ...base,
      corporateEvidenceVerified: true,
      corporateEndorsedCompletionCertificateCount: 2,
    });
    expect(result.recommendedTier).toBe(FixerTier.CORPORATE);
    expect(result.humanReviewRequired).toBe(true);
    expect(result.publicPromotionAllowed).toBe(false);
  });

  it('qualifies Specialist and Expert only from their evidence gates', () => {
    const specialist = service.evaluate({
      ...base,
      corporateEvidenceVerified: true,
      corporateEndorsedCompletionCertificateCount: 5,
    });
    const expert = service.evaluate({
      ...base,
      corporateEvidenceVerified: true,
      projectCompletionCertificateCount: 5,
      hasInternationalAward: true,
    });
    expect(specialist.recommendedTier).toBe(FixerTier.SPECIALIST);
    expect(expert.recommendedTier).toBe(FixerTier.EXPERT);
  });
});
