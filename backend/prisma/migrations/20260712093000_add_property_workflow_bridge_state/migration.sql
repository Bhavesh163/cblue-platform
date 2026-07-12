ALTER TABLE "property_inquiries"
ADD COLUMN "requestDetails" TEXT;

CREATE TABLE "property_inquiry_attachments" (
  "id" TEXT NOT NULL,
  "inquiryId" TEXT NOT NULL,
  "uploadedBy" TEXT NOT NULL,
  "label" TEXT,
  "url" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "property_inquiry_attachments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "property_inquiry_attachments_inquiryId_fkey"
    FOREIGN KEY ("inquiryId") REFERENCES "property_inquiries"("id") ON DELETE CASCADE
);
CREATE INDEX "property_inquiry_attachments_inquiryId_idx"
  ON "property_inquiry_attachments"("inquiryId");

CREATE TABLE "property_inquiry_workflow_events" (
  "id" TEXT NOT NULL,
  "inquiryId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "status" "PropertyInquiryStatus" NOT NULL,
  "step" INTEGER NOT NULL,
  "actorId" TEXT NOT NULL,
  "isPrivate" BOOLEAN NOT NULL DEFAULT false,
  "note" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "property_inquiry_workflow_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "property_inquiry_workflow_events_inquiryId_fkey"
    FOREIGN KEY ("inquiryId") REFERENCES "property_inquiries"("id") ON DELETE CASCADE
);
CREATE INDEX "property_inquiry_workflow_events_inquiryId_createdAt_idx"
  ON "property_inquiry_workflow_events"("inquiryId", "createdAt");
