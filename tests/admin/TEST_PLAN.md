# Sparq Admin System — Test Plan

**Version:** 1.0
**Stack:** Next.js 14, Prisma + PostgreSQL, NextAuth v4 JWT, Stripe Connect
**Scope:** Internal admin system — KYC, artist management, bookings, disputes, payments, audit log, RBAC

---

## Table of Contents

1. [Test Strategy](#1-test-strategy)
2. [Module Coverage Map](#2-module-coverage-map)
3. [Functional Test Cases](#3-functional-test-cases)
4. [KYC Critical Flows](#4-kyc-critical-flows)
5. [Booking Restriction Rules](#5-booking-restriction-rules)
6. [Stripe Webhook Contract](#6-stripe-webhook-contract)
7. [RBAC Permission Matrix](#7-rbac-permission-matrix)
8. [Security Tests](#8-security-tests)
9. [Edge Cases](#9-edge-cases)
10. [Regression Checklist](#10-regression-checklist)
11. [Automation Recommendations](#11-automation-recommendations)
12. [Setup & Prerequisites](#12-setup--prerequisites)

---

## 1. Test Strategy

### Pyramid

```
            ┌──────────────────┐
            │   E2E / Browser  │  ~15%   Playwright (critical user flows)
            │   (Playwright)   │
            ├──────────────────┤
            │  Integration /   │  ~50%   Playwright API + Vitest
            │  API Tests       │
            ├──────────────────┤
            │   Unit Tests     │  ~35%   Vitest (risk scoring, status logic)
            └──────────────────┘
```

### Test types

| Type | Tool | What it tests |
|------|------|---------------|
| Unit | Vitest | KYC status machine, risk scoring, `mapStripeStatusToKYC()`, PII detection regex |
| Integration | Playwright (API mode) | All `/api/admin/*` routes, webhook handling, auth guards |
| E2E Browser | Playwright (browser mode) | KYC approval/rejection UI, ban flow, dispute modal, RBAC page access |
| Manual QA | Checklist (section 10) | UX judgment calls, visual edge cases, responsive layout |

### Priority tiers

| P0 — Must pass before any release | P1 — Must pass before production | P2 — Best effort |
|---|---|---|
| Auth + session guards | All KYC flows | UI loading/empty states |
| KYC VERIFIED blocks booking | Dispute resolution | Responsive layout |
| Audit log created for all actions | Stripe webhook signature | Performance |
| Ban prevents all platform access | RBAC API guards | Error toasts |

---

## 2. Module Coverage Map

| Module | Spec file | TC count |
|--------|-----------|----------|
| Auth & session | `specs/auth.spec.ts` | 13 |
| RBAC | `specs/rbac.spec.ts` | 20 |
| KYC | `specs/kyc.spec.ts` | 32 |
| Artist management | `specs/artists.spec.ts` | 22 |
| Bookings | `specs/bookings.spec.ts` | 17 |
| Dispute resolution | `specs/disputes.spec.ts` | 20 |
| Stripe webhooks | `specs/webhooks/stripe.spec.ts` | 14 |
| Audit log | `specs/audit-log.spec.ts` | 20 |
| Admin API (comprehensive) | `specs/api/admin-api.spec.ts` | 30 |
| **Total** | | **188** |

---

## 3. Functional Test Cases

### 3.1 Dashboard

| ID | Scenario | Precondition | Steps | Expected | Priority | Type |
|----|----------|--------------|-------|----------|----------|------|
| TC-DASH-01 | Dashboard loads KPI cards | Logged in as admin | Navigate to /admin | 6+ KPI cards visible with numbers ≥ 0 | P0 | E2E |
| TC-DASH-02 | Pending KYC count is accurate | At least 1 pending KYC record | Compare UI count with GET /api/admin/stats | Values match | P0 | Integration |
| TC-DASH-03 | High-risk flag count is accurate | At least 1 high-risk record | Compare UI with API | Values match | P1 | Integration |
| TC-DASH-04 | Empty state when all queues clear | Test DB with no pending actions | Navigate to /admin | No crash; zero state shown gracefully | P2 | E2E |
| TC-DASH-05 | Stats update after admin action | Active pending KYC | Approve 1 artist; refresh dashboard | pendingKYC decreases by 1 | P1 | E2E |
| TC-DASH-06 | Dashboard error state on API failure | Mock /api/admin/stats to 500 | Navigate to /admin | Error message shown; no white screen | P1 | E2E |

### 3.2 KYC Module

See `specs/kyc.spec.ts` for full machine-readable cases. Summary below.

| ID | Scenario | Priority | Type |
|----|----------|----------|------|
| TC-KYC-01 to 07 | KYC queue list view, filters, KPI strip | P1 | E2E |
| TC-KYC-08 to 11 | Detail drawer — opens, shows Stripe status, risk signals, action buttons | P1 | E2E |
| TC-KYC-12 to 16 | Flow A: Approve → VERIFIED, isVerified=true, audit log, idempotency | P0 | Integration + E2E |
| TC-KYC-17 to 22 | Flow C: Reject with reason, reason stored, reject w/o reason = 400 | P0 | Integration + E2E |
| TC-KYC-23 to 24 | Flow B: Request info → REQUIRES_ACTION | P1 | Integration |
| TC-KYC-25 to 28 | Flow D: Flag for review, UNDER_REVIEW, unblock via approve | P1 | Integration |
| TC-KYC-29 to 32 | Edge: 404, invalid action, empty state, concurrent approve | P1 | Integration |

### 3.3 Artist Management

| ID | Scenario | Priority | Type |
|----|----------|----------|------|
| TC-ART-01 to 04 | List view, filters, search | P1 | E2E |
| TC-ART-05 to 09 | Suspend / unsuspend with reason, audit log | P1 | Integration |
| TC-ART-10 to 15 | Ban with reason, audit, idempotent, UI modal | P0 | Integration + E2E |
| TC-ART-16 to 20 | Service moderation, hide/restore, price anomaly flag | P1 | Integration |
| TC-ART-21 to 22 | PII detection via risk scoring | P1 | Integration |

### 3.4 Booking Management

| ID | Scenario | Priority | Type |
|----|----------|----------|------|
| TC-BKG-01 to 06 | Block bookings for all non-VERIFIED KYC states | P0 | Integration |
| TC-BKG-07 | Allow booking for VERIFIED artist | P0 | Integration |
| TC-BKG-08 | Existing bookings not auto-cancelled on flag | P1 | Integration |
| TC-BKG-09 to 11 | Admin booking list UI, status column, filter | P2 | E2E |
| TC-BKG-12 to 15 | Force-cancel, audit log, no reason = 400 | P1 | Integration |
| TC-BKG-16 to 17 | Payout blocked for PENDING/REJECTED artists | P0 | Integration |

### 3.5 Dispute Resolution

| ID | Scenario | Priority | Type |
|----|----------|----------|------|
| TC-DSP-01 to 05 | List view, filter, detail expansion | P1 | E2E |
| TC-DSP-06 to 09 | Full refund, booking state update, audit, UI modal | P0 | Integration + E2E |
| TC-DSP-10 to 12 | Partial refund with amount, no amount = 400, over-refund = 400 | P0 | Integration |
| TC-DSP-13 | Payout release | P1 | Integration |
| TC-DSP-14 | Dismiss | P1 | Integration |
| TC-DSP-15 to 16 | Internal notes stored, not exposed publicly | P1 | Integration |
| TC-DSP-17 to 20 | Edge: resolve resolved, 404, double-refund | P1 | Integration |

### 3.6 Audit Log

| ID | Scenario | Priority | Type |
|----|----------|----------|------|
| TC-AUD-01 to 04 | UI: table, fields, order, no edit/delete buttons | P1 | E2E |
| TC-AUD-05 to 13 | Action coverage: all 9 action types write log | P0 | Integration |
| TC-AUD-14 to 16 | Tamper prevention: PATCH/DELETE blocked, unauth = 401 | P0 | Integration |
| TC-AUD-17 to 20 | API: required fields, pagination, filter by type/actor | P1 | Integration |

---

## 4. KYC Critical Flows

### Flow A — Happy path: Full onboarding → VERIFIED

```
Artist registers
  → KYCRecord created (status: PENDING)
  → Artist completes Stripe Connect onboarding
  → Stripe sends account.updated (charges_enabled=true, payouts_enabled=true)
  → Webhook handler maps to VERIFIED
  → ProviderProfile.isVerified = true
  → Artist can receive bookings
  → Admin sees VERIFIED badge in KYC table
```

**Test IDs:** TC-KYC-12, TC-KYC-13, TC-WHK-05

### Flow B — Incomplete KYC (Stripe requires action)

```
Artist registers
  → Stripe Connect started but requirements pending
  → account.updated: requirements.currently_due not empty
  → KYCRecord.status = REQUIRES_ACTION
  → Booking attempt returns 403
  → Admin sees "Requires Action" badge and requirements list
```

**Test IDs:** TC-KYC-23, TC-KYC-24, TC-BKG-02, TC-WHK-06

### Flow C — Admin rejection

```
Admin opens KYC drawer for PENDING artist
  → Clicks "Reject"
  → Confirmation modal requires reason
  → Submits with reason
  → KYCRecord.status = REJECTED
  → KYCRecord.rejectedReason stored
  → AuditLog entry written
  → Booking attempt returns 403
  → isVerified = false
```

**Test IDs:** TC-KYC-17 to TC-KYC-22

### Flow D — Manual review override

```
Stripe verifies artist (charges_enabled=true)
  → Risk scoring detects HIGH signals (PII, price anomaly)
  → Admin flags artist for manual review
  → KYCRecord.status = UNDER_REVIEW
  → Bookings temporarily blocked
  → Admin reviews and either approves (→ VERIFIED) or rejects (→ REJECTED)
```

**Test IDs:** TC-KYC-25 to TC-KYC-27

---

## 5. Booking Restriction Rules

### Core rule

```typescript
function canAcceptBooking(artist: ArtistProfile): boolean {
  return (
    artist.kycStatus === 'VERIFIED' &&
    artist.accountStatus === 'ACTIVE'
  )
}
```

### State matrix

| KYC Status | Account Status | New Bookings | Payout |
|------------|---------------|--------------|--------|
| VERIFIED | ACTIVE | ✅ Allowed | ✅ Allowed |
| PENDING | ACTIVE | ❌ Blocked | ❌ Blocked |
| REQUIRES_ACTION | ACTIVE | ❌ Blocked | ❌ Blocked |
| UNDER_REVIEW | ACTIVE | ❌ Blocked | ⏸ Held |
| REJECTED | ACTIVE | ❌ Blocked | ❌ Blocked |
| VERIFIED | SUSPENDED | ❌ Blocked | ⏸ Held |
| VERIFIED | BANNED | ❌ Blocked | ❌ Blocked |

### Existing booking rule

When an artist transitions from VERIFIED to any blocked state:
- **Existing CONFIRMED bookings:** Remain in place (not auto-cancelled)
- **Future booking acceptance:** Blocked immediately
- **Payout:** Held until KYC returns to VERIFIED

This is a deliberate business decision protecting customers with confirmed appointments.
Implement automated notifications to affected customers when an artist is flagged.

---

## 6. Stripe Webhook Contract

### Endpoint: `POST /api/webhooks/stripe`

**Security:** Verified via `stripe.webhooks.constructEvent()` using `STRIPE_WEBHOOK_SECRET`

### `account.updated` → KYC mapping

```typescript
function mapStripeStatusToKYC(account: Stripe.Account): KYCStatus {
  if (account.requirements.disabled_reason?.startsWith('rejected')) return 'REJECTED'
  if (account.charges_enabled && account.payouts_enabled
      && account.requirements.currently_due.length === 0) return 'VERIFIED'
  if (account.requirements.currently_due.length > 0) return 'REQUIRES_ACTION'
  return 'UNDER_REVIEW'
}
```

### Idempotency contract

- Same Stripe event ID delivered twice → second delivery is a no-op
- Concurrent delivery of same event → safe (use DB upsert, not insert)
- Must return 200 to Stripe on all handled events (prevents retry storm)
- Unhandled event types → return 200, log the type

### Required tests

| Event | Test ID | Assertion |
|-------|---------|-----------|
| Signature missing | TC-WHK-01 | 400 |
| Invalid signature | TC-WHK-02 | 400 |
| Tampered payload | TC-WHK-03 | 400 |
| Valid signature | TC-WHK-04 | 200 |
| charges+payouts enabled | TC-WHK-05 | VERIFIED |
| requirements.currently_due not empty | TC-WHK-06 | REQUIRES_ACTION |
| rejected.fraud | TC-WHK-07 | REJECTED |
| payment_intent.succeeded | TC-WHK-08 | Booking PAID |
| payment_intent.failed | TC-WHK-09 | Booking FAILED |
| transfer.created | TC-WHK-10 | Payout COMPLETED |
| transfer.failed | TC-WHK-11 | Payout FAILED |
| Duplicate event | TC-WHK-12, 13 | No 500, no double-write |
| Unknown event | TC-WHK-14 | 200 graceful ignore |

---

## 7. RBAC Permission Matrix

| Action | ADMIN | OPS | SUPPORT |
|--------|-------|-----|---------|
| View dashboard | ✅ | ✅ | ✅ |
| View KYC queue | ✅ | ✅ | ❌ |
| Approve KYC | ✅ | ✅ | ❌ |
| Reject KYC | ✅ | ✅ | ❌ |
| Flag for review | ✅ | ✅ | ❌ |
| View artist list | ✅ | ✅ | ❌ |
| Suspend artist | ✅ | ✅ | ❌ |
| **Ban artist** | ✅ | ❌ | ❌ |
| View bookings | ✅ | ✅ | ✅ |
| Force-cancel booking | ✅ | ✅ | ❌ |
| View disputes | ✅ | ✅ | ✅ |
| **Issue full refund** | ✅ | ❌ | ❌ |
| Issue partial refund | ✅ | ✅ | ❌ |
| Release payout | ✅ | ✅ | ❌ |
| View payments | ✅ | ✅ | ❌ |
| **View audit log** | ✅ | ❌ | ❌ |
| Modify audit log | ❌ | ❌ | ❌ |

**Implementation note:** Enforce at two layers:
1. **UI layer** — hide buttons and nav items per role
2. **API layer** — return 403 for unauthorized mutations regardless of UI state

---

## 8. Security Tests

### 8.1 Session & authentication

| Test | Expected |
|------|----------|
| Access /admin/* without cookie | Redirect to /login |
| Access /api/admin/* without cookie | 401 |
| Expired cookie + navigate | Redirect to /login |
| Expired cookie + API call | 401 |

### 8.2 Privilege escalation

| Test | Expected |
|------|----------|
| PATCH /api/profile with role=ADMIN | Ignored or 403 |
| Support calling ban API | 403 |
| Ops calling full refund API | 403 |
| Ops accessing audit log page | 403 / redirect |

### 8.3 Injection

| Test | Expected |
|------|----------|
| SQL injection in search param | No 500; Prisma parameterises queries |
| XSS in reason field | Stored as plain text, not executed |
| Large payload (>5000 chars) in reason | 400 or truncated, not 500 |
| Malformed JSON body | 400 from body parser |

### 8.4 Data exposure

| Test | Expected |
|------|----------|
| adminNotes in public booking API | Field absent |
| internalNotes in public API | Field absent |
| Artist PII in customer-facing endpoints | Masked or absent |
| Audit log accessible to customer | 401 |

### 8.5 IDOR

| Test | Expected |
|------|----------|
| Admin reads another admin's audit log entries directly by ID | Only accessible via admin session |
| Customer reads admin booking details | 401 |

---

## 9. Edge Cases

| ID | Scenario | Expected behaviour |
|----|----------|-------------------|
| EC-01 | Stripe verifies artist but admin manually bans same artist | BANNED takes precedence; booking blocked |
| EC-02 | Full refund issued twice on same dispute | Second attempt returns 400 |
| EC-03 | Same webhook event delivered twice concurrently | Idempotent — no double-write, no 500 |
| EC-04 | Dispute opened after refund already issued | Return 400 or disallow dispute on refunded booking |
| EC-05 | Artist account deleted while booking still CONFIRMED | Booking retains provider data snapshot; admin can still view |
| EC-06 | Listing hidden while booking is pending | Booking remains valid; listing hidden from search only |
| EC-07 | Admin closes drawer while KYC action still processing | Loading state shown; re-opening shows correct final state |
| EC-08 | Artist has multiple overlapping risk signals | All signals displayed; highest-severity risk level wins |
| EC-09 | Two admins approve/reject same artist simultaneously | One wins; other gets graceful error; final state is deterministic |
| EC-10 | Partial refund amount of $0 | Rejected as 400 |
| EC-11 | Partial refund amount equals exactly booking total | Treated as full refund or allowed (define policy explicitly) |
| EC-12 | KYC record missing for seeded provider (pre-feature) | Auto-created on KYC page load or on `POST /api/admin/kyc` |
| EC-13 | Stripe account ID not set on provider (no Connect onboarding) | payoutsEnabled=false; no webhook match expected |
| EC-14 | Force-cancel a COMPLETED booking | Return 400 — completed bookings cannot be cancelled |
| EC-15 | Filter by non-existent status value | Return 400 or empty array; no 500 |

---

## 10. Regression Checklist

Run before every release against the test environment (`TEST_BASE_URL=https://staging.sparq.com.au`).

### KYC flow

- [ ] New artist registration creates KYCRecord with status PENDING
- [ ] Admin can approve PENDING artist
- [ ] Approval sets isVerified=true
- [ ] Admin can reject with mandatory reason
- [ ] Rejection stores reason and sets isVerified=false
- [ ] Rejection without reason returns 400
- [ ] Admin can flag VERIFIED artist for review
- [ ] UNDER_REVIEW blocks new bookings
- [ ] Approve after review restores VERIFIED
- [ ] Webhook `account.updated` syncs KYC status

### Booking restrictions

- [ ] PENDING artist cannot receive booking (API returns 403)
- [ ] REQUIRES_ACTION artist cannot receive booking
- [ ] UNDER_REVIEW artist cannot receive booking
- [ ] REJECTED artist cannot receive booking
- [ ] SUSPENDED artist cannot receive booking
- [ ] BANNED artist cannot receive booking
- [ ] VERIFIED + ACTIVE artist CAN receive booking
- [ ] Existing confirmed bookings survive a flag action

### Admin permissions

- [ ] Admin can access all modules
- [ ] Ops cannot access audit log
- [ ] Ops cannot ban an artist
- [ ] Support cannot access KYC module
- [ ] Support cannot issue any refund
- [ ] Unauthenticated requests to all /api/admin/* return 401

### Refund / dispute

- [ ] Full refund accepted on open dispute
- [ ] Full refund sets booking.paymentStatus = REFUNDED
- [ ] Partial refund requires amount
- [ ] Partial refund over total is rejected
- [ ] Double full-refund is rejected
- [ ] Dismiss creates audit log entry

### Payout status sync

- [ ] transfer.created sets Payout.status = COMPLETED
- [ ] transfer.failed sets Payout.status = FAILED
- [ ] REJECTED artist shows payout blocked

### Audit log

- [ ] KYC_APPROVED written on approval
- [ ] KYC_REJECTED written on rejection with reason
- [ ] USER_BANNED written on ban with reason
- [ ] BOOKING_CANCELLED written on force-cancel
- [ ] DISPUTE_RESOLVED written on resolution
- [ ] Audit log PATCH returns 405/403
- [ ] Audit log DELETE returns 405/403
- [ ] Audit log inaccessible to Ops and Support roles

### Stripe webhooks

- [ ] Missing signature → 400
- [ ] Invalid signature → 400
- [ ] Tampered payload → 400
- [ ] Duplicate event → 200, no double-write
- [ ] Unknown event type → 200, no crash

---

## 11. Automation Recommendations

### What to automate

| Layer | Tool | What |
|-------|------|------|
| Unit | Vitest | `mapStripeStatusToKYC()`, `computeRiskSignals()`, `detectPII()`, KYC status transitions |
| Integration (API) | Playwright API mode | All 188 test cases in this plan — fast, no browser overhead |
| E2E (browser) | Playwright browser mode | Auth flow, KYC approve/reject UI, ban modal, dispute modal |
| Webhook contract | Playwright API + Stripe CLI | All 14 TC-WHK-* cases |
| Permission matrix | Playwright multi-project | TC-RBAC-* for each role |

### Recommended tool stack

```
@playwright/test       — E2E + API integration tests (already in plan)
vitest                 — Unit tests (fast, same tsconfig as project)
@testing-library/react — React component unit tests
stripe-mock / Stripe CLI — Webhook simulation in CI
prisma test isolation  — Use a separate schema per CI worker:
                          DATABASE_URL=postgresql://localhost/sparq_test
```

### CI pipeline recommendation

```yaml
# .github/workflows/test.yml
jobs:
  unit:
    run: npx vitest --run

  api-tests:
    env:
      TEST_BASE_URL: http://localhost:3000
    run: npx playwright test --project=api

  e2e:
    env:
      TEST_BASE_URL: http://localhost:3000
    run: npx playwright test --project=admin-chrome

  rbac:
    run: npx playwright test --project=ops-chrome --project=support-chrome
```

### Stripe CLI local webhook testing

```bash
# Forward all Stripe events to local dev server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger a specific event
stripe trigger account.updated
stripe trigger payment_intent.succeeded
stripe trigger transfer.created
```

---

## 12. Setup & Prerequisites

### Environment variables required for tests

```env
# .env.test
DATABASE_URL="postgresql://localhost:5432/sparq_test"
NEXTAUTH_SECRET="test-secret-32-chars-minimum-xxx"
NEXTAUTH_URL="http://localhost:3000"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_test_..."
TEST_SECRET="test-secret-local"
TEST_BASE_URL="http://localhost:3000"
```

### Test database setup

```bash
# Create test DB and run migrations
DATABASE_URL="postgresql://localhost:5432/sparq_test" npx prisma db push
DATABASE_URL="postgresql://localhost:5432/sparq_test" npm run db:seed

# Add test-only roles (Ops + Support) to seed if not present
# Edit prisma/seed.ts and add:
#   ops@sparq.com.au    / ops123456    / role: ADMIN (with OPS flag in metadata)
#   support@sparq.com.au/ support123456/ role: ADMIN (with SUPPORT flag)
```

### Run tests

```bash
# Install Playwright browsers (first time)
npx playwright install chromium

# Run all tests
npx playwright test --config=tests/admin/playwright.config.ts

# Run specific module
npx playwright test tests/admin/specs/kyc.spec.ts

# Run API tests only (no browser, fastest)
npx playwright test --project=api

# Run with browser visible (debug)
npx playwright test --headed

# Interactive debug
npx playwright test --debug
```

### Seed assumptions

The following seeded accounts must exist in the test DB before running tests:

| Account | Email | Password | Role |
|---------|-------|----------|------|
| Admin | admin@sparq.com.au | admin123456 | ADMIN |
| Ops | ops@sparq.com.au | ops123456 | OPS |
| Support | support@sparq.com.au | support123456 | SUPPORT |
| Artist | lily.nguyen@example.com | provider123 | PROVIDER |
| Customer | emma@customer.com | password123 | CUSTOMER |

At least the following records should exist:
- 1 provider with KYC status PENDING
- 1 provider with KYC status VERIFIED
- 1 CONFIRMED booking
- 1 open dispute
- Several audit log entries (from prior admin actions)
