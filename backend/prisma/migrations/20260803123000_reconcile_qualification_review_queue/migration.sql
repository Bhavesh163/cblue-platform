-- Retire unresolved review tasks belonging to superseded partner submissions.
WITH "latest_submissions" AS (
  SELECT
    "id",
    "fixerId",
    ROW_NUMBER() OVER (
      PARTITION BY "fixerId"
      ORDER BY "version" DESC, "createdAt" DESC, "id" DESC
    ) AS "position"
  FROM "kyc_submissions"
)
UPDATE "qualification_review_tasks" AS "task"
SET
  "status" = 'DECIDED',
  "decision" = 'SUPERSEDED_BY_NEWER_SUBMISSION',
  "decidedAt" = COALESCE("task"."decidedAt", NOW()),
  "updatedAt" = NOW()
FROM "latest_submissions" AS "submission"
WHERE
  "task"."submissionId" = "submission"."id"
  AND "submission"."position" > 1
  AND "task"."status" <> 'DECIDED';

-- Retire unresolved identity reviews that already reached a terminal KYC state.
UPDATE "qualification_review_tasks" AS "task"
SET
  "status" = 'DECIDED',
  "decision" = COALESCE("task"."decision", 'KYC_ALREADY_FINALIZED'),
  "decidedAt" = COALESCE("task"."decidedAt", NOW()),
  "updatedAt" = NOW()
FROM "kyc_submissions" AS "submission"
WHERE
  "task"."submissionId" = "submission"."id"
  AND "task"."kind" = 'KYC'
  AND "task"."status" <> 'DECIDED'
  AND "submission"."status" IN (
    'APPROVED',
    'REJECTED',
    'NEEDS_RESUBMISSION',
    'EXPIRED'
  );

-- Approved latest submissions created before tier review became mandatory need
-- one authoritative tier task. The deterministic UUID makes this idempotent.
WITH "ranked_submissions" AS (
  SELECT
    "submission"."id",
    "submission"."policyVersion",
    "submission"."status",
    ROW_NUMBER() OVER (
      PARTITION BY "submission"."fixerId"
      ORDER BY "submission"."version" DESC, "submission"."createdAt" DESC, "submission"."id" DESC
    ) AS "position"
  FROM "kyc_submissions" AS "submission"
),
"latest_approved" AS (
  SELECT "id", "policyVersion"
  FROM "ranked_submissions"
  WHERE "position" = 1 AND "status" = 'APPROVED'
),
"inserted_tasks" AS (
  INSERT INTO "qualification_review_tasks" (
    "id",
    "submissionId",
    "status",
    "kind",
    "priority",
    "reasonCodes",
    "createdAt",
    "updatedAt"
  )
  SELECT
    SUBSTRING(MD5("submission"."id" || ':tier-review-v1') FROM 1 FOR 8) || '-' ||
      SUBSTRING(MD5("submission"."id" || ':tier-review-v1') FROM 9 FOR 4) || '-' ||
      SUBSTRING(MD5("submission"."id" || ':tier-review-v1') FROM 13 FOR 4) || '-' ||
      SUBSTRING(MD5("submission"."id" || ':tier-review-v1') FROM 17 FOR 4) || '-' ||
      SUBSTRING(MD5("submission"."id" || ':tier-review-v1') FROM 21 FOR 12),
    "submission"."id",
    'OPEN',
    'TIER',
    10,
    JSONB_BUILD_OBJECT(
      'policyVersion', "submission"."policyVersion",
      'reasonCodes', JSONB_BUILD_ARRAY('TIER_REVIEW_REQUIRED'),
      'backfilled', TRUE
    ),
    NOW(),
    NOW()
  FROM "latest_approved" AS "submission"
  WHERE NOT EXISTS (
      SELECT 1
      FROM "qualification_review_tasks" AS "existing"
      WHERE
        "existing"."submissionId" = "submission"."id"
        AND "existing"."kind" = 'TIER'
    )
  ON CONFLICT ("id") DO NOTHING
  RETURNING "id", "submissionId"
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
  SUBSTRING(MD5("task"."id" || ':audit') FROM 1 FOR 8) || '-' ||
    SUBSTRING(MD5("task"."id" || ':audit') FROM 9 FOR 4) || '-' ||
    SUBSTRING(MD5("task"."id" || ':audit') FROM 13 FOR 4) || '-' ||
    SUBSTRING(MD5("task"."id" || ':audit') FROM 17 FOR 4) || '-' ||
    SUBSTRING(MD5("task"."id" || ':audit') FROM 21 FOR 12),
  "task"."submissionId",
  'TIER_REVIEW_BACKFILLED',
  'QualificationReviewTask',
  "task"."id",
  'Tier review created for an approved latest submission',
  JSONB_BUILD_OBJECT('source', 'migration'),
  NOW()
FROM "inserted_tasks" AS "task"
ON CONFLICT ("id") DO NOTHING;
