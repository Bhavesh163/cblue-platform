-- Persist the customer-entered meeting note with the property workflow.
ALTER TABLE "property_inquiries"
ADD COLUMN IF NOT EXISTS "meetingNote" TEXT;
