-- Existing fixer PO references are stored in the order description.
-- A trigram index keeps authoritative bridge lookups responsive without
-- reconstructing workflow state from descriptions.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "orders_description_trgm_idx"
ON "orders" USING GIN ("description" gin_trgm_ops);
