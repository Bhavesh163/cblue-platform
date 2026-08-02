ALTER TABLE "orders"
  ADD COLUMN "serviceHistoryDeleteAt" TIMESTAMP(3),
  ADD COLUMN "legalHoldUntil" TIMESTAMP(3);

CREATE INDEX "orders_serviceHistoryDeleteAt_idx"
  ON "orders"("serviceHistoryDeleteAt");
