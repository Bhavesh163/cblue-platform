ALTER TABLE "kyc_documents"
ADD COLUMN "identityNumberLast4" TEXT,
ADD COLUMN "identityNumberHash" TEXT,
ADD COLUMN "identityExpiryDate" TIMESTAMP(3);

CREATE INDEX "kyc_documents_identityNumberHash_idx"
ON "kyc_documents"("identityNumberHash");
