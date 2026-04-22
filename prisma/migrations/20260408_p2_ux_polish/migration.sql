-- P2-4: Add usageCount to ServiceAddon
ALTER TABLE "ServiceAddon" ADD COLUMN IF NOT EXISTS "usageCount" INTEGER NOT NULL DEFAULT 0;

-- P2-7: Add sequence to WaitlistEntry for FIFO ordering
CREATE SEQUENCE IF NOT EXISTS "WaitlistEntry_sequence_seq";
ALTER TABLE "WaitlistEntry" ADD COLUMN IF NOT EXISTS "sequence" INTEGER NOT NULL DEFAULT nextval('"WaitlistEntry_sequence_seq"');

-- P2-6 / P2-1: Add GENERAL to NotificationType enum
DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'GENERAL';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
