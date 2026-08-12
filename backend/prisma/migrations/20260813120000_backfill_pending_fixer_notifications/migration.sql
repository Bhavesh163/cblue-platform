-- Persist applicant notices for active fixer profiles that predate the
-- authoritative qualification notification flow.
INSERT INTO "notifications" (
  "id",
  "userId",
  "type",
  "status",
  "title",
  "body",
  "data",
  "attempts",
  "dedupeKey",
  "createdAt",
  "updatedAt"
)
SELECT
  'fixer-registration-in-app-' || fixer."id",
  fixer."userId",
  'IN_APP'::"NotificationType",
  'SENT'::"NotificationStatus",
  'Identity verification required',
  'Complete and submit your identity verification before your profile can receive new opportunities.',
  jsonb_build_object('fixerId', fixer."id", 'eligibilityStatus', 'PENDING'),
  0,
  'fixer-registration-in-app:' || fixer."id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "fixers" AS fixer
JOIN "users" AS account ON account."id" = fixer."userId"
WHERE account."isActive" = TRUE
  AND fixer."status" = 'PENDING'
ON CONFLICT ("dedupeKey") DO NOTHING;

INSERT INTO "notifications" (
  "id",
  "userId",
  "type",
  "title",
  "body",
  "data",
  "attempts",
  "dedupeKey",
  "createdAt",
  "updatedAt"
)
SELECT
  'fixer-registration-email-' || fixer."id",
  fixer."userId",
  'EMAIL'::"NotificationType",
  'Identity verification required',
  'Complete and submit your identity verification before your profile can receive new opportunities.',
  jsonb_build_object('fixerId', fixer."id", 'eligibilityStatus', 'PENDING'),
  0,
  'fixer-registration-email:' || fixer."id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "fixers" AS fixer
JOIN "users" AS account ON account."id" = fixer."userId"
WHERE account."isActive" = TRUE
  AND fixer."status" = 'PENDING'
ON CONFLICT ("dedupeKey") DO NOTHING;
