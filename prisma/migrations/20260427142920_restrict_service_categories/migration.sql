-- ============================================================
-- 20260427_restrict_service_categories
--
-- Collapse the 10-value ServiceCategory enum down to the three
-- launch categories: NAILS, LASHES, MAKEUP.
--
-- Removed values: HAIR, BROWS, WAXING, MASSAGE, FACIALS,
--                 TUTORING, OTHER (7 values).
--
-- Pre-migration check (run manually before applying — confirmed
-- to return 0 in the local DB):
--
--   SELECT COUNT(*) FROM "Booking" b
--     INNER JOIN "Service" s ON s."id" = b."serviceId"
--    WHERE s."category"::text IN
--      ('HAIR','BROWS','WAXING','MASSAGE','FACIALS','TUTORING','OTHER');
--
-- If non-zero, the DELETE in step 1 will fail (Booking → Service
-- FK is RESTRICT-on-delete) and the BEGIN/COMMIT will roll back.
-- ============================================================

BEGIN;

-- 1. Delete every Service whose category is being dropped.
DELETE FROM "Service"
 WHERE "category"::text IN (
   'HAIR', 'BROWS', 'WAXING', 'MASSAGE', 'FACIALS', 'TUTORING', 'OTHER'
 );

-- 2. Create the new enum with only the three kept values.
CREATE TYPE "ServiceCategory_new" AS ENUM (
  'NAILS',
  'LASHES',
  'MAKEUP'
);

-- 3. Rewrite the Service.category column to the new type.
--    The USING clause casts via text — Postgres won't implicitly
--    cast between two enum types. After step 1 every row's value
--    is in the new enum's value set.
ALTER TABLE "Service"
  ALTER COLUMN "category" TYPE "ServiceCategory_new"
  USING "category"::text::"ServiceCategory_new";

-- 4. Drop the old type, rename the new one.
DROP TYPE "ServiceCategory";

ALTER TYPE "ServiceCategory_new" RENAME TO "ServiceCategory";

COMMIT;
