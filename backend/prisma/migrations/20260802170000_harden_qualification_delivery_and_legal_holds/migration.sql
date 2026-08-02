ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'IN_APP';

ALTER TABLE "kyc_documents"
  ADD COLUMN "legalHoldUntil" TIMESTAMP(3);

ALTER TABLE "notifications"
  ADD COLUMN "dedupeKey" TEXT,
  ADD COLUMN "claimedAt" TIMESTAMP(3),
  ADD COLUMN "claimedBy" TEXT,
  ADD COLUMN "claimExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "notifications_dedupeKey_key"
  ON "notifications"("dedupeKey");

CREATE INDEX "notifications_claimExpiresAt_idx"
  ON "notifications"("status", "type", "claimExpiresAt");
