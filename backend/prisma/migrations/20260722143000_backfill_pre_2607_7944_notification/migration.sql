-- Persist the audience-specific Step 3 notification for the production inquiry
-- created before notification metadata became part of the workflow contract.
UPDATE "property_inquiry_workflow_events" AS e
SET "metadata" = COALESCE(e."metadata", '{}'::jsonb) || jsonb_build_object(
  'sourceVersion', 'cblue-property-workflow-v1',
  'audience', jsonb_build_array('customer', 'lister'),
  'notifications', jsonb_build_object(
    'customer',
    'House ' || chr(183) ||
      ' Order: PRE-2607-7944: Please wait for the selected lister to accept the inquiry.',
    'lister',
    'House ' || chr(183) ||
      ' Order: PRE-2607-7944: A customer selected your listing. Please accept or decline the inquiry.'
  )
)
FROM "property_inquiries" AS i
WHERE e."inquiryId" = i."id"
  AND i."poNumber" = 'PRE-2607-7944'
  AND e."action" = 'partner-notified';
