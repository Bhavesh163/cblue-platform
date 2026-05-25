-- CreateEnum
CREATE TYPE "PropertyInquiryStatus" AS ENUM ('NOTIFY_SENT', 'ACCEPTED', 'DECLINED', 'PAID', 'MEETING_SENT', 'MEETING_CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "property_inquiries" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "listerUserId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "listerName" TEXT NOT NULL,
    "status" "PropertyInquiryStatus" NOT NULL DEFAULT 'NOTIFY_SENT',
    "step" INTEGER NOT NULL DEFAULT 3,
    "meetingDate" TEXT,
    "meetingTime" TEXT,
    "meetingVenue" TEXT,
    "customerRating" INTEGER,
    "customerComment" TEXT,
    "listerRating" INTEGER,
    "listerComment" TEXT,
    "reselectedOnce" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "property_inquiries_poNumber_key" ON "property_inquiries"("poNumber");

-- CreateIndex
CREATE INDEX "property_inquiries_customerId_idx" ON "property_inquiries"("customerId");

-- CreateIndex
CREATE INDEX "property_inquiries_listerUserId_idx" ON "property_inquiries"("listerUserId");

-- CreateIndex
CREATE INDEX "property_inquiries_propertyId_idx" ON "property_inquiries"("propertyId");

-- AddForeignKey
ALTER TABLE "property_inquiries" ADD CONSTRAINT "property_inquiries_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_inquiries" ADD CONSTRAINT "property_inquiries_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_inquiries" ADD CONSTRAINT "property_inquiries_listerUserId_fkey" FOREIGN KEY ("listerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
