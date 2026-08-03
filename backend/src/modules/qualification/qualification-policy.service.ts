import { Injectable } from '@nestjs/common';
import { FixerTier } from '@prisma/client';

export const QUALIFICATION_POLICY_VERSION = 'cblue-fixer-qualification-v5';

export type QualificationEvidenceInput = {
  yearsExperience: number;
  relatedCertificateCount: number;
  corporateCertificateCount: number;
  corporateEndorsedCompletionCertificateCount: number;
  projectCompletionCertificateCount: number;
  millionBahtCompletionCertificateCount: number;
  hasEligibleMastersOrDoctorate: boolean;
  hasInternationalAward: boolean;
  corporateEvidenceVerified: boolean;
};

export type TierPolicyDecision = {
  maximumTier: FixerTier;
  eligibilityScore: number;
  reasonCodes: string[];
};

const tierRank: Record<FixerTier, number> = {
  ECONOMY: 0,
  STANDARD: 1,
  CORPORATE: 2,
  SPECIALIST: 3,
  EXPERT: 4,
};

@Injectable()
export class QualificationPolicyService {
  calculateTierCeiling(input: QualificationEvidenceInput): TierPolicyDecision {
    const standardQualified =
      input.yearsExperience > 3 ||
      input.relatedCertificateCount >= 2 ||
      input.corporateCertificateCount >= 1 ||
      input.millionBahtCompletionCertificateCount >= 1;
    const corporateQualified =
      input.corporateEvidenceVerified &&
      (input.corporateEndorsedCompletionCertificateCount >= 2 ||
        (input.hasEligibleMastersOrDoctorate &&
          input.corporateCertificateCount >= 1));
    const specialistQualified =
      input.corporateEvidenceVerified &&
      input.corporateEndorsedCompletionCertificateCount >= 5;
    const expertQualified =
      input.corporateEvidenceVerified &&
      input.projectCompletionCertificateCount >= 5 &&
      input.hasInternationalAward;

    const eligibleTiers: FixerTier[] = [FixerTier.ECONOMY];
    if (standardQualified) eligibleTiers.push(FixerTier.STANDARD);
    if (corporateQualified) eligibleTiers.push(FixerTier.CORPORATE);
    if (specialistQualified) eligibleTiers.push(FixerTier.SPECIALIST);
    if (expertQualified) eligibleTiers.push(FixerTier.EXPERT);

    const maximumTier = eligibleTiers.reduce(
      (best, tier) => (tierRank[tier] > tierRank[best] ? tier : best),
      FixerTier.ECONOMY,
    );
    const reasonCodes: string[] = [];
    if (!standardQualified) {
      reasonCodes.push('STANDARD_EVIDENCE_INSUFFICIENT');
    }
    if (!corporateQualified) {
      reasonCodes.push('CORPORATE_EVIDENCE_INSUFFICIENT');
    }
    if (!specialistQualified) {
      reasonCodes.push('SPECIALIST_EVIDENCE_INSUFFICIENT');
    }
    if (!expertQualified) {
      reasonCodes.push('EXPERT_EVIDENCE_INSUFFICIENT');
    }
    if (maximumTier !== FixerTier.ECONOMY) {
      reasonCodes.push('TIER_ADMIN_REVIEW_REQUIRED');
    }

    return {
      maximumTier,
      eligibilityScore: this.calculateEligibilityScore(input),
      reasonCodes,
    };
  }

  evaluate(input: QualificationEvidenceInput & { kycApproved?: boolean }) {
    if (input.kycApproved === false) {
      return {
        policyVersion: QUALIFICATION_POLICY_VERSION,
        recommendedTier: FixerTier.ECONOMY,
        eligibleTiers: [FixerTier.ECONOMY],
        humanReviewRequired: true,
        publicPromotionAllowed: false,
        reasons: ['Approved KYC is required before any tier qualification.'],
      };
    }
    const decision = this.calculateTierCeiling(input);
    const eligibleTiers = Object.values(FixerTier).filter(
      (tier) => tierRank[tier] <= tierRank[decision.maximumTier],
    );
    return {
      policyVersion: QUALIFICATION_POLICY_VERSION,
      recommendedTier: decision.maximumTier,
      eligibleTiers,
      humanReviewRequired: decision.maximumTier !== FixerTier.ECONOMY,
      publicPromotionAllowed:
        decision.maximumTier === FixerTier.ECONOMY ||
        decision.maximumTier === FixerTier.STANDARD,
      reasons: decision.reasonCodes,
    };
  }
  private calculateEligibilityScore(input: QualificationEvidenceInput) {
    return Math.min(
      100,
      Math.min(25, Math.max(0, input.yearsExperience) * 5) +
        Math.min(15, Math.max(0, input.relatedCertificateCount) * 7) +
        Math.min(15, Math.max(0, input.projectCompletionCertificateCount) * 3) +
        Math.min(10, Math.max(0, input.corporateCertificateCount) * 5) +
        (input.corporateEvidenceVerified ? 20 : 0) +
        (input.hasEligibleMastersOrDoctorate ? 5 : 0) +
        (input.hasInternationalAward ? 10 : 0),
    );
  }
}
