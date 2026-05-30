-- Idempotent repair for production schema drift that can break dashboard APIs.
-- Some live databases may have old migration rows recorded while missing newer
-- runtime columns/tables used by orders/my, properties/my, and order chat.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionStatus') THEN
    CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PropertyType') THEN
    CREATE TYPE "PropertyType" AS ENUM ('CONDO', 'HOUSE', 'TOWNHOUSE', 'LAND', 'COMMERCIAL', 'APARTMENT');
  END IF;
END $$;

ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'OFFICE';
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'WAREHOUSE';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ListingType') THEN
    CREATE TYPE "ListingType" AS ENUM ('SALE', 'RENT');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PropertyStatus') THEN
    CREATE TYPE "PropertyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SOLD', 'RENTED', 'EXPIRED', 'REMOVED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PropertyTier') THEN
    CREATE TYPE "PropertyTier" AS ENUM ('ECONOMY', 'STANDARD', 'UPPER', 'LUXURY', 'GRANDEUR');
  END IF;
END $$;

ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscriberId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "users_subscriberId_key" ON "users"("subscriberId");

CREATE TABLE IF NOT EXISTS "subscribers" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "company" TEXT,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
  "serviceCategory" TEXT,
  "description" TEXT,
  "resetToken" TEXT,
  "resetTokenExpiry" TIMESTAMP(3),
  "pdpaConsentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscribers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscribers_email_key" ON "subscribers"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "subscribers_resetToken_key" ON "subscribers"("resetToken");
CREATE INDEX IF NOT EXISTS "subscribers_email_idx" ON "subscribers"("email");
CREATE INDEX IF NOT EXISTS "subscribers_status_idx" ON "subscribers"("status");

ALTER TABLE "fixers" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "fixers" ADD COLUMN IF NOT EXISTS "pastExperience" TEXT;
ALTER TABLE "fixers" ADD COLUMN IF NOT EXISTS "pastProjectType" TEXT;
ALTER TABLE "fixers" ADD COLUMN IF NOT EXISTS "availableStartDate" TEXT;
ALTER TABLE "fixers" ADD COLUMN IF NOT EXISTS "companyAddress" JSONB;
ALTER TABLE "fixers" ADD COLUMN IF NOT EXISTS "priceList" JSONB;
ALTER TABLE "fixers" ADD COLUMN IF NOT EXISTS "serviceProvince" TEXT;
ALTER TABLE "fixers" ADD COLUMN IF NOT EXISTS "serviceDistrict" TEXT;
ALTER TABLE "fixers" ADD COLUMN IF NOT EXISTS "servicePostalCode" TEXT;
ALTER TABLE "fixers" ADD COLUMN IF NOT EXISTS "gpsLat" DOUBLE PRECISION;
ALTER TABLE "fixers" ADD COLUMN IF NOT EXISTS "gpsLng" DOUBLE PRECISION;
ALTER TABLE "fixers" ADD COLUMN IF NOT EXISTS "aiScore" INTEGER;
ALTER TABLE "fixers" ADD COLUMN IF NOT EXISTS "aiTier" TEXT;
ALTER TABLE "fixers" ADD COLUMN IF NOT EXISTS "aiBreakdown" JSONB;
ALTER TABLE "fixers" ADD COLUMN IF NOT EXISTS "aiFlags" JSONB;
ALTER TABLE "fixers" ADD COLUMN IF NOT EXISTS "aiCredentialStatus" TEXT;

ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "tier" "PropertyTier" NOT NULL DEFAULT 'STANDARD';

CREATE TABLE IF NOT EXISTS "property_images" (
  "id" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "property_images_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "property_images_propertyId_idx" ON "property_images"("propertyId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'property_images_propertyId_fkey'
  ) THEN
    ALTER TABLE "property_images"
      ADD CONSTRAINT "property_images_propertyId_fkey"
      FOREIGN KEY ("propertyId") REFERENCES "properties"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "order_chat_messages" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "senderUserId" TEXT NOT NULL,
  "senderRole" "UserRole",
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "order_chat_messages_orderId_idx" ON "order_chat_messages"("orderId");
CREATE INDEX IF NOT EXISTS "order_chat_messages_senderUserId_idx" ON "order_chat_messages"("senderUserId");
CREATE INDEX IF NOT EXISTS "order_chat_messages_createdAt_idx" ON "order_chat_messages"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_chat_messages_orderId_fkey'
  ) THEN
    ALTER TABLE "order_chat_messages"
      ADD CONSTRAINT "order_chat_messages_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "orders"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_chat_messages_senderUserId_fkey'
  ) THEN
    ALTER TABLE "order_chat_messages"
      ADD CONSTRAINT "order_chat_messages_senderUserId_fkey"
      FOREIGN KEY ("senderUserId") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
