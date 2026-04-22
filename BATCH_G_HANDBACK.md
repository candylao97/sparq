# Batch G — Handback Report

**Date:** 2026-04-21
**Scope:** Close-out of the 40-bug audit pass across Batches A–G
**Author:** Claude (engineering triage)

---

## TL;DR

- **8 of 40 items shipped as code** on dedicated `fix/audit-NNN-*`
  branches. All ready to open as PRs against `main`.
- **1 of 40 items** is a no-op (AUDIT-008 — the PDF receipt use case is
  already served by the browser-print flow; documented inline on the
  relevant branch).
- **8 of 40 items** are held back for business / legal / compliance
  sign-off; consolidated into `ESCALATIONS.md` on branch
  `docs/escalations-memo`.
- **23 of 40 items** are outside the scope of this session's work pass
  and were either (a) already covered by earlier commits, (b) pure
  UI/UX polish that wasn't blocking launch, or (c) deferred by the
  operator. This report does not cover them.

---

## Shipped branches

Each branch is cut from `main` (commit `f15caca`) and carries the
AUDIT-NNN change plus any transitive fixes that were stacked from
earlier branches in the same session. The "Clean delta" column tells
you what the branch contributes that isn't already on `main`.

| Branch | Audit ID | Clean delta | Summary |
|--------|----------|------------:|---------|
| `fix/audit-001-subscription-tier-enforcement` | 001 | 5 commits | Provider tier resolution now requires an active Stripe subscription. Prevents tier perks (reduced commission) leaking to lapsed subscribers. |
| `fix/audit-021-payment-reconciliation-cron` | 021 | 6 commits | New cron walks pending Stripe PaymentIntents hourly, reconciles status, and closes the dropped-webhook gap. |
| `fix/audit-014-chargeback-defense-ui` | 014 | 7 commits | Admin dashboard can now upload dispute evidence directly to Stripe Disputes API; prevents auto-loss on representment deadline. |
| `fix/audit-009-012-cancellation-policy-visibility` | 009, 012 | 8 commits | Cancellation policy is now shown on artist profile, editable from settings, and surfaces the refund window before customer confirms a booking. |
| `fix/audit-011-next-payout-visibility` | 011 | 1 commit | New `NextPayoutCard` on provider dashboard + extended payouts summary showing the next scheduled payout, total queued, and overdue status. |
| `fix/audit-017-velocity-checks` | 017 | 1 commit | Redis-backed rate-limit gates on 5 high-value endpoints (booking POST/PATCH/reschedule, disputes POST, gift-card purchase). Tier 1 by IP + tier 2 by user on create endpoints. |
| `fix/audit-037-no-show-timezone` | 037 | 1 commit | Two client-side `+10:00` hardcodes replaced with DST-aware `hoursUntilBooking()`. Fixes NO_SHOW button + refund-window boundaries during AEDT. |
| `docs/escalations-memo` | (memo) | 1 commit | The 8 escalated items consolidated for owner sign-off. |

### AUDIT-008 — no-op

AUDIT-008 requested a PDF receipt. The existing `ReceiptModal` + the
browser's native "Save as PDF" print flow already produces a readable,
brandable receipt without a server-side PDF pipeline. The cost of
adding e.g. `@react-pdf/renderer` isn't justified against a use case
already served. Documented inline on the cancellation-policy branch in
the commit that covers the receipt-flow audit crossref; no code
change.

---

## Test posture

Every shipped fix includes unit or integration tests that lock in the
intended behaviour:

| Audit | Tests added | Status |
|-------|-------------|--------|
| 001 | subscription-tier resolution | ✅ pass |
| 009/012 | cancellation-policy normalisation, 16 tests | ✅ pass |
| 011 | `next-payout` helper, 10 tests | ✅ pass |
| 014 | chargeback defense route | ✅ pass |
| 017 | booking velocity, 6 tests | ✅ pass |
| 021 | reconciliation cron | ✅ pass |
| 037 | booking-time DST, 10 tests | ✅ pass |

**Pre-existing test failures not caused by this session:**

- `src/__tests__/api/bookings.test.ts` — 4 PATCH tests fail against
  `[id]/route.ts` working-tree drift (BL-3 `stripeAccountId` check).
  Verified unrelated to AUDIT-017: `git checkout main --
  src/app/api/bookings/[id]/route.ts` → 22/22 pass.
- `src/__tests__/utils/formatCurrency.test.ts` — 10 `getLocationLabel`
  assertions fail because the drift in `src/lib/utils.ts` renamed
  labels (e.g., "At Studio" → "At a studio"). Unrelated to AUDIT-037.

These are pre-existing drift on the `main` working tree, not
regressions introduced by this work pass. They should be cleaned up in
a separate sweep.

---

## Working-tree drift caveat

`main` HEAD (`f15caca Initial commit`) has ~150 files of working-tree
drift that gets implicitly pulled into any branch that touches a
drifted file. Where a shipped fix is small but the branch diff is
large, this is the cause. Every commit body where that applies carries
a "drift caveat" note. PR descriptions should echo the caveat so
reviewers focus on the deliberate change rather than the drift
reshuffle.

Recommendation: run a separate cleanup pass on `main` to either absorb
or revert the drift before merging any of these PRs. Otherwise each
merge conflict-resolves a fraction of the drift and the remaining
state stays hard to reason about.

---

## Escalations — 8 items

See `ESCALATIONS.md` on branch `docs/escalations-memo` for the full
memo. One-line summary per item:

| ID | Topic | Owner | Recommended default |
|----|-------|-------|---------------------|
| 002 | Commission rate confirmation | Legal + Finance | Keep tiered rates, publish rate card + T&Cs notice clause |
| 003 | GST / tax remittance model | Finance + Legal | Merchant of record, Stripe Tax on |
| 010 | KYC failure policy | Compliance | Time-boxed soft launch, KYC required before first payout |
| 013 | Refund / cancellation tiers | Ops + Legal | Ratify 6/24/48h tiers as-is, revisit at 3-month mark |
| 015 | Dispute SLA & escalation | Ops | 24h first-touch, 7d resolution, auto-escalate at 3d |
| 016 | Review moderation bar | T&S + Legal | Narrow takedown: PII / abuse / provably false |
| 020 | Pricing transparency | Legal + Product | Two-line disclosure pre-pay (service + booking fee) |
| 036 | Data retention & deletion | Legal + Privacy | Soft delete on request, hard delete after 7 years |

Effort estimate once decisions land: ~11–20 engineer-days total,
implementable in parallel.

---

## Suggested PR open order

1. **`fix/audit-017-velocity-checks`** — lowest-risk, critical for
   card-testing / refund-farming resistance. Merge first.
2. **`fix/audit-037-no-show-timezone`** — contained, isolated bug.
3. **`fix/audit-021-payment-reconciliation-cron`** — operational
   safety; catches dropped Stripe webhooks.
4. **`fix/audit-014-chargeback-defense-ui`** — stacks on 021; open
   after 021 merges.
5. **`fix/audit-001-subscription-tier-enforcement`** — revenue
   protection.
6. **`fix/audit-011-next-payout-visibility`** — pure UX add; ship any
   time after dashboard drift is resolved.
7. **`fix/audit-009-012-cancellation-policy-visibility`** — stacks on
   011; open after 011.
8. **`docs/escalations-memo`** — merge last, or land as a separate
   docs-only PR alongside the others.

---

## Next session's starting point

- If the escalation decisions come back before the next session, the
  8 policy-gated items can be implemented against the recommended
  defaults in ~11–20 engineer-days.
- If the 23 out-of-scope audit items need attention, start by re-
  triaging them against the new `main` once the working-tree drift
  cleanup has happened — doing that first avoids re-litigating drift
  in every branch.
