# Sparq — Test Plan

**Status:** Phase B output (test-plan enumeration). No tests written; no code
changed. This document is the input to Phase D (writing tests) and Phase C
(running tests + bug triage).

**Last updated:** 2026-04-29
**Branch:** `docs/test-plan`
**Codebase snapshot:** main as of `ccea1dd` (2026-04-28 brief-refresh merge)

---

## Section 1 — Priority tiers

A scenario's tier reflects *what the consequence is if the behaviour breaks
in production*, not how hard the test is to write.

- **P0** — Must work for launch. A break here is one of:
  - Money flows to the wrong place, or doesn't flow at all
  - A user can access another user's data
  - Authentication / authorisation can be bypassed
  - A core conversion path (signup, booking, payment) silently fails
  - A compliance gate (ToS consent, unsubscribe, KYC, refund-on-cancel) is bypassed
  Production cannot ship without these passing.

- **P1** — Must work within first week of launch. Break here means:
  - A secondary surface (messaging, reviews, dashboards) is broken or wrong
  - An edge case in the happy path produces a wrong-but-not-catastrophic result
  - A retry / reconciliation / cleanup path silently no-ops
  - An admin tool is broken (operator pain, but not user-facing)
  Ship with these unverified at your peril; in-week hotfix is acceptable.

- **P2** — Should work within first month. Break here means:
  - Empty-state copy is missing or generic
  - A non-critical email goes to the wrong list classification
  - A dashboard chart is misleading
  - A nice-to-have feature (AI guide, ical export, referrals) is buggy
  Ship-blocking only if the bug is *visible* (e.g., 500 on a public page).

- **P3** — Nice to have. Break here means:
  - Cosmetic, marketing, or analytics-only impact
  - Behaviour that exists but isn't wired to a user-facing flow yet
  - Behaviour for surfaces that haven't been built (e.g., calendar picker UI)
  Acceptable to land as test debt and revisit at quarterly cleanup.

**Note on bug-tracking scenarios.** Where a scenario exists to *document a
known open bug* (FIND-7, FIND-8, FIND-10, FIND-11, FIND-13, FIND-14, FIND-15,
FIND-16, FIND-17, FIND-22 already merged but worth regression-locking, etc.),
its tier reflects the bug's severity, not the test's value. These are
flagged inline with the FIND-id so Phase C can wire them to the queue.

---

## Section 2 — Scenarios grouped by area

ID format: `<AREA>-<NNN>`. Areas: BK, PMT, KYC, PYT, MSG, RVW, SRC, PROF,
DASH, ADM, EMAIL, CRON, WEBHOOK, AUTH, SEC, MOBILE.

### BK — Booking flow (44 scenarios)

> Routes: `/api/bookings` (POST), `/api/bookings/[id]` (GET, PATCH),
> `/api/bookings/[id]/reschedule` (GET, POST, PATCH),
> `/api/bookings/[id]/reschedule/request` (POST), `/api/checkout`,
> `/api/availability/*`. Pages: `/book/[providerId]`, `/bookings`,
> `/bookings/[id]`, `/bookings/[id]/confirmed`, `/bookings/[id]/receipt`.

**Happy paths**

- `BK-001` [P0] Customer books a confirmed-instant service with valid card; booking enters CONFIRMED, payment AUTHORISED, artist receives `NEW_BOOKING` notification, `sendBookingConfirmationToCustomer` fires.
- `BK-002` [P0] Customer books a request-only (non-instant) service; booking enters PENDING with `acceptDeadline = now + 24h`, artist receives `sendBookingRequestEmail`, customer receives confirmation.
- `BK-003` [P0] Artist accepts a PENDING booking within 24h; status → CONFIRMED, payment captured, customer notified via `sendBookingConfirmationEmail`, booking visible in customer's `/bookings`.
- `BK-004` [P0] Artist declines a PENDING booking; status → DECLINED, payment authorisation released (PaymentStatus AUTH_RELEASED), customer notified via `sendBookingDeclinedEmail`, no payout queued.
- `BK-005` [P0] Booking auto-completes via cron 24h after appointment end; status → COMPLETED, `completedAt` set, payout row created with `amount = totalPrice - platformFee` (FIND-18 regression — tip MUST stay in payout amount).
- `BK-006` [P1] Customer books with a gift voucher covering full price; booking total = $0, no Stripe charge created, voucher `usedAmount` incremented, status enters CONFIRMED directly.
- `BK-007` [P1] Customer books with a gift voucher covering partial price; remaining amount charged to card, voucher `usedAmount` reflects partial, both balances correct after.
- `BK-008` [P1] Customer books with a valid promo code; discount applied to `totalPrice`, `PromoCodeUsage` row written, `PromoCode.currentUses` incremented.

**Validation & error states**

- `BK-009` [P0] Booking POST with missing `serviceId` returns 400 with field-specific error message (not generic 500). Cross-ref FIND-17 pattern.
- `BK-010` [P0] Booking POST with `date` in the past returns 400 "Booking date must be in the future".
- `BK-011` [P0] Booking POST for a service that's `isDeleted = true` or `isActive = false` returns 404 / 410.
- `BK-012` [P0] Booking POST violating per-policy lead-time (e.g., FLEXIBLE = 6h) returns 400 "Booking too close to start time".
- `BK-013` [P1] Booking POST with `guestCount` exceeding service `maxGuests` returns 400 with the limit shown.
- `BK-014` [P1] Booking POST with location=AT_HOME but missing `address` returns 400; uses shared `isValidBookingAddress` validator (FIND-24).
- `BK-015` [P1] Booking POST with malformed address (no street number) is rejected by `isValidBookingAddress`.
- `BK-016` [P1] Booking POST with `time` in 12-hour format is canonicalised to 24-hour before persisting (FIND-25 regression-lock).

**Permission boundaries**

- `BK-017` [P0] Logged-out user POSTing `/api/bookings` returns 401; redirected to `/login` with `returnTo` URL preserving wizard state (AUDIT-006 regression).
- `BK-018` [P0] Customer A trying to GET `/api/bookings/<customer-B-booking-id>` returns 404 (not 403 — don't reveal existence).
- `BK-019` [P0] Artist trying to PATCH a booking they're not the provider for returns 404.
- `BK-020` [P1] BANNED user POSTing `/api/bookings` is redirected to `/account-suspended` by middleware before route hits.

**State transitions**

- `BK-021` [P0] PENDING → CONFIRMED transitions write a `BookingStatusHistory` row with `changedBy = providerUserId`, `fromStatus="PENDING"`, `toStatus="CONFIRMED"`.
- `BK-022` [P0] CONFIRMED → CANCELLED_BY_CUSTOMER triggers refund per the artist's `cancellationPolicyType` (currently always 100% — FIND-7 documents the gap, test should regression-lock the *current* behaviour and be updated when AUDIT-013 lands).
- `BK-023` [P0] CONFIRMED → CANCELLED_BY_PROVIDER triggers 100% refund regardless of policy, increments `ProviderProfile.cancellationCount`.
- `BK-024` [P1] COMPLETED bookings cannot transition back to any other status (PATCH returns 409).
- `BK-025` [P1] DISPUTED bookings cannot be cancelled by either party (PATCH returns 409 with "Dispute open").
- `BK-026` [P1] Reschedule request from customer creates `RESCHEDULE_REQUESTED` status, sets `rescheduleDate`, `rescheduleTime`, notifies artist.
- `BK-027` [P1] Reschedule accept by artist sets booking to original status, clears reschedule fields, updates `date` / `time`, notifies customer.
- `BK-028` [P2] Reschedule decline by artist returns to original status, clears reschedule fields, customer notified with reason.

**Race conditions & timing**

- `BK-029` [P0] Two concurrent POSTs for the same `(providerUserId, date, time)` slot — only one succeeds; the other gets 409. **Currently broken — FIND-8.** Test should be authored as the regression-lock for the future fix; mark `xfail` until FIND-8 lands.
- `BK-030` [P0] Double-click on Confirm button (two POSTs in <1s with same payload) creates exactly one booking, exactly one PaymentIntent.
- `BK-031` [P0] Booking on day of DST transition (Sydney 2026-10-04 spring-forward, 2026-04-05 fall-back) — `hoursUntilBooking` from `src/lib/booking-time.ts` returns the wall-clock-correct value, not 23 or 25 (AUDIT-037 regression-lock).
- `BK-032` [P1] Booking made by customer in `Australia/Perth` for an artist in `Australia/Sydney` — both wizards display the artist's local time, persisted `date`/`time` is the artist's TZ.
- `BK-033` [P1] PaymentIntent expires 7 days after authorisation; expire-payments cron releases authorisation, booking → EXPIRED, customer notified via `sendBookingExpiredEmail`.
- `BK-034` [P1] Customer revisits a payment-failed booking; the retry-payment link preserves wizard state via `src/lib/booking-url-state.ts` (AUDIT-007 regression).

**Refund arithmetic**

- `BK-035` [P0] Cancellation 8h before start under FLEXIBLE policy (6h cutoff) — refund = 100% (currently). Once AUDIT-013/FIND-7 land: this becomes a tier-aware test with multiple expected values.
- `BK-036` [P0] Tip is always fully refunded to customer on cancel-before-completion (FIND-18 corollary — tips ride with the booking on refund, not with the artist).
- `BK-037` [P1] Partial-refund booking — payout amount excludes the refunded portion AND excludes tip-already-refunded.
- `BK-038` [P1] Refund processed sets `refundAmount`, `refundedAt`, `refundStatus = PROCESSED`, sends `sendRefundConfirmationEmail`.

**Empty / edge states**

- `BK-039` [P1] `/bookings` page when customer has zero bookings shows "Find your Sparq" CTA, not a blank list.
- `BK-040` [P1] `/bookings/[id]/receipt` for a CANCELLED booking shows the cancellation timestamp, refund amount, and "$0 charged" if refunded fully.
- `BK-041` [P2] Booking confirmation page (`/bookings/[id]/confirmed`) renders the right copy variant per `src/lib/booking-confirmation.ts` (instant-book vs request — AUDIT-005 regression).
- `BK-042` [P2] `/bookings` list is sorted by date descending; past and upcoming clearly separated.
- `BK-043` [P2] Booking with deleted service still renders historical detail (service `isDeleted = true` doesn't 500 the receipt page).
- `BK-044` [P3] Booking notes longer than 1000 chars are truncated with "show more" rather than overflowing the card.

### PMT — Payment / Stripe (32 scenarios)

> Routes: `/api/stripe/create-payment-intent`, `/api/stripe/connect`,
> `/api/stripe/connect/refresh`, `/api/stripe/verify-identity`,
> `/api/admin/bookings/[id]/refund`, `/api/admin/payments`,
> `/api/services/[id]/fee-preview`. Webhooks see WEBHOOK area.

**Happy paths**

- `PMT-001` [P0] `create-payment-intent` for a valid booking returns a `clientSecret`; PaymentIntent has `capture_method = manual`, metadata includes `bookingId`, `customerId`, `providerUserId`.
- `PMT-002` [P0] PaymentIntent confirmation via Stripe.js succeeds → webhook flips `Booking.paymentStatus` to AUTHORISED, `Booking.stripePaymentId` populated.
- `PMT-003` [P0] On booking accept, manual capture fires; webhook flips `paymentStatus` → CAPTURED, no double-capture if accept is retried.
- `PMT-004` [P0] On booking decline, authorisation released; webhook flips `paymentStatus` → AUTH_RELEASED, no charge on customer card.
- `PMT-005` [P0] Tip arithmetic: `totalPrice` includes tip, `platformFee` = 15% × (servicePrice + addons + tip×0?) — clarify and lock per current code; payout amount = `totalPrice - platformFee` (FIND-18 fix regression-lock).
- `PMT-006` [P1] Promo discount applied before fee calculation; `totalPrice` reflects discount, `platformFee` is 15% of *discounted* total.
- `PMT-007` [P1] Gift voucher applied as separate balance; PaymentIntent amount = `totalPrice - voucherAmount`, never negative.

**3DS / SCA**

- `PMT-008` [P0] Card requiring 3DS triggers `requires_action` status; UI surfaces the Stripe.js challenge; on success, AUTHORISED webhook lands within 60s.
- `PMT-009` [P1] Customer abandons 3DS challenge; PaymentIntent stays `requires_action`; expire-payments cron releases after 7 days.
- `PMT-010` [P1] 3DS authentication failure → `payment_intent.payment_failed` webhook → `paymentStatus` = FAILED, `sendPaymentFailedEmail` sent, retry link in email preserves wizard state.

**Failure modes**

- `PMT-011` [P0] Card declined at authorisation → 402 returned to client with Stripe's decline-reason code mapped to a friendly message; no booking created.
- `PMT-012` [P0] Stripe API returns 503 / network timeout during create-payment-intent → 503 surfaced to client with retry copy; no booking created in inconsistent state.
- `PMT-013` [P1] Card decline at capture (rare but possible) → `payment_intent.payment_failed` webhook flips `paymentStatus` to FAILED; admin alerted; booking stays CONFIRMED until human review.
- `PMT-014` [P1] Refund attempt against a non-CAPTURED booking returns 409 with reason; no Stripe API call made.

**Connect (artist payouts)**

- `PMT-015` [P0] Artist starts Stripe Connect onboarding (`/api/stripe/connect` POST) — returns onboarding URL; `ProviderProfile.stripeAccountId` is set on first call (idempotent on subsequent).
- `PMT-016` [P0] `account.updated` webhook with `charges_enabled = true` sets `stripeChargesEnabled` = true; same for `payouts_enabled`, `details_submitted`.
- `PMT-017` [P0] Artist with `stripePayoutsEnabled = false` cannot have payouts triggered — process-payouts cron skips them; banner on dashboard prompts to finish onboarding.
- `PMT-018` [P1] Connect onboarding refresh URL works mid-flow (account requires more info → return to dashboard → re-enter onboarding).

**Disputes**

- `PMT-019` [P0] `charge.dispute.created` webhook creates a `Dispute` row with status OPEN, opens a chargeback record, sends `sendDisputeOpenedEmail`.
- `PMT-020` [P1] `charge.dispute.updated` webhook updates Dispute status (review → won / lost). **FIND-11 risk** — only the long Stripe webhook route handles this; if Stripe is configured to the short one, this case is dropped silently.
- `PMT-021` [P1] Admin uploads chargeback evidence via `/admin/chargebacks/[id]` → POSTs to Stripe Disputes API → response surfaced; AUDIT-014 regression.

**Reconciliation**

- `PMT-022` [P1] `/api/cron/reconcile-payments` finds a Booking with `stripePaymentId` set but `paymentStatus = AUTH_PENDING` whose Stripe PaymentIntent is actually `succeeded` → flips local state to CAPTURED (AUDIT-021 regression).
- `PMT-023` [P1] Reconcile cron runs twice in a row → idempotent; second run no-ops.

**Tip flow (FIND-18 regression-lock)**

- `PMT-024` [P0] Booking with tip → completion path → payout includes tip in `amount` (NOT subtracted). Cover all four completion paths: normal COMPLETED, NO_SHOW → COMPLETED, $0/voucher COMPLETED, auto-expire cron.
- `PMT-025` [P0] Booking with tip → cancellation refund → tip is fully refunded to customer (booking refund includes tip).
- `PMT-026` [P0] Partial refund (e.g., 50% under MODERATE) — payout amount excludes the refund portion AND excludes tip (which was already refunded with the cancel).
- `PMT-027` [P1] Booking with `tipAmount = 0` → payout amount = `totalPrice - platformFee` (regression guard for the zero-tip case).

**Fee preview**

- `PMT-028` [P1] `/api/services/[id]/fee-preview` returns `{ subtotal, platformFee, total }` matching what booking POST will compute (no drift between preview and reality).
- `PMT-029` [P2] Fee preview with promo code applied returns the correct discounted total.

**Webhook idempotency** (also see WEBHOOK area)

- `PMT-030` [P0] Same Stripe event id delivered twice → `ProcessedWebhookEvent` table prevents double-processing; second call returns 200 without side-effects.

**Edge cases**

- `PMT-031` [P2] Authorisation made on Friday, captured Tuesday — within Stripe's 7-day auth window; capture succeeds.
- `PMT-032` [P2] Service price changes after authorisation but before capture — capture amount = original PaymentIntent amount, not new price (no surprise charges).

### KYC — Identity verification (12 scenarios)

> Routes: `/api/stripe/verify-identity`, `/api/admin/kyc`,
> `/api/admin/kyc/[id]`, `/api/dashboard/provider/kyc-status`.
> Page: `/admin/kyc`. Model: `KYCRecord`.

- `KYC-001` [P0] Artist initiates Stripe Identity verification → `KYCRecord` created with status PENDING, redirected to Stripe-hosted flow with return URL.
- `KYC-002` [P0] `identity.verification_session.verified` webhook flips `KYCRecord.status` → VERIFIED, `chargesEnabled = true`, `payoutsEnabled = true`, sends `sendKycDecisionEmail`.
- `KYC-003` [P0] `identity.verification_session.requires_input` webhook → status REQUIRES_ACTION, artist sees "resubmit" CTA on dashboard.
- `KYC-004` [P0] Artist with `KYCRecord.status != VERIFIED` cannot have payouts processed; process-payouts cron filters them out.
- `KYC-005` [P0] Admin manually rejects a KYC submission via `/api/admin/kyc/[id]` PATCH → status REJECTED, `rejectedReason` recorded, `sendKycDecisionEmail` with reason, AuditLog row.
- `KYC-006` [P1] Risk signals JSON populated on KYC creation; HIGH risk routes to `UNDER_REVIEW` instead of auto-VERIFIED. (Currently MEDIUM is default — verify behaviour matches code.)
- `KYC-007` [P1] Rejected artist can resubmit; `KYCRecord.status` returns to PENDING, history retained.
- `KYC-008` [P1] Customer (non-provider) hitting `/api/stripe/verify-identity` POST returns 403.
- `KYC-009` [P1] Logged-out user hitting `/api/admin/kyc` returns 401; non-admin returns 403.
- `KYC-010` [P2] `requirementsDue` JSON field reflects Stripe's `requirements.currently_due` accurately.
- `KYC-011` [P2] KYC banner on `/dashboard/provider` is dismissible only when status = VERIFIED.
- `KYC-012` [P3] AUDIT-010 escalation — once Compliance ratifies the soft-launch grace window (recommended 7d), add a scenario for "first booking allowed before KYC, payout blocked until KYC".

### PYT — Payouts (10 scenarios)

> Routes: `/api/dashboard/provider/payout-history`,
> `/api/admin/payouts/[id]/retry`. Cron: `/api/cron/process-payouts`.
> Lib: `src/lib/stripe-payouts.ts`, `src/lib/next-payout.ts`.
> Model: `Payout`.

- `PYT-001` [P0] Booking COMPLETED → Payout row created with `bookingId`, `providerUserId`, `amount = totalPrice - platformFee`, `status = SCHEDULED`, `scheduledAt = completedAt + payout-delay`.
- `PYT-002` [P0] process-payouts cron picks up `SCHEDULED` payouts past `scheduledAt`, creates Stripe Transfer to artist's `stripeAccountId`, flips `status` → COMPLETED, sets `processedAt`, `stripeTransferId`.
- `PYT-003` [P0] Stripe Transfer fails → `status` → FAILED, `failedAt` set, `failureReason` populated, admin alert via `/admin/fraud-signals`.
- `PYT-004` [P0] Artist without `stripePayoutsEnabled` is skipped by cron; payout stays SCHEDULED with no transfer attempt.
- `PYT-005` [P0] Re-running process-payouts cron does NOT double-transfer for already-COMPLETED payouts (idempotency on `status != SCHEDULED`).
- `PYT-006` [P1] Negative-balance penalty payouts (`amount < 0`) deduct from next positive payout if within 90 days (`penaltyExpiresAt`); expired penalties skipped.
- `PYT-007` [P1] `/api/dashboard/provider/payout-history` returns paginated payouts for the logged-in provider only (FIND-2 regression-lock).
- `PYT-008` [P1] Next-payout card on dashboard reflects `src/lib/next-payout.ts` calculation (AUDIT-011 regression).
- `PYT-009` [P1] Admin retry payout endpoint creates a new Stripe Transfer attempt; old FAILED payout becomes the source-of-truth audit trail.
- `PYT-010` [P2] Tips appear in `tipStats` AND in payout `amount` (FIND-18 regression — both surfaces must agree).

### MSG — Messaging (8 scenarios)

> Routes: `/api/messages`, `/api/messages/conversations`,
> `/api/messages/read`, `/api/messages/unread-count`. Page: `/messages`.

- `MSG-001` [P0] Customer sends message on a booking they own → Message row created, recipient gets `sendNewMessageEmail`, `Notification` row written.
- `MSG-002` [P0] User sending to a booking they're not party to (neither customer nor provider) returns 403.
- `MSG-003` [P0] PII filter (`src/lib/content-filter.ts`) detects phone number / email in message body → still sends, but `ContactLeakageFlag` row created with `flagType`, `snippet`, linked to messageId.
- `MSG-004` [P1] Read receipts: `PATCH /api/messages/read` with `messageIds` flips `read = true`, decrements unread count.
- `MSG-005` [P1] Conversations list groups by `bookingId`, sorted by latest message; unread badge per conversation.
- `MSG-006` [P1] Empty inbox shows "Start a conversation" CTA, not blank list.
- `MSG-007` [P2] Message body of >2000 chars rejected with 400; not silently truncated.
- `MSG-008` [P2] Admin viewing `/admin/leakage` sees flagged messages with snippet, can mark resolved.

### RVW — Reviews (10 scenarios)

> Routes: `/api/reviews` (POST, GET), `/api/reviews/[id]/flag`,
> `/api/reviews/[id]/reply`, `/api/reviews/[id]/respond`,
> `/api/admin/reviews`, `/api/admin/reviews/[id]`.
> Page: `/reviews/new`.

- `RVW-001` [P0] Customer with COMPLETED booking POSTs review → Review row created with `isVerifiedPurchase = true`, `isVisible = true`, provider notified.
- `RVW-002` [P0] Customer attempting to review a PENDING / CONFIRMED / DECLINED booking returns 403.
- `RVW-003` [P0] Customer attempting to review a booking they're not the customer on returns 403.
- `RVW-004` [P0] One review per booking (`Review.bookingId` unique) — second POST returns 409.
- `RVW-005` [P0] User flagging a review writes `isFlagged = true`, sets `flagReason`; review remains visible until admin acts.
- `RVW-006` [P1] Provider responds to review via `/api/reviews/[id]/reply` → `providerResponse` populated, `sendReviewReplyEmail` to customer, one response per review.
- `RVW-007` [P1] Admin moderation hides a review (`isVisible = false`); `moderatedAt` and `moderatedBy` set; review disappears from public profile.
- `RVW-008` [P1] Review-reminder cron sends `sendReviewReminderEmail` 30 days post-completion if no review yet; idempotent (sets a marker so it sends once).
- `RVW-009` [P2] Review with PII (phone / email) flagged via content-filter; `ContactLeakageFlag` written.
- `RVW-010` [P2] Average rating recomputed on review create / hide / unhide; provider profile shows correct aggregate.

### SRC — Search / discovery (12 scenarios)

> Routes: `/api/search` (if exists; else home), `/api/providers`,
> `/api/providers/[id]`, `/api/providers/[id]/availability`,
> `/api/providers/nearby`, `/api/services`, `/api/services/[id]`,
> `/api/ai/search`. Pages: `/`, `/search`, `/providers/[id]`,
> `/nearby`.

- `SRC-001` [P0] `/search` with no params returns the full provider list (paginated), 200 status, no 500 (FIND-22 regression-lock).
- `SRC-002` [P0] `/search?category=NAILS` filters to NAILS providers only; same for LASHES, MAKEUP.
- `SRC-003` [P0] `/search?category=HAIR` (a removed enum value, FIND-20) silently strips the param and warns; returns full list, not 500.
- `SRC-004` [P0] `/search?location=Sydney` filters by suburb-or-city match; result count > 0 with seeded data.
- `SRC-005` [P0] Logged-out user can browse `/search` and `/providers/[id]` without auth (public surfaces).
- `SRC-006` [P1] No-results state on `/search` shows "No artists match your search" + suggestions; not blank.
- `SRC-007` [P1] **FIND-15** — `q=gel+nails&location=Sydney` — known bug, returns 0; test should `xfail`-mark as FIND-15 regression target.
- `SRC-008` [P1] **FIND-16** — `location=Melbourne` returns 0 (zero seeded Melbourne providers) — test documents the bug; either align seed or copy.
- `SRC-009` [P1] `/api/providers/[id]/availability` returns Sydney-local 30-day walk; profile and booking wizard show same available dates (FIND-23 regression).
- `SRC-010` [P2] Sort options (price asc, price desc, rating desc, newest) actually sort by the right field.
- `SRC-011` [P2] Price filter `min` / `max` excludes services outside range.
- `SRC-012` [P2] Provider with `accountStatus != ACTIVE` is excluded from search results.

### PROF — Profile pages (12 scenarios)

> Pages: `/providers/[id]` (public), `/profile` (artist editor),
> `/dashboard/customer` (also acts as profile area).
> Routes: `/api/providers/[id]`, `/api/profile`,
> `/api/account-settings`, `/api/portfolio*`,
> `/api/dashboard/provider/availability`,
> `/api/dashboard/provider/service-area`.

- `PROF-001` [P0] Public provider profile renders for any active provider; portfolio, reviews, services, tagline, cancellation policy visible.
- `PROF-002` [P0] Provider profile for a SUSPENDED / BANNED artist returns 404.
- `PROF-003` [P0] Logged-out user viewing a provider profile sees the "Sign in to book" CTA on services.
- `PROF-004` [P0] Artist editing `/profile` and saving a service-radius change → `ProviderProfile.serviceRadius` updated; nearby calc reflects on next request.
- `PROF-005` [P0] Service area validation rejects "Bondi" (no postcode/state) and accepts "Bondi NSW 2026" via `isValidServiceArea` (FIND-24 regression).
- `PROF-006` [P1] Cancellation policy editor on settings page persists `cancellationPolicyType` and `cancellationPolicy` text (AUDIT-012 regression).
- `PROF-007` [P1] Cancellation policy is visible on the public artist profile (AUDIT-009 regression).
- `PROF-008` [P1] Portfolio reorder via drag-and-drop persists order on PUT `/api/portfolio/reorder`.
- `PROF-009` [P1] Provider tagline >300 chars rejected with field-specific error.
- `PROF-010` [P2] Profile views increment via `/api/providers/[id]/view`; idempotent per session.
- `PROF-011` [P2] iCal export from `/api/providers/[id]/ical` returns valid VCALENDAR with confirmed bookings.
- `PROF-012` [P2] iCal regenerate token invalidates old URL.

### DASH — Dashboards (12 scenarios)

> Pages: `/dashboard/customer`, `/dashboard/provider`. Routes:
> `/api/dashboard/customer`, `/api/dashboard/provider/*`.

- `DASH-001` [P0] Logged-out user hitting `/dashboard/customer` is redirected to `/login` with `returnTo` preserved.
- `DASH-002` [P0] Customer hitting `/dashboard/provider` is redirected (middleware enforces role).
- `DASH-003` [P0] Provider with no bookings sees onboarding CTA, not a 500 or blank chart.
- `DASH-004` [P0] Provider dashboard's earnings figure matches sum of COMPLETED payouts × `amount`.
- `DASH-005` [P0] `tipStats` and payout `amount` agree (FIND-18 surface — provider should not see tips reported as received without them actually being in the payout).
- `DASH-006` [P1] Customer dashboard shows upcoming and past bookings separately, sorted correctly.
- `DASH-007` [P1] Sparq Score gauge renders with the correct breakdown (review / completion / response / consistency / verification scores from `ScoreFactors`).
- `DASH-008` [P1] Provider analytics `/api/dashboard/provider/analytics` returns response-time, completion-rate, conversion-rate; no 500 for new providers (zero-data case).
- `DASH-009` [P1] Customer cancels upcoming booking from dashboard → status flips, refund flows, dashboard reflects within one refresh.
- `DASH-010` [P2] Earnings-by-month endpoint groups by calendar month in artist's TZ.
- `DASH-011` [P2] Pending requests card on provider dashboard counts only PENDING bookings (not RESCHEDULE_REQUESTED, not DISPUTED).
- `DASH-012` [P3] AI insights endpoint (`/api/ai/dashboard-insights`) returns sensible output for low-data providers (no hallucinated stats).

### ADM — Admin tooling (18 scenarios)

> Pages: `/admin/*` (23 pages). Routes: `/api/admin/*` (~30 routes).
> Middleware: requires `role === 'ADMIN'`.

- `ADM-001` [P0] Non-admin user hitting any `/admin/*` URL is redirected by middleware to their role's dashboard; never sees admin chrome.
- `ADM-002` [P0] Logged-out user hitting `/admin/*` is redirected to `/login`.
- `ADM-003` [P0] Admin user hitting `/admin` sees stats home (GMV, users, flagged reviews, pending KYC).
- `ADM-004` [P0] Admin processing a refund via `/api/admin/bookings/[id]/refund` triggers Stripe refund, sets `refundStatus`, writes AuditLog row, sends `sendRefundConfirmationEmail`.
- `ADM-005` [P0] Admin updating a user's `accountStatus` to BANNED writes AuditLog with `actorId`, `targetType="User"`, action="BAN", reason captured.
- `ADM-006` [P0] Admin hiding a flagged review writes AuditLog and flips `isVisible = false`.
- `ADM-007` [P0] Admin manual cron trigger (`/api/admin/cron/trigger`) requires ADMIN role and a known cron name; unknown cron → 400.
- `ADM-008` [P1] Admin disputes list shows OPEN disputes paginated; filter by status works.
- `ADM-009` [P1] Admin chargebacks page renders evidence upload form; POST creates evidence on Stripe via `/api/admin/chargebacks/[id]` (AUDIT-014 regression).
- `ADM-010` [P1] Admin KYC review action (approve / reject) updates `KYCRecord.status` and triggers email.
- `ADM-011` [P1] Admin voucher creation writes a `GiftVoucher` row with unique code; duplicate code returns 409.
- `ADM-012` [P1] Admin suburb CRUD — create writes row; edit updates; delete soft-deactivates (`isActive = false`).
- `ADM-013` [P1] Admin export endpoint (`/api/admin/export`) returns CSV; large datasets streamed not buffered.
- `ADM-014` [P1] Admin notes pinned/unpinned ordering — pinned first.
- `ADM-015` [P1] **FIND-14** — promo-code admin UI/API doesn't exist (only vouchers). Test documents the gap as a missing route returning 404 today; convert to functional test once built.
- `ADM-016` [P2] Audit log page shows actorId, action, targetType, createdAt; filterable by date range.
- `ADM-017` [P2] Admin reports page renders without 500 on empty dataset.
- `ADM-018` [P2] Admin fraud-signals page renders risk-level breakdown from `KYCRecord.riskLevel` aggregations.

### EMAIL — Email templates (22 scenarios)

> 19 helpers in `src/lib/email.ts`. Lib: `src/lib/unsubscribe.ts`,
> `src/lib/email.ts`. Model: `Suppression`. Page: `/unsubscribe`.

**Suppression / unsubscribe (FIND-6)**

- `EMAIL-001` [P0] Sending a marketing email to an address in `Suppression` is skipped; `sendEmail` returns "suppressed" without calling provider.
- `EMAIL-002` [P0] Sending a transactional email to an address in `Suppression` IS delivered (transactionals bypass suppression). All 5 transactionals must pass: `sendVerificationEmail`, `sendBookingConfirmationEmail`, `sendBookingConfirmationToCustomer`, `sendPayoutEmail`, `sendPasswordResetEmail`.
- `EMAIL-003` [P0] Every marketing email includes RFC 8058 `List-Unsubscribe` header AND `List-Unsubscribe-Post` header for one-click compliance.
- `EMAIL-004` [P0] Every marketing email body includes a footer with HMAC-signed unsubscribe link.
- `EMAIL-005` [P0] Unsubscribe GET with valid HMAC token shows confirmation page; POST writes `Suppression` row with `reason = user_unsubscribe`.
- `EMAIL-006` [P0] Unsubscribe GET with tampered / expired HMAC returns 400; no row written.
- `EMAIL-007` [P0] Unsubscribe is idempotent — second click returns the already-suppressed page, no duplicate row (PK on `email`).

**Transactional content (5 helpers)**

- `EMAIL-008` [P0] `sendVerificationEmail` includes signed verify link; subject and body match brand tone (warm, premium).
- `EMAIL-009` [P0] `sendBookingConfirmationEmail` (artist accepts) shows booking date in artist's TZ, address, customer name, total charged.
- `EMAIL-010` [P0] `sendBookingConfirmationToCustomer` (instant book or after request) shows artist name, service, date/time in customer's TZ.
- `EMAIL-011` [P0] `sendPayoutEmail` shows payout amount, period, transfer ID; only sent on COMPLETED payout.
- `EMAIL-012` [P0] `sendPasswordResetEmail` includes time-limited reset token; expired token rejected by handler.

**Marketing content (14 helpers)**

- `EMAIL-013` [P1] `sendBookingRequestEmail` to artist includes accept-deadline countdown; copy reflects 24h flat window post-premium-removal.
- `EMAIL-014` [P1] `sendBookingReminderEmail` fires 24h before; includes "View / cancel / message" links.
- `EMAIL-015` [P1] `sendPaymentExpiryWarningEmail` fires at 48h before authorisation expiry; once per booking (idempotent flag).
- `EMAIL-016` [P1] `sendPaymentFailedEmail` includes retry link with preserved wizard state.
- `EMAIL-017` [P1] `sendRefundConfirmationEmail` shows refund amount and method; classification is currently 'marketing' — **FIND-6 escalation flag** — Legal/Product to confirm.
- `EMAIL-018` [P1] `sendWaitlistNotificationEmail` includes booking link with date pre-filled.
- `EMAIL-019` [P1] `sendBookingCancelledEmail` differentiates customer-vs-provider initiated cancellations.
- `EMAIL-020` [P1] `sendBookingDeclinedEmail` includes refund timing; classification is 'marketing'.
- `EMAIL-021` [P2] `sendReviewReminderEmail` only sent once per booking; respects suppression.
- `EMAIL-022` [P2] `sendKycDecisionEmail` shows reason on rejection; classification is 'marketing' — **FIND-6 escalation flag**.

### CRON — Scheduled jobs (15 scenarios)

> 13 cron routes under `src/app/api/cron/**`. Schedule defined in
> `vercel.json`.

- `CRON-001` [P0] `expire-bookings` flips PENDING bookings past `acceptDeadline` to EXPIRED, releases authorisation, sends email; idempotent.
- `CRON-002` [P0] `expire-payments` releases authorisations >7 days old that never captured; sets PaymentStatus = AUTH_RELEASED; idempotent.
- `CRON-003` [P0] `process-payouts` picks SCHEDULED payouts past `scheduledAt`, processes via Stripe Transfer; idempotent re-run does NOT double-pay.
- `CRON-004` [P0] `reconcile-payments` corrects local state when webhook was missed; idempotent (AUDIT-021 regression).
- `CRON-005` [P0] `send-reminders` sends 24h-before reminders; once per booking via `reminderSentAt` marker; uses `hoursUntilBooking` from `src/lib/booking-time.ts` (DST-safe, AUDIT-037).
- `CRON-006` [P0] `notify-waitlist` notifies waitlisted customers when slot opens. **FIND-10 — currently always no-ops** because `WaitlistEntry.providerId` is `User.id` but the cron queries `Availability.providerId` which is `ProviderProfile.id`. Test should `xfail`-mark as the regression target for the future fix.
- `CRON-007` [P0] All cron routes require the Vercel cron secret header; unauthenticated calls return 401.
- `CRON-008` [P1] `review-reminders` fires 24h post-completion; once per booking; respects suppression.
- `CRON-009` [P1] `expire-featured` flips `ProviderProfile.isFeatured = false` past `featuredUntil`.
- `CRON-010` [P1] `cleanup-webhooks` and `cleanup-webhook-events` delete records older than 90 days; doesn't crash when 0 rows match.
- `CRON-011` [P1] `cleanup-notifications` deletes notifications older than 60 days for read=true; preserves unread.
- `CRON-012` [P1] `re-engage-providers` skips already-active providers; doesn't double-email a provider on consecutive runs.
- `CRON-013` [P1] Admin manual trigger (`/api/admin/cron/trigger`) routes to the right cron handler by name; unknown name → 400.
- `CRON-014` [P2] Cron handlers' missed-window recovery — running send-reminders at 25h instead of 24h still finds and sends; doesn't only fire in a narrow window.
- `CRON-015` [P2] All crons emit structured logs with `[cron-name]` prefix for traceability.

### WEBHOOK — Webhook handlers (10 scenarios)

> Routes: `/api/webhooks/stripe` (505 lines), `/api/stripe/webhooks`
> (581 lines — **FIND-11 duplicate**),
> `/api/webhooks/stripe-subscription` (159 lines).

- `WEBHOOK-001` [P0] Webhook signature verification — request without `Stripe-Signature` header returns 400; with bad sig returns 400; with valid sig proceeds.
- `WEBHOOK-002` [P0] `payment_intent.succeeded` flips local `Booking.paymentStatus` correctly per metadata `bookingId`.
- `WEBHOOK-003` [P0] `payment_intent.payment_failed` flips status, sends `sendPaymentFailedEmail`.
- `WEBHOOK-004` [P0] `account.updated` (Connect) updates `stripeChargesEnabled` / `stripePayoutsEnabled` / `stripeDetailsSubmitted` flags on `ProviderProfile`.
- `WEBHOOK-005` [P0] Replay protection — same `event.id` delivered twice → second call short-circuits via `ProcessedWebhookEvent` table, returns 200 with no side-effects.
- `WEBHOOK-006` [P0] Out-of-order delivery — `payment_intent.succeeded` arriving after `payment_intent.payment_failed` does NOT overwrite the failed state with succeeded if the local state is already settled. (Document current behaviour; flag if order-sensitive.)
- `WEBHOOK-007` [P0] **FIND-11** — both `/api/webhooks/stripe` AND `/api/stripe/webhooks` are live route handlers; the test should fail-loud assert that one is removed (regression target). Until removal, document which path is configured in Stripe dashboard.
- `WEBHOOK-008` [P0] `charge.dispute.created` writes a Dispute row, opens chargeback record. **Risk** — only the longer route handles `charge.dispute.updated` and `account.external_account.*`; ensure Stripe dashboard points at the long route until FIND-11 closes.
- `WEBHOOK-009` [P1] `identity.verification_session.verified` updates KYCRecord; cross-ref KYC-002.
- `WEBHOOK-010` [P1] Subscription webhook (`/api/webhooks/stripe-subscription`) — confirm whether it's still wired post-premium-tier-removal; if dead, regression target should be its removal.

### AUTH — Authentication / sessions (12 scenarios)

> Routes: `/api/auth/[...nextauth]`, `/api/auth/register`,
> `/api/auth/check-email`, `/api/auth/verify-email`,
> `/api/auth/resend-verification`, `/api/auth/forgot-password`,
> `/api/auth/change-password`, `/api/user/upgrade-role`.
> Lib: `src/lib/auth.ts`, `src/lib/tos.ts`. Pages: `/login`,
> `/register`, `/register/provider`, `/forgot-password`,
> `/verify-email`.

- `AUTH-001` [P0] POST `/api/auth/register` with valid payload AND `acceptedTerms: true` creates User with `termsAcceptedAt`, `termsVersion = "v1-placeholder"` (FIND-4 regression).
- `AUTH-002` [P0] POST `/api/auth/register` with `acceptedTerms: false` (or missing) returns 400; no User created (FIND-4 hard-gate).
- `AUTH-003` [P0] POST `/api/auth/register` with `role: "ADMIN"` returns 400 (zod rejects). **FIND-17** — currently returns generic 500; test should regression-lock the fix.
- `AUTH-004` [P0] Sign-in with valid credentials issues JWT with `user.id`, `user.role`, `user.accountStatus`.
- `AUTH-005` [P0] Sign-in for BANNED user — login succeeds technically but middleware redirects all routes to `/account-suspended`.
- `AUTH-006` [P0] `/api/user/upgrade-role` flips `User.role` from CUSTOMER to BOTH and creates `ProviderProfile`; new role propagates through JWT (FIND-26 regression).
- `AUTH-007` [P0] Password reset — request → token sent via `sendPasswordResetEmail`; token has TTL; expired token returns 400.
- `AUTH-008` [P1] Password reset re-use — used token returns 400.
- `AUTH-009` [P1] `change-password` requires current password; wrong current → 400.
- `AUTH-010` [P1] Email verification — clicking link flips `User.emailVerified` to now; expired token rejected.
- `AUTH-011` [P1] `check-email` returns `{ exists: true }` for existing email, `{ exists: false }` for new — used by signup form.
- `AUTH-012` [P2] Google OAuth signup creates User with `emailVerified` set immediately; account row written.

### SEC — Security / rate limits / PII (12 scenarios)

> Lib: `src/lib/rate-limit.ts`, `src/lib/content-filter.ts`,
> `src/lib/auditLog.ts`, `src/lib/riskScoring.ts`,
> `src/lib/unsubscribe.ts` (HMAC).
> AUDIT-017: rate limits on 5 high-value endpoints.

- `SEC-001` [P0] Booking POST rate-limit — 6th attempt within window returns 429; AUDIT-017 regression.
- `SEC-002` [P0] Booking PATCH rate-limit — same.
- `SEC-003` [P0] Booking reschedule rate-limit — same.
- `SEC-004` [P0] Disputes POST rate-limit — same.
- `SEC-005` [P0] Gift-card purchase rate-limit — same.
- `SEC-006` [P0] HMAC unsubscribe token tampering — modified email or token returns 400 (FIND-6 regression).
- `SEC-007` [P0] No PII (phone, email) in logs from email-send pathways; `sendEmail` redacts.
- `SEC-008` [P0] Customer A cannot read Customer B's profile / bookings / messages (cross-tenant isolation across all `/api/bookings/[id]`, `/api/messages`, `/api/profile`).
- `SEC-009` [P1] Admin actions write AuditLog rows with `actorId`, `targetType`, `targetId`, `details`; missing actor → 500-level log.
- `SEC-010` [P1] Risk-scoring on KYC sets `riskLevel` based on signals (`src/lib/riskScoring.ts`); HIGH triggers manual review path.
- `SEC-011` [P2] Rate-limit reset window — request after window passes succeeds again.
- `SEC-012` [P2] All admin POST/PATCH/DELETE routes write AuditLog; missing log on a covered action is a regression.

### MOBILE — Mobile-specific behaviour (6 scenarios)

> Sparq is mobile-first per CLAUDE.md. Most pages have responsive logic
> in Tailwind classes; minimal mobile-only code paths exist.

- `MOBILE-001` [P1] `/` home renders without horizontal scroll on 375px width (iPhone SE).
- `MOBILE-002` [P1] `/search` filter drawer opens as bottom sheet on mobile, sidebar on desktop.
- `MOBILE-003` [P1] `/book/[providerId]` 4-step wizard usable with mobile keyboard (no inputs hidden behind sticky CTA).
- `MOBILE-004` [P2] Date / time picker is touch-friendly; tap-targets ≥44px per WCAG.
- `MOBILE-005` [P2] `/messages` keyboard does not push composer off-screen; safe-area-inset-bottom respected on iOS.
- `MOBILE-006` [P3] Provider portfolio carousel swipe gestures work on touch; arrow controls visible on hover only on desktop.

---

## Section 3 — Cross-cutting concerns

### Permission matrix

Authoritative source of truth for "who can do what". This is a *test surface*
in itself — every cell below has a corresponding scenario in the area
above. A regression here (e.g., a customer-only endpoint accidentally
allows artists) is a P0 leak.

| Surface | Public | Customer | Artist (PROVIDER/BOTH) | Admin |
|---|---|---|---|---|
| `/`, `/search`, `/providers/[id]`, marketing pages | ✓ | ✓ | ✓ | ✓ |
| `/login`, `/register`, `/register/provider`, `/forgot-password` | ✓ | ✓ | ✓ | ✓ |
| `/dashboard/customer`, `/bookings`, `/messages`, `/wishlists` | ✗ | ✓ | ✓ (BOTH role only) | ✓ |
| `/dashboard/provider`, `/profile`, `/start-earning` | ✗ | ✗ | ✓ | ✓ |
| `/admin/*` | ✗ | ✗ | ✗ | ✓ |
| `/account-suspended` | ✗ | ✓ (if SUSPENDED/BANNED) | ✓ (if SUSPENDED/BANNED) | n/a |
| Booking POST | ✗ | ✓ | ✓ (BOTH) | ✓ |
| Booking PATCH (own) | ✗ | ✓ if customer | ✓ if provider | ✓ |
| Review POST | ✗ | ✓ if customer of COMPLETED booking | ✗ | ✗ |
| Provider response on review | ✗ | ✗ | ✓ if recipient | ✓ |
| Dispute POST | ✗ | ✓ if customer of CAPTURED booking | ✗ | ✗ |
| Connect onboarding | ✗ | ✗ | ✓ | ✗ |
| Cron endpoints | ✗ (header-gated) | ✗ | ✗ | ✗ (use admin trigger) |

A separate scenario `SEC-008` covers cross-tenant isolation generally;
the matrix above informs which permutations matter most.

### Empty state inventory

Every list / collection page should have a tested empty state. P1 unless
the page itself is launch-critical (then P0).

- `/` — no featured providers (seeded data missing) — homepage still renders without 500
- `/search` — no results for current filters — "No artists match" copy
- `/providers/[id]` — provider with no portfolio / no reviews / no services — sections collapse, profile renders
- `/bookings` — customer with zero bookings — "Find your Sparq" CTA
- `/messages` — empty inbox — "Start a conversation" CTA
- `/wishlists` — no saved providers — "Save artists" CTA
- `/dashboard/customer` — no bookings, zero stats — onboarding card
- `/dashboard/provider` — no bookings, zero earnings — onboarding card
- `/admin/disputes`, `/admin/chargebacks`, `/admin/kyc` — empty queues — "Nothing to review" copy
- `/admin/audit-log` — date range with zero events — empty table state

### Error state inventory

- 401 unauthenticated — every protected route redirects to `/login` with `returnTo`
- 403 unauthorised — wrong-role users see a polite "no access" page, not a stack trace
- 404 not found — booking / provider / service / review IDs that don't exist or are deleted
- 409 conflict — duplicate booking, double-review, used promo code, used voucher, double-unsubscribe
- 410 gone — service that's `isDeleted = true`, provider that's BANNED
- 429 rate-limited — high-value endpoints (AUDIT-017)
- 500 — should be impossible from user input; covered by FIND-17 regression
- 503 — Stripe / SendGrid / Cloudinary downtime — graceful degradation copy

### Mobile vs desktop divergence

- Bottom sheets vs sidebars on `/search`, `/messages`
- Stripe.js Element rendering on small screens (3DS challenge iframe)
- Sticky-bottom CTA on booking wizard mobile vs inline on desktop
- Admin pages are intentionally desktop-first; not part of MOBILE area

### Real-time / push behaviour

- Per memory, Socket.io is not yet wired; messages use REST polling
- Notifications appear via polling in dashboard (not push)
- Tests should NOT assume real-time; they should poll until visible or fixture-tick the clock
- When real-time lands (post-launch), add a P1 scenario set under MSG and DASH

---

## Section 4 — Out of scope

Deliberately excluded from this test plan:

- **Test fixtures and seed data themselves** (`prisma/seed.ts`) — these are
  test infrastructure, not production code; their correctness is verified
  by the tests that consume them.
- **Generated migrations** — Prisma migration files under
  `prisma/migrations/*` are tested by `prisma migrate dev` running
  successfully against the shadow DB; we don't write per-migration tests.
- **Third-party service internals** — Stripe's own behaviour (e.g., that
  `payment_intent.succeeded` actually fires on success) is Stripe's problem;
  we test our handlers against fixture events, not the live service.
- **Visual regression** — out of scope until the visual design is stable.
  Per CLAUDE.md the design system is in flux (e.g., FIND-21 just normalised
  64 headings to Title Case). Reintroduce visual-regression as a P2 area
  once the brand refresh stabilises.
- **Performance / load testing** — not part of correctness testing. Cap
  performance assertions at "the page renders within 5 s" smoke checks;
  proper benchmarking is a separate workstream.
- **Accessibility audit beyond WCAG-AA tap-targets** — formal a11y audit
  is its own sweep (axe / pa11y); this plan covers the obvious mobile
  tap-target case as P2 and defers the rest.
- **AI feature output quality** — `/api/ai/*` endpoints (chat, guide,
  search, insights, generate-service) should return *structurally* valid
  responses (not 500, not malformed JSON). LLM output quality is not
  unit-testable in the conventional sense; eval via Phase D's rubric is
  out of scope here. Cover the contract (200 + valid shape) only.
- **Calendar availability picker UI** — per memory, this UI is not yet
  built. Skip. Add scenarios under PROF and BK once it ships.
- **Cloudinary image upload UI** — same. Backend portfolio CRUD is in
  scope; the upload widget is not.
- **Stripe webhook handler internals for events the app doesn't act on**
  — e.g., `customer.created`, `invoice.*` events that arrive but the
  handler ignores. Tests cover only the events the code branches on.
- **Decision-blocked behaviour** — scenarios that depend on AUDIT-013
  (cancellation tier ratification), AUDIT-003 (GST model), AUDIT-010
  (KYC strictness), AUDIT-016 (review takedown bar), AUDIT-036 (data
  retention) are noted inline as "regression target post-decision". They
  are not in-scope for Phase D until the decision lands. Phase C should
  filter them out at run time via `xfail` markers.

---

## Section 5 — Coverage estimate

Scenarios per area (rounded to actuals):

| Area | P0 | P1 | P2 | P3 | Total |
|---|---|---|---|---|---|
| BK | 20 | 19 | 4 | 1 | 44 |
| PMT | 16 | 13 | 3 | 0 | 32 |
| KYC | 5 | 4 | 2 | 1 | 12 |
| PYT | 5 | 4 | 1 | 0 | 10 |
| MSG | 3 | 3 | 2 | 0 | 8 |
| RVW | 5 | 3 | 2 | 0 | 10 |
| SRC | 5 | 4 | 3 | 0 | 12 |
| PROF | 5 | 4 | 3 | 0 | 12 |
| DASH | 5 | 4 | 2 | 1 | 12 |
| ADM | 7 | 8 | 3 | 0 | 18 |
| EMAIL | 12 | 8 | 2 | 0 | 22 |
| CRON | 7 | 6 | 2 | 0 | 15 |
| WEBHOOK | 8 | 2 | 0 | 0 | 10 |
| AUTH | 7 | 4 | 1 | 0 | 12 |
| SEC | 8 | 2 | 2 | 0 | 12 |
| MOBILE | 0 | 3 | 2 | 1 | 6 |
| **TOTAL** | **118** | **91** | **34** | **4** | **247** |

**Grand total:** 247 scenarios. P0 = 118, P1 = 91, P2 = 34, P3 = 4.

**Areas at the 5-P0 minimum:** KYC, PYT, RVW, SRC, PROF, DASH all sit at
exactly 5 P0. They are not under-specified — these areas have a smaller
critical surface (KYC has one happy path, one resubmit, four
authorisation gates; payouts are mechanically simple once Stripe Connect
is set up, etc.).

**MSG sits at 3 P0** — flagged as under-specified. The reason is that
messaging is a thin surface in the current code (no real-time yet, no
attachments, no group chats). The 3 P0 scenarios cover the actual risk
surface (sending, cross-tenant access, PII filter). Adding more would
be ceremony, not coverage. **Judgement call — accept at 3.**

**MOBILE has 0 P0** — by design. No mobile-specific behaviour is
launch-blocking; mobile compliance is responsive-CSS and the same logic
as desktop. P1 tier is appropriate. **Judgement call — accept at 0 P0.**

### Bug-tracking scenarios (regression targets)

19 scenarios are tagged as documenting a known OPEN bug or recently-merged
fix that needs regression-locking:

- FIND-7 (cancellation enforcement): BK-022, BK-035 — `xfail` until AUDIT-013
- FIND-8 (double-booking race): BK-029 — `xfail` until fix
- FIND-10 (waitlist cron no-op): CRON-006 — `xfail` until fix
- FIND-11 (duplicate webhook routes): WEBHOOK-007, PMT-020 — `xfail` until removal
- FIND-13 (silent-catch sweep): no test; document at code-review time
- FIND-14 (no promo-code admin): ADM-015 — `xfail` until built
- FIND-15 (search phrase regression): SRC-007 — `xfail` until fix
- FIND-16 (Melbourne seed drift): SRC-008 — `xfail` until decision
- FIND-17 (register 500 on validation): AUTH-003 — already merged? verify; lock as regression
- FIND-18 (tip payout fix): BK-005, PMT-005, PMT-024-027, PYT-010, DASH-005 — regression-lock the merged fix
- FIND-22 (raw-SQL rename): SRC-001 — regression-lock
- FIND-23 (availability mismatch): SRC-009 — regression-lock
- FIND-24 (address validation): BK-014, BK-015, PROF-005 — regression-lock
- FIND-25 (booking time canonicalisation): BK-016 — regression-lock
- FIND-26 (artist upgrade JWT): AUTH-006 — regression-lock
- AUDIT-005 (instant-book copy): BK-041 — regression-lock
- AUDIT-006 (login-gate state): BK-017 — regression-lock
- AUDIT-007 (retry-payment state): BK-034 — regression-lock
- AUDIT-009/012 (cancellation policy visibility): PROF-006, PROF-007 — regression-lock
- AUDIT-011 (next payout): PYT-008 — regression-lock
- AUDIT-014 (chargeback UI): PMT-021, ADM-009 — regression-lock
- AUDIT-017 (rate limits): SEC-001 through SEC-005 — regression-lock
- AUDIT-021 (reconcile cron): PMT-022, CRON-004 — regression-lock
- AUDIT-037 (DST/TZ): BK-031, CRON-005 — regression-lock

These are the highest-value scenarios to write first in Phase D —
they pay back twice (verify the fix held; document the bug for future
auditors).

---

## Notes on scope judgements

A few places where scope was unclear and a call was made:

1. **AI endpoints** — `/api/ai/*` routes (chat, guide, search, insights,
   generate-service) get one P2 scenario in DASH (DASH-012) plus an
   out-of-scope note in §4. The contract is "200 + valid JSON shape";
   output quality is an LLM-eval problem, not a unit-test problem.
2. **Subscription webhook** — `/api/webhooks/stripe-subscription` is
   listed in WEBHOOK-010 with a "is this still wired?" question. Per
   the 2026-04-27 premium-tier-removal Decisions log entry, it may be
   dead code; if so, the regression target is its removal, not its
   correctness.
3. **Page-level smoke tests vs route-level tests** — pages mostly render
   what their backing route returns. The plan defines tests at the
   route level (faster, more deterministic) and adds page-level tests
   only where there's UI logic the route doesn't cover (wizard state,
   filter drawer, mobile bottom-sheet).
4. **Admin page count vs admin scenario count** — the inventory found
   ~23 admin pages but only 18 ADM scenarios. The admin pages are
   thin (mostly tables backed by `/api/admin/*` GET endpoints); a
   single P0 covers the cross-cutting "non-admin can't access". Per-page
   scenarios would be ceremony.
5. **Promo-code admin (FIND-14)** — listed under ADM-015 as `xfail`
   pending build. Could equally have lived under PMT or as its own area;
   ADM is the right home because the test target is the missing admin
   surface, not the promo-code mechanic itself (which is tested via
   BK-008).
6. **Mobile-first per CLAUDE.md** — could have justified mobile being
   a P0 area. Decided P1 because the responsive logic is in CSS, not
   business logic; a regression here is visible-and-fixable in hours,
   not a launch blocker.

---

*End of TEST_PLAN.md.*
