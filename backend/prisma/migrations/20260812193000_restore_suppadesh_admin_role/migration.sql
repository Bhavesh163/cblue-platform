-- Restore the previously authorized administrator record after legacy fixer
-- registration could overwrite its role. Do not create or match another user.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "users"
    WHERE lower(email) = 'suppadesh@hotmail.com'
  ) THEN
    RAISE EXCEPTION 'Authorized administrator account suppadesh@hotmail.com is missing';
  END IF;

  UPDATE "users"
  SET role = 'ADMIN'::"UserRole", "isActive" = true, "updatedAt" = NOW()
  WHERE lower(email) = 'suppadesh@hotmail.com';
END $$;
