-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "PropertyTier" AS ENUM ('ECONOMY', 'STANDARD', 'UPPER', 'LUXURY', 'GRANDEUR');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable: add tier column to properties
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "tier" "PropertyTier" NOT NULL DEFAULT 'STANDARD';
