ALTER TABLE "property_inquiries" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "property_inquiries_customerId_idempotencyKey_key"
  ON "property_inquiries"("customerId", "idempotencyKey");
