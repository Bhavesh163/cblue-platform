CREATE TYPE "QualificationHandoffStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

CREATE TABLE "qualification_handoffs" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "kind" "QualificationReviewKind" NOT NULL DEFAULT 'TIER',
    "status" "QualificationHandoffStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "claimedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "qualification_handoffs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "qualification_handoffs_submissionId_kind_key" ON "qualification_handoffs"("submissionId", "kind");
CREATE INDEX "qualification_handoffs_status_createdAt_idx" ON "qualification_handoffs"("status", "createdAt");
ALTER TABLE "qualification_handoffs" ADD CONSTRAINT "qualification_handoffs_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "kyc_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;