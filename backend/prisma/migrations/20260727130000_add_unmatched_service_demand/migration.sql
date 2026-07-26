CREATE TYPE "DemandGapStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED');

CREATE TABLE "unmatched_service_demands" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "bookingType" TEXT,
    "requestText" TEXT,
    "requestedServices" JSONB,
    "district" TEXT,
    "province" TEXT,
    "postalCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "status" "DemandGapStatus" NOT NULL DEFAULT 'OPEN',
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedAdminId" TEXT,
    "resolutionNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unmatched_service_demands_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "unmatched_service_demands_fingerprint_key" ON "unmatched_service_demands"("fingerprint");
CREATE INDEX "unmatched_service_demands_status_lastSeenAt_idx" ON "unmatched_service_demands"("status", "lastSeenAt");
CREATE INDEX "unmatched_service_demands_province_district_idx" ON "unmatched_service_demands"("province", "district");
CREATE INDEX "unmatched_service_demands_expiresAt_idx" ON "unmatched_service_demands"("expiresAt");
