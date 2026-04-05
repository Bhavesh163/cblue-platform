-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('HOUSEHOLD', 'PROJECT');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "orderType" "OrderType" NOT NULL DEFAULT 'HOUSEHOLD';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "company" TEXT;
