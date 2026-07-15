DO $$
DECLARE
  matched_ids text[];
  target_id text;
BEGIN
  SELECT array_agg(id ORDER BY id)
  INTO matched_ids
  FROM "users"
  WHERE lower(coalesce(email, '')) = 'ghiscafe@gmail.com'
     OR phone = '+66818544291';

  IF coalesce(array_length(matched_ids, 1), 0) > 1 THEN
    RAISE EXCEPTION
      'Cannot promote ghiscafe@gmail.com: email and phone are attached to different users. Merge them manually first.';
  END IF;

  IF coalesce(array_length(matched_ids, 1), 0) = 1 THEN
    target_id := matched_ids[1];

    UPDATE "users"
    SET
      email = 'ghiscafe@gmail.com',
      name = 'Ghis Cafe',
      phone = '+66818544291',
      role = 'ADMIN'::"UserRole",
      "isActive" = true,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE id = target_id;
  ELSE
    INSERT INTO "users" (
      id,
      email,
      name,
      phone,
      role,
      "isActive",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      'admin_' || md5('ghiscafe@gmail.com'),
      'ghiscafe@gmail.com',
      'Ghis Cafe',
      '+66818544291',
      'ADMIN'::"UserRole",
      true,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );
  END IF;
END $$;