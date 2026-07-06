-- Backfill the authoritative Original Budget for legacy CBLUE PO-2606-4636.
-- This does not parse project details, modal text, or PO digits. It stores the
-- budget rows confirmed from the CBLUE modal into the backend source of truth
-- used by the BLUE bridge endpoint: orders."budgetBreakdown".
UPDATE "orders"
SET "budgetBreakdown" = jsonb_build_array(
  jsonb_build_object(
    'service', 'Fit-out',
    'qty', 20,
    'unit', 'sq.m.',
    'unitRate', 30000,
    'total', 600000
  ),
  jsonb_build_object(
    'service', 'Reinstatement',
    'qty', 10,
    'unit', 'sq.m.',
    'unitRate', 10000,
    'total', 100000
  ),
  jsonb_build_object(
    'service', 'Construction',
    'qty', 10,
    'unit', 'sq.m.',
    'unitRate', 20000,
    'total', 200000
  ),
  jsonb_build_object(
    'service', 'Website development',
    'qty', 2000,
    'unit', 'page',
    'unitRate', 1000,
    'total', 2000000
  ),
  jsonb_build_object(
    'service', 'chatbot',
    'qty', 100,
    'unit', 'FAQ',
    'unitRate', 100,
    'total', 10000
  )
)
WHERE "description" ILIKE '%PO-2606-4636%'
  AND (
    "budgetBreakdown" IS NULL
    OR "budgetBreakdown" = 'null'::jsonb
    OR "budgetBreakdown" = '[]'::jsonb
  );
