CREATE TYPE "QualificationDocumentLifecycleState" AS ENUM (
  'PENDING_UPLOAD',
  'UPLOADED',
  'ASSESSING',
  'READY',
  'DELETE_PENDING',
  'FAILED'
);

ALTER TABLE "kyc_documents"
  ADD COLUMN "lifecycleState" "QualificationDocumentLifecycleState" NOT NULL DEFAULT 'PENDING_UPLOAD',
  ADD COLUMN "objectUploadedAt" TIMESTAMP(3),
  ADD COLUMN "readyAt" TIMESTAMP(3),
  ADD COLUMN "objectDeletedAt" TIMESTAMP(3),
  ADD COLUMN "cleanupAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "cleanupErrorCode" TEXT;

UPDATE "kyc_documents"
SET
  "lifecycleState" = CASE
    WHEN "assessedAt" IS NOT NULL THEN 'READY'::"QualificationDocumentLifecycleState"
    ELSE 'UPLOADED'::"QualificationDocumentLifecycleState"
  END,
  "objectUploadedAt" = "createdAt",
  "readyAt" = "assessedAt";

CREATE INDEX "kyc_documents_lifecycleState_updatedAt_idx"
ON "kyc_documents" ("lifecycleState", "updatedAt");
WITH "ranked_unresolved_kyc" AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "submissionId"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS "position"
  FROM "qualification_review_tasks"
  WHERE "kind" = 'KYC' AND "status" <> 'DECIDED'
)
UPDATE "qualification_review_tasks" AS "task"
SET
  "status" = 'DECIDED',
  "decidedAt" = COALESCE("task"."decidedAt", NOW()),
  "decision" = COALESCE("task"."decision", 'SUPERSEDED_DUPLICATE'),
  "updatedAt" = NOW()
FROM "ranked_unresolved_kyc" AS "ranked"
WHERE "task"."id" = "ranked"."id" AND "ranked"."position" > 1;

CREATE UNIQUE INDEX "qualification_review_tasks_one_unresolved_kyc"
ON "qualification_review_tasks" ("submissionId")
WHERE "kind" = 'KYC' AND "status" <> 'DECIDED';
