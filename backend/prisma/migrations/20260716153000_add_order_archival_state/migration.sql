-- Persist server-owned visibility for legacy workflows that CBLUE intentionally hides.
ALTER TABLE "orders"
ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "orders_archivedAt_idx"
ON "orders"("archivedAt");

-- One-time repair of the explicitly retired legacy test workflows. Runtime
-- lifecycle resolution uses archivedAt and never parses a PO number.
UPDATE "orders"
SET
  "archivedAt" = COALESCE("archivedAt", "updatedAt", "createdAt", CURRENT_TIMESTAMP),
  "workflowPhase" = 'TERMINAL',
  "chatEnabled" = false,
  "workflowRevision" = COALESCE("workflowRevision", 0) + 1
WHERE "archivedAt" IS NULL
  AND "description" ~* '^[[:space:]]*PO-2605-(2747|6716|9605|8699|9701|9593|6146)[[:space:]]*([|]|$)'
  AND EXISTS (
    SELECT 1
    FROM "fixers"
    INNER JOIN "users" ON "users"."id" = "fixers"."userId"
    WHERE "fixers"."id" = "orders"."fixerId"
      AND LOWER("users"."email") = 'suppadesh@yahoo.com'
  );
