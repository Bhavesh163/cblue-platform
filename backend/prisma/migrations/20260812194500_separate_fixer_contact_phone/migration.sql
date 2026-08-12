ALTER TABLE "fixers" ADD COLUMN "contactPhone" TEXT;

UPDATE "fixers" AS fixer
SET "contactPhone" = COALESCE(NULLIF(BTRIM("users"."phone"), ''), NULLIF(BTRIM("subscribers"."phone"), ''))
FROM "users"
LEFT JOIN "subscribers" ON "subscribers"."id" = "users"."subscriberId"
WHERE fixer."userId" = "users"."id";
