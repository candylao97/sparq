-- FIND-6 — Email suppression list for AU Spam Act 2003 compliance.
-- Skipping an address here prevents non-transactional sends; transactional
-- emails are still delivered per s.5 exemption.
CREATE TABLE "Suppression" (
    "email"            TEXT         NOT NULL,
    "suppressedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason"           TEXT         NOT NULL DEFAULT 'user_unsubscribe',
    "sourceCampaign"   TEXT,
    "unsubscribeToken" TEXT,

    CONSTRAINT "Suppression_pkey" PRIMARY KEY ("email")
);

CREATE INDEX "Suppression_suppressedAt_idx" ON "Suppression"("suppressedAt");
