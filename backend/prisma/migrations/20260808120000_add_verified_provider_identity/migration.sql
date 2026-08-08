ALTER TABLE "fixers"
ADD COLUMN "publicDisplayName" TEXT,
ADD COLUMN "verifiedCompanyName" TEXT,
ADD COLUMN "companyIdentityVerifiedAt" TIMESTAMP(3),
ADD COLUMN "companyIdentityVerifiedBy" TEXT;
