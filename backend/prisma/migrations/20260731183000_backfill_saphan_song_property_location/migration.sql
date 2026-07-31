UPDATE "properties"
SET
  "province" = CASE
    WHEN NULLIF(BTRIM("province"), '') IS NULL THEN 'กรุงเทพมหานคร'
    ELSE "province"
  END,
  "district" = CASE
    WHEN NULLIF(BTRIM("district"), '') IS NULL THEN 'วังทองหลาง'
    ELSE "district"
  END,
  "subdistrict" = CASE
    WHEN NULLIF(BTRIM("subdistrict"), '') IS NULL THEN 'สะพานสอง'
    ELSE "subdistrict"
  END,
  "postalCode" = CASE
    WHEN NULLIF(BTRIM("postalCode"), '') IS NULL THEN '10310'
    ELSE "postalCode"
  END
WHERE "latitude" BETWEEN 13.7863498 AND 13.8028206
  AND "longitude" BETWEEN 100.5883725 AND 100.6129265
  AND (
    NULLIF(BTRIM("province"), '') IS NULL
    OR NULLIF(BTRIM("district"), '') IS NULL
    OR NULLIF(BTRIM("subdistrict"), '') IS NULL
    OR NULLIF(BTRIM("postalCode"), '') IS NULL
  );
