ALTER TABLE "fixers"
  ADD COLUMN "suspendedAt" TIMESTAMP(3),
  ADD COLUMN "suspendedById" TEXT,
  ADD COLUMN "suspensionReason" TEXT;

CREATE INDEX "fixers_status_suspendedAt_idx"
ON "fixers"("status", "suspendedAt");
