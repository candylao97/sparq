-- FIND-4 — ToS consent capture at signup (Privacy Act APP 1.3 /
-- Spam Act 2003 foundation for "express consent" transactional email).
-- Both fields are nullable so users created before this migration keep
-- their current state; a follow-up flow will re-prompt them on next login.
ALTER TABLE "User" ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "termsVersion"    TEXT;
