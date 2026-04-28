# Test Coverage Audit — 2026-04-21

**Phase 1 output. Awaiting human sign-off before Phase 2.**

---

## 0. Setup blockers (flagged before Phase 1 ran)

The brief names two inputs that are NOT present in the repo:

| Input | Status | Workaround used |
|-------|--------|------------------|
| `AGENT_BRIEF.md` | Missing | Used the 40-bug audit captured in `BATCH_G_HANDBACK.md` + `ESCALATIONS.md` (from the session I just closed) as the bug list. |
| `GAP_ANALYSIS_OUTPUT.md` | Missing | Used `PRODUCT_AUDIT.md` (558L, 2026-04-06) + `tests/admin/TEST_PLAN.md` + my own codebase survey to construct a 12-domain taxonomy. |

Other blockers that affect Phase 3 execution, not this audit:

1. **Playwright not installed.** It's referenced by `package.json` scripts
   (`test:e2e*`), but not in `devDependencies`. `npx playwright` triggers
   an on-demand fetch. Browsers aren't provisioned either. Running the
   existing `tests/admin/specs/**` suite needs `npm i -D @playwright/test`
   and `npx playwright install chromium`.
2. **No `.env.test` / `.env.example`.** Only `.env` exists. Reproducing
   the test environment on another machine requires a known-good env
   template.
3. **No dedicated test DB.** `prisma/seed.ts` seeds the dev DB; there's
   no `jest-setup` hook that resets to a clean schema between suites.
   Current Jest tests all use `jest.mock('@/lib/prisma')` to avoid real DB
   calls — fine for unit/contract tests, but the Playwright suite
   (`tests/admin/helpers/seed.helper.ts`) assumes a live Postgres.
4. **No Stripe CLI setup instructions.** The Playwright webhook specs
   (`tests/admin/specs/webhooks/stripe.spec.ts`) expect `stripe listen`
   to be forwarding — the README doesn't mention it.
5. **No CI pipeline.** Tests run locally only. No branch-gate enforcement
   of the passing suite.

None of these block **Phase 2** (the plan); they all affect **Phase 3**
(actually writing the tests). Flagged here so the operator can green-
light the Phase 3 env work in parallel.

---

## 1. Current state

### Framework

| Tool | Version | Role |
|------|---------|------|
| Jest | 29.7.0 | Unit + contract tests (`src/__tests__/**/*.test.ts[x]`) |
| ts-jest | 29.4.6 | TS transform |
| jest-environment-jsdom | 29.7.0 | Default env (individual files can opt into `node` via docblock) |
| @testing-library/react | 16.3.2 | React component testing |
| @testing-library/jest-dom | 6.9.1 | DOM matchers |
| @testing-library/user-event | 14.6.1 | Installed, barely used |
| Playwright | 1.x (not installed) | Admin E2E + API specs in `tests/admin/**`; config exists, dependency doesn't |
| MSW | — | Not installed |
| GitHub Actions | — | Not configured |

`jest.config.ts` uses `next/jest`, maps `@/*` → `src/*`, matches
`src/__tests__/**/*.test.{ts,tsx}`. Setup file is
`src/__tests__/setup.ts` (one line: `import '@testing-library/jest-dom'`).

### Test suite results

I ran the suite twice: once against the clean HEAD of `main`
(commit `f15caca`, via `git stash -u`), and once against the
working-tree-drifted state (255 modified + untracked files).

**Clean `main` HEAD — baseline:**

```
Test Suites: 2 failed, 8 passed, 10 total
Tests:       8 failed, 252 passed, 260 total
Time:        ~1s
```

**Working-tree (drift applied) — state of the repo as-is:**

```
Test Suites: 7 failed, 3 passed, 10 total
Tests:       55 failed, 205 passed, 260 total
Time:        ~13s
```

The 8 clean-HEAD failures are **pre-existing test-vs-source drift**
that has nothing to do with the working tree:

| Suite | Failures | Cause |
|-------|----------|-------|
| `formatCurrency.test.ts` | 7 | `getTierColor` expects colours that no longer match `src/lib/utils.ts` (ELITE, PRO, TRUSTED, RISING), plus 3 `getLocationLabel` assertions expecting "At Your Home" / "At Studio" / "At Home or Studio" when source returns "At home" / "At a studio" / "Home & studio". |
| `BookingStatusPill.test.tsx` | 1 | `DECLINED` expected to contain a `gray` class; source now emits brand-ink classes. |

The additional 47 failures under working-tree drift are genuine drift —
the source moved, the tests on `main` didn't. They're unrelated to any
coverage work; they're a symptom of the uncommitted drift on `main`.

### Coverage

**Project-wide (against clean `main`, `collectCoverageFrom: src/**/*.{ts,tsx}`):**

| Metric | Clean `main` | Drifted tree |
|--------|--------------|---------------|
| Statements | **5.18 %** (1143 / 22028) | 2.44 % (1282 / 52384) |
| Branches | 49.11 % (221 / 450) | 32.72 % (215 / 657) |
| Functions | 11.67 % (23 / 197) | 6.75 % (25 / 370) |
| Lines | 5.18 % | 2.44 % |

The branch % is artificially high because Jest only counts branches in
files that have at least one test — it ignores the 166 files with 0%
coverage. The true measure is **lines** / **statements**, and both sit
at **5.2 % on clean `main`**.

**Files, by coverage bucket (clean `main`):**

| Bucket | Count | % of source |
|--------|------:|------------:|
| 100 % covered | 3 | 1.7 % |
| ≥ 50 % | 7 total | 4.0 % |
| > 0 % but < 50 % | 3 | 1.7 % |
| **0 %** | **166** | **94.3 %** |
| Total | 176 | — |

The 10 files with any coverage:

| File | Lines | Notes |
|------|------:|-------|
| `src/app/api/auth/register/route.ts` | 100 % | Full POST coverage |
| `src/components/providers/BookingStatusPill.tsx` | 100 % | Snapshot + class assertions |
| `src/lib/content-filter.ts` | 100 % | Phone / email / URL / social filters |
| `src/app/api/providers/route.ts` | 97.1 % | List endpoint |
| `src/app/api/messages/route.ts` | 96.9 % | Leakage filter at the API boundary |
| `src/app/api/providers/[id]/route.ts` | 88.0 % | Detail endpoint |
| `src/app/api/stripe/webhooks/route.ts` | 87.3 % | Covers a handful of events; gaps in charge.refunded / payout.paid |
| `src/app/api/bookings/route.ts` | 77.4 % | POST happy + some error paths |
| `src/app/api/bookings/[id]/route.ts` | 67.0 % | PATCH core; reschedule + dispute branches lighter |
| `src/lib/utils.ts` | 53.8 % | `formatCurrency`, `formatTime`, tier helpers — the rest (label normalizers) untested |

**Per-directory file coverage (drift-aware; files tracked / total in dir):**

| Directory | Tested files | Total | % |
|-----------|-------------:|------:|--:|
| `src/app/api` | 7 | 56 | 12.5 % |
| `src/lib` | 2 | 7 | 28.6 % |
| `src/components/providers` | 1 | 11 | 9.1 % |
| `src/app/admin` | 0 | 11 | 0 % |
| `src/app/dashboard` | 0 | 6 | 0 % |
| `src/components/dashboard` | 0 | 22 | 0 % |
| `src/components/messages` | 0 | 9 | 0 % |
| `src/components/ui` | 0 | 10 | 0 % |
| `src/hooks` | 0 | 3 | 0 % |
| `src/types` | 0 | 3 | 0 % |

### Flaky tests

**None observed.** Three consecutive runs (clean and drifted) gave
deterministic counts. The Jest suite is ~1–13s depending on state;
fast enough that flakiness would be rare anyway.

### E2E inventory (Playwright, not runnable as-is)

`tests/admin/specs/` contains 9 spec files (not executed in this audit
because Playwright isn't installed). The roster:

| Spec | Scope |
|------|-------|
| `artists.spec.ts` | Provider listing, suspend/restore, tier changes |
| `audit-log.spec.ts` | Immutable log rows, filtering |
| `auth.spec.ts` | Admin login, session expiry |
| `bookings.spec.ts` | Admin booking moderation |
| `disputes.spec.ts` | Dispute queue, resolution |
| `kyc.spec.ts` | KYC approve/reject, Stripe Connect states |
| `rbac.spec.ts` | Admin / Ops / Support role boundaries |
| `api/admin-api.spec.ts` | Contract tests over `/api/admin/*` |
| `webhooks/stripe.spec.ts` | Signed Stripe event replay |

These are well-scoped but currently **aspirational** — the framework
isn't wired, browsers aren't installed, and the auth storage states
(`.auth/admin.json` etc.) would be generated on first setup run.

---

## 2. Coverage by domain

Because `GAP_ANALYSIS_OUTPUT.md` isn't present, I constructed a 12-
domain taxonomy directly from the codebase (`src/app/api/**/route.ts`
enumeration + `src/lib` + `src/components`). If the operator already
has a different taxonomy, the mapping below can be re-pivoted without
redoing the coverage measurement.

Each domain lists: covered files, coverage type, and critical-path gaps.
**"Covered"** means the API route or lib function is explicitly
exercised by at least one Jest test assertion — not that 100 % of
branches are covered.

### Domain 1 — Identity & access

- **API surfaces.** `auth/register`, `auth/[...nextauth]`, `auth/change-password`, `auth/check-email`, `auth/forgot-password`, `auth/resend-verification`, `auth/verify-email`, `user/upgrade-role`, `profile`, `account-settings`, `account-settings/notification-preferences`, `src/middleware.ts`, `src/lib/auth.ts`.
- **Covered:** `src/__tests__/api/auth.test.ts` — unit/contract tests for `POST /api/auth/register`. One file, 100 % line coverage on `register/route.ts`.
- **Coverage type.** Contract-style (mocked Prisma + mocked bcrypt).
- **Untested critical paths.**
  - `auth/forgot-password`, `auth/verify-email`, `auth/resend-verification` — zero coverage on password reset + email-verification flows. These are PRODUCT_AUDIT P0-05 and P0-04.
  - `auth/change-password` — zero coverage. Account takeover risk if the rate limiter or old-password check regresses.
  - NextAuth session lifecycle — `src/lib/auth.ts` (JWT callbacks, `session.user.id` augmentation, role propagation) is entirely untested.
  - `middleware.ts` route guards — redirects for unauthed users on `/dashboard/*` are untested.
  - RBAC: `user.role === 'ADMIN'` checks scattered across admin routes — no single test proves a non-admin is rejected.

### Domain 2 — Bookings

- **API surfaces.** `bookings`, `bookings/[id]`, `bookings/[id]/reschedule`, `bookings/[id]/reschedule/request`, plus the cron jobs `cron/expire-bookings`, `cron/send-reminders`.
- **Covered:** `src/__tests__/api/bookings.test.ts` (22 tests, mocked Prisma; covers GET, POST, PATCH) — 77% on POST route, 67% on PATCH. `src/__tests__/utils/bookingStateMachine.test.ts` locks in the status-transition matrix.
- **Coverage type.** Unit + contract (mocked Prisma, mocked Stripe).
- **Untested critical paths.**
  - **Double-booking prevention** — the schema has no unique `(providerId, date, time)` constraint; current logic relies on `availability` lookups. No test proves two concurrent `POST /api/bookings` calls for the same slot can't both succeed (requires an integration test, not unit).
  - **Reschedule happy path + validator** — `bookings/[id]/reschedule` POST is untested. Availability re-check is custom logic.
  - **Reschedule request** — `bookings/[id]/reschedule/request` is a separate endpoint (customer proposes, artist accepts); untested.
  - **Cron expire-bookings** — decides which PENDING bookings auto-expire; no test.
  - **Cron send-reminders** — 24h / 1h reminder math; no test.
  - **NO_SHOW transitions** — the new AUDIT-037 fix proves `hoursUntilBooking` is DST-safe, but there's no test that the NO_SHOW status can only be set by the provider on a CONFIRMED past booking.
  - **Timezone correctness in the POST flow** — AUDIT-037 touched the client pages only. The API-side `bookingToUtc` use in `bookings/route.ts` is tested implicitly, not by name.

### Domain 3 — Payments (Stripe)

- **API surfaces.** `stripe/create-payment-intent`, `stripe/webhooks`, `webhooks/stripe`, `webhooks/stripe-subscription`, `stripe/connect`, `stripe/connect/refresh`, `stripe/verify-identity`, `cron/process-payouts`, `cron/expire-payments`, `cron/cleanup-webhooks`, `cron/cleanup-webhook-events`.
- **Covered:** `src/__tests__/api/stripe/webhooks.test.ts` — partial coverage of the Stripe webhook router (`charge.succeeded`, `payment_intent.succeeded`). 87% of the webhook route file.
- **Coverage type.** Unit + mocked Stripe signature verification.
- **Untested critical paths.**
  - **PaymentIntent creation** (`stripe/create-payment-intent`) — zero tests. Revenue-critical.
  - **PaymentIntent capture + cancel** — the manual-capture lifecycle inside `bookings/[id]/route.ts` PATCH has coverage for the happy path but not for (a) capture on booking acceptance, (b) cancel on decline, (c) what happens if Stripe returns an error mid-transition.
  - **Refund paths** — `admin/bookings/[id]/refund` is untested. `charge.refunded` webhook event is not asserted.
  - **Dispute webhooks** — `charge.dispute.created` / `charge.dispute.funds_withdrawn` / `charge.dispute.closed` aren't in the webhook test.
  - **Webhook event dedup** — prior audit flagged that duplicate events can trigger duplicate notifications. No test.
  - **Subscription webhooks** — `webhooks/stripe-subscription` (the new path) has zero coverage. Ties to AUDIT-001 tier enforcement.
  - **Payout cron** — `cron/process-payouts` is partially tested on its branch but that lives on `fix/audit-021-payment-reconciliation-cron`, not `main`.

### Domain 4 — Payouts & commission

- **API surfaces.** `admin/payouts/[id]/retry`, `admin/payments`, `provider/penalties`, `dashboard/provider/payout-history`, `dashboard/provider/earnings-by-month`, `dashboard/provider/commission-rate`, `cron/process-payouts`, `src/lib/stripe-payouts.ts`.
- **Covered:** None on `main`. (AUDIT-011 added `src/lib/next-payout.ts` + 10 tests on branch `fix/audit-011-next-payout-visibility`.)
- **Coverage type.** N/A.
- **Untested critical paths.**
  - **Commission math** — `getCommissionRate()` (in `utils.ts`) is partially tested, but `calculatePlatformFee()` isn't asserted against the full tier matrix incl. the negotiated overrides in `settings.ts`.
  - **Payout scheduling** — SCHEDULED → PROCESSING → COMPLETED transitions.
  - **Payout cancellation on dispute** — critical: a dispute must cancel an in-flight payout before Stripe transfers.
  - **Payout penalties** — `penaltyExpiresAt` logic for negative payouts (e.g., after an artist cancels late).
  - **Admin payout retry** — `admin/payouts/[id]/retry` is the Ops escape hatch when Stripe returns a failure. Zero coverage.
  - **`stripe-payouts.ts` helpers** — the `createTransfer` / `createPayout` wrappers are untested.

### Domain 5 — Disputes & T&S

- **API surfaces.** `disputes`, `disputes/[id]`, `admin/disputes`, `admin/leakage-flags`, `admin/fraud-signals`, `admin/reviews/[id]`, `src/lib/content-filter.ts`, `src/lib/riskScoring.ts`.
- **Covered:** `src/__tests__/utils/contentFilter.test.ts` (49 tests, 100% line coverage on `content-filter.ts`). `src/__tests__/api/messages/leakage.test.ts` (proves the filter is called at the API boundary).
- **Coverage type.** Unit + API contract.
- **Untested critical paths.**
  - **Dispute create** — `POST /api/disputes` has no test. All the new AUDIT-017 rate-limiting + the T&S-R4 3-per-30-day rule + the per-provider 2-per-90-day rule are untested on `main`.
  - **Dispute withdraw** — `DELETE /api/disputes` — payout restoration logic is complex (TS-3 refund check) and untested.
  - **Admin dispute resolution** — `admin/disputes` POST (grant refund / dismiss).
  - **Leakage flags** — `admin/leakage-flags` listing + resolution flow.
  - **Risk scoring** — `riskScoring.ts` is imported by fraud-signals but untested.
  - **Review moderation** — flagging a review doesn't have a test verifying it actually hides the review and notifies the author.

### Domain 6 — Artist catalog (services, availability)

- **API surfaces.** `services`, `services/[id]`, `services/[id]/addons`, `services/[id]/addons/[addonId]`, `services/[id]/duplicate`, `services/[id]/fee-preview`, `providers`, `providers/[id]`, `providers/[id]/availability`, `providers/[id]/view`, `providers/nearby`, `providers/[id]/ical`, `providers/[id]/ical/regenerate`, `dashboard/provider/availability`, `dashboard/provider/availability/[date]`, `dashboard/provider/service-area`, `calendar/ical`, `src/lib/availability-sentinel.ts`.
- **Covered:** `src/__tests__/api/providers.test.ts` — list + detail; 97% / 88%.
- **Coverage type.** Unit + contract.
- **Untested critical paths.**
  - **Service create / edit / duplicate** — `services` POST / `services/[id]` PATCH / `services/[id]/duplicate` are untested.
  - **Addon CRUD + price compounding** — price-calculation bugs here feed straight into booking total. Untested.
  - **Fee preview** — `services/[id]/fee-preview` — what the customer sees before pay. Untested.
  - **Availability save/fetch** — `providers/[id]/availability` + `dashboard/provider/availability` — AUDIT flagged availability as "save/fetch uncertain" in PRODUCT_AUDIT P0-09.
  - **iCal export + token regen** — `providers/[id]/ical/regenerate` is a security-sensitive endpoint (token invalidation). Untested.
  - **Nearby search** — `providers/nearby` geospatial query.
  - **Service-area rules** — `dashboard/provider/service-area`.

### Domain 7 — Reviews

- **API surfaces.** `reviews`, `reviews/[id]/flag`, `reviews/[id]/reply`, `reviews/[id]/respond`, `admin/reviews`, `admin/reviews/[id]`, `cron/review-reminders`.
- **Covered:** None.
- **Coverage type.** N/A.
- **Untested critical paths.**
  - **Post-booking review creation** — eligibility window, rating range, 1-review-per-booking rule.
  - **Flag + reply separation** — `reviews/[id]/flag` vs `reviews/[id]/reply` vs `reviews/[id]/respond` — what differentiates them isn't obvious from the route names alone. Needs a cover-all test.
  - **Admin moderation** — `admin/reviews/[id]` hide/restore.
  - **Review-reminder cron** — window, not-already-reviewed check.

### Domain 8 — Messaging

- **API surfaces.** `messages`, `messages/unread-count`, `notifications`, `notifications/[id]/read`, `src/components/messages/**` (9 components), `src/hooks/useMessages.ts`.
- **Covered:** `src/__tests__/api/messages/leakage.test.ts` — asserts the content-filter boundary integration. `src/__tests__/utils/contentFilter.test.ts` — unit-level filter coverage.
- **Coverage type.** Unit + contract.
- **Untested critical paths.**
  - **Unread count** — `messages/unread-count` used by navbar badge. Untested.
  - **Notification CRUD** — `notifications` GET/POST + mark-read.
  - **`useMessages` hook** — polling cadence, optimistic update, reconnect behaviour.
  - **Message components** — `MessageThread`, `MessageBubble`, `MessageInput` — zero component tests despite this being the primary trust-reduction surface (PII leakage happens in the input field).

### Domain 9 — Gift cards, promos, subscriptions, referrals

- **API surfaces.** `gift-cards/validate`, plus branch-only routes (`gift-cards/purchase`), `promo-codes/validate`, `subscriptions`, `membership/cancel`, `membership/upgrade`, `customer/billing-portal`, `customer/membership`, `referrals`, `featured/purchase`.
- **Covered:** None.
- **Coverage type.** N/A.
- **Untested critical paths.**
  - **Gift voucher validation + redemption** — VOUCHER_CODE format, single-use enforcement, expiry.
  - **Gift-card purchase** — AUDIT-017 adds velocity gates on branch but no test of the Stripe Checkout session creation itself.
  - **Promo-code validation** — expiry, usage cap, per-user limit.
  - **Subscription lifecycle** — create, cancel, renew, downgrade — critical for AUDIT-001 tier enforcement on `main`.
  - **Referrals** — credit issuance, fraud defence (self-referral).

### Domain 10 — Admin, moderation & audit log

- **API surfaces.** 30+ routes under `admin/*` — `admin/bookings`, `admin/providers`, `admin/services`, `admin/disputes`, `admin/kyc`, `admin/users`, `admin/audit-log`, `admin/reports`, `admin/settings`, `admin/stats`, `admin/fraud-signals`, `admin/vouchers`, `admin/export`, etc. Plus `src/lib/auditLog.ts`.
- **Covered:** None on Jest. Playwright has `tests/admin/specs/*.spec.ts` covering this surface in theory but they can't run as-is.
- **Coverage type.** Aspirational E2E only.
- **Untested critical paths.**
  - **Every admin route's role check** — the biggest single gap. No Jest test proves a non-admin gets 403 from any admin route.
  - **KYC approve / reject** — state transition + Stripe Connect update.
  - **Ban / suspend** — cascades to bookings, services, messages, payouts.
  - **Audit log immutability** — no test proves entries are never updated/deleted.
  - **Admin export** — `admin/export` CSV generation; PII exposure risk.

### Domain 11 — Customer / provider dashboards

- **API surfaces.** `dashboard/customer`, `dashboard/provider`, `dashboard/provider/*` (analytics, growth, kyc-status, payout-history, earnings-by-month, commission-rate, service-area), `src/hooks/useDashboardData.ts`, `src/hooks/useCustomerDashboardData.ts`.
- **Covered:** None.
- **Coverage type.** N/A.
- **Untested critical paths.**
  - **Data shape contracts** — dashboard aggregations (upcoming-bookings, totals, etc.) are computed server-side. A regression that returns the wrong shape silently breaks the UI.
  - **Hook error / loading states** — the hooks manage polling + auth; no tests.
  - **Component rendering with realistic data** — zero component tests for the 22 files under `src/components/dashboard/`.

### Domain 12 — Cross-cutting infra

- **Library surfaces.** `src/lib/rate-limit.ts`, `src/lib/email.ts`, `src/lib/sms.ts`, `src/lib/booking-time.ts`, `src/lib/riskScoring.ts`, `src/lib/auditLog.ts`, `src/lib/availability-sentinel.ts`, `src/lib/settings.ts`, `src/lib/utils.ts`, `src/lib/utils.server.ts`, `src/middleware.ts`.
- **Covered on `main`:** `src/__tests__/utils/formatCurrency.test.ts` (partial — and currently failing for `getTierColor` / `getLocationLabel`). `src/__tests__/utils/addressPrivacy.test.ts` (fully passing).
- **Coverage type.** Unit.
- **Untested critical paths.**
  - **Rate limiter** — `rate-limit.ts` is the hinge for 5+ endpoints now (AUDIT-017). No unit test proves the fail-closed behaviour in production vs. fail-open in dev.
  - **Email/SMS senders** — no tests that verify template selection, recipient resolution, or that errors are swallowed (many callers `.catch(() => {})`).
  - **`booking-time.ts`** — covered on branch by AUDIT-037's `bookingTime.test.ts`, but not on `main`.
  - **`auditLog.ts`** — the central logger. Every admin action is supposed to call it; no test proves it's idempotent or that a failure doesn't crash the caller.
  - **`middleware.ts`** — route guards for logged-in-only / role-restricted pages. Zero coverage.
  - **`availability-sentinel.ts`** — presumably a double-booking guard; untested.

---

## 3. Working-tree drift caveat

`main` HEAD is commit `f15caca` but the repo carries 255 modified /
untracked files as working-tree drift. Everything above is measured
against the **committed** source (post-stash) so the numbers are
reproducible. If you re-measure against the drifted tree you get
2.44 % coverage over 325 files, which muddies the signal — most of the
drift adds **new** untested code rather than making existing tests
obsolete.

Recommendation: Phase 2's target-setting should be done against the
drifted tree, because that's what ships. I can re-compute against drift
on request.

---

## 4. Summary — where we stand

- Jest runs reliably, no flakiness. **8 pre-existing failures** on
  clean `main` that should be triaged separately (they're test bugs,
  not product bugs).
- **~5 % statement coverage** across 176 source files on clean `main`.
  94 % of files have **zero** Jest coverage.
- Tests are **unit + API-contract** style (mocked Prisma, mocked
  Stripe). No integration tests against a real DB. No E2E running.
- Coverage is concentrated in 3 areas: **content-filter** (100%),
  **auth register** (100%), **bookings POST/PATCH** (~70%). Everything
  else is 0–ish.
- **Top risk clusters with zero or near-zero coverage:** payouts,
  disputes, reviews, admin authorization, subscriptions, gift
  vouchers, dashboard data shapes, middleware guards,
  rate-limiter behaviour.

---

---

## 5. Phase 2 — Top 20 missing tests (priority order)

Priority = impact × (inverse of setup cost). Items 1–10 are all
Jest-unit tests with mocked Prisma/Stripe, shippable as-is. Items
11–17 ask for slightly more mock scaffolding (fake clocks,
`settings.ts` mock, dashboard-shape snapshots). Items 18–20 are
**flagged as genuinely not unit-testable** — they need either an
integration DB or Playwright.

### Legend

- **Type.** `unit` / `integration` / `e2e`
- **Setup.** `low` = new file + existing mock patterns. `med` = fresh
  mocks (clock, settings, multiple Prisma tables). `high` = real DB
  tx, Playwright, or Stripe CLI.
- **Impact.** R = revenue, T = trust/safety, C = customer-visible,
  D = data-integrity. Multiple letters = multiple risks.

### 1 — Admin authorization sweep

- **Domain / Path.** Admin & audit — every `/api/admin/**` route (29 files).
- **Type.** unit &nbsp; **Setup.** low &nbsp; **Impact.** T, R
- **Why.** Every admin route repeats the same guard
  (`session.user.role === 'ADMIN'`). One regression in that pattern
  bypasses moderation, refunds, audit log — immediate trust collapse.
  No test on `main` proves a non-admin gets 401/403 from any of them.
- **Given** a session where `user.role === 'CUSTOMER'` (or no session),
- **When** the test hits every exported HTTP method on every
  `/api/admin/**/route.ts` with a minimal body,
- **Then** the response status is `401` or `403` and Prisma is never
  called. Implementation uses a parametrized `describe.each` over a
  route manifest so adding a 30th admin route forces the author to add
  a row.

### 2 — Subscription gate on effective commission tier

- **Domain / Path.** Payouts & commission — the tier-resolution helper
  and its callers in `getCommissionRateAsync` / `calculatePlatformFeeAsync`.
- **Type.** unit &nbsp; **Setup.** low &nbsp; **Impact.** R
- **Why.** AUDIT-001 shipped the fix on a branch; needs a regression
  guard on `main`. A provider whose Stripe subscription is `past_due`,
  `canceled`, or `unpaid` must NOT receive the tier-discounted
  commission rate — they revert to NEWCOMER.
- **Given** a provider with tier `ELITE` and `subscriptionStatus:
  'past_due'`,
- **When** the commission resolver is called for a new booking,
- **Then** the rate returned is the NEWCOMER default (0.15), not the
  ELITE discount (0.10), and a debug log records the fallback.

### 3 — Stripe PaymentIntent capture on accept, cancel on decline

- **Domain / Path.** Payments — `PATCH /api/bookings/[id]`.
- **Type.** unit &nbsp; **Setup.** low &nbsp; **Impact.** R, C
- **Why.** Manual-capture PaymentIntent lifecycle is revenue-critical
  and UI-visible. The existing suite covers the status transitions but
  doesn't assert the Stripe call. A regression that misses capture on
  accept = lost revenue + expired auth holds.
- **Given** a CONFIRMED booking with `stripePaymentIntentId: 'pi_123'`,
- **When** the provider PATCHes status → `CONFIRMED` (accept) or
  `DECLINED`,
- **Then** `stripe.paymentIntents.capture('pi_123')` is called once on
  accept; `stripe.paymentIntents.cancel('pi_123')` is called once on
  decline; neither is called on status transitions that aren't
  accept/decline.

### 4 — Stripe webhook idempotency

- **Domain / Path.** Payments — `POST /api/stripe/webhooks`.
- **Type.** unit &nbsp; **Setup.** low &nbsp; **Impact.** D
- **Why.** PRODUCT_AUDIT flagged duplicate webhook events triggering
  duplicate notifications. The route already writes to
  `prisma.processedWebhookEvent` (confirmed at line 30), but nothing
  proves a replayed event short-circuits.
- **Given** an incoming `payment_intent.succeeded` whose `event.id`
  already exists in `processedWebhookEvent`,
- **When** the webhook handler runs,
- **Then** no `booking.update` / `notification.create` /
  `payout.create` is called; response is 200; `processedWebhookEvent`
  is not re-written.

### 5 — Rate limiter fail-closed in production

- **Domain / Path.** Cross-cutting infra — `src/lib/rate-limit.ts`.
- **Type.** unit &nbsp; **Setup.** low &nbsp; **Impact.** T
- **Why.** The limiter gates 5 endpoints after AUDIT-017. The fail
  mode when Upstash env is missing is different in dev (fail-open) vs
  prod (fail-closed). Misconfiguring that in production disables the
  whole velocity defence silently.
- **Given** `UPSTASH_REDIS_REST_URL` unset and `NODE_ENV === 'production'`,
- **When** `rateLimit(key, 10, 3600)` is called,
- **Then** the return value is `false` (fail-closed) and a WARN is
  logged. Counterpart test: with `NODE_ENV === 'development'` the
  return is `true` (fail-open), no throw.

### 6 — Dispute create: T&S-R4 + per-provider caps

- **Domain / Path.** Disputes — `POST /api/disputes`.
- **Type.** unit &nbsp; **Setup.** low &nbsp; **Impact.** T, R
- **Why.** Two separate fraud caps (3 disputes / 30 days per customer,
  2 disputes / 90 days per (customer, provider)) and a filing SLA.
  Silent regression → refund farming goes uncapped.
- **Given** the calling customer has 3 disputes in the past 30 days OR
  2 disputes against the same provider in the past 90 days,
- **When** they `POST /api/disputes` for a new eligible booking,
- **Then** the response is 429 with the correct error copy; `dispute.create`
  is never called; booking status isn't changed to DISPUTED.

### 7 — Dispute withdraw: refund-processed path skips payout restore

- **Domain / Path.** Disputes — `DELETE /api/disputes?id=...`.
- **Type.** unit &nbsp; **Setup.** low &nbsp; **Impact.** R, D
- **Why.** The TS-3 branch (`refundStatus === 'PROCESSED'`) guards
  against double-paying the provider after the customer already got a
  refund. If that branch inverts, Sparq pays twice on every withdrawn
  dispute.
- **Given** a disputed booking with a CANCELLED payout AND
  `refundStatus === 'PROCESSED'`,
- **When** the customer DELETEs their dispute,
- **Then** the payout stays CANCELLED, booking goes back to COMPLETED,
  notification fires once, audit log entry written.

### 8 — Booking reschedule availability validation

- **Domain / Path.** Bookings — `POST /api/bookings/[id]/reschedule`.
- **Type.** unit &nbsp; **Setup.** low &nbsp; **Impact.** C, D
- **Why.** Reschedule lets customers pick a new slot. If availability
  isn't re-checked server-side, a customer can pin a slot the artist
  has since blocked → double-booking or no-show.
- **Given** a CONFIRMED booking and a proposed date/time that does not
  match `providers/[id]/availability`,
- **When** the POST is made,
- **Then** status is 400/409 with a clear "artist is no longer
  available then" error; booking row unchanged.

### 9 — Gift voucher single-use enforcement

- **Domain / Path.** Gift cards — `POST /api/gift-cards/validate` +
  redemption path in `POST /api/bookings` (applies `giftVoucherCode`).
- **Type.** unit &nbsp; **Setup.** low &nbsp; **Impact.** R
- **Why.** A redeemed voucher must never apply again. The
  `updateMany` pattern in some codebases is race-safe, but only if the
  `where` clause filters on `redeemedAt: null`. Currently untested.
- **Given** a voucher with `redeemedAt: '2026-01-01T...'`,
- **When** a booking POST passes that code,
- **Then** the booking is rejected (400) or voucher line doesn't
  apply; the voucher row isn't re-updated.

### 10 — Commission + platform-fee math across tiers & member flag

- **Domain / Path.** Payouts & commission — `calculatePlatformFeeAsync`,
  `getCommissionRateAsync` in `utils.server.ts`.
- **Type.** unit &nbsp; **Setup.** low &nbsp; **Impact.** R
- **Why.** Every booking's total + artist take depend on this.
  Settings overrides + `isMember` branch + floor clamp are easy to
  break silently. One table-driven test covering tier × member × price
  combinations pins the matrix.
- **Given** a matrix `{tier: NEWCOMER|RISING|TRUSTED|PRO|ELITE} ×
  {isMember: true|false} × {price: 10, 100, 1000}`,
- **When** `calculatePlatformFeeAsync` is called for each cell,
- **Then** the `{fee, floor}` result matches the expected cell value
  to within $0.01, and `isMember: true` always returns `{0, 0}`.

### 11 — Cron: expire-bookings marks and refunds stale PENDING

- **Domain / Path.** Cron — `GET /api/cron/expire-bookings`.
- **Type.** unit &nbsp; **Setup.** med (fake clock via `jest.useFakeTimers`) &nbsp; **Impact.** D, C
- **Why.** PENDING bookings with no artist accept must auto-expire and
  release the Stripe authorization. If the cron silently no-ops,
  the customer's card stays held for the full 7-day auth window.
- **Given** a PENDING booking whose `acceptDeadline < now`,
- **When** the cron handler runs,
- **Then** booking goes EXPIRED, `stripe.paymentIntents.cancel` is
  called, customer notification created, audit log written.

### 12 — Cron: process-payouts respects dispute hold + window

- **Domain / Path.** Cron — `GET /api/cron/process-payouts`.
- **Type.** unit &nbsp; **Setup.** med &nbsp; **Impact.** R, D
- **Why.** If this cron transfers funds on bookings with an open
  DISPUTE or inside the 48h dispute window, Sparq will pay the artist
  and then be on the hook for any subsequent refund. The branch
  `fix/audit-021-payment-reconciliation-cron` adds reconciliation but
  doesn't test the payout gate itself.
- **Given** a SCHEDULED payout for a booking that's (a) within its
  48h dispute deadline OR (b) has `dispute.status === 'OPEN'`,
- **When** the cron runs,
- **Then** the payout stays SCHEDULED; Stripe transfer is not created;
  a deferred-reason is logged.

### 13 — Middleware route guards

- **Domain / Path.** Cross-cutting — `src/middleware.ts`.
- **Type.** unit &nbsp; **Setup.** low (mock `next-auth/jwt`) &nbsp; **Impact.** T
- **Why.** Middleware is the first line defence for
  `/dashboard/*`, `/admin/*`, `/messages/*`. Easy to break by adding a
  new matcher or renaming a route.
- **Given** a NextRequest for `/dashboard/customer` with no session
  cookie,
- **When** the middleware runs,
- **Then** it returns a 302 to `/login?callbackUrl=/dashboard/customer`.
  Same pattern for `/admin/*` with a CUSTOMER role → 302 to `/`.

### 14 — Review visibility: flagged review hidden from public GET

- **Domain / Path.** Reviews — `POST /api/reviews/[id]/flag`,
  `GET /api/reviews?providerId=`.
- **Type.** unit &nbsp; **Setup.** low &nbsp; **Impact.** T
- **Why.** Flagging must remove the review from the public feed
  immediately; otherwise the "flag" button is theatre. Also: the
  author should still see their flagged review in their own history.
- **Given** a review with `status: 'FLAGGED'`,
- **When** an anonymous user GETs `/api/reviews?providerId=<pid>`,
- **Then** the flagged review is not in the response array. Extra
  assertion: its author GETting `/api/reviews?authorId=self` still
  sees it with a `status: 'FLAGGED'` badge.

### 15 — NO_SHOW transition rules

- **Domain / Path.** Bookings — `PATCH /api/bookings/[id]` with
  `status: 'NO_SHOW'`.
- **Type.** unit &nbsp; **Setup.** low &nbsp; **Impact.** T, R
- **Why.** Only the provider, only on a CONFIRMED booking whose
  `bookingDateTime < now` (DST-safe via AUDIT-037). Customers must
  never be able to mark themselves no-show. Future bookings must
  never be no-show-able.
- **Given** a CONFIRMED booking in the past,
- **When** the provider PATCHes `status: 'NO_SHOW'`,
- **Then** 200 and state transitions. Contrast cases: customer
  PATCHing same → 403. Provider PATCHing a future booking → 400.

### 16 — KYC gate on provider taking bookings

- **Domain / Path.** Bookings — `POST /api/bookings`.
- **Type.** unit &nbsp; **Setup.** low &nbsp; **Impact.** T, R
- **Why.** AUDIT-010 escalation: an artist can currently accept a
  booking before Stripe Connect `charges_enabled === true`. When the
  payment captures, Stripe rejects; customer sees an error; artist is
  confused.
- **Given** a provider with `stripeAccountId` set but
  `stripeChargesEnabled: false`,
- **When** a customer POSTs a booking for that provider's service,
- **Then** the response is 409/422 with a clear "artist setup
  incomplete" message; no PaymentIntent is created.

### 17 — Dashboard data shape contracts

- **Domain / Path.** Dashboards — `GET /api/dashboard/customer`,
  `GET /api/dashboard/provider`.
- **Type.** unit &nbsp; **Setup.** med (multi-table Prisma mocks +
  type assertion) &nbsp; **Impact.** C
- **Why.** Silent shape regressions here immediately break rendering
  on the most-trafficked authenticated pages. Snapshot or TypeBox
  schema assertion ties the response to `src/types/dashboard.ts`.
- **Given** a seeded customer with 2 upcoming + 3 past bookings + 1
  saved provider,
- **When** they GET `/api/dashboard/customer`,
- **Then** the response matches the `CustomerDashboardData` shape
  exactly (no extra keys, no missing keys). Provider variant: seeded
  provider with 1 pending + 2 confirmed-today + 1 queued payout.

### 18 — Double-booking race &nbsp; ⚠️ not unit-testable

- **Domain / Path.** Bookings — `POST /api/bookings`.
- **Type.** **integration (real DB)** &nbsp; **Setup.** high &nbsp; **Impact.** D, C
- **Why.** PRODUCT_AUDIT §4.3: no unique `(providerId, date, time)`
  constraint. Two concurrent requests for the same slot can both
  succeed because the availability read-then-write pattern isn't
  atomic. Proving this requires actual concurrent DB transactions —
  mocking Prisma defeats the test.
- **Needs.** A live Postgres + two simultaneous requests. Either (a)
  Playwright API-mode firing two `Promise.all` fetches, or (b) a Jest
  test that spins up a tx-per-worker via a real `PrismaClient`.
- **Given** a provider with exactly one availability window at
  `2099-12-31T10:00`,
- **When** two customers POST simultaneously for that exact slot,
- **Then** exactly one succeeds (booking created, slot blocked); the
  other gets 409; the failing request's Stripe PI (if any was
  created) is cancelled.
- **Flagged.** This is the #1 "can't unit-test, must integrate"
  item in the audit. A DB-level unique index is the real fix;
  this test proves the fix holds.

### 19 — Stripe webhook signature verification

- **Domain / Path.** Payments — `POST /api/stripe/webhooks`.
- **Type.** **integration (Stripe SDK)** &nbsp; **Setup.** med &nbsp; **Impact.** T, D
- **Why.** If `stripe.webhooks.constructEvent` ever gets bypassed or
  misconfigured (e.g., missing `STRIPE_WEBHOOK_SECRET` in the env),
  any attacker who learns the endpoint URL can forge events (refund
  triggers, subscription cancellations, you name it). Unit-tests that
  mock `constructEvent` can't catch this — the bug is in the binding,
  not the callers.
- **Needs.** A real Stripe SDK call to sign a payload with a known
  secret, plus an unsigned variant. Can be done inside Jest (no
  network), just with the real (not mocked) Stripe SDK.
- **Given** a payload signed with the wrong secret,
- **When** POST hits the webhook,
- **Then** response is 400, no Prisma writes, no side effects.
  Contrast: correctly signed payload is accepted.
- **Flagged.** Borderline — doable in Jest without network, but with
  the **real** Stripe SDK rather than the usual mock. Worth calling
  out because it's the only "integration-ish" Jest test in the list.

### 20 — Ban cascade end-to-end

- **Domain / Path.** Admin & T&S — `POST /api/admin/providers/[id]` +
  downstream effects.
- **Type.** **e2e (Playwright)** &nbsp; **Setup.** high &nbsp; **Impact.** T
- **Why.** When Ops bans a provider, four things must happen across
  three surfaces: (a) login blocked, (b) services hidden from search,
  (c) outstanding bookings flagged / cancellable, (d) audit log entry
  written. No unit test can assert the UI-visible parts; you need a
  real browser pass.
- **Needs.** Playwright running against a seeded DB, admin + customer
  + banned-provider auth states. Already scaffolded in
  `tests/admin/specs/rbac.spec.ts` but not wired to the ban flow.
- **Given** a provider with 2 CONFIRMED upcoming bookings and 1
  published service,
- **When** an admin bans them through `/admin/providers/[id]`,
- **Then** (a) provider cannot log in (sees suspended screen), (b)
  `/search` does not include the service, (c) the customer sees a
  "booking cancellable" banner on their existing booking, (d)
  `/admin/audit-log` has a `USER_BANNED` entry keyed to the admin
  actor.
- **Flagged.** Genuine E2E — spans 3 user sessions + 4 API calls + 3
  UI states. Unit tests can assert each leg in isolation but can't
  prove the cascade holds in practice.

---

## 6. Phase 2 summary table

| # | Domain | Path | Type | Setup | Impact |
|--:|--------|------|------|-------|--------|
|  1 | Admin & audit | `/api/admin/**` blanket | unit | low | T, R |
|  2 | Payouts & commission | Subscription → commission resolver | unit | low | R |
|  3 | Payments | PI capture / cancel on PATCH | unit | low | R, C |
|  4 | Payments | Webhook idempotency | unit | low | D |
|  5 | Cross-cutting | Rate limiter fail-closed | unit | low | T |
|  6 | Disputes | Dispute create caps | unit | low | T, R |
|  7 | Disputes | Withdraw + refund-processed branch | unit | low | R, D |
|  8 | Bookings | Reschedule availability re-check | unit | low | C, D |
|  9 | Gift cards | Voucher single-use | unit | low | R |
| 10 | Payouts & commission | Commission / fee matrix | unit | low | R |
| 11 | Cron | Expire-bookings + refund | unit | med | D, C |
| 12 | Cron | Process-payouts dispute hold | unit | med | R, D |
| 13 | Cross-cutting | Middleware route guards | unit | low | T |
| 14 | Reviews | Flagged review hidden | unit | low | T |
| 15 | Bookings | NO_SHOW transition rules | unit | low | T, R |
| 16 | Bookings | KYC gate on booking create | unit | low | T, R |
| 17 | Dashboards | Dashboard data shape contracts | unit | med | C |
| 18 | Bookings | **Double-booking race** | integration | high | D, C |
| 19 | Payments | **Webhook signature verify** | integration | med | T, D |
| 20 | Admin & T&S | **Ban cascade** | e2e | high | T |

**Legend.** T = trust/safety · R = revenue · C = customer-visible ·
D = data-integrity.

**Estimated effort.** Items 1–17 are ~6–8 engineer-days of Jest work;
most files are table-driven tests under 80 lines. Items 18–20 need
the env scaffolding flagged in section 0 first (Playwright install,
test DB, Stripe CLI); add ~3–5 days of setup + ~1 day per test.

---

## 7. Setup blockers (consolidated)

Pulled forward from section 0 and restated as a Phase-3 readiness
checklist:

| Blocker | Needed for | How to unblock |
|---------|-----------|----------------|
| Playwright not installed | #20, and running existing admin specs | `npm i -D @playwright/test`; `npx playwright install chromium`; document in README |
| No dedicated test DB | #18, #19, #20 | Add `DATABASE_URL_TEST`; add `jest.setup.ts` to truncate between integration tests; add `npm run db:reset:test` |
| No `.env.example` | All new dev machines | Add `.env.example` listing required vars (STRIPE_*, DATABASE_URL, NEXTAUTH_URL, UPSTASH_REDIS_*) |
| Stripe CLI not documented | #19, webhook E2E | README snippet + `stripe listen --forward-to localhost:3000/api/stripe/webhooks` |
| `getServerSession` mock pattern not reused | #1 (admin blanket), #13 (middleware) | Extract to `src/__tests__/helpers/sessionMock.ts` so all test files share it |
| Prisma-mocking pattern not reused | Items 1–17 | Extract `createPrismaMock()` to a helper so each new suite doesn't re-declare 15 `jest.mock` lines |
| CI pipeline absent | All of the above (enforcement) | Add `.github/workflows/test.yml` running `jest --ci --coverage` on PRs; surface coverage delta in the PR comment |

---

## Next step — awaiting approval before Phase 3

Phase 2 complete. If you want to proceed with writing tests, reply
with either:

- **"write all"** — I'll batch the 17 unit items into ~5 PRs grouped
  by domain (`test/coverage-payments`, `test/coverage-disputes`,
  `test/coverage-bookings`, `test/coverage-admin`, `test/coverage-
  infra`), one PR per domain. Items 18–20 will be held back until the
  env-scaffolding blockers in section 7 are resolved.
- **"write N"** — give me the row numbers you want, I'll cherry-pick.
- **"modify the plan"** — tell me which items to drop/add/reorder and
  I'll revise section 5 in place before we touch any code.

If the 17 unit items are approved as-is, I'll also pick up blockers
#5 and #6 (shared `sessionMock` / `createPrismaMock` helpers) as the
first commit of the first PR so every subsequent test file is ~30%
shorter.
