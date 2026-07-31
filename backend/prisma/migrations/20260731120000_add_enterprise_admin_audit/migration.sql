ALTER TABLE "kyc_documents"
ADD CONSTRAINT "kyc_documents_documentType_allowed"
CHECK ("documentType" IN ('id-front', 'id-back', 'selfie-with-id', 'education-certificate', 'professional-certificate', 'corporate-certificate', 'project-completion-certificate', 'international-award', 'portfolio')) NOT VALID;

CREATE TABLE "qualification_document_accesses" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "caseReference" TEXT,
    "legalHoldUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "qualification_document_accesses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "unmatched_service_demand_occurrences" (
    "id" TEXT NOT NULL,
    "demandId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "bookingType" TEXT,
    "requestText" TEXT,
    "district" TEXT,
    "province" TEXT,
    "postalCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "unmatched_service_demand_occurrences_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "qualification_document_accesses" ADD CONSTRAINT "qualification_document_accesses_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "kyc_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "qualification_document_accesses" ADD CONSTRAINT "qualification_document_accesses_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "kyc_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "unmatched_service_demand_occurrences" ADD CONSTRAINT "unmatched_service_demand_occurrences_demandId_fkey" FOREIGN KEY ("demandId") REFERENCES "unmatched_service_demands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "qualification_document_accesses_submissionId_createdAt_idx" ON "qualification_document_accesses"("submissionId", "createdAt");
CREATE INDEX "qualification_document_accesses_documentId_createdAt_idx" ON "qualification_document_accesses"("documentId", "createdAt");
CREATE INDEX "unmatched_service_demand_occurrences_fingerprint_occurredAt_idx" ON "unmatched_service_demand_occurrences"("fingerprint", "occurredAt");
CREATE INDEX "unmatched_service_demand_occurrences_province_district_occurredAt_idx" ON "unmatched_service_demand_occurrences"("province", "district", "occurredAt");