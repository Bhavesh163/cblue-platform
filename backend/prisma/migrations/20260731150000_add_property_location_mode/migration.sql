CREATE TYPE "PropertyLocationMode" AS ENUM ('GPS', 'ADMINISTRATIVE');

ALTER TABLE "properties"
ADD COLUMN "locationMode" "PropertyLocationMode" NOT NULL DEFAULT 'ADMINISTRATIVE';

UPDATE "properties"
SET "locationMode" = 'GPS'
WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL
  AND NOT (ABS("latitude") < 0.000001 AND ABS("longitude") < 0.000001);
