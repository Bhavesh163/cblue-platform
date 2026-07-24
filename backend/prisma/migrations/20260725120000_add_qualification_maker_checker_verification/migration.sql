ALTER TABLE "kyc_documents"
  ADD COLUMN "extractionProvider" TEXT,
  ADD COLUMN "extractionModel" TEXT,
  ADD COLUMN "extractedAt" TIMESTAMP(3),
  ADD COLUMN "extractionErrorCode" TEXT,
  ADD COLUMN "credentialVerification" JSONB,
  ADD COLUMN "credentialVerifiedAt" TIMESTAMP(3);

ALTER TABLE "qualification_review_tasks"
  ADD COLUMN "proposedDecision" TEXT,
  ADD COLUMN "proposedTier" "FixerTier",
  ADD COLUMN "proposedReason" TEXT,
  ADD COLUMN "proposedBy" TEXT,
  ADD COLUMN "proposedAt" TIMESTAMP(3),
  ADD COLUMN "checkedBy" TEXT,
  ADD COLUMN "checkedAt" TIMESTAMP(3),
  ADD COLUMN "checkReason" TEXT;

CREATE INDEX "qualification_review_tasks_proposedAt_status_idx"
  ON "qualification_review_tasks"("proposedAt", "status");
