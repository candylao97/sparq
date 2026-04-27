-- ============================================================
-- 20260427_remove_premium_tiers
--
-- Remove the premium-tier system:
--   - CustomerProfile.membership (CustomerMembership enum)
--   - CustomerProfile.stripeSubscriptionId
--     (KEEP CustomerProfile.stripeCustomerId — generic Stripe-customer
--      pointer, vestigial today, needed by the deferred Item 6b
--      tip-on-review-page work.)
--   - ProviderProfile.tier (ProviderTier enum)
--   - ProviderProfile.subscriptionPlan (SubscriptionPlan enum)
--   - ProviderProfile.stripeSubscriptionId
--   - ProviderProfile.stripeSubscriptionStatus
--   - Drop now-unreferenced enums ProviderTier, SubscriptionPlan,
--     CustomerMembership
--   - Remove TIER_CHANGE from NotificationType (recreate-and-swap)
--
-- All wrapped in BEGIN/COMMIT so a partial failure (most likely the
-- USING cast in step 4 if any TIER_CHANGE row escaped step 1) rolls
-- back the entire migration rather than leaving the schema half-applied.
-- ============================================================

BEGIN;

-- 1. Migrate any existing TIER_CHANGE notifications to GENERAL so the
--    enum value can be removed without orphaning rows.
UPDATE "Notification"
   SET "type" = 'GENERAL'
 WHERE "type" = 'TIER_CHANGE';

-- 2. Drop columns. None of these have FK constraints or indexes, so any
--    order works. Each ALTER TABLE takes a brief ACCESS EXCLUSIVE lock.
ALTER TABLE "CustomerProfile" DROP COLUMN "membership";
ALTER TABLE "CustomerProfile" DROP COLUMN "stripeSubscriptionId";

ALTER TABLE "ProviderProfile" DROP COLUMN "tier";
ALTER TABLE "ProviderProfile" DROP COLUMN "subscriptionPlan";
ALTER TABLE "ProviderProfile" DROP COLUMN "stripeSubscriptionId";
ALTER TABLE "ProviderProfile" DROP COLUMN "stripeSubscriptionStatus";

-- 3. Drop now-unreferenced enums.
DROP TYPE "ProviderTier";
DROP TYPE "SubscriptionPlan";
DROP TYPE "CustomerMembership";

-- 4. Recreate-and-swap NotificationType to remove TIER_CHANGE.
--    Postgres does NOT support `ALTER TYPE ... DROP VALUE`, so we
--    create a parallel type, rewrite the column to use it, drop the
--    old type, and rename. The USING clause casts via text — required
--    because Postgres won't implicitly cast between two enum types
--    even if their value sets overlap.
CREATE TYPE "NotificationType_new" AS ENUM (
  'NEW_BOOKING',
  'BOOKING_ACCEPTED',
  'BOOKING_DECLINED',
  'BOOKING_COMPLETED',
  'BOOKING_CANCELLED',
  'NEW_MESSAGE',
  'NEW_REVIEW',
  'PAYMENT_RECEIVED',
  'PAYOUT_SENT',
  'BOOKING_EXPIRED',
  'BOOKING_DISPUTED',
  'REVIEW_REMINDER',
  'RESCHEDULE_REQUESTED',
  'REVIEW_REPLY',
  'DISPUTE_RESOLVED',
  'REFUND_PROCESSED',
  'GENERAL'
);

ALTER TABLE "Notification"
  ALTER COLUMN "type" TYPE "NotificationType_new"
  USING "type"::text::"NotificationType_new";

DROP TYPE "NotificationType";

ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";

COMMIT;
