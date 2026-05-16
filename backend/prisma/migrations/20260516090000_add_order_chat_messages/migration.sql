-- CreateTable
CREATE TABLE IF NOT EXISTS "order_chat_messages" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "senderRole" "UserRole",
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "order_chat_messages_orderId_idx" ON "order_chat_messages"("orderId");
CREATE INDEX IF NOT EXISTS "order_chat_messages_senderUserId_idx" ON "order_chat_messages"("senderUserId");
CREATE INDEX IF NOT EXISTS "order_chat_messages_createdAt_idx" ON "order_chat_messages"("createdAt");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'order_chat_messages_orderId_fkey'
  ) THEN
    ALTER TABLE "order_chat_messages"
      ADD CONSTRAINT "order_chat_messages_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "orders"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'order_chat_messages_senderUserId_fkey'
  ) THEN
    ALTER TABLE "order_chat_messages"
      ADD CONSTRAINT "order_chat_messages_senderUserId_fkey"
      FOREIGN KEY ("senderUserId") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
