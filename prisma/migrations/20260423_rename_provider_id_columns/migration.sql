-- FIND-1/2/3 — rename `providerId` columns to unambiguous names so it's
-- clear at the type level whether a given FK points at `User.id` or
-- `ProviderProfile.id`. Previously:
--   - ScoreFactors/Service/Availability/PortfolioPhoto/Verification/KYCRecord
--     had `providerId` that referenced `ProviderProfile.id`
--   - Booking/WaitlistEntry had `providerId` that referenced `User.id`
--   - Payout.providerId was a plain String with no @relation — the
--     structural weakness that hid FIND-2 and FIND-3 for months.
-- After this migration:
--   - FK-to-ProviderProfile.id  → `providerProfileId`
--   - FK-to-User.id             → `providerUserId`
--   - Payout.providerUserId gets a real FK constraint to User.id, making the
--     `Notification.userId: payout.providerUserId` write in
--     `src/app/api/cron/process-payouts` correct by construction (FIND-3).
--
-- Prisma's diff generates DROP COLUMN + ADD COLUMN for this; we hand-wrote
-- RENAME COLUMN per the human's prior decision so existing row data is
-- preserved (no data loss, no backfill required).

-- ─── ScoreFactors: providerId → providerProfileId ────────────────────
ALTER TABLE "ScoreFactors" RENAME COLUMN "providerId" TO "providerProfileId";
ALTER INDEX  "ScoreFactors_providerId_key" RENAME TO "ScoreFactors_providerProfileId_key";
ALTER TABLE  "ScoreFactors" RENAME CONSTRAINT "ScoreFactors_providerId_fkey" TO "ScoreFactors_providerProfileId_fkey";

-- ─── Service: providerId → providerProfileId ─────────────────────────
ALTER TABLE "Service" RENAME COLUMN "providerId" TO "providerProfileId";
ALTER INDEX  "Service_providerId_idx" RENAME TO "Service_providerProfileId_idx";
ALTER TABLE  "Service" RENAME CONSTRAINT "Service_providerId_fkey" TO "Service_providerProfileId_fkey";

-- ─── Availability: providerId → providerProfileId ────────────────────
ALTER TABLE "Availability" RENAME COLUMN "providerId" TO "providerProfileId";
ALTER INDEX  "Availability_providerId_date_key" RENAME TO "Availability_providerProfileId_date_key";
ALTER TABLE  "Availability" RENAME CONSTRAINT "Availability_providerId_fkey" TO "Availability_providerProfileId_fkey";

-- ─── PortfolioPhoto: providerId → providerProfileId ──────────────────
ALTER TABLE "PortfolioPhoto" RENAME COLUMN "providerId" TO "providerProfileId";
ALTER TABLE  "PortfolioPhoto" RENAME CONSTRAINT "PortfolioPhoto_providerId_fkey" TO "PortfolioPhoto_providerProfileId_fkey";

-- ─── Verification: providerId → providerProfileId ────────────────────
ALTER TABLE "Verification" RENAME COLUMN "providerId" TO "providerProfileId";
ALTER INDEX  "Verification_providerId_key" RENAME TO "Verification_providerProfileId_key";
ALTER TABLE  "Verification" RENAME CONSTRAINT "Verification_providerId_fkey" TO "Verification_providerProfileId_fkey";

-- ─── KYCRecord: providerId → providerProfileId ───────────────────────
ALTER TABLE "KYCRecord" RENAME COLUMN "providerId" TO "providerProfileId";
ALTER INDEX  "KYCRecord_providerId_key" RENAME TO "KYCRecord_providerProfileId_key";
ALTER TABLE  "KYCRecord" RENAME CONSTRAINT "KYCRecord_providerId_fkey" TO "KYCRecord_providerProfileId_fkey";

-- ─── Booking: providerId → providerUserId (FK to User.id) ────────────
ALTER TABLE "Booking" RENAME COLUMN "providerId" TO "providerUserId";
ALTER INDEX  "Booking_providerId_idx" RENAME TO "Booking_providerUserId_idx";
ALTER TABLE  "Booking" RENAME CONSTRAINT "Booking_providerId_fkey" TO "Booking_providerUserId_fkey";

-- ─── WaitlistEntry: providerId → providerUserId (FK to User.id) ──────
ALTER TABLE "WaitlistEntry" RENAME COLUMN "providerId" TO "providerUserId";
ALTER INDEX  "WaitlistEntry_providerId_date_idx" RENAME TO "WaitlistEntry_providerUserId_date_idx";
ALTER TABLE  "WaitlistEntry" RENAME CONSTRAINT "WaitlistEntry_providerId_fkey" TO "WaitlistEntry_providerUserId_fkey";

-- ─── Payout: providerId → providerUserId + add real FK + index ───────
-- This is the FIND-12 / FIND-2 / FIND-3 structural fix. Before this
-- migration the column was a plain String with no FK. After: it's a proper
-- FK to User.id with ON DELETE RESTRICT (so a provider account can't be
-- hard-deleted while they have outstanding payouts).
ALTER TABLE "Payout" RENAME COLUMN "providerId" TO "providerUserId";
CREATE INDEX "Payout_providerUserId_idx" ON "Payout"("providerUserId");
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_providerUserId_fkey" FOREIGN KEY ("providerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Pre-existing enum drift: ServiceCategory missing TUTORING ───────
-- The 20260422_baseline migration was marked --applied without running,
-- so the live DB reflects whatever was there before baseline creation,
-- which was missing TUTORING. Add it here so the baseline intent is
-- restored. Safe on any DB that already has TUTORING (IF NOT EXISTS).
ALTER TYPE "ServiceCategory" ADD VALUE IF NOT EXISTS 'TUTORING';
