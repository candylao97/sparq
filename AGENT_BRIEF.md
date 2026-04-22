# Sparq Bug Fix Agent Brief

**This file is the source of truth.** Branches, commit messages,
conversational context, and agent working memory are NOT. When
assigning new AUDIT ids, commit to this file in the same PR.

Last updated: 2026-04-22
Last AUDIT-id assigned: AUDIT-037 (gaps exist — see Notes per id)
Last FIND-id assigned: FIND-13 (with a documented collision — see Notes)

## Status legend

- `OPEN` — not started
- `IN_PROGRESS` — branch exists, work underway
- `IN_REVIEW` — PR open
- `MERGED` — landed in `main`
- `ESCALATED` — awaiting human decision
- `BLOCKED` — depends on another item (name it)
- `DUPLICATE` — consolidated (name the winner)
- `UNKNOWN` — evidence insufficient; see notes

Notes on mapping:
- The audit campaign described itself as "40-bug" in
  [BATCH_G_HANDBACK.md](BATCH_G_HANDBACK.md) (on `docs/escalations-memo`), but
  only 21 AUDIT ids are documented across all sources. The other 19 are marked
  `UNKNOWN` here.
- No PR surface could be verified (`gh` not installed); branches with
  finished-looking diffs are recorded as `IN_REVIEW` on the assumption a PR
  will be opened. If you confirm no PR exists, downgrade to `IN_PROGRESS`.
- `main` has a single commit `f15caca Initial commit` — nothing in the queue
  is `MERGED` other than AUDIT-008 which is a documented no-op.

## Queue

### AUDIT-001 — Subscription tier enforcement
- Status: IN_REVIEW
- Branch: `fix/audit-001-subscription-tier-enforcement` (ahead 5, files 13)
- Evidence: commit `fc0e6fb`,
  [BATCH_G_HANDBACK.md](BATCH_G_HANDBACK.md) Shipped Branches row
- Notes: blocked in the product sense by AUDIT-002 (commission rate schedule
  has not been ratified), but the code is written. Branch is stacked on
  004/005/006/007 — review cannot be isolated without cherry-picking.

### AUDIT-002 — Commission rate schedule + disclosure
- Status: ESCALATED
- Branch: none
- Evidence: [ESCALATIONS.md §AUDIT-002](ESCALATIONS.md) on
  `docs/escalations-memo`
- Notes: Needs Legal + Finance sign-off on the rate card, T&Cs notice window,
  and onboarding disclosure copy. Recommended default per memo: Option 1
  (keep dynamic tiers, publish the table, 30-day notice window). Owner: Legal
  (sign-off) + Finance + Product. **The user prompt's description
  ("$0 booking payout funding source") is not supported by any on-repo
  source.**

### AUDIT-003 — GST / tax remittance model
- Status: ESCALATED
- Branch: none
- Evidence: [ESCALATIONS.md §AUDIT-003](ESCALATIONS.md)
- Notes: Needs Finance + Legal decision on merchant-of-record vs conduit.
  Blocks AUDIT-008 receipt design, Stripe Tax enablement, and
  `Booking.gstAmount` schema addition. Recommended default per memo: Option 1
  (merchant-of-record, Stripe Tax on). **The user prompt's description
  ("provider ban refund source") is not supported by any on-repo source.**

### AUDIT-004 — Availability calendar on provider profile
- Status: IN_REVIEW
- Branch: `fix/audit-004-availability-calendar` (ahead 4, files 10)
- Evidence: commit `b684821`, BATCH_G_HANDBACK Shipped Branches
- Notes: Branch is stacked on 005/006/007. Adds `AvailabilityCalendar`
  component + 188 lines of tests; pure UI/contract addition.

### AUDIT-005 — Instant-book confirmation-page copy
- Status: IN_REVIEW
- Branch: `fix/audit-005-instant-book-confirmation-copy` (ahead 1, files 4)
- Evidence: commit `89e74b1`
- Notes: Smallest clean branch in the queue. `src/lib/booking-confirmation.ts`
  + snapshot test. Safe to merge first if the build is unblocked.

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
- Notes: Contains 005/006 commits. Depends on the URL-state helper shared with
  006.

### AUDIT-008 — PDF receipt
- Status: MERGED (as a documented no-op)
- Branch: none
- Evidence: [BATCH_G_HANDBACK.md §AUDIT-008 — no-op](BATCH_G_HANDBACK.md)
- Notes: The handback report closes this out on the basis that the browser's
  "Save as PDF" print flow through `ReceiptModal` serves the use case without
  a server-side PDF pipeline. **FIND-9 in `READINESS_OUTPUT.md` contradicts
  this closure** — it treats the lack of a PDF receipt as a launch-blocker.
  A product decision is needed to reconcile the two. Until reconciled, treat
  this as `BLOCKED — FIND-9 disagreement`.

### AUDIT-009 — Cancellation policy visibility on artist profile
- Status: IN_REVIEW
- Branch: `fix/audit-009-012-cancellation-policy-visibility` (ahead 8, files 27)
- Evidence: commit `f7711b3`
- Notes: Bundled with AUDIT-012 in the same branch. Branch is the most
  stacked in the queue (carries 001/004/005/006/007/014/021 commits as well).
  Blocked on AUDIT-013 (tier ratification) before merge — until the tiers are
  ratified, surfacing them in UI is premature.

### AUDIT-010 — KYC + identity verification policy
- Status: ESCALATED
- Branch: none
- Evidence: [ESCALATIONS.md §AUDIT-010](ESCALATIONS.md)
- Notes: Needs Compliance + Product decision. Recommended default per memo:
  Option 3 (time-boxed 7-day soft launch, require KYC before first payout).
  Blocks first-booking flow UX changes for providers. **User prompt's
  description matches this entry (KYC cold-start compliance).**

### AUDIT-011 — Next payout visibility
- Status: IN_REVIEW
- Branch: `fix/audit-011-next-payout-visibility` (ahead 1, files 6)
- Evidence: commit `b91cd06`
- Notes: Adds `src/lib/next-payout.ts` + dashboard `NextPayoutCard`. Clean
  isolated branch; safe merge candidate after build is unblocked.

### AUDIT-012 — Cancellation policy editable from settings
- Status: IN_REVIEW
- Branch: `fix/audit-009-012-cancellation-policy-visibility` (bundled with 009)
- Evidence: commit `f7711b3`
- Notes: Same bundled branch as AUDIT-009. Depends on AUDIT-013 for policy
  values to be meaningful.

### AUDIT-013 — Refund / cancellation-policy tiers
- Status: ESCALATED
- Branch: none
- Evidence: [ESCALATIONS.md §AUDIT-013](ESCALATIONS.md)
- Notes: Needs Ops + Legal to ratify the FLEXIBLE / MODERATE / STRICT windows
  (6h / 24h / 48h) or expand to NO_REFUND / CUSTOM. Blocks FIND-7 (the code
  that would enforce the chosen policy). Recommended default per memo: Option 1
  (ratify as-is, revisit at 3-month mark). **The user prompt's description
  ("deposit system scope") is not supported by any on-repo source.**

### AUDIT-014 — Chargeback defense UI (Stripe Disputes API)
- Status: IN_REVIEW
- Branch: `fix/audit-014-chargeback-defense-ui` (ahead 7, files 22)
- Evidence: commit `8ac175d`
- Notes: Stacked on 001/004/005/006/007/021. Evidence upload + representment
  workflow in admin dashboard. Non-trivial diff; needs careful review.

### AUDIT-015 — Dispute SLA + escalation ladder
- Status: ESCALATED
- Branch: none
- Evidence: [ESCALATIONS.md §AUDIT-015](ESCALATIONS.md)
- Notes: Needs Ops lead to pick the SLA cutoffs. Recommended default per memo:
  Option 1 (24h first-touch, 7d resolution, 3d auto-escalate).

### AUDIT-016 — Review moderation & removal policy
- Status: ESCALATED
- Branch: none
- Evidence: [ESCALATIONS.md §AUDIT-016](ESCALATIONS.md)
- Notes: Needs T&S + Legal sign-off. Recommended default per memo: Option 1
  (narrow takedown: PII / abuse / provably false).

### AUDIT-017 — Velocity checks on high-value endpoints
- Status: IN_REVIEW
- Branch: `fix/audit-017-velocity-checks` (ahead 1, files 7)
- Evidence: commit `edb4a25`
- Notes: Clean isolated branch. Upstash-Redis-backed rate-limits on 5 routes
  (booking POST/PATCH/reschedule, disputes POST, gift-card purchase). Test
  coverage: 6 tests. Safe first-merge candidate.

### AUDIT-018 — unknown
- Status: UNKNOWN
- Branch: none
- Evidence: none
- Notes: The "40-bug audit" claim implies this id exists, but no source
  describes it. To resolve: find the original audit input or reassign.

### AUDIT-019 — unknown
- Status: UNKNOWN
- Branch: none
- Evidence: none
- Notes: Same as AUDIT-018.

### AUDIT-020 — Pricing / surcharge transparency
- Status: ESCALATED
- Branch: none
- Evidence: [ESCALATIONS.md §AUDIT-020](ESCALATIONS.md)
- Notes: ACL s.48 component-pricing call. Recommended default per memo:
  Option 2 (two-line disclosure pre-pay: service + booking fee). **The user
  prompt's description ("per-service availability scope") is not supported
  by any on-repo source.**

### AUDIT-021 — Payment reconciliation cron for dropped webhooks
- Status: IN_REVIEW
- Branch: `fix/audit-021-payment-reconciliation-cron` (ahead 6, files 17)
- Evidence: commit `3de6e3e`
- Notes: Stacked on 001/004/005/006/007. Adds `/api/cron/reconcile-payments`
  + `vercel.json` with 8 cron schedules. Operational-safety addition.

### AUDIT-022 through AUDIT-035 — unknown
- Status: UNKNOWN
- Branch: none
- Evidence: none (except AUDIT-036 which IS documented)
- Notes: [BATCH_G_HANDBACK.md](BATCH_G_HANDBACK.md) states "23 of 40 items are
  outside the scope of this session's work pass" — this range likely overlaps
  with those 23 but without the original input doc the ids cannot be
  reconstructed.

### AUDIT-036 — Data retention & account deletion
- Status: ESCALATED
- Branch: none
- Evidence: [ESCALATIONS.md §AUDIT-036](ESCALATIONS.md)
- Notes: Needs Legal + Privacy decision. Recommended default per memo:
  Option 2 (soft delete on request, hard delete after 7 years). Blocks
  FIND-5 implementation. Cost once decided: ~3–5 engineer-days.

### AUDIT-037 — No-show timezone / DST handling
- Status: IN_REVIEW
- Branch: `fix/audit-037-no-show-timezone` (ahead 1, files 3)
- Evidence: commit `e4402bf`
- Notes: Clean isolated branch. Replaces two hardcoded `+10:00` offsets with
  `hoursUntilBooking()` helper; 10 tests. Safe merge candidate.

### AUDIT-038 through AUDIT-040 — unknown
- Status: UNKNOWN
- Branch: none
- Evidence: none
- Notes: Same as AUDIT-022–035. Likely part of the "23 out-of-scope" set.

---

### FIND-1 — Availability endpoint 404 (id-scheme mismatch)
- Status: OPEN
- Branch: none
- Evidence: [READINESS_OUTPUT.md line 33](READINESS_OUTPUT.md),
  [ROOT_CAUSE_OUTPUT.md §2.6](ROOT_CAUSE_OUTPUT.md)
- Notes: `/api/providers/[id]` uses `ProviderProfile.id`; sibling
  `/api/providers/[id]/availability` uses `User.id` (at
  `src/app/api/providers/[id]/availability/route.ts:78,100`). Book page
  (`src/app/providers/[id]/page.tsx:272`) passes `profile.id` to both.
  1-line fix; regression test needed.

### FIND-2 — Payout history always empty
- Status: OPEN
- Branch: none
- Evidence: READINESS_OUTPUT.md line 34, ROOT_CAUSE_OUTPUT.md §2.2
- Notes: Payout writes at `src/app/api/bookings/[id]/route.ts:126,171` store
  `ProviderProfile.id`; dashboard reads at
  `src/app/api/dashboard/provider/payout-history/route.ts:31` use
  `session.user.id`. Four writer sites need fixing, plus backfill migration.

### FIND-3 — Silent notification FK violation
- Status: OPEN
- Branch: none
- Evidence: READINESS_OUTPUT.md line 35, ROOT_CAUSE_OUTPUT.md §2.4
- Notes: `src/app/api/cron/process-payouts/route.ts:235` writes
  `userId: payout.providerId` (a ProviderProfile.id) into `Notification.userId`
  which FKs to `User.id`. Fails, gets swallowed by `.catch(() => {})`.

### FIND-4 — No ToS consent capture (compliance blocker)
- Status: ESCALATED
- Branch: none
- Evidence: READINESS_OUTPUT.md line 36
- Notes: `User` model has no `termsAcceptedAt` / `termsVersion` fields; register
  schema does not accept consent. Needs legal decision on policy version, notice
  period, existing-user soft-gate strategy. Owner: Legal + Product.

### FIND-5 — No user-initiated account deletion (compliance blocker)
- Status: ESCALATED (overlaps AUDIT-036)
- Branch: none
- Evidence: READINESS_OUTPUT.md line 37
- Notes: APP 11.2 requires destruction/de-identification of personal info no
  longer needed. `/api/account-settings` exposes GET/PUT only. The
  implementation choice (hard vs soft delete, retention timers) is the
  AUDIT-036 decision — **these two items must be resolved together**.

### FIND-6 — No email unsubscribe mechanism (compliance blocker)
- Status: ESCALATED
- Branch: none
- Evidence: READINESS_OUTPUT.md line 38
- Notes: AU Spam Act 2003 requires a functional unsubscribe on every
  commercial electronic message. `src/lib/email.ts` has 20 templates and no
  unsubscribe footer. Needs decision on email categories (transactional vs
  marketing), token signing, and unsubscribe SLA. Owner: Legal + Marketing.

### FIND-7 — Cancellation policy stored but not enforced
- Status: OPEN (blocked by AUDIT-013)
- Branch: none
- Evidence: READINESS_OUTPUT.md line 39
- Notes: `ProviderProfile.cancellationPolicyType` is persisted but
  `src/app/api/bookings/[id]/route.ts:84-99` always refunds 100% regardless.
  Cannot implement enforcement until AUDIT-013 tier decision is made.

### FIND-8 — Double-booking race
- Status: OPEN
- Branch: none
- Evidence: READINESS_OUTPUT.md line 40
- Notes: No DB unique on `(providerId, date, time)`, no `SELECT … FOR UPDATE`.
  Two concurrent POSTs on the same slot can both pass the check. Needs schema
  migration + row-level lock or unique constraint.

### FIND-9 — No PDF receipt (contradicts AUDIT-008 no-op ruling)
- Status: BLOCKED — conflicts with AUDIT-008
- Branch: none
- Evidence: READINESS_OUTPUT.md line 41, BATCH_G_HANDBACK.md §AUDIT-008
- Notes: Same day, same author, two different verdicts. Product call needed.
  If FIND-9 wins, AUDIT-008 reopens. If AUDIT-008 wins, this FIND closes as
  WONTFIX.

### FIND-10 — AMBIGUOUS (two definitions in two docs)
- Status: OPEN
- Branch: none
- Evidence: READINESS_OUTPUT.md line 42 AND ROOT_CAUSE_OUTPUT.md §2.7
- Notes: **Collision.** READINESS says "no admin UI/API for PromoCode". ROOT_CAUSE
  says "waitlist cron never finds availability because
  `Availability.providerId` (ProviderProfile.id) is queried with
  `WaitlistEntry.providerId` (User.id), per
  `src/app/api/cron/notify-waitlist/route.ts:98`". Both are real bugs. One
  should be renumbered. Defer fixing until owner declares the canonical
  set.

### FIND-11 — AMBIGUOUS (two definitions in two docs)
- Status: OPEN
- Branch: none
- Evidence: READINESS_OUTPUT.md line 43 AND ROOT_CAUSE_OUTPUT.md §2.7
- Notes: Collision. READINESS says "search `gel nails` returns 0 while `gel`
  returns 3". ROOT_CAUSE says "two live Stripe webhook routes
  (`/api/stripe/webhooks` and `/api/webhooks/stripe`) that differ in
  event-type coverage". Defer until owner declares canonical set.

### FIND-12 — AMBIGUOUS (two definitions in two docs)
- Status: OPEN
- Branch: none
- Evidence: READINESS_OUTPUT.md line 44 AND ROOT_CAUSE_OUTPUT.md §2.7
- Notes: Collision. READINESS says "search/copy Melbourne vs seed-data drift".
  ROOT_CAUSE says "`Payout.providerId` has no `@relation`, no index, no FK
  constraint — the precondition that let FIND-2/3 exist". The ROOT_CAUSE
  version is structurally blocking. Defer until renumbering decision.

### FIND-13 — AMBIGUOUS (two definitions in two docs)
- Status: OPEN
- Branch: none
- Evidence: READINESS_OUTPUT.md line 45 AND ROOT_CAUSE_OUTPUT.md §2.7
- Notes: Collision. READINESS says "register endpoint 500s on zod validation
  errors instead of 400". ROOT_CAUSE says "77 bare `.catch(() => {})`
  wrappers across 34 files silently swallow FK violations and race-condition
  errors". Both are real. Defer until renumbering decision.

## Escalations

| Id | Decision needed | Blocking | Escalated | Owner |
|---|---|---|---|---|
| AUDIT-002 | Commission rate schedule + T&Cs disclosure + notice window | AUDIT-001 in-code implementation | 2026-04-21 (`ESCALATIONS.md`) | Legal + Finance + Product |
| AUDIT-003 | Merchant-of-record vs conduit for GST | AUDIT-008 receipt content; Stripe Tax; `Booking.gstAmount` schema | 2026-04-21 | Finance + Legal |
| AUDIT-010 | Strict vs soft-launch KYC gate + hold-timer length | First-booking provider flow; AUSTRAC posture | 2026-04-21 | Compliance + Product |
| AUDIT-013 | Ratify 6/24/48h tiers, or add NO_REFUND/CUSTOM | FIND-7 refund enforcement | 2026-04-21 | Ops + Legal |
| AUDIT-015 | Dispute SLA + escalation cutoffs | Auto-escalate cron; T&S headcount | 2026-04-21 | Ops lead |
| AUDIT-016 | Review takedown bar + appeal path | Review moderation UI; audit-log fields | 2026-04-21 | T&S + Legal |
| AUDIT-020 | Pricing-transparency level | Booking-confirm + receipt layout; ACL s.48 | 2026-04-21 | Legal + Product |
| AUDIT-036 | Data retention matrix (hard vs soft; 2y/7y timers) | FIND-5 | 2026-04-21 | Legal + Privacy |
| FIND-4 | ToS consent fields + version gate on existing users | Launch | 2026-04-21 (`READINESS_OUTPUT.md`) | Legal + Product |
| FIND-5 | Deletion UX and retention (overlaps AUDIT-036) | Launch; APP 11.2 | 2026-04-21 | Legal + Privacy |
| FIND-6 | Email categories + unsubscribe SLA | Launch; Spam Act 2003 | 2026-04-21 | Legal + Marketing |
| — | Rebase / combined-PR strategy for stacked audit branches | Any merge from `fix/audit-*` | 2026-04-22 (this brief) | Engineering |
| — | Prisma schema-drift commit vs revert | All merges | 2026-04-22 | Engineering |
| — | `FIND-9` vs `AUDIT-008` PDF-receipt tiebreak | Launch receipt design | 2026-04-22 | Product |
| — | Canonical meaning of `FIND-10` / `FIND-11` / `FIND-12` / `FIND-13` | Any fix for the ambiguous ids | 2026-04-22 | Audit author |

## Decisions log

*(Placeholder — future decisions captured here. No decisions recorded in
existing docs as of 2026-04-22; `ESCALATIONS.md` reads "No code in this PR
changes behaviour on any of these eight items" and the recommended defaults
are labelled as recommendations, not ratified choices.)*
