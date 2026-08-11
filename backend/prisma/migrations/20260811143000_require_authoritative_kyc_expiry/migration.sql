WITH latest_submission AS (
  SELECT DISTINCT ON (submission."fixerId")
    submission."id",
    submission."fixerId",
    submission."status"
  FROM "kyc_submissions" submission
  ORDER BY submission."fixerId", submission."version" DESC
),
provider_kyc AS (
  SELECT
    fixer."id" AS "fixerId",
    latest."status" AS "submissionStatus",
    identity."identityExpiryDate",
    CASE
      WHEN latest."status" = 'APPROVED'
        AND identity."identityExpiryDate" IS NOT NULL
        AND identity."identityExpiryDate" <= CURRENT_TIMESTAMP
      THEN 'ID_EXPIRED'
      ELSE 'MISSING_ID_EXPIRY'
    END AS reason
  FROM "fixers" fixer
  LEFT JOIN latest_submission latest
    ON latest."fixerId" = fixer."id"
  LEFT JOIN LATERAL (
    SELECT document."identityExpiryDate"
    FROM "kyc_documents" document
    WHERE document."submissionId" = latest."id"
      AND document."documentType" = 'id-front'
      AND document."isActive" = TRUE
      AND document."lifecycleState" = 'READY'
      AND document."evidenceStatus" = 'VALIDATED'
    ORDER BY document."createdAt" DESC
    LIMIT 1
  ) identity ON TRUE
  WHERE fixer."status" = 'APPROVED'
    AND fixer."verified" = TRUE
)
UPDATE "fixers" fixer
SET
  "qualificationEligibilityStatus" = 'REVERIFICATION_REQUIRED',
  "kycValidUntil" = CASE
    WHEN provider."submissionStatus" = 'APPROVED'
    THEN provider."identityExpiryDate"
    ELSE NULL
  END,
  "kycReverificationRequiredAt" = COALESCE(
    fixer."kycReverificationRequiredAt",
    CURRENT_TIMESTAMP
  ),
  "kycReverificationReasons" = CASE
    WHEN COALESCE(fixer."kycReverificationReasons", '[]'::jsonb)
      @> jsonb_build_array(provider.reason)
    THEN COALESCE(fixer."kycReverificationReasons", '[]'::jsonb)
    ELSE COALESCE(fixer."kycReverificationReasons", '[]'::jsonb)
      || jsonb_build_array(provider.reason)
  END,
  "kycExpiryWarningSentAt" = NULL
FROM provider_kyc provider
WHERE provider."fixerId" = fixer."id"
  AND (
    provider."submissionStatus" IS DISTINCT FROM 'APPROVED'
    OR provider."identityExpiryDate" IS NULL
    OR provider."identityExpiryDate" <= CURRENT_TIMESTAMP
  );
