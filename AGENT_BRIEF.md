# Sparq Bug Fix Agent Brief

**This file is the source of truth.** Branches, commit messages,
conversational context, and agent working memory are NOT. When
assigning new AUDIT or FIND ids, commit to this file in the same PR.

Last updated: 2026-04-28
Last AUDIT-id assigned: AUDIT-037 (gaps exist — see Notes per id)
Last FIND-id assigned: FIND-26

## Status legend

- `OPEN` — not started
- `IN_PROGRESS` — branch exists, work underway
- `IN_REVIEW` — PR open (or in the post-2026-04-22 local-merge workflow,
  commit-on-branch awaiting human local merge)
- `MERGED` — landed in `main`
- `ESCALATED` — awaiting human decision
- `BLOCKED` — depends on another item (name it)
- `DUPLICATE` — consolidated (name the winner)
- `SUPERSEDED` — code merged then later removed by a different decision
- `COLLAPSED` — original scope no longer meaningful; reduced or
  reframed (often paired with a Decisions log entry)
- `UNKNOWN` — evidence insufficient; see notes

## Notes on the queue

- The audit campaign described itself as "40-bug" in
  `BATCH_G_HANDBACK.md` (on `docs/escalations-memo`). 21 AUDIT ids are
  documented across all sources; the other 19 carry no surviving
  description and are marked `UNKNOWN`. See the bulk-UNKNOWN note at
  the end of the AUDIT section.
- PR surface is not verified in the current local-merge workflow
  (see Decisions log 2026-04-22). The 2026-04-25 CI setup
  (`chore/ci-setup` → `f16cd40`) gates pushes via GitHub Actions
  on typecheck / build / test (lint runs but is non-blocking).
  Branches with finished-looking diffs that haven't yet been merged
  are recorded as `IN_REVIEW`.
- Main has 60+ merge commits since the recovery brief landed;
  status per item below. Per-item evidence cites the merge SHA
  where relevant.

---

## AUDIT queue

### AUDIT-001 — Subscription tier enforcement
- Status: SUPERSEDED (2026-04-27)
- Branch: `fix/audit-001-subscription-tier-enforcement` (lifecycle: MERGED → SUPERSEDED)
- Evidence: original code shipped via merge `0d91f23` on 2026-04-22;
  superseded by `feat/remove-premium-tiers` (merge `9ab7f9a` on
  2026-04-27)
- Notes: Premium tiers were removed entirely. The original branch
  DID merge to main (the `getEffectiveProviderTier` helper and
  `provider-tier.ts` module landed on 2026-04-22), then both were
  deleted by the premium-removal series a week later. There is now
  a single flat 15 % commission rate for every artist, so
  subscription-tier enforcement has no meaning. Both
  `getEffectiveProviderTier` and `provider-tier.ts` are no longer
  on main.

### AUDIT-002 — Commission rate schedule + disclosure
- Status: COLLAPSED (2026-04-27)
- Branch: none
- Evidence: [ESCALATIONS.md §AUDIT-002](ESCALATIONS.md) on
  `docs/escalations-memo`; superseded scope per
  `feat/remove-premium-tiers`
- Notes: Premium tiers were removed entirely. The "ratify the rate
  card and notice window" decision collapses to a much simpler
  question: "is the single flat rate (15 %) the right number?"
  That is still a Legal/Finance call, but the supporting work
  (tier disclosure page, version log, per-tier T&Cs amendment) is
  no longer needed. Effectively this audit is OPEN with reduced
  scope; reopen as a single-rate ratification when ready.

### AUDIT-003 — GST / tax remittance model
- Status: ESCALATED
- Branch: none
- Evidence: [ESCALATIONS.md §AUDIT-003](ESCALATIONS.md)
- Notes: Needs Finance + Legal decision on merchant-of-record vs
  conduit. **Blocks AUDIT-008 receipt content, Stripe Tax
  enablement, `Booking.gstAmount` schema addition, and the
  FIND-9/AUDIT-008 receipt contradiction (see FIND-9 below).**
  Recommended default per memo: Option 1 (merchant-of-record, Stripe
  Tax on).

### AUDIT-004 — Availability calendar on provider profile
- Status: MERGED
- Branch: `fix/audit-004-availability-calendar`
- Evidence: merged via `0ba8aad` on 2026-04-22 (original commit `b684821`).
  Backup tag `backup/fix-audit-004-2026-04-22`.
- Notes: `AvailabilityCalendar` component + 188 lines of tests on main.
  Pure UI/contract addition. (See also Decisions log 2026-04-24 —
  branch `fix/remove-provider-profile-calendar` was prepared as a
  follow-up to remove the inline calendar from the profile page,
  but not yet merged.)

### AUDIT-005 — Instant-book confirmation-page copy
- Status: MERGED
- Branch: `fix/audit-005-instant-book-confirmation-copy`
- Evidence: merged via `29ac8ed` on 2026-04-22 (original commit `89e74b1`).
  Backup tag `backup/fix-audit-005-2026-04-22`.
- Notes: `src/lib/booking-confirmation.ts` + snapshot test on main.

### AUDIT-006 — Login gate preserve state
- Status: MERGED
- Branch: `fix/audit-006-login-gate-preserve-state`
- Evidence: merged via `74ffce4` on 2026-04-22 (original commit `422efd3`).
  Backup tag `backup/fix-audit-006-2026-04-22`.
- Notes: `src/lib/booking-url-state.ts` introduced; URL-state helper
  shared with AUDIT-007.

### AUDIT-007 — Retry payment link preserves wizard state
- Status: MERGED
- Branch: `fix/audit-007-retry-payment-preserve-state`
- Evidence: merged via `952583d` on 2026-04-22 (original commit `7ef3c87`).
- Notes: Depends on the URL-state helper shared with AUDIT-006 (also merged).

### AUDIT-008 — PDF receipt
- Status: BLOCKED — contradiction with FIND-9, both blocked on AUDIT-003
- Branch: none
- Evidence: [BATCH_G_HANDBACK.md §AUDIT-008 — no-op](BATCH_G_HANDBACK.md);
  [FIND-9](#find-9--no-pdf-receipt) below
- Notes: Handback report closes this out as a no-op on the basis
  that `ReceiptModal` + browser "Save as PDF" serves the use case.
  FIND-9 in `READINESS_OUTPUT.md` contradicts that conclusion —
  treats the lack of a server-generated PDF receipt as a
  launch-blocker for AU GST compliance. **The tiebreak is the
  AUDIT-003 GST decision**: a merchant-of-record model (Option 1 in
  ESCALATIONS.md) almost certainly requires a tax-invoice PDF
  with ABN, GST line, booking id — which a browser-print flow
  cannot reliably produce. A conduit / hybrid model may accept the
  browser-print. Reopen AUDIT-008 after AUDIT-003 lands.

### AUDIT-009 — Cancellation policy visibility on artist profile
- Status: MERGED (product-blocked by AUDIT-013 for full activation)
- Branch: `fix/audit-009-012-handauthored`
- Evidence: merged via `209d252` on 2026-04-22 (commit `5e2518a`).
  Backup tag `backup/fix-audit-009-012-2026-04-22` preserves the
  original bundled branch (`f7711b3`).
- Notes: Bundled with AUDIT-012 in the same branch. The cancellation
  policy is now visible on artist profiles + editable from settings.
  Tier ratification (AUDIT-013) is still escalated; until that lands
  the surfaced values are the existing FLEXIBLE/MODERATE/STRICT
  defaults rather than ratified policy.

### AUDIT-010 — KYC + identity verification policy
- Status: ESCALATED
- Branch: none
- Evidence: [ESCALATIONS.md §AUDIT-010](ESCALATIONS.md)
- Notes: Needs Compliance + Product decision covering: the strict-
  vs-soft-launch KYC gate, failed-KYC UX, hold-timer length, and
  artist appeal window. Recommended default per memo: Option 3
  (time-boxed 7-day soft launch, require KYC before first payout).
  Blocks provider first-booking UX changes.

### AUDIT-011 — Next payout visibility
- Status: MERGED
- Branches: `fix/audit-011-handauthored` (lib + tests) +
  `fix/audit-011-ui-integration` (API + card + payouts-banner)
- Evidence: commits `ace41b1` (partial, lib only) and the follow-up
  commit landing the UI integration; backup tag
  `backup/fix-audit-011-2026-04-22` preserves the original bundled
  branch.
- Notes: Shipped in two passes. Phase 4 landed the pure helper
  (`src/lib/next-payout.ts` + 10 tests) and the UI integration was
  deferred because the original branch's `dashboard/provider/page.tsx`
  diff (+969 lines) bundled many unrelated UX changes that couldn't
  be cleanly rebased. The follow-up pass lands just the
  NextPayoutCard, API wiring, payouts-page banner, and the
  `DashboardData.nextPayout` / `DashboardData.tipStats` contract
  additions — the minimum surface needed for next-payout visibility.
  Unrelated bundle material (PendingBooking.reschedule*,
  CustomerBooking.dispute*, ProviderProfile.cancellationCount /
  isFeatured / accountStatus) is deliberately not ported.

### AUDIT-012 — Cancellation policy editable from settings
- Status: MERGED (product-blocked by AUDIT-013 for full activation)
- Branch: `fix/audit-009-012-handauthored` (bundled with AUDIT-009)
- Evidence: merged via `209d252` on 2026-04-22 (commit `5e2518a`).
- Notes: Same bundled branch as AUDIT-009. Settings page exposes
  the policy editor; values shown are pre-ratification defaults
  pending AUDIT-013.

### AUDIT-013 — Refund / cancellation-policy tiers
- Status: ESCALATED
- Branch: none
- Evidence: [ESCALATIONS.md §AUDIT-013](ESCALATIONS.md)
- Notes: Needs Ops + Legal ratification of the FLEXIBLE / MODERATE
  / STRICT windows (6h / 24h / 48h) or expansion to NO_REFUND /
  CUSTOM. Blocks FIND-7 (the code that would enforce the chosen
  policy) and gates AUDIT-009/012 merges. Recommended default per
  memo: Option 1 (ratify as-is, revisit at 3-month mark).

### AUDIT-014 — Chargeback defense UI (Stripe Disputes API)
- Status: MERGED
- Branch: `fix/audit-014-chargeback-defense-ui`
- Evidence: merged via `1f2cac7` on 2026-04-22 (commit `653edf2`).
  Backup tag `backup/fix-audit-014-2026-04-22`.
- Notes: Evidence upload + representment workflow in admin dashboard
  on main. See `src/app/admin/chargebacks/` and the API routes
  under it.

### AUDIT-015 — Dispute SLA + escalation ladder
- Status: ESCALATED
- Branch: none
- Evidence: [ESCALATIONS.md §AUDIT-015](ESCALATIONS.md)
- Notes: Needs Ops lead to pick the SLA cutoffs. Recommended
  default per memo: Option 1 (24h first-touch, 7d resolution,
  3d auto-escalate).

### AUDIT-016 — Review moderation & removal policy
- Status: ESCALATED
- Branch: none
- Evidence: [ESCALATIONS.md §AUDIT-016](ESCALATIONS.md)
- Notes: Needs T&S + Legal sign-off. Recommended default per memo:
  Option 1 (narrow takedown: PII / abuse / provably false).

### AUDIT-017 — Velocity checks on high-value endpoints
- Status: MERGED
- Branch: `fix/audit-017-velocity-checks`
- Evidence: merged via `55c02d5` on 2026-04-22 (commit `189c716`).
  Backup tag `backup/fix-audit-017-2026-04-22`.
- Notes: Upstash-Redis-backed rate-limits on 5 routes (booking
  POST/PATCH/reschedule, disputes POST, gift-card purchase).
  6-test suite on main.

### AUDIT-020 — Pricing / surcharge transparency
- Status: ESCALATED
- Branch: none
- Evidence: [ESCALATIONS.md §AUDIT-020](ESCALATIONS.md)
- Notes: ACL s.48 component-pricing call. Recommended default per
  memo: Option 2 (two-line disclosure pre-pay: service + booking
  fee).

### AUDIT-021 — Payment reconciliation cron for dropped webhooks
- Status: MERGED
- Branch: `fix/audit-021-payment-reconciliation-cron`
- Evidence: merged via `fa297fe` on 2026-04-22 (commit `f45884d`).
  Backup tag `backup/fix-audit-021-2026-04-22`.
- Notes: `/api/cron/reconcile-payments` + `vercel.json` with cron
  schedules on main. FIND-18 (tip payout) cross-references this
  route — both touch the payout pipeline.

### AUDIT-036 — Data retention & account deletion
- Status: ESCALATED
- Branch: none
- Evidence: [ESCALATIONS.md §AUDIT-036](ESCALATIONS.md)
- Notes: Needs Legal + Privacy decision on retention matrix (hard
  vs soft delete; 2y / 7y / never). Recommended default per memo:
  Option 2 (soft delete on request, hard delete after 7 years).
  **Blocks FIND-5 implementation** (the deletion endpoint choice
  flows directly from this decision — resolve together).
  Cost once decided: ~3–5 engineer-days.

### AUDIT-037 — No-show timezone / DST handling
- Status: MERGED
- Branch: `fix/audit-037-handauthored` (commit `5bccaea`,
  merge `57e6463`); backup tag
  `backup/fix-audit-037-2026-04-22` preserves the original branch.
- Evidence: `src/lib/booking-time.ts` on main (from Phase 1) is the
  DST-aware helper; `src/__tests__/utils/bookingTime.test.ts` (10
  tests) locks the behaviour in and was landed as the hand-authored
  variant. Server-side consumers already route through the helper:
  `src/app/api/bookings/[id]/route.ts`,
  `src/app/api/cron/expire-bookings/route.ts`,
  `src/app/api/cron/send-reminders/route.ts`.
- Notes: The original branch's client-side call-site fixes had no
  target on main. `grep -rn '+10:00\|+11:00' src/app/ src/components/`
  returns zero hits — the buggy code the branch was patching was
  working-tree drift that never made it into main. The new provider
  bookings page (`src/app/dashboard/provider/bookings/page.tsx`) and
  the refund-preview UI on `src/app/bookings/page.tsx` that the
  backup branch also carried are separate feature work, not bug-fix
  scope; if/when those features land, they should import
  `hoursUntilBooking` from `@/lib/booking-time`. Closing the
  audit as MERGED on the basis that (1) the helper is in place,
  (2) regression tests are committed, (3) no remaining buggy
  call-sites exist on main.

### AUDIT-018, AUDIT-019, AUDIT-022..AUDIT-035 (except AUDIT-036), AUDIT-038..AUDIT-040 — UNKNOWN
- Status: UNKNOWN
- Branch: none
- Evidence: none
- Notes: Referenced in prior planning (the "40-bug audit" framing in
  `BATCH_G_HANDBACK.md` which claims 8 shipped + 1 no-op + 8
  escalated + 23 out-of-scope = 40 items), but **no surviving
  description exists in any committed doc, branch, commit message,
  or working-tree file** for these 19 ids. **Do not assign work
  until described.** If an operator recovers the original audit
  input or reconstructs the intent, add the description here and
  change the status accordingly.

---

## FIND queue

*FIND-10 through FIND-17 reflect the Phase 2 reconciliation
(see Decisions log, 2026-04-22). ROOT_CAUSE definitions kept their
original ids (10-13). READINESS definitions renumbered to 14-17.*

### FIND-1 — Availability endpoint 404 (id-scheme mismatch)
- Status: MERGED
- Branch: `fix/find-1-2-3-provider-id-unification` (bundled with FIND-2 + FIND-3)
- Evidence: merged via `98a7cb5` on 2026-04-22 (commit `c3ec6f2`).
  See also FIND-22 for the raw-SQL follow-up that the codemod missed.
- Notes: Renamed `providerId` → `providerProfileId` / `providerUserId`
  consistently across the schema and all Prisma reads. Original
  bug-fix scope shipped; the raw-SQL queries on `/`, `/search`,
  and `/api/providers/nearby` weren't touched by the codemod and
  surfaced as a 500 — FIND-22 cleaned that up the same evening.

### FIND-2 — Payout history always empty
- Status: MERGED
- Branch: `fix/find-1-2-3-provider-id-unification` (bundled)
- Evidence: merged via `98a7cb5` on 2026-04-22 (commit `c3ec6f2`).
- Notes: Both writer and reader sides now use the same id scheme.
  No backfill needed — the local DB had 0 payouts at the time. The
  structural weakness flagged as FIND-12 (no FK on `Payout.providerId`)
  is closed as a side-effect of the rename: the new field is
  `Payout.providerUserId` with a real `@relation` to User.

### FIND-3 — Silent notification FK violation
- Status: MERGED
- Branch: `fix/find-1-2-3-provider-id-unification` (bundled)
- Evidence: merged via `98a7cb5` on 2026-04-22 (commit `c3ec6f2`).
- Notes: The cron's `userId:` write now passes a User.id correctly.
  FIND-13 (the bare-catch anti-pattern that hid the original error)
  is still OPEN — the silent-catch sites elsewhere in the codebase
  remain.

### FIND-4 — No ToS consent capture (compliance blocker)
- Status: MERGED — engineering done; legal text + existing-user
  re-prompt still ESCALATED
- Branch: `fix/find-4-tos-consent`
- Evidence: merged via `cb92a7b` on 2026-04-22 (commit `921dbbc`).
  Migration `prisma/migrations/20260424_add_tos_consent_fields`;
  schema adds `User.termsAcceptedAt` + `User.termsVersion`;
  register endpoint hard-requires `acceptedTerms: true`;
  /login signup + /register/provider listing step both gate the
  submit button on a required checkbox.
- Notes:
  - **Placeholder ToS version string** `v1-placeholder` lives in
    `src/lib/tos.ts` as `CURRENT_TOS_VERSION`. Legal must replace
    this with the published version string before launch.
  - **Existing users carry `termsAcceptedAt = null`** until a future
    re-prompt flow backfills them on next login. That backfill is
    out of scope for this commit.
  - **ConsentRecord audit table deliberately skipped** for MVP.
    User-level fields satisfy APP 1.3 "collection notice"; a
    separate ConsentRecord table (tos_version, ip, user_agent,
    consent_type) should be added if we later need to support
    multiple consent types (marketing, terms updates, etc.) or
    need full audit-trail evidence for disputes. Adding it now
    would be single-purpose and premature.
- Still escalated: legal must publish the actual ToS text and
  replace the placeholder version string. Product must decide the
  existing-user re-prompt strategy.
- Owner: Legal + Product (for text + policy); Engineering done.

### FIND-5 — No user-initiated account deletion (compliance blocker)
- Status: ESCALATED — blocked on AUDIT-036
- Branch: none
- Evidence: READINESS_OUTPUT.md line 37
- Notes: APP 11.2 requires destruction/de-identification of personal
  info no longer needed. `/api/account-settings` exposes GET/PUT
  only. **The implementation choice (hard vs soft delete, retention
  timers) is the AUDIT-036 decision — these two must be resolved
  together.** See AUDIT-036 for the pending options and recommended
  default.

### FIND-6 — No email unsubscribe mechanism (compliance blocker)
- Status: MERGED — engineering done; transactional-list legal
  review + bounce SLA still ESCALATED
- Branch: `fix/find-6-email-unsubscribe`
- Evidence: merged via `3613a13` on 2026-04-22 (commit `7dbeaf1`).
  Migration `prisma/migrations/20260425_add_suppression_table`;
  new `Suppression` model; `src/lib/unsubscribe.ts` (HMAC token +
  verify); `src/app/api/unsubscribe/route.ts` (GET + POST); new
  `/unsubscribe` confirmation page; `src/lib/email.ts`
  `sendEmail` rewritten to run suppression pre-check, append
  footer, and emit List-Unsubscribe + List-Unsubscribe-Post
  headers (RFC 8058 one-click).
- **Transactional classification — flagged for human review.** Per
  the brief, only 5 helpers are tagged `category: 'transactional'`
  (the narrow list):
  - `sendVerificationEmail`
  - `sendBookingConfirmationEmail`
  - `sendBookingConfirmationToCustomer`
  - `sendPayoutEmail`
  - `sendPasswordResetEmail`
  Everything else (`sendBookingRequestEmail`,
  `sendBookingReminderEmail`, `sendPaymentExpiryWarningEmail`,
  `sendPaymentFailedEmail`, `sendRefundConfirmationEmail`,
  `sendWaitlistNotificationEmail`, `sendBookingCancelledEmail`,
  `sendBookingDeclinedEmail`, `sendReviewReminderEmail`,
  `sendDisputeOpenedEmail`, `sendKycDecisionEmail`,
  `sendReviewReplyEmail`, `sendNewMessageEmail`,
  `sendBookingExpiredEmail`) is `category: 'marketing'` and will
  be skipped for suppressed recipients. **Product/Legal should
  confirm** whether any of these (especially billing-related like
  `sendPaymentFailedEmail` and `sendRefundConfirmationEmail`) should
  be reclassified as transactional. To reclassify: change the
  `category` literal in the helper.
- **Required env var:** `UNSUBSCRIBE_SECRET` (falls back to
  `NEXTAUTH_SECRET`). Dev uses an unsafe fallback; production
  throws if neither is set. Document in `.env.example` when that
  file is created.
- Suppression scope: reason defaults to `user_unsubscribe`; also
  accepts `bounce` / `complaint` / `admin_block` for future
  bounce-handling / admin-driven paths. Ops can query the
  `Suppression` table directly to list unsubscribed addresses or
  reverse an entry (no UI for that yet — out of scope).
- Still escalated: Legal must review the narrow transactional list
  above. Marketing must decide suppression SLA for bounce-based
  entries (auto-reactivate after N months? never?). Out of scope
  for this commit.
- Owner: Legal + Product (classification review); Engineering done.

### FIND-7 — Cancellation policy stored but not enforced
- Status: OPEN — blocked on AUDIT-013
- Branch: none
- Evidence: READINESS_OUTPUT.md line 39
- Notes: `ProviderProfile.cancellationPolicyType` is persisted but
  `src/app/api/bookings/[id]/route.ts:84-99` always refunds 100%
  regardless. Cannot implement enforcement until AUDIT-013 tier
  decision is ratified.

### FIND-8 — Double-booking race
- Status: OPEN
- Branch: none
- Evidence: READINESS_OUTPUT.md line 40
- Notes: No DB unique on `(providerId, date, time)`, no
  `SELECT … FOR UPDATE`. Two concurrent POSTs on the same slot
  can both pass the check. Needs schema migration + row-level lock
  or unique constraint.

### FIND-9 — No PDF receipt
- Status: BLOCKED — contradiction with AUDIT-008, both blocked on AUDIT-003
- Branch: none
- Evidence: READINESS_OUTPUT.md line 41;
  [BATCH_G_HANDBACK.md §AUDIT-008](BATCH_G_HANDBACK.md)
- Notes: READINESS calls this a launch-blocker on AU GST compliance
  grounds. BATCH_G_HANDBACK closes AUDIT-008 as a no-op, asserting
  the browser-print flow through `ReceiptModal` is sufficient.
  **The tiebreak is the AUDIT-003 GST decision.** If AUDIT-003
  lands as merchant-of-record (the recommended default), a
  server-generated tax-invoice PDF with ABN / GST / booking-id is
  effectively required and AUDIT-008 reopens as real work. If
  conduit or hybrid, the browser-print may survive and this FIND
  closes as WONTFIX. Do not implement or close either way before
  AUDIT-003.

### FIND-10 — Waitlist notification cron never finds availability
- Status: OPEN
- Branch: none
- Evidence: [ROOT_CAUSE_OUTPUT.md §2.7](ROOT_CAUSE_OUTPUT.md)
- Notes: `src/app/api/cron/notify-waitlist/route.ts:98` queries
  `prisma.availability.findFirst({ where: { providerId: entry.providerId, ... } })`.
  `WaitlistEntry.providerId` is `User.id` (per the schema relation
  `ProviderWaitlist`); `Availability.providerId` is
  `ProviderProfile.id`. The query always returns `null`, the `if
  (!availability) continue` runs, and the waitlist cron silently
  no-ops. Latent today (zero bookings in the live audit state); on
  launch, every waitlist signup will go unnotified.

### FIND-11 — Two live Stripe webhook routes
- Status: OPEN
- Branch: none
- Evidence: [ROOT_CAUSE_OUTPUT.md §5.1](ROOT_CAUSE_OUTPUT.md)
- Notes: `src/app/api/stripe/webhooks/route.ts` (587 lines) and
  `src/app/api/webhooks/stripe/route.ts` (511 lines) are both live
  route handlers at two different URLs. ~99% byte-identical. The
  shorter one is missing `charge.dispute.updated` and
  `account.external_account.*` cases. Whichever URL is configured
  in the Stripe dashboard wins — the other silently accretes drift.
  Delete the loser after checking Stripe dashboard config.

### FIND-12 — `Payout.providerId` has no FK / index / `@relation`
- Status: MERGED (closed as side-effect of FIND-1/2/3)
- Branch: `fix/find-1-2-3-provider-id-unification`
- Evidence: merged via `98a7cb5` on 2026-04-22.
- Notes: The id-unification rename created `Payout.providerUserId`
  with a real `@relation("ProviderPayouts")` to `User` and
  `onDelete: Restrict`. The original `providerId` column with no
  FK no longer exists. Closes the structural weakness that made
  FIND-2 and FIND-3 possible.

### FIND-13 — 77 bare `.catch(() => {})` wrappers across 34 files
- Status: OPEN
- Branch: none
- Evidence: [ROOT_CAUSE_OUTPUT.md §3](ROOT_CAUSE_OUTPUT.md)
- Notes: Silent-catch anti-pattern across notification / payout /
  webhook side-effects. ~40 of 77 wrap `prisma.notification.create`
  — because `Notification.userId` has a strict FK, any
  mis-scheme-passed id produces P2003 which is then swallowed
  (FIND-3 is the caught example). Mechanical sweep: convert each
  site to either `.catch(err => console.warn('<context>:', err))`
  (for legitimately fire-and-forget paths) or un-wrap (for critical
  paths so the transaction surfaces the failure). Alternatively add
  a `noFail(promise, ctx)` helper that structured-logs with a
  context tag.

### FIND-14 — No admin UI/API to manage promo codes
- Status: OPEN
- Branch: none
- Evidence: [READINESS_OUTPUT.md line 52 (post-rename)](READINESS_OUTPUT.md)
- Notes: `PromoCode` model exists but no routes under
  `src/app/api/admin/promos`. Only vouchers (`/api/admin/vouchers`)
  are admin-manageable. Medium severity — no launch block, but
  promo-code CRUD must be built before the first marketing
  campaign. *(Renumbered from FIND-10 in Phase 2.)*

### FIND-15 — Search phrase query regression
- Status: OPEN
- Branch: none
- Evidence: [READINESS_OUTPUT.md line 53 (post-rename)](READINESS_OUTPUT.md)
- Notes: `q=gel+nails&location=Sydney` returns 0 providers;
  `q=gel&location=Sydney` returns 3. Substring-AND match over
  service titles is brittle for "gel nails" (a top marketing search
  term). Needs a better tokeniser / substring-OR fallback / or a
  lightweight search index. Low severity individually, but maps to
  the most-searched keyword — feels like a bug to users.
  *(Renumbered from FIND-11 in Phase 2.)*

### FIND-16 — Search terminology drift (Melbourne vs seed)
- Status: OPEN
- Branch: none
- Evidence: [READINESS_OUTPUT.md line 54 (post-rename)](READINESS_OUTPUT.md)
- Notes: Copy/marketing uses "Melbourne" in example queries; seed
  database has 0 Melbourne providers — search for
  `location=Melbourne` returns empty regardless of query. Align
  seed data or copy. Low severity. *(Renumbered from FIND-12 in
  Phase 2.)*

### FIND-17 — Register endpoint returns generic 500 on validation error
- Status: OPEN
- Branch: none
- Evidence: [READINESS_OUTPUT.md line 55 (post-rename)](READINESS_OUTPUT.md)
- Notes: Register returns `{"error":"Registration failed"}` HTTP
  500 on zod validation failure (e.g. `role: "ADMIN"`). Zod parse
  error should return 400 with the specific field message. Also
  flagged as a "FIND-17-style issue" at READINESS line 120 for the
  Stripe error copy. Low severity. *(Renumbered from FIND-13 in
  Phase 2.)*

### FIND-18 — Tip payout bug (P0): tips captured but never transferred to artist
- Status: MERGED
- Branch: `fix/find-18-tip-payout`
- Evidence: merged via `81a691e` on 2026-04-28 (commit `5f0b2c4`).
- Notes: Tips were authorised + captured on the booking PaymentIntent,
  then EXCLUDED from the artist payout transfer at all four
  completion paths (normal COMPLETED, NO_SHOW → COMPLETED,
  $0/voucher COMPLETED, auto-expire cron). Net effect: tips sat on
  the platform Stripe balance forever while the provider dashboard
  showed `tipStats` as if the artist had received them. Fix
  collapses the four `providerPayout = totalPrice - platformFee
  - (booking.tipAmount ?? 0)` sites to `providerPayout =
  totalPrice - platformFee` and adds structured `[FIND-18]` log
  lines. Refund paths (which fully refund tip to customer on
  cancel) and partial-refund payout paths (which exclude tip
  because it's already been refunded) were verified untouched.
  Tests: +5 (4 PATCH paths incl. zero-tip regression guard, 1
  cron path). Backfill: fix-forward only (option A) — pre-launch
  test data, no migration script.
- Cross-refs: AUDIT-021 (payment reconciliation cron) and FIND-11
  (two live Stripe webhook routes) both touch the same payout
  pipeline.

### FIND-19 — Provider bio field removed
- Status: MERGED
- Branch: `feat/launch-prep-batch-2` (Item 3 of the launch-prep batch)
- Evidence: merged via `ff71436` on 2026-04-28 (commit `68521e6`).
  Migration `prisma/migrations/20260427140747_remove_provider_bio`.
- Notes: Single `ALTER TABLE "ProviderProfile" DROP COLUMN "bio"`
  + 13 read sites cleaned (profile editor textarea + 50-char min
  validation, public profile "About" snippet, SEO fallback now
  uses tagline, homepage featured-providers filter swapped from
  `bio: { not: null }` to `tagline: { not: null }`, free-text
  search drops bio clause, risk-scoring PII detector reads tagline
  only, dashboard API drops bio field, admin list type cleaned).
  Bio: pre-launch only on `ProviderProfile` (never on `User` or
  `CustomerProfile`).

### FIND-20 — ServiceCategory enum restricted to NAILS / LASHES / MAKEUP
- Status: MERGED
- Branch: `feat/launch-prep-batch-2` (Item 1 of the launch-prep batch)
- Evidence: merged via `ff71436` on 2026-04-28 (commit `590e778`).
  Migration `prisma/migrations/20260427142920_restrict_service_categories`.
- Notes: 7 enum values dropped (HAIR, BROWS, WAXING, MASSAGE,
  FACIALS, TUTORING, OTHER) via DELETE-then-recreate-and-swap (same
  pattern as `NotificationType` removal in premium-removal). MAKEUP
  added to UI surfaces it didn't yet appear on (homepage 3rd card,
  artist signup, service-create form, customer "Recommended for
  you", footer, admin filter). Seed updated: 8 NAILS + 7 LASHES
  + 3 MAKEUP = 18 providers. `/search` silently strips invalid
  `?category=` params with a `console.warn` for monitoring.

### FIND-21 — Headings normalised to Title Case (h1–h4)
- Status: MERGED
- Branch: `feat/launch-prep-batch-2` (Item 2 of the launch-prep batch)
- Evidence: merged via `ff71436` on 2026-04-28 (commit `c8f3bc9`).
- Notes: 64 hardcoded headings transformed across 34 files via
  one-shot Node script (not committed). Rule: first letter
  capitalised, rest lowercase. Brand / acronym / product-name
  exemptions: Sparq, Stripe, Google, iCal, KYC, FAQ, GST, ABN,
  MFA, URL, SMS, PDF, CSV, IDs, AUSTRAC. Dynamic-content headings
  (24 instances — service titles, names, page-title props) left
  unchanged per the proper-noun exemption. 4 manual fixes after
  diff review: "Stripe Connect" restored, three multi-sentence
  headings re-capitalised after `.`/`?`. Pure UI text rewrite —
  no schema or logic change.

### FIND-22 — Search 500 + ratings raw-SQL rename follow-up
- Status: MERGED
- Branch: `fix/search-500-raw-sql-rename`
- Evidence: merged via `3f96e74` on 2026-04-22 (commits `6975a69` +
  `1b362b2`).
- Notes: The FIND-1/2/3 codemod renamed `Payout.providerId` →
  `Payout.providerUserId` etc. across all Prisma reads, but missed
  the raw-SQL queries that compute homepage / nearby / search
  rating aggregates. Result was a 500 on `/search` immediately
  after FIND-1/2/3 merged. This branch landed the raw-SQL column
  renames and an audit pass that caught additional drift in the
  homepage and nearby routes. Distinct work from FIND-1/2/3 (the
  codemod), so tracked as its own FIND.

### FIND-23 — Availability profile / booking-wizard mismatch (Batch B Items 3+4)
- Status: MERGED
- Branch: `fix/availability-profile-booking-mismatch`
- Evidence: merged via `0f11321` on 2026-04-24 (commit `b87b999`).
- Notes: TZ-safe Sydney-local 30-day walk in
  `src/app/api/providers/[id]/route.ts` ensures the dates an artist
  appears available on their profile match what the booking wizard
  shows. Also seeded 112 availability sentinel rows across 16
  providers so the empty-seed waitlist CTA at FIND-10 doesn't fire
  for new artists. Three distinct bugs investigated; #1 (FIND-1
  class widget id mismatch) was superseded by Batch A Item 7 (the
  inline-calendar removal — branch
  `fix/remove-provider-profile-calendar`, not yet merged; see
  Decisions log 2026-04-24).

### FIND-24 — Address validation (Batch B Item 5, structural — no Places SDK)
- Status: MERGED
- Branch: `fix/address-validation-booking-and-service-area`
- Evidence: merged via `0c3e6ed` on 2026-04-24 (commit `627e025`).
- Notes: Shared `src/lib/address-validation.ts` module — two
  validators (`isValidBookingAddress`, `isValidServiceArea`) used by
  client + server so both layers agree. Customer booking address
  needs a street number; artist service area needs "Suburb [,] STATE
  postcode". 15 unit tests. Option C from the original 3-option
  proposal: pure structural validation, no Google Places SDK
  (deferred to a post-launch session if needed).

### FIND-25 — Booking time canonicalisation (was QA-001)
- Status: MERGED
- Branch: `fix/qa-001-booking-time-format`
- Evidence: merged via `f60d4ce` on 2026-04-22 (commit `54c3d5a`).
- Notes: Booking wizard now canonicalises time to 24h before POST
  and on URL hydration. Patched mid-recovery as a quality issue
  surfaced during validation. Originally tracked as QA-001;
  assigned a FIND-id at the 2026-04-28 brief refresh.

### FIND-26 — Artist upgrade role JWT propagation (was QA-002)
- Status: MERGED
- Branch: `fix/qa-002-artist-upgrade-role`
- Evidence: merged via `08e7f99` on 2026-04-22 (commit `44cf8d3`).
- Notes: When a customer upgrades to artist (`/api/user/upgrade-role`),
  the new role now propagates through the JWT correctly so the
  redirect to `/dashboard/provider` lands on the right page.
  Patched mid-recovery as a quality issue surfaced during validation.
  Originally tracked as QA-002; assigned a FIND-id at the
  2026-04-28 brief refresh.

---

## Cross-references

- **FIND-5 overlaps AUDIT-036.** Both describe AU Privacy Act
  APP 11.2 right-to-erasure. FIND-5 frames it as launch-blocking
  compliance; AUDIT-036 frames it as retention-matrix policy. The
  implementation is one endpoint + one cron + one anonymisation
  pass; resolve together once AUDIT-036 decision lands.
- **FIND-9 overlaps AUDIT-008.** Contradictory verdicts on the same
  PDF-receipt question. Tiebreak blocked on AUDIT-003 (GST model);
  see FIND-9 and AUDIT-008 notes.
- **FIND-2 was structurally enabled by FIND-12.** Both closed
  together by the FIND-1/2/3 unification (`98a7cb5`); the rename
  created a real `@relation` with FK and removed the structural
  weakness in one pass.
- **FIND-3 is enabled by FIND-13.** FIND-3 itself merged via
  `98a7cb5`, but FIND-13 (the bare-catch anti-pattern) is still
  OPEN — the silent-catch sites elsewhere remain.
- **FIND-7 is blocked by AUDIT-013.** Policy enforcement can't be
  implemented until the tiers are ratified.
- **AUDIT-001 was product-blocked by AUDIT-002**, then both
  collapsed by the 2026-04-27 premium-tier removal. AUDIT-001 is
  SUPERSEDED, AUDIT-002 is COLLAPSED to "is 15 % the right number?"
- **AUDIT-009/012 are MERGED but product-gated by AUDIT-013** for
  full activation — surfaced values are pre-ratification defaults
  until the tier decision lands.
- **FIND-18 cross-references AUDIT-021 + FIND-11.** All three
  touch the payout pipeline. AUDIT-021 (reconciliation cron) and
  FIND-18 (tip transfer) MERGED; FIND-11 (duplicate webhook routes)
  still OPEN.
- **FIND-22 is the codemod follow-up to FIND-1/2/3.** The Prisma
  rename codemod didn't touch raw-SQL queries; FIND-22 cleaned
  those up the same evening.
- **FIND-23 cross-references FIND-10.** FIND-23's seed of 112
  availability sentinel rows ensures FIND-10's empty-seed waitlist
  CTA doesn't fire for new artists. FIND-10 itself (the cron
  always returning null) is still OPEN.

## Escalations

| Id | Decision needed | Blocking | Escalated | Owner |
|---|---|---|---|---|
| AUDIT-002 | Is single flat 15 % the right commission rate? (collapsed scope after premium-tier removal) | Future commission ratification | 2026-04-21; collapsed 2026-04-27 (`Decisions log`) | Legal + Finance |
| AUDIT-003 | Merchant-of-record vs conduit for GST | AUDIT-008 receipt content; FIND-9 tiebreak; Stripe Tax enablement; `Booking.gstAmount` schema | 2026-04-21 | Finance + Legal |
| AUDIT-010 | Strict vs soft-launch KYC gate + hold-timer length | First-booking provider flow; AUSTRAC posture | 2026-04-21 | Compliance + Product |
| AUDIT-013 | Ratify 6/24/48h tiers, or add NO_REFUND/CUSTOM | FIND-7 refund enforcement; AUDIT-009/012 full activation | 2026-04-21 | Ops + Legal |
| AUDIT-015 | Dispute SLA + escalation cutoffs | Auto-escalate cron; T&S headcount | 2026-04-21 | Ops lead |
| AUDIT-016 | Review takedown bar + appeal path | Review moderation UI; audit-log fields | 2026-04-21 | T&S + Legal |
| AUDIT-020 | Pricing-transparency level | Booking-confirm + receipt layout; ACL s.48 | 2026-04-21 | Legal + Product |
| AUDIT-036 | Data retention matrix (hard vs soft; 2y/7y timers) | FIND-5 | 2026-04-21 | Legal + Privacy |
| FIND-4 | Published ToS text + existing-user re-prompt strategy (engineering MERGED 2026-04-22; placeholder version `v1-placeholder` still in code) | Launch | 2026-04-21 (`READINESS_OUTPUT.md`) | Legal + Product |
| FIND-5 | Deletion UX and retention (overlaps AUDIT-036) | Launch; APP 11.2 | 2026-04-21 | Legal + Privacy |
| FIND-6 | Narrow transactional-list legal review + bounce SLA (engineering MERGED 2026-04-22; 5 helpers tagged transactional, all others marketing) | Launch; Spam Act 2003 | 2026-04-21 | Legal + Marketing |
| — | Rebase / combined-PR strategy for stacked audit branches | Merges from `fix/audit-*` | 2026-04-22 (this brief) | Engineering (decided — see Decisions log) |
| — | Prisma schema-drift commit vs revert | All merges | 2026-04-22 | Engineering (decided — see Decisions log) |

## Decisions log

- **2026-04-22 — Build drift resolution.** The schema drift
  (~253 lines) + 260 modified/new `src/**` files + 18 Playwright
  specs + 3 authored-untracked migration directories are committed
  to `chore/commit-schema-drift` at commit `430b5d9`. The
  migration-history brokenness (initial `20260307` migration
  outdated, `AccountStatus` not created, shadow DB can't replay) is
  scoped out — tracked as a follow-up Phase (M2 baseline-squash or
  M3 history-fix). Done via Phase 1 of `RECOVERY_BRIEF.md`.
- **2026-04-22 — Stacked-branch strategy.** Each `fix/audit-*`
  branch to be rebased onto post-drift main as an independent PR
  in Phase 4 of `RECOVERY_BRIEF.md` (one at a time, with backup
  tags, with approval gates). Combined-PR fallback reserved for
  branches whose "own" commits turn out to be coupled to a deeper
  stack during rebase.
- **2026-04-22 — FIND-id collision resolution.** ROOT_CAUSE
  definitions keep FIND-10..13. READINESS definitions renumbered to
  FIND-14..17, descriptions unchanged. No code/test/branch/commit
  references existed for the old numbers; the rename is entirely
  documentation. Executed in `docs/reconcile-find-ids` at commit
  `4477f74`. Phase 2 of `RECOVERY_BRIEF.md`.
- **2026-04-22 — Escalation-description baseline.** The
  conversational escalation descriptions used in the Phase 0
  state-of-repo prompt for AUDIT-002 ("$0 booking payout funding
  source"), AUDIT-003 ("provider ban refund source"), AUDIT-013
  ("deposit system scope") and AUDIT-020 ("per-service availability
  scope") were incorrect. `ESCALATIONS.md` on
  `docs/escalations-memo` is the source of truth; all AUDIT
  descriptions in this brief match that memo. Phase 0 discrepancy
  note removed from the queue; preserved here as a one-off
  correction record.
- **2026-04-22 — Workflow: local merge only.** Effective
  mid-session per the "Workflow Update: Local Merge Only"
  instruction. No branches pushed, no PRs opened by the agent.
  Human handles `git merge` + optional backup push locally.
  Branches in this brief labelled `IN_REVIEW` reflect this
  workflow — they have a committed branch awaiting human local
  merge rather than an open GitHub PR.
- **2026-04-22 (afternoon) — Audit + FIND merge cascade.** Ten
  audit branches landed on this date as the post-recovery batch:
  AUDIT-001 / 004 / 005 / 006 / 007 / 009 / 012 / 014 / 017 / 021,
  plus AUDIT-011 in two parts (lib partial + UI integration) and
  AUDIT-037 hand-authored variant. Plus the FIND queue:
  FIND-1/2/3 unification (`98a7cb5`), FIND-4 ToS consent
  (`cb92a7b`), FIND-6 email unsubscribe (`3613a13`). Mid-batch
  quality patches FIND-25 (booking time canonicalisation, ex-QA-001)
  and FIND-26 (artist upgrade JWT, ex-QA-002) also landed. Same
  evening the FIND-1/2/3 codemod surfaced a raw-SQL regression
  (homepage / nearby / search 500); FIND-22 (`3f96e74`) cleaned it
  up. AUDIT-002 noted as not-yet-actioned; AUDIT-013 / 015 / 016 /
  020 / 036 still escalated.
- **2026-04-24 — Booking flow & availability fixes (Batch B).**
  FIND-23 (availability profile↔booking-wizard mismatch + empty-seed
  waitlist coverage) and FIND-24 (address validation, structural —
  no Places SDK) merged. Batch A items 1, 2, 7 from the same
  planning round remain unmerged on their branches:
  `fix/booking-hide-past-time-slots` (hide past time slots),
  `fix/booking-lead-time-by-policy-tier` (per-artist lead time),
  `fix/remove-provider-profile-calendar` (remove inline calendar
  from profile). Status pending.
- **2026-04-25 — CI infrastructure landed.** GitHub Actions
  workflow at `.github/workflows/ci.yml` with 4 jobs (typecheck,
  build, test, lint). Lint uses `continue-on-error: true` due to
  65 pre-existing errors documented in STATE_OF_REPO.md. The 55
  pre-existing failing tests at the time of CI setup were wrapped
  in `it.failing()` / `test.failing()` so the test job runs green
  (jest 29's `test.failing` semantics: "test passes when it fails"
  — silent fixes break CI, forcing un-`.failing`-ing). Merged via
  `f16cd40`. Future cleanup: drop `continue-on-error` on lint.
- **2026-04-27 — Premium tiers removed.** Customer PREMIUM
  membership and artist NEWCOMER/RISING/TRUSTED/PRO/ELITE tiers
  were removed in their entirety on `feat/remove-premium-tiers`
  (4 commits). All artists now pay a single flat 15 % commission;
  all bookings have a flat 24 h accept window once payment is
  authorised. AUDIT-001 superseded; AUDIT-002 collapsed to "is
  15 % the right number?" as a future Legal/Finance ratification.
  CI test baseline shifts: 55 failing / 414 passing →
  **0 failing / 423 passing.** The 55 pre-existing `.failing`
  tests were all tier-shaped mocks that got removed alongside
  the code they tested; the new green baseline should be reflected
  in `.github/workflows/ci.yml` documentation on the next CI sync.
  Stripe Dashboard cleanup checklist (archive Products/Prices,
  cancel test-mode subscriptions) handed off to the human
  manually — no programmatic equivalent.
- **2026-04-28 — Launch prep batch 2 shipped.** Three independent
  changes on `feat/launch-prep-batch-2` (merged via `ff71436`):
  FIND-19 (provider bio field removed), FIND-20 (ServiceCategory
  restricted to NAILS / LASHES / MAKEUP, with 3 MAKEUP providers
  seeded for parity), FIND-21 (h1–h4 headings normalised to Title
  Case across 34 files with brand/acronym exemptions).
- **2026-04-28 — FIND-18 tip payout fix shipped.** Pre-existing P0
  caught during Item 6a investigation a week earlier (tips were
  captured from customers but never transferred to artists at any
  of four completion paths). Fix sat on `fix/find-18-tip-payout`
  for several days before merging via `81a691e`. The 2026-04-28
  brief refresh recorded the merge after the fact (the original
  FIND-18 branch's brief edits hit a merge conflict; resolved by
  taking main's version, with the Phase 2 brief refresh adding
  FIND-18 to the brief properly).
- **2026-04-28 — Brief refresh.** This file refreshed against
  current main state. Items reconciled from `IN_REVIEW` →
  `MERGED` based on actual merge SHAs; FIND-18 through FIND-26
  added (8 new FIND entries — FIND-18 tip payout, FIND-19/20/21
  launch-prep batch 2, FIND-22 codemod follow-up, FIND-23/24
  Batch B, FIND-25/26 ex-QA-001/002). "Notes on the queue"
  rewritten — the stale "main has only Initial commit" claim
  replaced with current state. Cross-references updated. Decisions
  log appended. Escalations table updated (AUDIT-002 collapse,
  FIND-4 / FIND-6 partial completion).
