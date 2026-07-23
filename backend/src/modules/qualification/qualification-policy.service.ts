import { Injectable } from '@nestjs/common';
import { FixerTier } from '@prisma/client';

export const QUALIFICATION_POLICY_VERSION = 'cblue-fixer-qualification-v1';

export type QualificationEvidenceInput = {
  kycApproved: boolean;
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

export type QualificationPolicyResult = {
  policyVersion: string;
  recommendedTier: FixerTier;
  eligibleTiers: FixerTier[];
  humanReviewRequired: boolean;
  publicPromotionAllowed: boolean;
  reasons: string[];
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
  evaluate(input: QualificationEvidenceInput): QualificationPolicyResult {
    if (!input.kycApproved) {
      return {
        policyVersion: QUALIFICATION_POLICY_VERSION,
        recommendedTier: FixerTier.ECONOMY,
        eligibleTiers: [FixerTier.ECONOMY],
        humanReviewRequired: true,
        publicPromotionAllowed: false,
        reasons: ['Approved KYC is required before any tier qualification.'],
      };
    }

    const standardQualified =
      (input.yearsExperience > 3 && input.relatedCertificateCount >= 2) ||
      input.corporateCertificateCount >= 1 ||
      input.millionBahtCompletionCertificateCount >= 1;
    const corporateQualified =
      input.corporateEvidenceVerified &&
      (input.corporateEndorsedCompletionCertificateCount >= 2 ||
        (input.hasEligibleMastersOrDoctorate && input.corporateCertificateCount >= 1));
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

    const recommendedTier = eligibleTiers.reduce(
      (best, tier) => (tierRank[tier] > tierRank[best] ? tier : best),
      FixerTier.ECONOMY,
    );
    const humanReviewRequired = tierRank[recommendedTier] >= tierRank[FixerTier.CORPORATE];

    const reasons: string[] = [];
    if (!standardQualified) {
      reasons.push('Standard requires more than 3 years plus two related certificates, a corporate certificate, or a million-baht completion certificate.');
    }
    if (!corporateQualified) {
      reasons.push('Corporate requires verified corporate evidence and qualifying endorsed certificates or an eligible advanced degree with corporate evidence.');
    }
    if (!specialistQualified) {
      reasons.push('Specialist requires five completion certificates endorsed by verified corporate clients.');
    }
    if (!expertQualified) {
      reasons.push('Expert requires five project completion certificates and an independently verifiable international award.');
    }
    if (humanReviewRequired) {
      reasons.push('Corporate and higher tiers require authorized human review.');
    }

    return {
      policyVersion: QUALIFICATION_POLICY_VERSION,
      recommendedTier,
      eligibleTiers,
      humanReviewRequired,
      publicPromotionAllowed: recommendedTier === FixerTier.ECONOMY ||
        recommendedTier === FixerTier.STANDARD,
      reasons,
    };
  }
}
