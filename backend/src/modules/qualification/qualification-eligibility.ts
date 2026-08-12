import {
  FixerStatus,
  QualificationEligibilityStatus,
  Prisma,
} from '@prisma/client';

export const KYC_EXPIRY_WARNING_DAYS = 30;
export const QUALIFICATION_SOURCE_VERSION =
  'cblue-fixer-qualification-v6' as const;

export const PERSONAL_KYC_DOCUMENT_TYPES = [
  'id-front',
  'selfie-with-id',
] as const;

export const COMPANY_KYC_DOCUMENT_TYPES = [
  ...PERSONAL_KYC_DOCUMENT_TYPES,
  'company-affidavit',
  'company-letter-of-intent',
] as const;

export const REVERIFICATION_REASONS = [
  'ID_EXPIRED',
  'ID_REPLACED',
  'EMAIL_CHANGED',
  'PHONE_CHANGED',
  'ADDRESS_CHANGED',
  'SERVICE_AREA_CHANGED',
  'COMPANY_EVIDENCE_CHANGED',
  'ADMIN_RESUBMISSION_REQUIRED',
  'MISSING_ID_EXPIRY',
] as const;

export type QualificationReverificationReason =
  (typeof REVERIFICATION_REASONS)[number];

export type QualificationEligibilitySnapshot = {
  status:
    | 'PENDING'
    | 'ELIGIBLE'
    | 'EXPIRING'
    | 'REVERIFICATION_REQUIRED'
    | 'EXPIRED'
    | 'SUSPENDED';
  newJobEligible: boolean;
  kycValidUntil: Date | null;
  warningStartsAt: Date | null;
  daysUntilExpiry: number | null;
  reverificationRequiredAt: Date | null;
  reasons: QualificationReverificationReason[];
  requiredEvidence: readonly string[];
  companyPartner: boolean;
  tierReevaluationPending: boolean;
  tierReevaluationRequestedAt: Date | null;
  tierReevaluationCompletedAt: Date | null;
  suspendedAt: Date | null;
  suspensionReason: string | null;
};

export function qualificationEligibleFixerWhere(
  now = new Date(),
): Prisma.FixerWhereInput {
  return {
    status: FixerStatus.APPROVED,
    verified: true,
    qualificationEligibilityStatus: {
      in: [
        QualificationEligibilityStatus.ELIGIBLE,
        QualificationEligibilityStatus.REVERIFICATION_REQUIRED,
      ],
    },
    kycValidUntil: { gt: now },
  };
}

export function readReverificationReasons(
  value: Prisma.JsonValue | null | undefined,
): QualificationReverificationReason[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (reason): reason is QualificationReverificationReason =>
      typeof reason === 'string' &&
      REVERIFICATION_REASONS.includes(
        reason as QualificationReverificationReason,
      ),
  );
}

export function mergeReverificationReasons(
  current: Prisma.JsonValue | null | undefined,
  incoming: QualificationReverificationReason[],
): QualificationReverificationReason[] {
  return Array.from(
    new Set([...readReverificationReasons(current), ...incoming]),
  );
}

export function qualificationEligibilitySnapshot(
  fixer: {
    status: FixerStatus;
    verified: boolean;
    verifiedCompanyName: string | null;
    qualificationEligibilityStatus: QualificationEligibilityStatus;
    kycValidUntil: Date | null;
    kycReverificationRequiredAt: Date | null;
    kycReverificationReasons: Prisma.JsonValue | null;
    tierReevaluationRequestedAt: Date | null;
    tierReevaluationCompletedAt: Date | null;
    suspendedAt?: Date | null;
    suspensionReason?: string | null;
  },
  now = new Date(),
): QualificationEligibilitySnapshot {
  const companyPartner = Boolean(fixer.verifiedCompanyName);
  const requiredEvidence = companyPartner
    ? COMPANY_KYC_DOCUMENT_TYPES
    : PERSONAL_KYC_DOCUMENT_TYPES;
  const validUntil = fixer.kycValidUntil;
  const warningStartsAt = validUntil
    ? new Date(
        validUntil.getTime() - KYC_EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000,
      )
    : null;
  const daysUntilExpiry = validUntil
    ? Math.max(
        0,
        Math.ceil(
          (validUntil.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
        ),
      )
    : null;
  const reasons = readReverificationReasons(fixer.kycReverificationReasons);
  const tierReevaluationPending = Boolean(
    fixer.tierReevaluationRequestedAt &&
    (!fixer.tierReevaluationCompletedAt ||
      fixer.tierReevaluationCompletedAt < fixer.tierReevaluationRequestedAt),
  );
  const suspendedAt = fixer.suspendedAt ?? null;
  const suspensionReason = fixer.suspensionReason?.trim() || null;

  if (fixer.status === FixerStatus.SUSPENDED) {
    return {
      status: 'SUSPENDED',
      newJobEligible: false,
      kycValidUntil: validUntil,
      warningStartsAt,
      daysUntilExpiry,
      reverificationRequiredAt: fixer.kycReverificationRequiredAt,
      reasons,
      requiredEvidence,
      companyPartner,
      tierReevaluationPending,
      tierReevaluationRequestedAt: fixer.tierReevaluationRequestedAt,
      tierReevaluationCompletedAt: fixer.tierReevaluationCompletedAt,
      suspendedAt,
      suspensionReason,
    };
  }

  if (
    fixer.status !== FixerStatus.APPROVED ||
    !fixer.verified ||
    fixer.qualificationEligibilityStatus ===
      QualificationEligibilityStatus.PENDING
  ) {
    return {
      status: 'PENDING',
      newJobEligible: false,
      kycValidUntil: validUntil,
      warningStartsAt,
      daysUntilExpiry,
      reverificationRequiredAt: fixer.kycReverificationRequiredAt,
      reasons,
      requiredEvidence,
      companyPartner,
      tierReevaluationPending,
      tierReevaluationRequestedAt: fixer.tierReevaluationRequestedAt,
      tierReevaluationCompletedAt: fixer.tierReevaluationCompletedAt,
      suspendedAt,
      suspensionReason,
    };
  }

  if (!validUntil || validUntil <= now) {
    return {
      status: 'EXPIRED',
      newJobEligible: false,
      kycValidUntil: validUntil,
      warningStartsAt,
      daysUntilExpiry: 0,
      reverificationRequiredAt: fixer.kycReverificationRequiredAt,
      reasons:
        reasons.length > 0
          ? reasons
          : [validUntil ? 'ID_EXPIRED' : 'MISSING_ID_EXPIRY'],
      requiredEvidence,
      companyPartner,
      tierReevaluationPending,
      tierReevaluationRequestedAt: fixer.tierReevaluationRequestedAt,
      tierReevaluationCompletedAt: fixer.tierReevaluationCompletedAt,
      suspendedAt,
      suspensionReason,
    };
  }

  if (
    fixer.qualificationEligibilityStatus ===
      QualificationEligibilityStatus.REVERIFICATION_REQUIRED ||
    fixer.kycReverificationRequiredAt
  ) {
    return {
      status: 'REVERIFICATION_REQUIRED',
      newJobEligible: true,
      kycValidUntil: validUntil,
      warningStartsAt,
      daysUntilExpiry,
      reverificationRequiredAt: fixer.kycReverificationRequiredAt,
      reasons,
      requiredEvidence,
      companyPartner,
      tierReevaluationPending,
      tierReevaluationRequestedAt: fixer.tierReevaluationRequestedAt,
      tierReevaluationCompletedAt: fixer.tierReevaluationCompletedAt,
      suspendedAt,
      suspensionReason,
    };
  }

  const expiring = Boolean(warningStartsAt && warningStartsAt <= now);
  return {
    status: expiring ? 'EXPIRING' : 'ELIGIBLE',
    newJobEligible: true,
    kycValidUntil: validUntil,
    warningStartsAt,
    daysUntilExpiry,
    reverificationRequiredAt: null,
    reasons,
    requiredEvidence,
    companyPartner,
    tierReevaluationPending,
    tierReevaluationRequestedAt: fixer.tierReevaluationRequestedAt,
    tierReevaluationCompletedAt: fixer.tierReevaluationCompletedAt,
    suspendedAt,
    suspensionReason,
  };
}
