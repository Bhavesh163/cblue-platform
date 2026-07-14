ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'MEETING_REQUESTED';

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "workflowRevision" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "fixer_workflow_actions" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "idempotencyKey" TEXT,
  "workflowRevision" INTEGER NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fixer_workflow_actions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fixer_workflow_actions_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "orders"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "fixer_workflow_actions_orderId_idempotencyKey_key"
  ON "fixer_workflow_actions"("orderId", "idempotencyKey");

CREATE INDEX IF NOT EXISTS "fixer_workflow_actions_orderId_createdAt_idx"
  ON "fixer_workflow_actions"("orderId", "createdAt");
