CREATE TYPE "QualificationStorageCleanupStatus" AS ENUM ('PENDING', 'COMPLETED');

CREATE TABLE "qualification_storage_cleanup_intents" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "status" "QualificationStorageCleanupStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "nextAttemptAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "claimedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qualification_storage_cleanup_intents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "qualification_storage_cleanup_intents_storageKey_key"
ON "qualification_storage_cleanup_intents"("storageKey");

CREATE INDEX "qualification_storage_cleanup_intents_status_nextAttemptAt_claimedAt_idx"
ON "qualification_storage_cleanup_intents"("status", "nextAttemptAt", "claimedAt");
