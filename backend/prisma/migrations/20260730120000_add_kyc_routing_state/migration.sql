CREATE TYPE "QualificationReviewKind" AS ENUM ('KYC', 'TIER');

ALTER TYPE "QualificationSubmissionStatus" ADD VALUE IF NOT EXISTS 'ASSESSING';
ALTER TYPE "QualificationSubmissionStatus" ADD VALUE IF NOT EXISTS 'NEEDS_RESUBMISSION';
ALTER TYPE "QualificationSubmissionStatus" ADD VALUE IF NOT EXISTS 'AI_PRECLEARED';

ALTER TABLE "kyc_documents"
  ADD COLUMN "isActive" BOOLEAN,
  ADD COLUMN "supersededAt" TIMESTAMP(3),
  ADD COLUMN "supersededById" TEXT,
  ADD COLUMN "assessmentReasonCodes" JSONB,
  ADD COLUMN "assessedAt" TIMESTAMP(3);

UPDATE "kyc_documents"
SET "isActive" = true
WHERE "isActive" IS NULL;

ALTER TABLE "kyc_documents"
  ALTER COLUMN "isActive" SET DEFAULT true,
  ALTER COLUMN "isActive" SET NOT NULL;

ALTER TABLE "qualification_evaluations"
  ADD COLUMN "identityConfidence" INTEGER,
  ADD COLUMN "documentAuthenticityConfidence" INTEGER,
  ADD COLUMN "faceMatchConfidence" INTEGER,
  ADD COLUMN "livenessConfidence" INTEGER,
  ADD COLUMN "credentialConfidence" INTEGER,
  ADD COLUMN "tierEligibilityScore" INTEGER,
  ADD COLUMN "humanReviewRequired" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "qualification_review_tasks"
  ADD COLUMN "kind" "QualificationReviewKind" NOT NULL DEFAULT 'KYC';

UPDATE "qualification_review_tasks"
SET "kind" = 'KYC'
WHERE "status" IN ('OPEN', 'ASSIGNED');

CREATE INDEX "kyc_submissions_status_submittedAt_idx"
  ON "kyc_submissions"("status", "submittedAt");
CREATE INDEX "kyc_documents_submissionId_isActive_documentType_idx"
  ON "kyc_documents"("submissionId", "isActive", "documentType");
CREATE INDEX "qualification_review_tasks_kind_status_priority_createdAt_idx"
  ON "qualification_review_tasks"("kind", "status", "priority", "createdAt");
