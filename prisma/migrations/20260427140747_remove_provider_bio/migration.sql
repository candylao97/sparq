-- ============================================================
-- 20260427_remove_provider_bio
--
-- Drop ProviderProfile.bio. The "About me" UI is being retired;
-- artists describe themselves via tagline + service titles only.
-- Pre-launch: no real user data to preserve.
-- ============================================================

BEGIN;

ALTER TABLE "ProviderProfile" DROP COLUMN "bio";

COMMIT;
