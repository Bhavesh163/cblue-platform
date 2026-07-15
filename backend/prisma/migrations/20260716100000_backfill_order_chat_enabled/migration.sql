UPDATE "orders"
SET "chatEnabled" = true
WHERE "chatEnabled" = false
  AND "status" NOT IN ('CANCELLED', 'COMPLETED')
  AND "workflowPhase" IN (
    'CHAT',
    'MEETING_CONFIRM',
    'VARIATION',
    'VARIATION_CONFIRM',
    'COMPLETION',
    'COMPLETION_CONFIRM'
  );