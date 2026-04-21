# Sparq — Audit Escalation Memo

**Date:** 2026-04-21
**Author:** Claude (engineering triage)
**Scope:** AUDIT-002, 003, 010, 013, 015, 016, 020, 036
**Audience:** Product / Ops / Legal owners of the 40-bug audit

---

## Purpose

During the Batch A–F work pass (completed audits: 001, 008, 009/012, 011,
014, 017, 021, 037), eight items were held back because they turn on a
business, policy, or compliance decision that an engineer should not make
unilaterally. This memo collects those items so the right owner can sign
off once, and Batch G can be closed out.

Each section below states:

- **The observable problem** — what the codebase actually does today
- **Why this is an escalation, not a bug fix** — the specific decision
  engineering cannot make on its own
- **Options on the table** — two or three realistic choices, with the
  tradeoffs we've already thought through
- **Recommended default** — what I'd ship if forced to choose, so the
  owner can either ratify it or counter-propose
- **Who owns the call** — the role we think should sign off
- **Rollout cost once the call is made** — rough effort to implement

No code in this PR changes behaviour on any of these eight items. They
are all documented against current master as of commit `f15caca`.

---

## AUDIT-002 — Commission rate confirmation (legal + finance)

**Observable problem.** `getCommissionRate()` in `src/lib/utils.ts`
hardcodes five tier rates (NEWCOMER 15% → ELITE 10%). `settings.ts`
lets Ops override them in-app, but there is no written policy attached
to those numbers, no version log, and no customer/artist disclosure
surface. Several audit comments mention the 85% artist take as if it
were contractual.

**Why this is an escalation.** Commission schedules are contractual
terms — changing them without notice is legally problematic in AU
(ACL s.18 misleading conduct, plus marketplace T&Cs). Before engineering
locks the values, Legal needs to confirm (a) the published rate card,
(b) the notice period for changing it, (c) how the tier mechanic is
disclosed to artists at onboarding.

**Options.**
1. **Keep dynamic tiers, publish the table.** Requires a T&Cs amendment
   and a new artist-facing "Your tier & commission" page.
2. **Collapse to a single flat rate for MVP.** Simpler disclosure, but
   abandons the tier-based incentive we built.
3. **Keep tiers but make all current artists grandfathered at NEWCOMER
   15%** until they opt into the new structure.

**Recommended default.** Option 1, with a 30-day notice window baked
into the T&Cs.

**Owner.** Legal (sign-off) + Finance (rate ratification) + Product
(disclosure UX).

**Cost once decided.** ~1 day engineering to add the disclosure page +
T&Cs version gate; ~0.5 day Legal review.

---

## AUDIT-003 — Artist tax / GST collection & remittance (finance + legal)

**Observable problem.** The booking pipeline captures payment on the
customer and forwards the artist share via Stripe Connect, but nowhere
in the code is GST separated out, invoiced to the customer, or remitted
to the ATO. Gift-card purchases compound the issue (pre-paid tax point
is ambiguous).

**Why this is an escalation.** Tax treatment in an AU marketplace
depends on whether Sparq is the **merchant of record** or a conduit:
- If MoR, Sparq collects GST on the full booking and remits.
- If conduit, each artist is responsible for their own GST once over the
  $75k threshold, and we only issue an RCTI (recipient-created tax
  invoice) or equivalent summary.

The platform's identity here is a tax-law question and drives schema,
invoicing, and Stripe Connect configuration.

**Options.**
1. **Merchant of record.** Cleanest for the customer (one invoice, GST
   line item). Adds compliance load on Sparq.
2. **Conduit / agent.** Each artist self-invoices. Simpler for Sparq,
   but creates a messy customer receipt.
3. **Hybrid: Sparq is MoR only for the booking fee, artists for the
   service.** Legally defensible and common, but the receipt is
   complicated to explain.

**Recommended default.** Option 1 (MoR). This matches how Airbnb AU
and ClassPass AU operate post-2023, is what customers expect, and is
the only model that lets us offer a clean tax invoice from the receipt
page we already built.

**Owner.** Finance (ATO registration) + Legal (MoR clause in T&Cs).

**Cost once decided.** ~3–5 days engineering (GST on Booking and
GiftVoucher, invoice PDF line item, Stripe Tax enablement, migration
of existing bookings).

---

## AUDIT-010 — KYC + identity verification policy (compliance)

**Observable problem.** Stripe Connect onboarding exists but is
partial. The artist can start taking bookings before Stripe KYC
completes (the route only checks `stripeAccountId`, not
`stripeChargesEnabled`). There is no written rule for what Sparq does
when KYC fails or lapses mid-lifetime (fraud hold policy, artist appeal
window, customer communication).

**Why this is an escalation.** KYC depth, data retention, and the
failed-KYC user experience are AUSTRAC-adjacent decisions, plus Stripe
has its own minimum bar for Connect accounts. Engineering can wire
whatever rules we're given, but we can't *pick* them.

**Options.**
1. **Strict: no bookings until Stripe charges_enabled = true.**
   Safest; highest friction for new artists.
2. **Soft launch: accept bookings, hold payout until KYC completes.**
   Current de facto behaviour; works until KYC is abandoned, at which
   point we have held funds with no clear escheat process.
3. **Time-boxed soft launch: accept bookings for 7 days, require KYC
   before the first payout attempt.** Balances friction and risk.

**Recommended default.** Option 3.

**Owner.** Compliance / Ops (fraud policy) + Product (onboarding UX).

**Cost once decided.** ~2 days engineering for the hold-timer, admin
queue, and artist-facing banner.

---

## AUDIT-013 — Refund & cancellation policy tiers (ops + legal)

**Observable problem.** The `CancellationPolicy` enum supports
FLEXIBLE / MODERATE / STRICT (6h / 24h / 48h windows). These windows
are used by `estimateRefund()` on the customer page and by the server
refund logic. The numeric values were set by developers based on
industry convention, not by Ops.

**Why this is an escalation.** Refund windows are a consumer-law
disclosure point under ACL and are also the biggest driver of dispute
volume. Getting them wrong costs Ops real money in chargeback defence.

**Options.**
1. **Ratify the current tiers as-is** and publish them in T&Cs.
2. **Add a fourth "NO_REFUND" tier** for premium services — some
   categories (e.g., bridal) warrant it.
3. **Add a "CUSTOM" tier** where artists can pick their own hours
   within guard-rails (min 6h, max 72h).

**Recommended default.** Option 1 for MVP, revisit at 3-month mark
based on dispute data.

**Owner.** Ops (policy) + Legal (T&Cs wording).

**Cost once decided.** 0 days (Option 1) to ~3 days (Option 3, new UX
on artist service-edit screen).

---

## AUDIT-015 — Dispute resolution SLA & escalation ladder (ops)

**Observable problem.** Disputes can be opened (`/api/disputes` POST)
and withdrawn (DELETE), but there is no written SLA for how quickly an
admin must respond, and no auto-escalation timer. A stale OPEN dispute
can sit indefinitely.

**Why this is an escalation.** This is an Ops staffing / SLA decision,
and the timer value directly affects T&S headcount planning.

**Options.**
1. **24h first-touch, 7d resolution, auto-escalate to T&S lead after
   3d.**
2. **48h first-touch, 14d resolution.**
3. **No hard SLA, admin works the queue FIFO.** (Default today.)

**Recommended default.** Option 1 — customers expect a quick ack even
if resolution takes longer.

**Owner.** Ops lead.

**Cost once decided.** ~1 day for the auto-escalation cron + admin
queue sort order.

---

## AUDIT-016 — Review moderation & removal policy (t&s)

**Observable problem.** Reviews can be flagged by users. Admin can
hide or restore. There is no written rule for what does and doesn't
warrant removal, and no customer-visible appeal path when a review is
taken down.

**Why this is an escalation.** Review manipulation is the single
biggest marketplace-trust risk. The policy bar ("removed only for
policy violation, not because the subject disagrees") needs Legal
sign-off or we risk defamation exposure either way — if we remove a
truthful negative review, or if we leave up a defamatory one.

**Options.**
1. **Narrow takedown bar:** PII, abusive language, provably false
   factual claims. Everything else stays.
2. **Wide takedown bar:** Artist can request review removal for any
   reason, admin reviews.
3. **No takedown, response-only:** Artist can reply to any review; no
   review ever removed except for PII / abuse.

**Recommended default.** Option 1.

**Owner.** T&S + Legal.

**Cost once decided.** ~2 days (policy page, appeal form, admin
decision log — audit log entries already exist).

---

## AUDIT-020 — Pricing / Surcharge transparency (legal)

**Observable problem.** The customer sees a single `totalPrice` on the
booking confirm screen. The implementation bundles platform fee,
service price, and (post-AUDIT-003) GST into that number. Surface
charges for peak-time, travel, or add-ons are not currently disclosed
as separate line items.

**Why this is an escalation.** ACL s.48 (component pricing) requires
that when a total price can be determined, it must be shown
prominently — but it's permissible to show a breakdown so long as the
single total is present. The legal call is about *what counts as one
price* (e.g., is the booking fee a Sparq charge or part of the service
price?).

**Options.**
1. **Single total, breakdown on receipt.** (Current.)
2. **Two-line disclosure pre-pay: service + booking fee.** Minimal
   friction, matches Airbnb.
3. **Full breakdown pre-pay.** Matches ClassPass, reduces post-pay
   surprise.

**Recommended default.** Option 2.

**Owner.** Legal + Product.

**Cost once decided.** ~0.5–1 day (book confirm screen, receipt
already supports breakdown).

---

## AUDIT-036 — Data retention & account deletion (privacy + legal)

**Observable problem.** Users can be suspended (`User.status`) but the
code has no account-deletion flow. Personal data, booking history, and
messages are retained indefinitely. Australian Privacy Principle 11.2
requires destruction/de-identification of personal info that is no
longer needed for a permitted purpose.

**Why this is an escalation.** Retention periods, anonymisation depth,
and what counts as "needed for a permitted purpose" (tax records, open
disputes, fraud signals) are legal calls.

**Options.**
1. **Hard delete on request** (except legally required records), soft
   delete after 2 years of inactivity.
2. **Soft delete on request** (anonymise PII, keep booking rows for
   analytics), hard delete after 7 years.
3. **Full erasure on request**, even of booking history — matches
   GDPR right-to-be-forgotten.

**Recommended default.** Option 2 — balances GDPR-style expectations,
ATO 5-year retention on tax records, and fraud signal continuity.

**Owner.** Legal + Privacy (DPO if one exists).

**Cost once decided.** ~3–5 days (deletion endpoint, cron job,
anonymisation of Review / Message / Booking, audit log entries).

---

## Next steps

Once each decision is recorded (even as a one-line verdict per item,
e.g., "AUDIT-002: Option 1, approved by Legal 2026-04-28"), I can open
fresh branches per item and close out Batch G. The eight items above
total roughly 11–20 engineer-days of follow-on work depending on which
options are picked.
