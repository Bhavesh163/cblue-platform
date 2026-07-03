DO $$
DECLARE
  admin_record record;
  matched_ids text[];
  target_id text;
BEGIN
  FOR admin_record IN
    SELECT *
    FROM (VALUES
      ('suppadesh@hotmail.com', 'Suppadesh Fungprasertsuk', '+66819852846'),
      ('bhaveshfung@gmail.com', 'Bhavesh Fungprasertsuk', '+66821056357')
    ) AS admins(email, name, phone)
  LOOP
    SELECT array_agg(id ORDER BY id)
    INTO matched_ids
    FROM "users"
    WHERE lower(coalesce(email, '')) = admin_record.email
       OR phone = admin_record.phone;

    IF coalesce(array_length(matched_ids, 1), 0) > 1 THEN
      RAISE EXCEPTION
        'Cannot promote %: email and phone are attached to different users. Merge them manually first.',
        admin_record.email;
    END IF;

    IF coalesce(array_length(matched_ids, 1), 0) = 1 THEN
      target_id := matched_ids[1];

      UPDATE "users"
      SET
        email = admin_record.email,
        name = admin_record.name,
        phone = admin_record.phone,
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
        'admin_' || md5(admin_record.email),
        admin_record.email,
        admin_record.name,
        admin_record.phone,
        'ADMIN'::"UserRole",
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      );
    END IF;
  END LOOP;
END $$;
