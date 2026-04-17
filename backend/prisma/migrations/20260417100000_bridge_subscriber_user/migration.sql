-- AlterTable: Make phone nullable and add subscriberId to users
ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscriberId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_subscriberId_key" ON "users"("subscriberId");
