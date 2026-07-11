-- Persist the operator-confirmed Step-2 selection shown by the CBLUE Step-5
-- modal for PO-2607-8879. These rows are copied as authoritative data; no
-- project text, price list, estimate, or PO digits are parsed or calculated.
UPDATE "orders"
SET "budgetBreakdown" = jsonb_build_array(
  jsonb_build_object(
    'service', 'Fit-out',
    'qty', 600,
    'unit', 'sq.m.',
    'unitRate', 30000,
    'total', 18000000
  ),
  jsonb_build_object(
    'service', 'Reinstatement',
    'qty', 300,
    'unit', 'sq.m.',
    'unitRate', 10000,
    'total', 3000000
  ),
  jsonb_build_object(
    'service', 'Construction',
    'qty', 700,
    'unit', 'sq.m.',
    'unitRate', 20000,
    'total', 14000000
  ),
  jsonb_build_object(
    'service', 'Website development',
    'qty', 10,
    'unit', 'page',
    'unitRate', 1000,
    'total', 10000
  ),
  jsonb_build_object(
    'service', 'chatbot',
    'qty', 100,
    'unit', 'FAQ',
    'unitRate', 100,
    'total', 10000
  )
)
WHERE "description" ILIKE '%PO-2607-8879%'
  AND (
    "budgetBreakdown" IS NULL
    OR "budgetBreakdown" = 'null'::jsonb
    OR "budgetBreakdown" = '[]'::jsonb
  );

-- The production UI already classifies PO-2605-2121 as a partner-declined
-- historical job. Persist that same lifecycle state for API projections.
WITH declined_orders AS (
  UPDATE "orders"
  SET "status" = 'CANCELLED',
      "updatedAt" = CURRENT_TIMESTAMP
  WHERE "description" ILIKE '%PO-2605-2121%'
  RETURNING "id"
)
INSERT INTO "order_status_history" (
  "id",
  "orderId",
  "status",
  "note",
  "changedBy",
  "createdAt"
)
SELECT
  'blue-contract-decline-2121-' || substr(md5(declined_orders."id"), 1, 12),
  declined_orders."id",
  'CANCELLED',
  'Partner declined this order and cannot proceed.',
  NULL,
  CURRENT_TIMESTAMP
FROM declined_orders
WHERE NOT EXISTS (
  SELECT 1
  FROM "order_status_history" existing
  WHERE existing."orderId" = declined_orders."id"
    AND existing."status" = 'CANCELLED'
    AND existing."note" = 'Partner declined this order and cannot proceed.'
);
