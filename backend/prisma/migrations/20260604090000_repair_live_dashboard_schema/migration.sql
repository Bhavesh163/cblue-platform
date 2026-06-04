-- Idempotent live-schema repair for dashboard/profile/property endpoints.
-- These guards cover deployments where earlier migrations were marked applied
-- before newer dashboard fields/enums existed.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "company" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscriberId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PropertyTier') THEN
    CREATE TYPE "PropertyTier" AS ENUM (
      'ECONOMY',
      'STANDARD',
      'CORPORATE',
      'SPECIALIST',
      'EXPERT'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PropertyType') THEN
    CREATE TYPE "PropertyType" AS ENUM (
      'CONDO',
      'HOUSE',
      'TOWNHOUSE',
      'LAND',
      'COMMERCIAL',
      'APARTMENT',
      'SHOPHOUSE',
      'OFFICE',
      'WAREHOUSE'
    );
  END IF;
END $$;

ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'SHOPHOUSE';
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'OFFICE';
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'WAREHOUSE';

ALTER TABLE "properties"
  ADD COLUMN IF NOT EXISTS "tier" "PropertyTier" NOT NULL DEFAULT 'STANDARD';
