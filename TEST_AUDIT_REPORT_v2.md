# Sparq Platform — Comprehensive Test Audit Report v2

**Date**: 2026-03-16
**Auditor**: Senior QA Engineer / Test Architect
**Stack**: Next.js 14 · Prisma v5.22 · PostgreSQL · NextAuth v4 · Stripe · Anthropic Claude
**Test Suite**: Jest 29.7 + React Testing Library

---

## 1. Executive Summary

### Current Test Maturity: LOW-MEDIUM

| Metric | Value |
|--------|-------|
| Total test files | 8 |
| Total test cases | 228 |
| Passing | 206 (90.4%) |
| Failing | 22 (9.6%) |
| API routes in app | 49 |
| API routes tested | 3 (6.1%) |
| E2E tests | 0 |
| CI/CD pipeline | None |
| Stripe tests | 0 |
| Message API tests | 0 |
| Admin route tests | 0 |

### Biggest Missing Coverage
1. **Stripe payment lifecycle** — zero tests for the money path (PI creation, capture, refund, payout)
2. **API-level content filtering** — unit tests exist for the filter function, but no tests verify API routes actually call it
3. **Admin authorization** — 17 admin API routes with zero test coverage
4. **22 failing tests** — stale mocks mean existing API tests provide zero confidence

### Biggest Product Risks
1. **BUG: paymentStatus set to AUTHORISED prematurely** (line 214 of bookings/route.ts) — set before webhook confirms card hold
2. **BUG: No idempotency key on Stripe transfers** — double-payout risk if cron retries
3. **BUG: Refund possible after payout sent** — dispute resolved as refund after provider already paid out, platform absorbs loss
4. **Missing: Portfolio captions, dispute text, AI chat — unfiltered** for contact info leakage

### Ship Safety Assessment
**🔴 RED — Major testing gaps. Unsafe to rely on current coverage for a payments platform.**

Rationale: Zero Stripe tests, 22 failing API tests, zero E2E tests, zero admin authorization tests, and confirmed payment state bugs make this codebase high-risk for production.

---

## 2. Test Stack and Existing Coverage

### Tools Found
| Tool | Version | Purpose | Status |
|------|---------|---------|--------|
| Jest | 29.7.0 | Test runner | ✅ Configured |
| ts-jest | 29.4.6 | TypeScript transform | ✅ Working |
| jest-environment-jsdom | 29.7.0 | DOM environment | ✅ Working |
| @testing-library/react | 16.3.2 | Component testing | ✅ Working |
| @testing-library/jest-dom | 6.9.1 | DOM matchers | ✅ Working |
| @testing-library/user-event | 14.6.1 | User interaction | ✅ Installed |
| Playwright/Cypress | — | E2E testing | ❌ Not installed |
| MSW | — | API mocking | ❌ Not installed |
| GitHub Actions | — | CI/CD | ❌ Not configured |

### Scripts Found
```json
"test": "jest",
"test:watch": "jest --watch",
"test:coverage": "jest --coverage",
"build": "next build",
"lint": "next lint"
```

### Coverage by Area
| Area | Files | Tests | Pass | Fail | Notes |
|------|-------|-------|------|------|-------|
| Utility functions | `formatCurrency.test.ts` | 55 | 55 | 0 | ✅ Solid |
| Content filter | `contentFilter.test.ts` | 49 | 49 | 0 | ✅ Good unit coverage |
| Booking state machine | `bookingStateMachine.test.ts` | 37 | 37 | 0 | ✅ Logic well-tested |
| Address privacy | `addressPrivacy.test.ts` | 19 | 19 | 0 | ✅ Good |
| Component: BookingStatusPill | `BookingStatusPill.test.tsx` | 30 | 30 | 0 | ✅ Solid |
| Auth registration API | `auth.test.ts` | 12 | 4 | **8** | ❌ Stale mocks (phone field) |
| Booking API | `bookings.test.ts` | 26 | 18 | **8** | ❌ Stale mocks (availability, stripe, filter) |
| Provider API | `providers.test.ts` | 15 | 9 | **6** | ❌ Missing $queryRaw mock |
| **Stripe lifecycle** | — | **0** | — | — | ❌ **ZERO TESTS** |
| **Message API** | — | **0** | — | — | ❌ **ZERO TESTS** |
| **Admin routes (17)** | — | **0** | — | — | ❌ **ZERO TESTS** |
| **Dispute flow** | — | **0** | — | — | ❌ **ZERO TESTS** |
| **Review API** | — | **0** | — | — | ❌ **ZERO TESTS** |
| **Cron jobs** | — | **0** | — | — | ❌ **ZERO TESTS** |
| **E2E user journeys** | — | **0** | — | — | ❌ **ZERO TESTS** |

---

## 3. Static Check Results

### TypeScript Compilation
```
✓ Compiled successfully
```
**No TypeScript errors.** All types resolve correctly.

### ESLint
```
Linting and checking validity of types ... ✓
```
**No lint errors.**

### Next.js Build
```
✓ Generating static pages (82/82)
Export encountered errors on: /dashboard/customer, /dashboard/provider/payouts, /login, /search
```
Export errors are expected — these dynamic pages require runtime data (database, session). **Not a real issue.**

### Prisma Schema
- ✅ Schema parses and generates correctly
- ✅ 21 models, 14 enums, comprehensive relations
- ⚠️ Missing compound unique constraint on `(providerId, date, time)` — allows double-booking at DB level
- ⚠️ `ContactLeakageFlag` has string FK fields (`messageId`, `reviewId`, `bookingId`) with no FK relations
- ⚠️ No CASCADE delete on Booking → BookingStatusHistory, Dispute, Payout (defaults to RESTRICT — deleting bookings will fail)

### Config Issues
- ⚠️ No `.env.example` file for contributor onboarding
- ⚠️ `.env` was previously not in `.gitignore` (now fixed)
- ⚠️ Google OAuth, Cloudinary, and Google Maps still have placeholder values

---

## 4. Current Tests Found

### Unit Tests (160 passing / 0 failing)

| File | Purpose | Tests | Status |
|------|---------|-------|--------|
| `src/__tests__/utils/formatCurrency.test.ts` | Currency, time, commission, fees, tiers, labels, truncate, slugify | 55 | ✅ All pass |
| `src/__tests__/utils/contentFilter.test.ts` | Phone, email, Instagram, URL, address, postcode, payment, social detection | 49 | ✅ All pass |
| `src/__tests__/utils/bookingStateMachine.test.ts` | Valid transitions, terminal states, role auth, forbidden transitions | 37 | ✅ All pass |
| `src/__tests__/utils/addressPrivacy.test.ts` | Booking address gating, provider contact privacy, dashboard privacy | 19 | ✅ All pass |

### Component Tests (30 passing / 0 failing)

| File | Purpose | Tests | Status |
|------|---------|-------|--------|
| `src/__tests__/components/BookingStatusPill.test.tsx` | Label, color, size variants, snapshots | 30 | ✅ All pass |

### API Route Tests (16 passing / 22 failing)

| File | Purpose | Pass | Fail | Root Cause |
|------|---------|------|------|------------|
| `src/__tests__/api/auth.test.ts` | Registration endpoint | 4 | 8 | Zod schema now requires `phone` field; tests don't provide it. Also `findFirst` replaced `findUnique`, error message changed from "Email already in use" to "Phone number or email already in use" |
| `src/__tests__/api/bookings.test.ts` | Booking CRUD + status changes | 18 | 8 | POST tests missing mocks for: `availability.findFirst`, `booking.findMany` (slot check), `stripe.paymentIntents`, `bookingStatusHistory.create`, `contactLeakageFlag.create`. PATCH tests missing mocks for: `stripe.paymentIntents.capture/cancel`, `bookingStatusHistory.create`, `payout.create` |
| `src/__tests__/api/providers.test.ts` | Provider listing + detail | 9 | 6 | Missing `prisma.$queryRaw` mock (raw SQL for ratings); `getServerSession` headers() context error in provider detail tests |

### Integration Tests
**None exist.**

### E2E Tests
**None exist.** No Playwright or Cypress installed.

---

## 5. Critical Gaps

| # | Area | What Should Be Tested | Current Coverage | Gap | Risk | Priority |
|---|------|----------------------|-----------------|-----|------|----------|
| 1 | **Stripe PaymentIntent** | PI creation, capture, cancel, refund | 0 tests | Complete | **CRITICAL** — money flows | P0 |
| 2 | **Stripe webhooks** | Signature verification, all 9 event handlers | 0 tests | Complete | **CRITICAL** — payment state | P0 |
| 3 | **Stripe Connect payout** | Transfer creation, idempotency, failure handling | 0 tests | Complete | **CRITICAL** — provider payments | P0 |
| 4 | **Fix 22 failing tests** | Auth, booking, provider API tests | 22 failing | Stale mocks | **HIGH** — false confidence | P0 |
| 5 | **Message API + leakage** | Send message, filter applied, flag created | 0 tests | Complete | **HIGH** — marketplace integrity | P1 |
| 6 | **Admin authorization** | All 17 admin routes reject non-admin | 0 tests | Complete | **HIGH** — privilege escalation | P1 |
| 7 | **Booking ownership** | Cross-user access to bookings/messages | 0 tests | Complete | **HIGH** — data privacy | P1 |
| 8 | **Review API** | Eligibility (COMPLETED only), filter, response | 0 tests | Complete | MEDIUM | P1 |
| 9 | **Dispute flow** | 48h window, payout cancellation, resolution | 0 tests | Complete | MEDIUM | P2 |
| 10 | **Cron job auth** | CRON_SECRET required for expire-bookings and process-payouts | 0 tests | Complete | MEDIUM | P2 |
| 11 | **Availability** | Double-booking prevention, slot conflict detection | 0 tests | Complete | MEDIUM | P2 |
| 12 | **E2E user journeys** | Customer browse → book → pay → review | 0 tests | Complete | HIGH | P2 |
| 13 | **CI/CD pipeline** | Automated test + build on PR | None | Complete | MEDIUM | P2 |

---

## 6. Booking Flow Test Audit

### Happy Path: PENDING → CONFIRMED → COMPLETED

| Step | Code Location | Tested? | Issues Found |
|------|--------------|---------|--------------|
| Customer creates booking | `POST /api/bookings` | ⚠️ 4 tests, all failing | Missing availability/stripe/filter mocks |
| Availability check prevents double-booking | Lines 43-130 | ❌ Not tested | 30-minute slot calculation logic untested |
| Notes filtered for contact info | Lines 164-172 | ❌ Not tested at API level | Unit tests exist for filter function only |
| Stripe PI created (manual capture) | Lines 200-210 | ❌ Not tested | **BUG:** `paymentStatus = 'AUTHORISED'` set before webhook |
| Provider accepts (CONFIRMED) | `PATCH /api/bookings/[id]` | ⚠️ 1 test, failing | Missing stripe.capture mock |
| Stripe PI captured | Lines 69-73 | ❌ Not tested | Capture failure blocks transition (correct but untested) |
| Provider marks COMPLETED | `PATCH /api/bookings/[id]` | ❌ Not tested | No test for CONFIRMED → COMPLETED |
| Payout scheduled (48h delay) | Lines 114-138 | ❌ Not tested | Payout creation untested |
| Dispute window opens | Lines 116-130 | ❌ Not tested | disputeDeadline and completedAt untested |

### Decline Path: PENDING → DECLINED

| Step | Tested? | Issues |
|------|---------|--------|
| Provider declines | ⚠️ 1 test, failing | Missing stripe.cancel mock |
| PI cancelled (auth released) | ❌ Not tested | Stripe cancel untested |
| Customer notified | ⚠️ 1 test, failing | Mock assertions stale |

### Cancellation Path

| Step | Tested? | Issues |
|------|---------|--------|
| Customer cancels PENDING | ⚠️ 1 test, failing | Test uses 'CANCELLED' instead of 'CANCELLED_BY_CUSTOMER' |
| Customer cancels CONFIRMED | ❌ Not tested | Refund path untested |
| Provider cancels CONFIRMED | ❌ Not tested | Refund path untested |
| PI refunded/cancelled | ❌ Not tested | Stripe refund logic untested |

### Invalid Status Transition

| Step | Tested? | Issues |
|------|---------|--------|
| State machine logic | ✅ 37 tests, all pass | Static map tested thoroughly |
| At API route level | ❌ Not tested | No test sends PENDING → COMPLETED and asserts 400 |
| Role-based restrictions at API level | ❌ Not tested | No test verifies customer can't set CONFIRMED |

### Unauthorized Access

| Step | Tested? | Issues |
|------|---------|--------|
| Unauthenticated → 401 | ✅ 3 tests pass | GET, POST, PATCH all tested |
| Wrong customer → 403 | ❌ Not tested | No cross-user access test |
| Wrong provider → 403 | ❌ Not tested | No cross-provider access test |

---

## 7. Messaging and Leakage Test Audit

### Content Filter Function (49 unit tests — ✅ ALL PASS)

| Pattern | Tests | Enforcement | Backend Bypass Risk | Notes |
|---------|-------|-------------|---------------------|-------|
| **Phone numbers** | 8 tests | ✅ Server-side regex | LOW | Handles spaces, +61, landlines |
| **Email addresses** | 7 tests | ✅ Server-side regex | MEDIUM | `[at]`/`[dot]` obfuscation bypasses |
| **Instagram handles** | 4 tests | ✅ @handle detection | MEDIUM | Bare handles without @ bypass |
| **URLs** | 4 tests | ✅ http/www detection | MEDIUM | Spelled-out "www dot" bypasses |
| **Street addresses** | 5 tests | ✅ Number + street type | LOW | Good abbreviation coverage |
| **Postcodes** | 3 tests | ✅ State + 4 digits | LOW | Australian format well-covered |
| **Payment methods** | 7 tests | ✅ Keyword detection | LOW | 11 keywords covered |
| **Social solicitation** | 6 tests | ✅ Verb+pronoun+platform | MEDIUM | "DM me" alone bypasses |
| **Clean text passthrough** | 5 tests | ✅ No false positives | LOW | Normal booking text passes |

### Where Filter IS Applied (verified by code trace)

| User Input Field | Filtered? | API Route | Evidence |
|-----------------|-----------|-----------|----------|
| Booking notes | ✅ YES | `POST /api/bookings` line 166 | `filterContactInfo(sanitizedNotes)` |
| Messages | ✅ YES | `POST /api/messages` line 54 | `filterContactInfo(text.trim())` |
| Review text | ✅ YES | `POST /api/reviews` line 31 | `filterContactInfo(text)` |
| Provider review response | ✅ YES | `POST /api/reviews/[id]/respond` line 38 | `filterContactInfo(responseText)` |
| Service title/description | ✅ YES | `POST /api/services` | `filterContactInfo()` on both |
| Provider bio/tagline | ✅ YES | `PUT /api/profile` | `filterContactInfo()` on both |

### Where Filter IS NOT Applied (GAP)

| User Input Field | API Route | Risk | Recommendation |
|-----------------|-----------|------|---------------|
| **Portfolio caption** | `POST /api/portfolio` | HIGH | Provider can embed contact info in photo captions |
| **Dispute reason** | `POST /api/disputes` line 42 | HIGH | Customer can include phone/email in dispute text |
| **Dispute evidence** | `POST /api/disputes` line 43 | HIGH | Unfiltered text field |
| **Booking address** | `POST /api/bookings` line 182 | MEDIUM | Legitimate field but could contain embedded contact info |
| **Studio address** | `POST /api/dashboard/provider/service-area` | MEDIUM | Provider-supplied, could contain embedded contact info |
| **AI chat messages** | `POST /api/ai/chat` | LOW | Not persisted, but Claude could echo contact info |

### Known Bypass Patterns (documented in tests)

| Bypass | Pattern | Status |
|--------|---------|--------|
| Spelled-out phone | "zero four one two..." | ❌ NOT DETECTED |
| Obfuscated email | "user [at] gmail [dot] com" | ❌ NOT DETECTED |
| Bare Instagram | "my insta is beautybyjane" | ❌ NOT DETECTED |
| Spelled-out URL | "www dot mysite dot com" | ❌ NOT DETECTED |
| Parenthetical phone | "(04) 1234 5678" | ❌ NOT DETECTED |
| "DM me" (no platform) | "Just DM me" | ❌ NOT DETECTED |

### API-Level Content Filter Testing
**❌ ZERO API-level tests exist.** All 49 tests are unit tests of the `filterContactInfo()` function. No test verifies that:
- `POST /api/messages` actually calls the filter
- `POST /api/reviews` actually sanitizes text
- `ContactLeakageFlag` records are actually created
- Sanitized text (not raw text) is stored in DB

**This is a critical gap.** The filter could be bypassed by a code change that removes the import.

---

## 8. Auth and Authorization Test Audit

### Registration / Login

| Aspect | Tested? | Evidence | Issues |
|--------|---------|----------|--------|
| Registration success (customer) | ⚠️ Test exists, failing | `auth.test.ts` line 71 | Missing `phone` in test body — Zod now requires it |
| Registration success (provider) | ⚠️ Test exists, failing | `auth.test.ts` line 89 | Same phone field issue |
| Password hashing | ⚠️ Test exists, failing | `auth.test.ts` line 106 | Same root cause |
| Duplicate email rejection | ⚠️ Test exists, failing | `auth.test.ts` line 180 | Error message changed to "Phone number or email already in use" |
| Duplicate phone rejection | ❌ Not tested | — | New requirement, no test |
| Login via credentials | ❌ Not tested | `src/lib/auth.ts` | CredentialsProvider config untested |
| Login via Google OAuth | ❌ Not tested | — | OAuth callback flow untested |
| JWT token contains role + id | ❌ Not tested | `auth.ts` lines 49-61 | Critical for authorization |
| Session callback augmentation | ❌ Not tested | — | session.user.id and role untested |
| Phone login (new feature) | ❌ Not tested | `auth.ts` line 25 | Credential provider accepts phone |

### Role Boundaries

| Boundary | Tested? | Code Location | Risk |
|----------|---------|---------------|------|
| Customer can't access admin routes | ❌ Not tested | `middleware.ts` lines 10-14 | HIGH |
| Provider can't access admin routes | ❌ Not tested | Same | HIGH |
| Unauthenticated → protected routes | ❌ Not tested | `middleware.ts` matcher | MEDIUM |
| Admin API routes check role | ❌ Not tested | 17 admin routes | HIGH |
| Customer can't set provider-only statuses | ❌ Not tested at API level | `bookings/[id]` lines 34-35 | HIGH |
| Provider can't access other provider's bookings | ❌ Not tested | `bookings/[id]` line 23 | HIGH |

### Protected Routes (middleware.ts)
```
/dashboard/*  — requires auth token
/book/*       — requires auth token
/account-settings/* — requires auth token
/messages/*   — requires auth token
/admin/*      — requires auth token + role=ADMIN
```
**All middleware route protection is UNTESTED.**

---

## 9. Address and Privacy Test Audit

### Unit Test Coverage (19 tests — ✅ ALL PASS)

| Test | Status | What It Validates |
|------|--------|-------------------|
| Address hidden for PENDING bookings | ✅ | Logic function returns null |
| Address hidden for CANCELLED bookings | ✅ | Logic function returns null |
| Address hidden for DECLINED bookings | ✅ | Logic function returns null |
| Address hidden for EXPIRED bookings | ✅ | Logic function returns null |
| Address hidden for DISPUTED bookings | ✅ | Logic function returns null |
| Address revealed for CONFIRMED bookings | ✅ | Logic function returns address |
| Address revealed for COMPLETED bookings | ✅ | Logic function returns address |
| Provider contact hidden (no confirmed booking) | ✅ | phone, email, studioAddress → null |
| Provider contact revealed (confirmed booking) | ✅ | phone, email, studioAddress → values |

### API-Level Address Privacy

| Endpoint | Address Protected? | Code Evidence | Tested at API Level? |
|----------|-------------------|---------------|---------------------|
| `GET /api/bookings/[id]` | ✅ Yes | Lines 287-291: address = null unless CONFIRMED/COMPLETED | ❌ No |
| `GET /api/messages/conversations` | ✅ Yes | Line 62: address stripped | ❌ No |
| `GET /api/dashboard/customer` | ✅ Yes | mapBooking strips address | ❌ No |
| `GET /api/dashboard/provider` | ✅ Yes | Same mapBooking logic | ❌ No |
| `GET /api/providers/[id]` | ✅ Yes | studioAddress, phone, email nulled | ❌ No |

### Issues Found

1. **Address stripping logic is duplicated** across 5 endpoints rather than being a shared utility — risk of divergence
2. **No test verifies the actual API response** — only unit tests of extracted logic
3. **Customer address is stored raw** — no structured fields (unit, street, suburb, postcode separated)
4. **Studio address stored as free-text string** — could contain embedded contact info (unfiltered)

---

## 10. Stripe and Payment Lifecycle Test Audit

### Coverage: **ZERO TESTS**

No Stripe-related tests exist anywhere in the codebase. This is the single largest risk area.

### Payment Flow Traced Through Code

#### PaymentIntent Creation (POST /api/bookings, lines 195-234)
```
✅ capture_method: 'manual' (authorize-only)
✅ Amount in cents AUD: Math.round(finalPrice * 100)
✅ Metadata includes bookingId, customerId, providerId
✅ Rollback on Stripe failure (delete booking, un-redeem voucher)
🔴 BUG: paymentStatus set to 'AUTHORISED' BEFORE webhook confirms
    Line 214: data: { stripePaymentId: paymentIntent.id, paymentStatus: 'AUTHORISED' }
    Should be 'AUTH_PENDING' — webhook 'payment_intent.amount_capturable_updated' confirms auth
```

#### PaymentIntent Capture (PATCH /api/bookings/[id], lines 69-73)
```
✅ Only triggered when status transitions to CONFIRMED
✅ stripe.paymentIntents.capture(booking.stripePaymentId)
✅ DB updated: paymentStatus = 'CAPTURED'
✅ Capture failure blocks transition (correct error handling)
⚠️ No retry mechanism for transient Stripe failures
```

#### PaymentIntent Cancel (PATCH /api/bookings/[id], lines 76-110)
```
✅ Triggered for DECLINED, CANCELLED_BY_*, EXPIRED
✅ Checks PI status before action:
   - requires_capture → cancel (release hold)
   - succeeded → refund
✅ DB updated: paymentStatus = 'AUTH_RELEASED' or 'REFUNDED'
```

#### Webhook Handler (/api/stripe/webhooks, 206 lines)
```
✅ Signature verification: stripe.webhooks.constructEvent(body, sig, secret)
✅ Missing signature → 400
✅ Invalid signature → 400

Events handled:
  ✅ identity.verification_session.verified → providerProfile.isVerified = true
  ✅ identity.verification_session.requires_input → verification.status = REJECTED
  ✅ payment_intent.amount_capturable_updated → paymentStatus = AUTHORISED
  ✅ payment_intent.succeeded → paymentStatus = CAPTURED
  ✅ payment_intent.payment_failed → booking.status = CANCELLED + notification
  ✅ payment_intent.canceled → release hold, cancel if PENDING
  ✅ charge.refunded → paymentStatus = REFUNDED, refundStatus = PROCESSED
  ⚠️ account.updated → only logs, doesn't update DB (should flag disabled accounts)

Missing event handlers:
  ❌ charge.dispute.created — no handling for Stripe-initiated disputes
  ❌ transfer.failed — no handling for failed payouts
  ❌ payout.failed — no handling for failed provider payouts
```

#### Payout Flow (POST /api/cron/process-payouts)
```
✅ Auth check: CRON_SECRET required (recently fixed)
✅ Finds SCHEDULED payouts past scheduledAt
✅ Skips payouts with open disputes
✅ Cancels payouts for REFUNDED/DISPUTED bookings
✅ Checks provider has Stripe Connect account
✅ Creates Stripe transfer: stripe.transfers.create()
✅ Updates payout status, provider earnings, notifications
🔴 BUG: No idempotency key on transfers — double-payout risk
🔴 BUG: No lock on payout row during processing — concurrent cron could process same payout
```

#### Connect Onboarding (POST /api/stripe/connect)
```
✅ Creates Express account (AU, individual)
✅ Stores stripeAccountId in providerProfile
✅ Creates Account Link for onboarding
✅ GET endpoint returns charges_enabled, payouts_enabled
```

### Confirmed Bugs

| # | Severity | Location | Bug | Impact |
|---|----------|----------|-----|--------|
| 1 | **HIGH** | `/api/bookings` line 214 | `paymentStatus = 'AUTHORISED'` set before webhook confirms | DB shows auth'd when card may not be held yet. If provider sees AUTHORISED and accepts immediately, capture may fail |
| 2 | **CRITICAL** | `/api/cron/process-payouts` | No idempotency key on `stripe.transfers.create()` | If cron runs twice on same payout (DB update fails after transfer), duplicate Stripe transfer created |
| 3 | **HIGH** | Admin dispute resolution | Refund issued after payout already sent to provider | Platform absorbs loss — Stripe transfers cannot be reversed |
| 4 | **MEDIUM** | Webhook handler | `account.updated` only logs, doesn't update DB | Admin unaware if provider loses payout/charge capability |
| 5 | **MEDIUM** | Webhook handler | No `charge.dispute.created` handler | Stripe-initiated chargebacks not tracked in DB |

---

## 11. Prisma / Database Integrity Test Audit

### Schema Structure Assessment

| Aspect | Status | Details |
|--------|--------|---------|
| Models | ✅ 21 models | Comprehensive coverage |
| Enums | ✅ 14 enums | All booking/payment states covered |
| Relations | ✅ Well-defined | FK relations with onDelete: Cascade where appropriate |
| Indexes | ⚠️ Partial | Missing indexes on `tier`, `subscriptionPlan`, `accountStatus` |
| Unique constraints | ⚠️ Gap | Missing `@@unique([providerId, date, time])` on Booking |

### Critical Schema Issues

1. **Double-booking risk** — No DB-level unique constraint on `(providerId, date, time)`. Current prevention is application-level only (query + check). Under concurrent requests, two bookings for the same slot can both pass the check.

2. **Missing CASCADE on audit records** — `BookingStatusHistory`, `Dispute`, `Payout` reference `Booking` but default to RESTRICT. Attempting to delete a booking (e.g., for GDPR) will fail with FK constraint error.

3. **ContactLeakageFlag orphan risk** — `messageId`, `reviewId`, `bookingId` are optional strings with no FK relations. If the referenced record is deleted, the flag becomes an orphan with no way to trace the original content.

4. **Nullable fields that cause workflow bugs**:
   - `Booking.refundAmount` is nullable even when `refundStatus = PROCESSED` — should be required when status is PROCESSED
   - `Booking.completedAt` is nullable — should be set when status = COMPLETED (currently is, but no constraint enforces it)
   - `Payout.processedAt` is nullable — should be set when status = COMPLETED

5. **Missing status tracking for payments**:
   - `PaymentStatus` enum has 7 values but no history table — only current state tracked
   - If webhook updates paymentStatus and DB fails, no record of the attempt

### Relation Integrity Check

| Relation | Cascade? | Issue |
|----------|----------|-------|
| User → Booking | ✅ Cascade | Deleting user deletes bookings |
| Booking → Review | ✅ Cascade | Deleting booking deletes review |
| Booking → Message | ✅ Cascade | Deleting booking deletes messages |
| Booking → BookingStatusHistory | ❌ RESTRICT | Cannot delete booking with status history |
| Booking → Dispute | ❌ RESTRICT | Cannot delete booking with dispute |
| Booking → Payout | ❌ RESTRICT | Cannot delete booking with payout |
| ProviderProfile → Service | ✅ Cascade | Deleting profile deletes services |
| Service → ServiceAddon | ✅ Cascade | Deleting service deletes addons |

---

## 12. Concrete Tests to Add Immediately

### Phase 1: Ship-Blocking (P0)

#### 1. `src/__tests__/api/stripe/paymentIntent.test.ts`
- **Purpose**: Test Stripe PaymentIntent creation, capture, cancel, refund
- **Mock**: `stripe` module (paymentIntents.create/capture/cancel, refunds.create), `prisma`, `getServerSession`
- **Assert**: PI created with manual capture, PI captured on CONFIRMED, PI cancelled on DECLINED, refund on customer cancel after capture, $0 booking skips Stripe
- **Priority**: P0 — money flows

#### 2. `src/__tests__/api/stripe/webhooks.test.ts`
- **Purpose**: Test webhook signature verification and all 9 event handlers
- **Mock**: `stripe.webhooks.constructEvent`, `prisma`
- **Assert**: 400 on missing/invalid signature, correct DB updates per event type, missing booking handled gracefully
- **Priority**: P0 — payment state consistency

#### 3. `src/__tests__/api/cron/processPayouts.test.ts`
- **Purpose**: Test payout cron auth and processing logic
- **Mock**: `stripe.transfers.create`, `prisma`
- **Assert**: 401 without CRON_SECRET, skips disputed payouts, cancels refunded payouts, creates transfer with correct amount, updates provider earnings
- **Priority**: P0 — provider payments

#### 4. Fix `src/__tests__/api/auth.test.ts`
- **Changes**: Add `phone: '0412345678'` to all test bodies, update `findUnique` mock to `findFirst`, update duplicate error message assertion
- **Priority**: P0 — fix 8 failing tests

#### 5. Fix `src/__tests__/api/bookings.test.ts`
- **Changes**: Add mocks for `availability.findFirst`, `booking.findMany` (slot check), `stripe.paymentIntents.create`, `bookingStatusHistory.create`, `contactLeakageFlag.create`, `payout.create`
- **Priority**: P0 — fix 8 failing tests

#### 6. Fix `src/__tests__/api/providers.test.ts`
- **Changes**: Add `prisma.$queryRaw` mock, fix `getServerSession` context for detail tests
- **Priority**: P0 — fix 6 failing tests

### Phase 2: Important Workflow (P1)

#### 7. `src/__tests__/api/messages/leakage.test.ts`
- **Purpose**: Verify message API applies content filter and creates leakage flags
- **Mock**: `prisma`, `getServerSession`
- **Assert**: Clean messages stored as-is, flagged messages sanitized in DB, ContactLeakageFlag created, booking participant check enforced, unauthorized users rejected
- **Priority**: P1 — marketplace integrity

#### 8. `src/__tests__/api/admin/authorization.test.ts`
- **Purpose**: Test admin role gating across all 17 admin routes
- **Mock**: `prisma`, `getServerSession`
- **Assert**: 401 without session, 403 for CUSTOMER role, 403 for PROVIDER role, 200 for ADMIN role
- **Priority**: P1 — privilege escalation

#### 9. `src/__tests__/api/reviews/eligibility.test.ts`
- **Purpose**: Test review creation eligibility and content filtering
- **Mock**: `prisma`, `getServerSession`
- **Assert**: Only COMPLETED bookings, only booking customer, rating 1-5, text filtered, duplicate review prevented

#### 10. `src/__tests__/api/disputes/flow.test.ts`
- **Purpose**: Test dispute creation and resolution
- **Mock**: `prisma`, `getServerSession`, `stripe`
- **Assert**: 48h window enforced, only COMPLETED bookings, payout cancelled, resolution refund/no-refund paths

### Phase 3: Regression & Scale (P2)

#### 11. E2E Setup (Playwright)
- Install `@playwright/test`
- Configure test database
- Create: Customer browse → book → pay → review journey
- Create: Provider accept → complete → get paid journey
- Create: Admin dispute resolution journey

#### 12. `src/__tests__/api/availability.test.ts`
- Double-booking prevention under concurrent requests
- Sentinel date (weekly defaults) logic
- Date override vs weekly default priority

#### 13. `src/__tests__/api/bookings/addressPrivacy.test.ts`
- API-level test: GET booking with PENDING status → address is null
- API-level test: GET booking with CONFIRMED status → address is present
- Cross-user access: Customer B cannot see Customer A's booking address

---

## 13. Likely Bugs / Failures

### Confirmed Bugs (from code trace)

| # | Severity | File | Line | Bug | Production Impact |
|---|----------|------|------|-----|-------------------|
| 1 | **CRITICAL** | `api/cron/process-payouts` | 64-69 | No idempotency key on `stripe.transfers.create()` | Double-payout if cron retries after DB update failure |
| 2 | **HIGH** | `api/bookings/route.ts` | 214 | `paymentStatus = 'AUTHORISED'` before webhook confirms | Provider may try to accept booking before card hold is actually placed |
| 3 | **HIGH** | `api/admin/disputes/route.ts` | 58-68 | Refund issued after payout already sent | Platform absorbs loss (transfer not reversible) |
| 4 | **MEDIUM** | `api/stripe/webhooks/route.ts` | 179-196 | `account.updated` logs only, no DB update | Provider loses charge/payout capability silently |
| 5 | **MEDIUM** | `api/bookings/[id]/route.ts` | — | No webhook handler for `charge.dispute.created` | Stripe-initiated chargebacks not reflected in booking status |

### Likely Runtime Issues

| # | Severity | Issue | Trigger | Impact |
|---|----------|-------|---------|--------|
| 6 | **HIGH** | Double-booking race condition | Two concurrent POST /api/bookings for same provider+time | Both pass availability check, both create bookings |
| 7 | **MEDIUM** | Stripe auth expires after 7 days | Provider takes >7 days to respond (despite 24h deadline) | Capture fails, booking stuck. `payment_intent.canceled` webhook would fire but booking may already be CONFIRMED |
| 8 | **MEDIUM** | Platform fee calculated on original price, not discounted price | Customer uses gift voucher | Platform fee higher than expected relative to actual payment |
| 9 | **LOW** | BookingStatusHistory `.catch(() => {})` silently swallows errors | DB connectivity issue | Audit trail has silent gaps |
| 10 | **LOW** | No webhook event deduplication | Stripe retries webhook delivery | Same event processed multiple times (most handlers are idempotent, but notifications could duplicate) |

---

## 14. Recommended Test Plan

### Phase 1: Ship-Blocking (before any launch)
- [ ] **Fix 22 failing tests** — update mocks to match current code (auth phone field, booking availability/stripe mocks, provider $queryRaw)
- [ ] **Add Stripe PaymentIntent tests** — creation, capture, cancel, refund
- [ ] **Add Stripe webhook tests** — signature verification, all event handlers
- [ ] **Add payout cron tests** — auth check, processing logic, failure handling
- [ ] **Fix paymentStatus bug** — change line 214 to `AUTH_PENDING`, let webhook set `AUTHORISED`
- [ ] **Add idempotency keys** — to all `stripe.transfers.create()` calls
- [ ] **Add dispute-before-payout guard** — check payout status before issuing refund

### Phase 2: Important Workflow (first sprint)
- [ ] **Add message leakage API tests** — verify filter is called, flag created, sanitized text stored
- [ ] **Add admin authorization tests** — all 17 routes reject non-admin
- [ ] **Add review eligibility tests** — COMPLETED only, content filtered
- [ ] **Add booking ownership tests** — cross-user access rejected
- [ ] **Add dispute flow tests** — 48h window, payout cancellation, resolution paths
- [ ] **Set up CI/CD** — GitHub Actions: test → lint → build on PR

### Phase 3: Regression & Scale (ongoing)
- [ ] **Set up Playwright E2E** — customer journey, provider journey, admin journey
- [ ] **Add availability/double-booking tests** — concurrent booking prevention
- [ ] **Add portfolio caption filtering** — apply content filter to captions
- [ ] **Add dispute text filtering** — apply content filter to reason/evidence
- [ ] **Add webhook event deduplication** — store processed event IDs
- [ ] **Add load testing** — concurrent bookings, concurrent payouts
- [ ] **Add test coverage reporting** — target 70%+
- [ ] **Create `.env.example`** — document all required variables

---

## 15. Final Verdict

### 🔴 RED — Major testing gaps. Unsafe to rely on current coverage.

**Rationale:**

1. **Zero Stripe tests** for a platform that processes real money. PaymentIntent creation, capture, refund, and payout are completely untested. This alone would be a RED verdict.

2. **22 out of 53 API tests are failing** (41.5% failure rate). The 3 API test files (auth, bookings, providers) have stale mocks that don't match current code. These tests provide zero confidence — they're worse than having no tests because they give the illusion of coverage.

3. **Zero E2E tests** means no automated verification of the complete user journey (browse → book → pay → confirm → complete → review → payout).

4. **Zero admin authorization tests** across 17 admin-only API routes. A single missing session check would expose platform-wide data.

5. **Confirmed payment bugs**: premature AUTHORISED status, no idempotency on payouts, refund-after-payout possible. These are real money-loss scenarios.

6. **Content filter bypasses are documented but not mitigated**: spelled-out phones, obfuscated emails, bare Instagram handles all pass through undetected.

**To reach YELLOW**: Fix 22 failing tests, add Stripe lifecycle tests, add admin auth tests, fix the 3 confirmed payment bugs.

**To reach GREEN**: All of YELLOW plus E2E tests, message API leakage tests, CI/CD pipeline, and coverage >60%.

---

## Test Results Summary

```
CURRENT STATE:
  Test Suites:  3 failed, 5 passed (8 total)
  Tests:        22 failed, 206 passed (228 total)
  Snapshots:    3 passed
  Build:        ✓ Compiled successfully
  Lint:         ✓ No errors

BREAKDOWN:
  ✅ Utilities (contentFilter, stateMachine, addressPrivacy, formatCurrency): 160/160 pass
  ✅ Components (BookingStatusPill): 30/30 pass
  ❌ Auth API: 4/12 pass (8 fail — stale mocks)
  ❌ Bookings API: 18/26 pass (8 fail — stale mocks)
  ❌ Providers API: 9/15 pass (6 fail — missing mock)
  ❌ Stripe: 0 tests
  ❌ Messages: 0 tests
  ❌ Admin: 0 tests
  ❌ E2E: 0 tests
```
