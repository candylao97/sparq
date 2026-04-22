# Pre-Launch Readiness — 2026-04-21

> **Renumbering note (2026-04-22):** This document originally used
> FIND-10, FIND-11, FIND-12, FIND-13 for four readiness findings. The
> same ids were later assigned different meanings in
> [ROOT_CAUSE_OUTPUT.md](ROOT_CAUSE_OUTPUT.md). Per the Phase 2
> reconciliation, ROOT_CAUSE keeps FIND-10..13 and this document's
> four items have been renumbered to **FIND-14, FIND-15, FIND-16,
> FIND-17** — descriptions unchanged. No code or test names referenced
> the old numbers; only this document needed updating. The
> renumbering is tracked in branch `docs/reconcile-find-ids`.

**Mode:** Path 2 (partial audit). Setup prerequisites not met at audit time:
- ❌ Stripe CLI not installed → live Stripe webhook triggering impossible
- ❌ Email sandbox not configured (no Mailpit, no `RESEND_API_KEY`) → email delivery unverifiable (dev fallback logs to console only)
- ❌ `GAP_ANALYSIS_OUTPUT.md` and `AGENT_BRIEF.md` not present → findings cannot be cross-referenced to known `AUDIT-xxx` IDs; every defect is reported as a new finding

Evidence sources used:
- HTTP probes against `http://localhost:3004` (self-started dev server, logged to `/tmp/sparq-dev.log`)
- Direct Prisma queries against the dev database (21 users, 390 bookings, 0 payouts seeded)
- Source code reads (route files, schema)
- Cross-verification of agent recon before every launch-blocker claim below

---

## Go/no-go summary

- **Launch blockers: 6** (3 newly discovered code defects + 3 compliance gaps)
- **High-risk issues: 4**
- **Nice-to-fix: 5**
- **Recommendation: NO-GO**

The booking flow has a critical ID-scheme mismatch that 404s the availability calendar for every customer clicking "Book now" from a provider page (FIND-1). The provider payments dashboard is similarly broken — `Payout.providerId` is written as `ProviderProfile.id` but queried as `User.id`, so providers will see zero payouts forever (FIND-2). Neither can reach production. Separately, compliance blockers — no ToS consent capture, no account deletion endpoint, no unsubscribe mechanism — expose the platform to legal risk under AU Privacy Act / Spam Act.

Fix the six blockers before launch. Four of six are small code diffs; the compliance gaps require schema changes and email-template edits.

---

## New issues found (no `AGENT_BRIEF.md` available to cross-reference)

| ID | Severity | Summary |
|----|----------|---------|
| **FIND-1** | **Launch blocker** | Booking availability 404s: `/api/providers/[id]` uses `ProviderProfile.id`, sibling `/api/providers/[id]/availability` uses `userId`. Book page passes profile id to both → availability endpoint 404s. Customers cannot see any available dates. `src/app/book/[providerId]/page.tsx:97,126`; `src/app/api/providers/[id]/availability/route.ts:78,100`; `src/app/providers/[id]/page.tsx:272` (link uses `profile.id`). |
| **FIND-2** | **Launch blocker** | Provider payout history always empty: `Payout.providerId` written as `providerProfile.id` at `src/app/api/bookings/[id]/route.ts:126,171`, but `src/app/api/dashboard/provider/payout-history/route.ts:31` queries `where:{providerId:session.user.id}`. User.id ≠ ProviderProfile.id, so every provider sees 0 rows. |
| **FIND-3** | High | Silent notification loss when payout held: `src/app/api/cron/process-payouts/route.ts:235` creates `Notification` with `userId: payout.providerId` (a ProviderProfile.id). `Notification.userId` FKs to `User.id`, so insert raises FK violation and is swallowed by `.catch(() => {})`. Providers whose Stripe account is disabled never receive the "action required" alert. |
| **FIND-4** | **Launch blocker** | No ToS consent capture. `User` model has no `termsAcceptedAt`/`termsVersion` fields (`prisma/schema.prisma` lines verified). Register zod schema accepts only `{name,email,password,role,ref}` (`src/app/api/auth/register/route.ts:9`). |
| **FIND-5** | **Launch blocker** | No user-initiated account deletion. `/api/account-settings` exposes `GET`/`PUT` only — no `DELETE`, no anonymise path. Right-to-erasure under AU Privacy Act APP 11 unaddressed. |
| **FIND-6** | **Launch blocker** | No unsubscribe mechanism. `src/lib/email.ts` (20 exported templates) has no unsubscribe footer or opt-out link. `sendEmail()` signature has no `attachments` field — same code path used by both transactional and reminder emails, with no distinction. |
| **FIND-7** | High | Cancellation policy not enforced. `ProviderProfile.cancellationPolicyType` persists as a string (default `MODERATE`, `prisma/schema.prisma:270`), but `src/app/api/bookings/[id]/route.ts:84-99` always issues a 100% refund on customer cancel regardless of the stored policy. |
| **FIND-8** | High | Double-booking race. `src/app/api/bookings/route.ts:92-129` reads existing bookings then inserts — no DB-level unique on `(providerId, date, time)`, no `SELECT … FOR UPDATE`. Two concurrent POSTs on the same slot can both pass the check. |
| **FIND-9** | High | No PDF receipt. `sendBookingConfirmationEmail` in `src/lib/email.ts` has no attachment field; no PDF generator found in `/api`. Journey 1 step 12 fails definitively even if email sandbox is wired. |
| **FIND-14** | Medium | No admin UI/API to manage promo codes. `PromoCode` model exists but no route under `src/app/api/admin/promos`. Only vouchers (`/api/admin/vouchers`) are admin-manageable. |
| **FIND-15** | Low | Search UX — phrase query regresses. `q=gel+nails&location=Sydney` returns 0 providers; `q=gel&location=Sydney` returns 3. Substring-AND match over service titles is brittle for the top marketing search term ("gel nails"). |
| **FIND-16** | Low | Search phrase terminology drift. Copy/marketing uses "Melbourne" in example queries; seed database has 0 Melbourne providers — search for `location=Melbourne` returns empty regardless of query. Seed data or copy should be aligned. |
| **FIND-17** | Low | Register endpoint returns generic `{"error":"Registration failed"}` with HTTP 500 on validation failure (e.g. `role: "ADMIN"`). Zod parse error should return 400 with the specific field message. |

---

## Journey results

### Journey 1 — New customer first booking
| Step | Status | Evidence | Notes |
|------|--------|----------|-------|
| 1. Home → search | PASS | `GET /` HTTP 200; `GET /api/providers?category=NAILS&location=Sydney&limit=2` HTTP 200, 3 providers. | `BEAUTY` is not a valid `ServiceCategory` enum — only `NAILS,LASHES,HAIR,MAKEUP,BROWS,WAXING,MASSAGE,FACIALS,OTHER`. "BEAUTY" query ⇒ HTTP 500. |
| 2. Filter by rating, view map | PASS (API) / BLOCKED (UI map) | `/api/providers` supports `sortBy=rating`, `serviceMode`, `minPrice`, `maxPrice`. Map UI visual check requires browser. | |
| 3. Open artist profile → availability calendar | **FAIL — FIND-1** | `GET /api/providers/{profileId}` 200; `GET /api/providers/{profileId}/availability?date=…` 404 `{"error":"Provider not found"}`. Availability endpoint does `findFirst({where:{userId:params.id}})` (line 100), book page sends `profile.id`. | **Launch blocker.** |
| 4. Click date → Step 1 | BLOCKED | UI-level step; not verifiable without browser + authenticated session. | |
| 5. Select service, add-ons | BLOCKED (add-ons) / PASS (service) | `/api/bookings` POST accepts `serviceId`, but schema has no `bookingAddOns` relation; add-ons are not a modelled concept. | Feature missing, but may be out-of-scope for v1. |
| 6. Pick date, time, address | BLOCKED | UI-level. Booking POST validates `HH:MM` time and date format (`src/app/api/bookings/route.ts`). | |
| 7. Not logged in → redirect to signup | PASS (code) | `src/app/book/[providerId]/page.tsx` checks `session` and redirects. | UI round-trip not exercised without browser. |
| 8. Signup → state preserved | PASS (code) | Book page holds `bookingData` in React state across phases (`src/app/book/[providerId]/page.tsx:693`); not lost on signup redirect because component remounts with same params. | Requires browser confirmation. |
| 9. Apply promo code | PASS | `/api/promo-codes/validate` + `/api/bookings` POST accepts `promoCode`; `PromoCode` model has `usedBy` + unique constraint on `(promoCodeId, userId)` (`prisma/schema.prisma:701`). | FIND-8 caveat — no atomic lock across simultaneous bookings, but per-user uniqueness is DB-enforced. |
| 10. Stripe test card | **BLOCKED (Stripe CLI)** | Cannot trigger card flow without Stripe CLI. Code path verified: `/api/stripe/create-payment-intent` + booking POST creates PI with manual capture, rolls back booking on Stripe failure (`src/app/api/bookings/route.ts:219-226`). | |
| 11. Confirmation page | PASS (route exists) | `/bookings/[id]/confirmation` route exists. | Content not verified without completed booking. |
| 12. Confirmation email with receipt PDF | **FAIL — FIND-9** | `sendBookingConfirmationEmail` body accepts only `html`; no `attachments` field; no PDF generator in `/api`. Email itself sends via `sendBookingConfirmationToCustomer` (`src/lib/email.ts:135`). | Email sends (assuming RESEND_API_KEY), PDF receipt does not. |
| 13. Booking on customer dashboard | PASS (code) | `/api/dashboard/customer` returns `upcomingBookings` array including the new booking (`src/app/api/dashboard/customer/route.ts:242-266`). Top-level shape locked by `dashboardContracts.test.ts`. | |
| 14. Artist notified | PARTIAL | `Notification` row created (`src/app/api/bookings/route.ts:236-244`). No email to artist on new booking — only payout email fires. `sendBookingRequestEmail` exists but is not called in booking POST path (grep confirms). | Push/email notification gap. |

### Journey 2 — Customer cancels within FLEXIBLE policy
| Step | Status | Evidence | Notes |
|------|--------|----------|-------|
| 1. Cancel | PASS | `PATCH /api/bookings/[id]` with `status:CANCELLED_BY_CUSTOMER` — `src/app/api/bookings/[id]/route.ts:84-99`. | |
| 2. Refund policy shown correctly | **FAIL — FIND-7** | Policy is stored (`cancellationPolicyType`), never read in the cancel handler. Every cancellation refunds 100%. "FLEXIBLE" is not distinct from "STRICT" in behaviour. | |
| 3. Stripe refund fires | PASS (code) / BLOCKED (live) | Handler inspects PI status: `requires_capture` → `paymentIntents.cancel`; `succeeded` → `refunds.create` (lines 86-96). Without Stripe CLI cannot verify the actual call. | |
| 4. Time slot released on artist calendar | PASS (by design) | Slot check in POST filters `status IN (PENDING, CONFIRMED)` (`src/app/api/bookings/route.ts:100`). Cancelled bookings drop from the filter automatically. | No explicit availability table mutation needed. |
| 5. Artist notified | PASS | `NOTIF_MAP.CANCELLED_BY_CUSTOMER` + `prisma.notification.create` routes to `booking.providerId` (User.id, correct). | `(src/app/api/bookings/[id]/route.ts:200-214)` |
| 6. Audit log entry | PASS | `prisma.bookingStatusHistory.create({fromStatus, toStatus, changedBy:session.user.id})` (line 190). `.catch(()=>{})` is non-blocking but writes log on success. | |

### Journey 3 — Artist onboarding to first booking
| Step | Status | Evidence | Notes |
|------|--------|----------|-------|
| 1. Sign up as artist | PASS | `/api/auth/register` with `role:"PROVIDER"` HTTP 200, auto-creates `ProviderProfile`. | |
| 2. Complete onboarding checklist | **MISSING** | No dedicated onboarding tracker / checklist API. Onboarding completion is implicit (profile has bio + suburb + 3 portfolio photos per `/api/providers` filter). | Map as "NOT IMPLEMENTED" in GAP_ANALYSIS. |
| 3. Stripe Connect onboarding | PASS (code) | `/api/stripe/connect/route.ts:27` creates Express account, stores `stripeAccountId`. | Live handshake BLOCKED without Stripe CLI. |
| 4. Stripe Identity verification | PASS (code) | `/api/stripe/verify-identity/route.ts:28` creates session, upserts `Verification` row. | Live handshake BLOCKED. |
| 5. Create first service | PASS | `/api/services` POST requires session + ProviderProfile (`src/app/api/services/route.ts:30-35`). | |
| 6. Set availability | PASS | `/api/dashboard/provider/availability` POST supports weekly default + date overrides, optimistic locking via `clientUpdatedAt`. | |
| 7. Artist receives booking | PARTIAL | In-app `Notification` row yes; no SMS; no email to artist on booking creation. | FIND: missing artist-side confirmation email. |
| 8. Accept booking | PASS (code) | `PATCH /api/bookings/[id]` status CONFIRMED → captures PI. | Capture BLOCKED live. |
| 9. Mark service complete | PASS (code) | Status CONFIRMED → COMPLETED. `completedAt`, `disputeDeadline=now+48h` set. `Payout` row created. | |
| 10. Payout scheduled — visible with date+amount | **FAIL — FIND-2** | Payout is written with `providerId: providerProfile.id`; payout-history endpoint queries `providerId: session.user.id`. Provider sees empty list. | **Launch blocker.** |
| 11. 48h later → payout fires | PASS (code) | `src/app/api/cron/process-payouts/route.ts` iterates SCHEDULED payouts past `scheduledAt`, respects BL-6 dispute hold (OPEN/UNDER_REVIEW/RESOLVED_REFUND). | Live trigger BLOCKED. |
| 12. Stripe Transfer lands | PASS (code) | `stripe.transfers.create(…, {idempotencyKey:`payout_${id}`})` at process-payouts:269. | BLOCKED live. |

### Journey 4 — Voucher-only booking
| Step | Status | Evidence | Notes |
|------|--------|----------|-------|
| 1. Customer receives voucher (admin-granted) | PASS | `/api/admin/vouchers` POST creates with unique-code check (`src/app/api/admin/vouchers/route.ts`). | |
| 2. Book entirely covered by voucher | PASS (code) | `src/app/api/bookings/route.ts:198` — `if (finalPrice > 0)` skips PI creation; `paymentStatus:'NONE'` for $0. | |
| 3. paymentStatus=NONE | PASS | Line 191 confirms. | |
| 4. Artist completes | PASS | Same code path as Journey 3 step 9. | |
| 5. Payout cron → paid from platform balance | **PARTIAL / UNCLEAR** | Line 251 sets `stripeTransferId:'no_payment_skip'` and status `COMPLETED` without calling `transfers.create`. Cron does NOT actually move money; payout amount was only recorded at booking-completion time. | If AUDIT-002 intends platform to still pay the artist out of its own balance, this code does not do that — the payout is marked complete but no Stripe transfer is made. Confirm intent. |
| 6. No "no_payment_skip" for vouchered booking | **INVERSE of spec — FIND** | The string `"no_payment_skip"` IS written for voucher-only bookings (`src/app/api/cron/process-payouts/route.ts:251`). Journey spec says confirm this does NOT happen. | If spec is correct, FAIL. If spec is inverted, PASS. Ambiguous without `GAP_ANALYSIS_OUTPUT.md`. |

### Journey 5 — Payment failure + retry
| Step | Status | Evidence | Notes |
|------|--------|----------|-------|
| 1. Start booking, proceed to payment | BLOCKED (live) | Code path verified. | |
| 2. Card declines (`4000 0000 0000 0002`) | BLOCKED (no Stripe CLI) | | |
| 3. Clear error message | PASS (code) | `/api/stripe/create-payment-intent` catches Stripe errors → HTTP 500 `{error:"Payment setup failed"}`. Client shows toast, stays on payment form. | Error copy generic; FIND-17-style issue. |
| 4. Retry → state preserved | PASS (code) | `src/app/book/[providerId]/page.tsx` keeps `bookingData` in React state; `onBack` returns to review without resetting. No localStorage — refresh loses state. | Page-refresh after decline = state loss. Minor risk. |
| 5. Different valid test card | BLOCKED (live) | | |
| 6. Booking confirms successfully | BLOCKED (live) | Code path: create-payment-intent reuses existing PI if status `requires_payment_method`/`requires_confirmation`/`requires_action` — idempotency-friendly. | |

### Journey 6 — Dispute / chargeback
| Step | Status | Evidence | Notes |
|------|--------|----------|-------|
| 1. Complete a booking | BLOCKED | | |
| 2. `stripe trigger charge.dispute.created` | **BLOCKED (no Stripe CLI)** | Webhook handler exists: `src/app/api/stripe/webhooks/route.ts:322`. | |
| 3. Artist payout frozen | PASS (code) | Dispute creation flips `Booking.status=DISPUTED` and `payout.updateMany({status:'CANCELLED'})`. BL-6 list blocks payout cron regardless. | Locked in by `paymentsDisputeHold.test.ts`. |
| 4. Admin views in dashboard | PASS (code) | `/api/admin/disputes` GET. | UI not exercised. |
| 5. Admin submits evidence | BLOCKED | No separate submit-evidence endpoint — resolution happens via `/api/admin/disputes/[id]`. | |
| 6. `stripe trigger charge.dispute.closed` (won) | BLOCKED | Webhook case exists at line 364; admin RESOLVED_NO_REFUND flow verified in `disputeResolutionRefund.test.ts`. | |
| 7. Payout unfrozen | PASS (code) | RESOLVED_NO_REFUND reschedules cancelled payout + audits `PAYOUT_RESCHEDULED_AFTER_DISPUTE`. | |

**Journey 6 overall: effectively BLOCKED end-to-end.** Code looks right based on existing test coverage in PR4, but cannot exercise live.

### Journey 7 — Provider ban with active bookings
| Step | Status | Evidence | Notes |
|------|--------|----------|-------|
| 1. Setup — artist has 3 future CONFIRMED | PASS (setup verifiable via Prisma) | | |
| 2. Admin bans | PASS | `PATCH /api/admin/providers/[id]` with `accountStatus:'SUSPENDED'` or `'BANNED'` (`src/app/api/admin/providers/[id]/route.ts:52-60`). | |
| 3. All 3 bookings auto-cancelled | PASS | Loop at lines 73-142 finds `status IN (PENDING,CONFIRMED)`, sets `CANCELLED_BY_PROVIDER`. | |
| 4. 3 customers refunded | PASS | Per-booking PI retrieve + `requires_capture`→cancel / `succeeded`→`refunds.create` (lines 90-111). | |
| 5. 3 customers notified | PASS | `prisma.notification.create({userId:booking.customerId, type:'BOOKING_CANCELLED'})` (lines 131-139). | No email. |
| 6. Artist payouts blocked | PASS | `payout.updateMany({status:{in:['SCHEDULED','PROCESSING']}}, {status:'CANCELLED'})` (lines 114-117). Future earnings impossible because provider can't accept bookings (`accountStatus='ACTIVE'` filter in search). | |

### Journey 8 — Race conditions (existence of guards)
| Step | Status | Evidence | Notes |
|------|--------|----------|-------|
| 1. Concurrent promo same-user | PARTIAL — high risk | `PromoCode.usages` has `@@unique([promoCodeId,userId])` (schema.prisma:701). DB will reject the second row → one wins. But booking-POST reads currentUses before inserting without `SELECT…FOR UPDATE`, so `maxUses` / `budgetCap` caps are racy. | |
| 2. Concurrent voucher > balance | PASS | Atomic `updateMany({where:{code,isRedeemed:false},data:{isRedeemed:true}})` returns count 0 for loser; loser booking is deleted + rolled back (`src/app/api/bookings/route.ts:142-227`). Locked in by `voucherSingleUse.test.ts`. | |
| 3. Concurrent bookings same slot | **FAIL — FIND-8** | No DB unique constraint on `(providerId,date,time)`. App-level slot check reads then writes in separate statements. Two concurrent POSTs can both see the slot as free and both insert. | High risk. |

### Journey 9 — Compliance touchpoints
| Step | Status | Evidence | Notes |
|------|--------|----------|-------|
| 1. Signup ToS consent with version + timestamp | **FAIL — FIND-4** | `User` model has no consent fields; register schema does not accept them. | Launch blocker. |
| 2. Receipt PDF w/ ABN, GST, booking ID | **FAIL — FIND-9** | No PDF generator exists. | AU tax compliance gap. |
| 3. Account deletion (AU Privacy Act APP 11 right to erasure) | **FAIL — FIND-5** | No `DELETE /api/account-settings`. No anonymise path. | |
| 4. Data export | **FAIL** | Only `/api/admin/export` exists (admin-only, CSV). No user-facing export. | |
| 5. Unsubscribe in marketing emails | **FAIL — FIND-6** | No unsubscribe footer in `src/lib/email.ts`. Email template library is transactional-only; any marketing send would violate AU Spam Act. | |

### Journey 10 — Admin ops
| Step | Status | Evidence | Notes |
|------|--------|----------|-------|
| 1. Admin search user + booking history | PASS | `/api/admin/users` GET accepts `search,role,page` (`src/app/api/admin/users/route.ts:6-56`). `/api/admin/users/[id]` returns bookings. | |
| 2. Admin refund with reason | PASS | `/api/admin/bookings/[id]/refund` POST takes `refundAmount + refundReason`. Handles capture vs refund branching, cancels payouts, notifies customer. | Locked in by PR4 tests. |
| 3. View fraud signals | PASS | `/api/admin/fraud-signals` returns risk-ranked flagged users (3+ leakage flags 7d, dispute rate >30%, cancel rate >50%, 2+ chargebacks). | |
| 4. Manage promos | **FAIL — FIND-14** | No admin promo-code routes. Only `/api/admin/vouchers`. | |
| 5. Audit log | PASS | `/api/admin/audit-log` GET with date/action filters + pagination. | |

---

## Blocked steps (couldn't verify — reason)

| Step | Reason |
|------|--------|
| J1-4, J1-6 | UI-level; no browser automation in this run. |
| J1-10, J5-2, J5-5 | Stripe CLI not installed → cannot run test card flow. |
| J1-12 (email delivery only; PDF part is FAIL not blocked) | No email sandbox; RESEND_API_KEY unset. Dev-fallback logs to console but no booking was completed end-to-end in this run. |
| J3-3, J3-4, J3-11, J3-12 | Require Stripe CLI + Connect webhooks. |
| J6 entire | Requires `stripe trigger charge.dispute.*`. |
| J8-2 runtime confirmation | Concurrent voucher redemption can only be tested under real load; code guard confirmed correct. |

Unblocking these requires: `brew install stripe/stripe-cli/stripe && stripe login && stripe listen --forward-to localhost:3004/api/stripe/webhooks`, plus `brew install mailpit && mailpit` with `SMTP_HOST=localhost SMTP_PORT=1025` in `.env.local`.

---

## Suggested launch-blocker fix plan (smallest diffs first)

1. **FIND-1** (availability 404): Either change `/api/providers/[id]/availability` to look up by `ProviderProfile.id` (1-line change from `userId:params.id` → `id:params.id`), or change the book-page href at `src/app/providers/[id]/page.tsx:272` from `/book/${profile.id}` to `/book/${profile.userId}`. Pick one — but the two siblings must agree. Add a regression test in `src/__tests__/api/providers/availabilityLookup.test.ts`.
2. **FIND-2** (payout history empty): In `src/app/api/bookings/[id]/route.ts:126,171` and parallel site in `src/app/api/cron/expire-bookings/route.ts` auto-complete path, change `providerId: providerProfile.id` to `providerId: booking.providerId` (the User.id). Write a migration to fix in-flight Payout rows.
3. **FIND-3** (notification FK fail): `src/app/api/cron/process-payouts/route.ts:235` — change `userId: payout.providerId` to `userId: payout.booking.providerId` to match the correct pattern used elsewhere in the same file.
4. **FIND-4** (ToS): Add `termsAcceptedAt DateTime?`, `termsVersion String?` to `User`; require both in register zod schema; add to existing-user soft-gate on next login.
5. **FIND-5** (account deletion): Add `DELETE /api/account-settings` that soft-anonymises: null out name/email/phone/image, set `accountStatus='DELETED'`, cancel active bookings with customer-initiated path, keep financial records per ATO retention rules.
6. **FIND-6** (unsubscribe): Add `unsubscribeUrl` param to `sendEmail`; generate signed unsubscribe tokens; add footer to every non-transactional template; add `GET /unsubscribe?token=…` to flip `notificationPreferences.marketingEmails=false`.

Estimated total: ~1–2 engineer days for FIND-1/2/3, ~2–3 days for FIND-4/5/6. Critical path is FIND-1 and FIND-2 — without those, customers cannot book and providers cannot trust the payments dashboard.
