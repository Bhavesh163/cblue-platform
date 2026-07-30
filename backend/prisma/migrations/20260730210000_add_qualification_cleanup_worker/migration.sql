ALTER TABLE "kyc_documents"
  ADD COLUMN "cleanupNextAttemptAt" TIMESTAMP(3),
  ADD COLUMN "cleanupClaimedAt" TIMESTAMP(3),
  ADD COLUMN "cleanupClaimedBy" TEXT;

UPDATE "kyc_documents"
SET "cleanupNextAttemptAt" = COALESCE("cleanupNextAttemptAt", NOW())
WHERE "lifecycleState" = 'DELETE_PENDING';

CREATE INDEX "kyc_documents_cleanup_due_idx"
ON "kyc_documents" (
  "lifecycleState", "cleanupNextAttemptAt", "cleanupClaimedAt"
);
