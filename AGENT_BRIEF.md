# Sparq Bug Fix Agent Brief

**This file is the source of truth.** Branches, commit messages,
conversational context, and agent working memory are NOT. When
assigning new AUDIT or FIND ids, commit to this file in the same PR.

Last updated: 2026-04-22
Last AUDIT-id assigned: AUDIT-037 (gaps exist — see Notes per id)
Last FIND-id assigned: FIND-17

## Status legend

- `OPEN` — not started
- `IN_PROGRESS` — branch exists, work underway
- `IN_REVIEW` — PR open (or in the post-2026-04-22 local-merge workflow,
  commit-on-branch awaiting human local merge)
- `MERGED` — landed in `main`
- `ESCALATED` — awaiting human decision
- `BLOCKED` — depends on another item (name it)
- `DUPLICATE` — consolidated (name the winner)
- `UNKNOWN` — evidence insufficient; see notes

## Notes on the queue

- The audit campaign described itself as "40-bug" in
  `BATCH_G_HANDBACK.md` (on `docs/escalations-memo`). 21 AUDIT ids are
  documented across all sources; the other 19 carry no surviving
  description and are marked `UNKNOWN`. See the bulk-UNKNOWN note at
  the end of the AUDIT section.
- PR surface is not verified in the current local-merge workflow
  (see Decisions log). Branches with finished-looking diffs are
  recorded as `IN_REVIEW` on the assumption the human will merge
  locally.
- `main` has only the single `Initial commit`. Nothing in the queue
  is `MERGED` other than AUDIT-008 (a documented no-op — no code
  change, deliberately closed).

---

## AUDIT queue

### AUDIT-001 — Subscription tier enforcement
- Status: IN_REVIEW
- Branch: `fix/audit-001-subscription-tier-enforcement` (ahead 5, files 13)
- Evidence: commit `fc0e6fb`;
  [BATCH_G_HANDBACK.md](BATCH_G_HANDBACK.md) Shipped Branches row
- Notes: Product-blocked by AUDIT-002 (the commission rate schedule
  must be ratified before perk-gating is meaningful), but the code
  is written. Branch is stacked on 004/005/006/007 — cannot review
  in isolation without cherry-picking.

### AUDIT-002 — Commission rate schedule + disclosure
- Status: ESCALATED
- Branch: none
- Evidence: [ESCALATIONS.md §AUDIT-002](ESCALATIONS.md) on
  `docs/escalations-memo`
- Notes: Needs Legal + Finance sign-off on the rate card, T&Cs
  notice window, and onboarding disclosure copy. Recommended default
  per memo: Option 1 (keep dynamic tiers, publish the table, 30-day
  notice window). Owner: Legal (sign-off) + Finance + Product.

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
- Status: IN_REVIEW
- Branch: `fix/audit-004-availability-calendar` (ahead 4, files 10)
- Evidence: commit `b684821`
- Notes: Branch is stacked on 005/006/007. Adds `AvailabilityCalendar`
  component + 188 lines of tests; pure UI/contract addition.

### AUDIT-005 — Instant-book confirmation-page copy
- Status: IN_REVIEW
- Branch: `fix/audit-005-instant-book-confirmation-copy` (ahead 1, files 4)
- Evidence: commit `89e74b1`
- Notes: Smallest clean branch in the queue. `src/lib/booking-confirmation.ts`
  + snapshot test. Safe to merge first.

### AUDIT-006 — Login gate preserve state
- Status: IN_REVIEW
- Branch: `fix/audit-006-login-gate-preserve-state` (ahead 2, files 7)
- Evidence: commit `422efd3`
- Notes: Contains commits for 005 as well. Introduces
  `src/lib/booking-url-state.ts`.

### AUDIT-007 — Retry payment link preserves wizard state
- Status: IN_REVIEW
- Branch: `fix/audit-007-retry-payment-preserve-state` (ahead 3, files 7)
- Evidence: commit `7ef3c87`
- Notes: Contains 005/006 commits. Depends on the URL-state helper
  shared with 006.

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
- Status: IN_REVIEW (product-blocked by AUDIT-013)
- Branch: `fix/audit-009-012-cancellation-policy-visibility` (ahead 8, files 27)
- Evidence: commit `f7711b3`
- Notes: Bundled with AUDIT-012 in the same branch. Branch is the
  most stacked in the queue (carries 001/004/005/006/007/014/021
  commits as well). Merging before AUDIT-013 is ratified would
  surface unratified tier values to users.

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
- Status: IN_REVIEW (product-blocked by AUDIT-013)
- Branch: `fix/audit-009-012-cancellation-policy-visibility` (bundled with 009)
- Evidence: commit `f7711b3`
- Notes: Same bundled branch as AUDIT-009. Depends on AUDIT-013 for
  policy values to be meaningful before merge.

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
- Status: IN_REVIEW
- Branch: `fix/audit-014-chargeback-defense-ui` (ahead 7, files 22)
- Evidence: commit `8ac175d`
- Notes: Stacked on 001/004/005/006/007/021. Evidence upload +
  representment workflow in admin dashboard. Non-trivial diff;
  needs careful review.

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
- Status: IN_REVIEW
- Branch: `fix/audit-017-velocity-checks` (ahead 1, files 7)
- Evidence: commit `edb4a25`
- Notes: Clean isolated branch. Upstash-Redis-backed rate-limits
  on 5 routes (booking POST/PATCH/reschedule, disputes POST,
  gift-card purchase). Test coverage: 6 tests. Safe first-merge
  candidate.

### AUDIT-020 — Pricing / surcharge transparency
- Status: ESCALATED
- Branch: none
- Evidence: [ESCALATIONS.md §AUDIT-020](ESCALATIONS.md)
- Notes: ACL s.48 component-pricing call. Recommended default per
  memo: Option 2 (two-line disclosure pre-pay: service + booking
  fee).

### AUDIT-021 — Payment reconciliation cron for dropped webhooks
- Status: IN_REVIEW
- Branch: `fix/audit-021-payment-reconciliation-cron` (ahead 6, files 17)
- Evidence: commit `3de6e3e`
- Notes: Stacked on 001/004/005/006/007. Adds
  `/api/cron/reconcile-payments` + `vercel.json` with 8 cron
  schedules. Operational-safety addition.

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
- Status: OPEN
- Branch: none
- Evidence: [READINESS_OUTPUT.md line 33](READINESS_OUTPUT.md),
  [ROOT_CAUSE_OUTPUT.md §2.6](ROOT_CAUSE_OUTPUT.md)
- Notes: `/api/providers/[id]` uses `ProviderProfile.id`; sibling
  `/api/providers/[id]/availability` uses `User.id` (at
  `src/app/api/providers/[id]/availability/route.ts:78,100`). Book
  page (`src/app/providers/[id]/page.tsx:272`) passes `profile.id`
  to both. 1-line fix; regression test needed.

### FIND-2 — Payout history always empty
- Status: OPEN
- Branch: none
- Evidence: READINESS_OUTPUT.md line 34, ROOT_CAUSE_OUTPUT.md §2.2
- Notes: Payout writes at `src/app/api/bookings/[id]/route.ts:126,171`
  store `ProviderProfile.id`; dashboard reads at
  `src/app/api/dashboard/provider/payout-history/route.ts:31` use
  `session.user.id`. Four writer sites need fixing, plus backfill
  migration. **Structurally enabled by FIND-12** (no FK on
  `Payout.providerId`); fix FIND-12 first or alongside.

### FIND-3 — Silent notification FK violation
- Status: OPEN
- Branch: none
- Evidence: READINESS_OUTPUT.md line 35, ROOT_CAUSE_OUTPUT.md §2.4
- Notes: `src/app/api/cron/process-payouts/route.ts:235` writes
  `userId: payout.providerId` (a ProviderProfile.id) into
  `Notification.userId` which FKs to `User.id`. Fails, gets
  swallowed by `.catch(() => {})` — see FIND-13 for the enabling
  anti-pattern.

### FIND-4 — No ToS consent capture (compliance blocker)
- Status: ESCALATED
- Branch: none
- Evidence: READINESS_OUTPUT.md line 36
- Notes: `User` model has no `termsAcceptedAt` / `termsVersion`
  fields; register schema does not accept consent. Needs legal
  decision on policy version, notice period, existing-user
  soft-gate strategy. Owner: Legal + Product.

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
- Status: ESCALATED
- Branch: none
- Evidence: READINESS_OUTPUT.md line 38
- Notes: AU Spam Act 2003 requires a functional unsubscribe on every
  commercial electronic message. `src/lib/email.ts` has 20
  templates and no unsubscribe footer. Needs decision on email
  categories (transactional vs marketing), token signing, and
  unsubscribe SLA. Owner: Legal + Marketing.

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
- Status: OPEN
- Branch: none
- Evidence: [ROOT_CAUSE_OUTPUT.md §2.2 + §4](ROOT_CAUSE_OUTPUT.md)
- Notes: `Payout.providerId` is a plain `String` with no Prisma
  `@relation`, no Postgres FK constraint, no `@@index([providerId])`.
  This is the structural weakness that made FIND-2 and FIND-3
  possible and undetected. DB currently has 0 payouts — this is the
  cheap moment to pick an id scheme and add the FK. Fix FIND-12
  first; FIND-2 becomes a trivial one-line rewrite with a loud
  migration error if it ever regresses.

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
- **FIND-2 is structurally enabled by FIND-12.** Fix FIND-12 (FK
  constraint) first, and FIND-2 becomes both trivial and
  future-proof. Sequencing matters.
- **FIND-3 is enabled by FIND-13.** The swallowed FK violation was
  invisible only because of the bare-catch. Fix FIND-13 first and
  FIND-3 would have been loud in logs months ago.
- **FIND-7 is blocked by AUDIT-013.** Policy enforcement can't be
  implemented until the tiers are ratified.
- **AUDIT-001 is product-blocked by AUDIT-002.** Subscription-tier
  perks can't launch until the rate card is ratified, even though
  the code is done.
- **AUDIT-009/012 are product-blocked by AUDIT-013** (same reason).

## Escalations

| Id | Decision needed | Blocking | Escalated | Owner |
|---|---|---|---|---|
| AUDIT-002 | Commission rate schedule + T&Cs disclosure + notice window | AUDIT-001 in-code implementation; tier perks | 2026-04-21 (`ESCALATIONS.md`) | Legal + Finance + Product |
| AUDIT-003 | Merchant-of-record vs conduit for GST | AUDIT-008 receipt content; FIND-9 tiebreak; Stripe Tax enablement; `Booking.gstAmount` schema | 2026-04-21 | Finance + Legal |
| AUDIT-010 | Strict vs soft-launch KYC gate + hold-timer length | First-booking provider flow; AUSTRAC posture | 2026-04-21 | Compliance + Product |
| AUDIT-013 | Ratify 6/24/48h tiers, or add NO_REFUND/CUSTOM | FIND-7 refund enforcement; AUDIT-009/012 merges | 2026-04-21 | Ops + Legal |
| AUDIT-015 | Dispute SLA + escalation cutoffs | Auto-escalate cron; T&S headcount | 2026-04-21 | Ops lead |
| AUDIT-016 | Review takedown bar + appeal path | Review moderation UI; audit-log fields | 2026-04-21 | T&S + Legal |
| AUDIT-020 | Pricing-transparency level | Booking-confirm + receipt layout; ACL s.48 | 2026-04-21 | Legal + Product |
| AUDIT-036 | Data retention matrix (hard vs soft; 2y/7y timers) | FIND-5 | 2026-04-21 | Legal + Privacy |
| FIND-4 | ToS consent fields + version gate on existing users | Launch | 2026-04-21 (`READINESS_OUTPUT.md`) | Legal + Product |
| FIND-5 | Deletion UX and retention (overlaps AUDIT-036) | Launch; APP 11.2 | 2026-04-21 | Legal + Privacy |
| FIND-6 | Email categories + unsubscribe SLA | Launch; Spam Act 2003 | 2026-04-21 | Legal + Marketing |
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
