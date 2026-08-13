WITH approved_company AS (
  SELECT DISTINCT ON (submission."fixerId")
    submission."id" AS "submissionId",
    submission."fixerId",
    fixer."userId",
    COALESCE(
      NULLIF(BTRIM(affidavit."extractedFields" -> 'fields' ->> 'companyName'), ''),
      NULLIF(BTRIM(affidavit."extractedFields" ->> 'companyName'), '')
    ) AS "companyName"
  FROM "kyc_submissions" AS submission
  JOIN "fixers" AS fixer ON fixer."id" = submission."fixerId"
  JOIN "kyc_documents" AS affidavit
    ON affidavit."submissionId" = submission."id"
    AND affidavit."documentType" = 'company-affidavit'
    AND affidavit."evidenceStatus" = 'VALIDATED'
    AND affidavit."isActive" = TRUE
    AND affidavit."lifecycleState" = 'READY'
    AND affidavit."assessmentReasonCodes" @> '["ADMIN_COMPANY_NAME_CONFIRMED", "ADMIN_COMPANY_AUTHORITY_CONFIRMED"]'::jsonb
  WHERE submission."status" = 'APPROVED'
    AND EXISTS (
      SELECT 1
      FROM "kyc_documents" AS authorization
      WHERE authorization."submissionId" = submission."id"
        AND authorization."documentType" = 'company-letter-of-intent'
        AND authorization."evidenceStatus" = 'VALIDATED'
        AND authorization."isActive" = TRUE
        AND authorization."lifecycleState" = 'READY'
        AND authorization."assessmentReasonCodes" @> '["ADMIN_COMPANY_NAME_CONFIRMED", "ADMIN_COMPANY_AUTHORITY_CONFIRMED", "ADMIN_COMPANY_INTENT_CONFIRMED", "ADMIN_COMPANY_APPLICANT_IDENTITY_CONFIRMED"]'::jsonb
    )
  ORDER BY submission."fixerId", submission."version" DESC
)
INSERT INTO "qualification_audit_logs" (
  "id",
  "submissionId",
  "action",
  "entityType",
  "entityId",
  "reason",
  "metadata",
  "createdAt"
)
SELECT
  'company-provider-name-backfill-' || approved_company."fixerId",
  approved_company."submissionId",
  'COMPANY_PROVIDER_NAME_BACKFILLED',
  'Fixer',
  approved_company."fixerId",
  'Restored the validated company identity as the authoritative public provider name.',
  jsonb_build_object('verifiedCompanyName', approved_company."companyName"),
  CURRENT_TIMESTAMP
FROM approved_company
JOIN "fixers" AS fixer ON fixer."id" = approved_company."fixerId"
WHERE approved_company."companyName" IS NOT NULL
  AND (
    fixer."publicDisplayName" IS DISTINCT FROM approved_company."companyName"
    OR fixer."verifiedCompanyName" IS DISTINCT FROM approved_company."companyName"
  )
ON CONFLICT ("id") DO NOTHING;

WITH approved_company AS (
  SELECT DISTINCT ON (submission."fixerId")
    submission."fixerId",
    COALESCE(
      NULLIF(BTRIM(affidavit."extractedFields" -> 'fields' ->> 'companyName'), ''),
      NULLIF(BTRIM(affidavit."extractedFields" ->> 'companyName'), '')
    ) AS "companyName"
  FROM "kyc_submissions" AS submission
  JOIN "kyc_documents" AS affidavit
    ON affidavit."submissionId" = submission."id"
    AND affidavit."documentType" = 'company-affidavit'
    AND affidavit."evidenceStatus" = 'VALIDATED'
    AND affidavit."isActive" = TRUE
    AND affidavit."lifecycleState" = 'READY'
    AND affidavit."assessmentReasonCodes" @> '["ADMIN_COMPANY_NAME_CONFIRMED", "ADMIN_COMPANY_AUTHORITY_CONFIRMED"]'::jsonb
  WHERE submission."status" = 'APPROVED'
    AND EXISTS (
      SELECT 1
      FROM "kyc_documents" AS authorization
      WHERE authorization."submissionId" = submission."id"
        AND authorization."documentType" = 'company-letter-of-intent'
        AND authorization."evidenceStatus" = 'VALIDATED'
        AND authorization."isActive" = TRUE
        AND authorization."lifecycleState" = 'READY'
        AND authorization."assessmentReasonCodes" @> '["ADMIN_COMPANY_NAME_CONFIRMED", "ADMIN_COMPANY_AUTHORITY_CONFIRMED", "ADMIN_COMPANY_INTENT_CONFIRMED", "ADMIN_COMPANY_APPLICANT_IDENTITY_CONFIRMED"]'::jsonb
    )
  ORDER BY submission."fixerId", submission."version" DESC
)
UPDATE "fixers" AS fixer
SET
  "publicDisplayName" = approved_company."companyName",
  "verifiedCompanyName" = approved_company."companyName",
  "updatedAt" = CURRENT_TIMESTAMP
FROM approved_company
WHERE fixer."id" = approved_company."fixerId"
  AND approved_company."companyName" IS NOT NULL;

UPDATE "users" AS account
SET
  "company" = fixer."verifiedCompanyName",
  "updatedAt" = CURRENT_TIMESTAMP
FROM "fixers" AS fixer
WHERE account."id" = fixer."userId"
  AND fixer."verifiedCompanyName" IS NOT NULL
  AND BTRIM(fixer."verifiedCompanyName") <> '';

UPDATE "properties" AS property
SET
  "contactName" = fixer."verifiedCompanyName",
  "updatedAt" = CURRENT_TIMESTAMP
FROM "fixers" AS fixer
WHERE property."userId" = fixer."userId"
  AND fixer."verifiedCompanyName" IS NOT NULL
  AND BTRIM(fixer."verifiedCompanyName") <> '';
