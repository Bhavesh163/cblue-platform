ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "workflowPhase" TEXT;

UPDATE "orders" AS o
SET "workflowPhase" = CASE
  WHEN o."status"::text = 'CANCELLED' THEN 'TERMINAL'
  WHEN o."status"::text = 'MATCHING' THEN 'PARTNER_DECISION'
  WHEN o."status"::text IN ('ASSIGNED', 'DEPOSIT_PENDING', 'CONFIRMED') THEN 'FEE'
  WHEN o."status"::text = 'MEETING_REQUESTED' THEN 'MEETING_CONFIRM'
  WHEN o."status"::text = 'IN_PROGRESS' AND EXISTS (
    SELECT 1 FROM "order_status_history" AS h
    WHERE h."orderId" = o."id" AND h."status"::text = 'MEETING_REQUESTED'
  ) THEN 'VARIATION'
  WHEN o."status"::text = 'IN_PROGRESS' THEN 'CHAT'
  WHEN o."status"::text = 'COMPLETED' AND EXISTS (
    SELECT 1 FROM "reviews" AS r WHERE r."orderId" = o."id"
  ) THEN 'TERMINAL'
  WHEN o."status"::text = 'COMPLETED' THEN 'RATING'
  ELSE NULL
END
WHERE o."workflowPhase" IS NULL;
