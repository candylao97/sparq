-- Add accountStatus to User model
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE';

-- Add reminderSentAt to Booking model
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3);

-- Add aiSummary to ProviderProfile model
ALTER TABLE "ProviderProfile" ADD COLUMN IF NOT EXISTS "aiSummary" TEXT;

-- Add new NotificationType enum values
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RESCHEDULE_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REVIEW_REPLY';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DISPUTE_RESOLVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REFUND_PROCESSED';
