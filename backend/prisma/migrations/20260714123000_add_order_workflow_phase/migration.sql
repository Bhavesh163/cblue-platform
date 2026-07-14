ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "workflowPhase" TEXT;

UPDATE "orders" AS o
SET "workflowPhase" = CASE
  WHEN o."status" = 'CANCELLED' THEN 'TERMINAL'
  WHEN o."status" = 'MATCHING' THEN 'PARTNER_DECISION'
  WHEN o."status" IN ('ASSIGNED', 'DEPOSIT_PENDING', 'CONFIRMED') THEN 'FEE'
  WHEN o."status" = 'MEETING_REQUESTED' THEN 'MEETING_CONFIRM'
  WHEN o."status" = 'IN_PROGRESS' AND EXISTS (
    SELECT 1 FROM "order_status_history" AS h
    WHERE h."orderId" = o."id" AND h."status" = 'MEETING_REQUESTED'
  ) THEN 'VARIATION'
  WHEN o."status" = 'IN_PROGRESS' THEN 'CHAT'
  WHEN o."status" = 'COMPLETED' AND EXISTS (
    SELECT 1 FROM "reviews" AS r WHERE r."orderId" = o."id"
  ) THEN 'TERMINAL'
  WHEN o."status" = 'COMPLETED' THEN 'RATING'
  ELSE NULL
END
WHERE o."workflowPhase" IS NULL;
