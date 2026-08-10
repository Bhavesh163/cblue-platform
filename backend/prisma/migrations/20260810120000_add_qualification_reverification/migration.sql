CREATE TYPE "QualificationEligibilityStatus" AS ENUM (
  'PENDING',
  'ELIGIBLE',
  'REVERIFICATION_REQUIRED'
);

CREATE TYPE "QualificationSubmissionPurpose" AS ENUM (
  'INITIAL_KYC',
  'KYC_REVERIFICATION'
);

ALTER TABLE "fixers"
  ADD COLUMN "qualificationEligibilityStatus" "QualificationEligibilityStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "kycValidUntil" TIMESTAMP(3),
  ADD COLUMN "kycReverificationRequiredAt" TIMESTAMP(3),
  ADD COLUMN "kycReverificationReasons" JSONB,
  ADD COLUMN "kycExpiryWarningSentAt" TIMESTAMP(3),
  ADD COLUMN "tierReevaluationRequestedAt" TIMESTAMP(3),
  ADD COLUMN "tierReevaluationCompletedAt" TIMESTAMP(3);

ALTER TABLE "kyc_submissions"
  ADD COLUMN "purpose" "QualificationSubmissionPurpose" NOT NULL DEFAULT 'INITIAL_KYC',
  ADD COLUMN "reverificationReasons" JSONB;

WITH ranked_identity AS (
  SELECT
    submission."fixerId",
    document."identityExpiryDate",
    ROW_NUMBER() OVER (
      PARTITION BY submission."fixerId"
      ORDER BY submission."version" DESC, document."createdAt" DESC
    ) AS row_number
  FROM "kyc_submissions" submission
  JOIN "kyc_documents" document
    ON document."submissionId" = submission."id"
  WHERE submission."status" = 'APPROVED'
    AND document."documentType" = 'id-front'
    AND document."isActive" = TRUE
    AND document."lifecycleState" = 'READY'
    AND document."evidenceStatus" = 'VALIDATED'
)
UPDATE "fixers" fixer
SET
  "qualificationEligibilityStatus" = 'ELIGIBLE',
  "kycValidUntil" = COALESCE(
    identity."identityExpiryDate",
    CURRENT_TIMESTAMP + INTERVAL '30 days'
  )
FROM ranked_identity identity
WHERE identity."fixerId" = fixer."id"
  AND identity.row_number = 1
  AND fixer."status" = 'APPROVED'
  AND fixer."verified" = TRUE;

UPDATE "fixers"
SET
  "qualificationEligibilityStatus" = 'ELIGIBLE',
  "kycValidUntil" = CURRENT_TIMESTAMP + INTERVAL '30 days',
  "kycReverificationReasons" = '["MISSING_ID_EXPIRY"]'::jsonb
WHERE "status" = 'APPROVED'
  AND "verified" = TRUE
  AND "kycValidUntil" IS NULL;

CREATE INDEX "fixers_status_verified_qualificationEligibilityStatus_kycVa_idx"
ON "fixers"(
  "status",
  "verified",
  "qualificationEligibilityStatus",
  "kycValidUntil"
);
