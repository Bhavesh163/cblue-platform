-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('CONDO', 'HOUSE', 'TOWNHOUSE', 'LAND', 'COMMERCIAL', 'APARTMENT');

-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('SALE', 'RENT');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SOLD', 'RENTED', 'EXPIRED', 'REMOVED');

-- AlterEnum: Add SPECIALIST to FixerTier, remove GURU
ALTER TYPE "FixerTier" ADD VALUE IF NOT EXISTS 'SPECIALIST';

-- AlterTable: Add new columns to fixers
ALTER TABLE "fixers" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "fixers" ADD COLUMN IF NOT EXISTS "pastExperience" TEXT;
ALTER TABLE "fixers" ADD COLUMN IF NOT EXISTS "pastProjectType" TEXT;
ALTER TABLE "fixers" ADD COLUMN IF NOT EXISTS "priceList" JSONB;
ALTER TABLE "fixers" ADD COLUMN IF NOT EXISTS "serviceProvince" TEXT;
ALTER TABLE "fixers" ADD COLUMN IF NOT EXISTS "serviceDistrict" TEXT;
ALTER TABLE "fixers" ADD COLUMN IF NOT EXISTS "servicePostalCode" TEXT;
ALTER TABLE "fixers" ADD COLUMN IF NOT EXISTS "gpsLat" DOUBLE PRECISION;
ALTER TABLE "fixers" ADD COLUMN IF NOT EXISTS "gpsLng" DOUBLE PRECISION;

-- CreateTable: subscribers
CREATE TABLE "subscribers" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: properties
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyType" "PropertyType" NOT NULL,
    "listingType" "ListingType" NOT NULL,
    "status" "PropertyStatus" NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "area" DOUBLE PRECISION,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "floors" INTEGER,
    "province" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "subdistrict" TEXT,
    "postalCode" TEXT,
    "addressLine" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT,
    "features" JSONB,
    "yearBuilt" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable: property_images
CREATE TABLE "property_images" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscribers_email_key" ON "subscribers"("email");
CREATE UNIQUE INDEX "subscribers_resetToken_key" ON "subscribers"("resetToken");
CREATE INDEX "subscribers_email_idx" ON "subscribers"("email");
CREATE INDEX "subscribers_status_idx" ON "subscribers"("status");

-- CreateIndex
CREATE INDEX "properties_userId_idx" ON "properties"("userId");
CREATE INDEX "properties_propertyType_idx" ON "properties"("propertyType");
CREATE INDEX "properties_listingType_idx" ON "properties"("listingType");
CREATE INDEX "properties_status_idx" ON "properties"("status");
CREATE INDEX "properties_province_district_idx" ON "properties"("province", "district");
CREATE INDEX "properties_price_idx" ON "properties"("price");

-- CreateIndex
CREATE INDEX "property_images_propertyId_idx" ON "property_images"("propertyId");

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_images" ADD CONSTRAINT "property_images_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
