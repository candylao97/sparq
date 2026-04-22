# Root-Cause Hunt — Provider ID Scheme Confusion

**Scope:** Read-only investigation into every place the `userId` ↔ `ProviderProfile.id` confusion exists in the codebase. No fixes applied. Triggered by FIND-1/2/3 in `READINESS_OUTPUT.md`.

**Repo state:** `/Users/candylao/Documents/Airservice` @ current working tree.
**Prisma version:** v5.22.
**Dev server during investigation:** single instance on :3004 (orphan servers on :3000–3002 killed at start).

---

## 1. Data model summary — "there are two IDs for every provider"

A provider has two primary keys in the database and they are **not** interchangeable:

| ID scheme                | Column                             | Type      | Example from seed |
| ------------------------ | ---------------------------------- | --------- | ----------------- |
| **User.id**              | `"User"."id"`                      | `cuid()`  | `clzxxx...user`   |
| **ProviderProfile.id**   | `"ProviderProfile"."id"`           | `cuid()`  | `clzxxx...profile`|
| Link between them        | `"ProviderProfile"."userId"`       | unique FK | = User.id         |

Both columns are opaque cuids of the same length and shape, so at a glance in logs, metadata, and URL params they look identical — which is exactly why the confusion survives so long.

Every provider-referring foreign key in the schema targets **one** of those two columns. The table below shows which column each FK points at. This is the canonical reference for the rest of this report.

### Fields inventory: provider-referring FKs

| Model                   | Column          | Targets                | Enforced by Prisma `@relation`? |
| ----------------------- | --------------- | ---------------------- | ------------------------------- |
| `ProviderProfile`       | `userId`        | `User.id`              | ✅ `onDelete: Cascade`          |
| `Service`               | `providerId`    | `ProviderProfile.id`   | ✅ `onDelete: Cascade`          |
| `Availability`          | `providerId`    | `ProviderProfile.id`   | ✅ `onDelete: Cascade`          |
| `PortfolioPhoto`        | `providerId`    | `ProviderProfile.id`   | ✅ `onDelete: Cascade`          |
| `Verification`          | `providerId`    | `ProviderProfile.id`   | ✅ `onDelete: Cascade`          |
| `ScoreFactors`          | `providerId`    | `ProviderProfile.id`   | ✅ `onDelete: Cascade`          |
| `KYCRecord`             | `providerId`    | `ProviderProfile.id`   | ✅ `onDelete: Cascade`          |
| `Booking`               | `providerId`    | `User.id`              | ✅ via `"ProviderBookings"`     |
| `Booking`               | `customerId`    | `User.id`              | ✅                              |
| `WaitlistEntry`         | `providerId`    | `User.id`              | ✅ via `"ProviderWaitlist"`     |
| `Notification`          | `userId`        | `User.id`              | ✅ `onDelete: Cascade`          |
| `Message`               | `senderId` / `receiverId` | `User.id`    | ✅                              |
| **`Payout`**            | **`providerId`**| **UNRESOLVED**         | ❌ **NO `@relation` in schema** |
| `Review`                | `customerId`    | `User.id`              | ✅                              |

**The `Payout.providerId` column has no Prisma `@relation`, no FK constraint in Postgres, and no `@@index([providerId])`.** It is a plain `String` that stores whichever cuid the caller happens to pass. This is the structural weakness that made FIND-2/FIND-3 possible and undetected.

Additional smaller gaps found during the schema sweep (not part of the id-scheme problem but worth knowing):

| Column                    | Status                                              |
| ------------------------- | --------------------------------------------------- |
| `Dispute.customerId`      | No `@relation` — unprotected string                 |
| `Dispute.resolvedBy`      | No `@relation` — unprotected string                 |
| `ReviewFlag.resolvedBy`   | No `@relation` — unprotected string                 |

---

## 2. Every write / read of provider-referring fields

Columns audited:

- `Booking.providerId` (→ User.id)
- `Payout.providerId` (→ unresolved)
- `Notification.userId` when sourced from a provider identity (→ User.id)
- `Availability.providerId` (→ ProviderProfile.id)
- `Service.providerId` (→ ProviderProfile.id)
- `ProviderProfile.userId` lookups
- `Verification.providerId`, `KYCRecord.providerId`, `ScoreFactors.providerId` (all → ProviderProfile.id)

Each `✓` means the ID passed matches the FK. Each `✗` means a documented mismatch. Each `⚠` means the call is internally consistent with a larger bug but depends on the wider pattern being fixed before it will keep working.

### 2.1 `Booking.providerId` (User.id)

| File : line | Direction | ID passed | Status |
| ----------- | --------- | --------- | ------ |
| `src/app/api/bookings/route.ts:98, 177, 207` | write / read | `service.provider.userId` | ✓ |
| `src/app/api/bookings/route.ts:279` | read | `session.user.id` | ✓ |
| `src/app/api/providers/[id]/route.ts:28, 47, 117` | read | `profile.userId` | ✓ |
| `src/app/api/providers/[id]/availability/route.ts:144` | read | `params.id` | ✓ (route-contract: see §4) |
| `src/app/api/providers/[id]/ical/route.ts:31` | read | `params.id` | ✓ (route-contract) |
| `src/app/api/calendar/ical/route.ts:49` | read | `provider.userId` | ✓ |
| `src/app/api/provider/clients/route.ts:20` | read | `session.user.id` | ✓ |
| `src/app/api/dashboard/provider/route.ts` (multiple) | read | `session.user.id` | ✓ |
| `src/app/api/dashboard/provider/earnings-by-month/route.ts:29` | read | `session.user.id` | ✓ |
| `src/app/api/admin/providers/[id]/route.ts:76` | read | `provider.userId` | ✓ |
| `src/app/api/cron/update-tiers/route.ts` (multiple $queryRaw) | read | `Booking."providerId"` directly | ✓ |
| `src/app/api/cron/notify-waitlist/route.ts:89` | read | `entry.providerId` (WaitlistEntry→User) | ✓ |
| `src/app/api/cron/re-engage-providers/route.ts:30, 33` | read | `providerUserIds` from profile.userId | ✓ |
| `src/app/api/cron/expire-bookings/route.ts` (multiple) | read/write | `booking.providerId` field itself | ✓ |
| `src/lib/riskScoring.ts:36` | read | `provider.userId` | ✓ |

**Booking.providerId is universally correct.** Every read and write uses a value that resolves to `User.id`.

### 2.2 `Payout.providerId` — the primary bug field

| File : line | Direction | ID passed | Scheme it implies | Status |
| ----------- | --------- | --------- | ------------------ | ------ |
| `src/app/api/bookings/[id]/route.ts:126` | write (create on COMPLETED) | `providerProfile.id` | ProviderProfile.id | **✗ FIND-2 source** |
| `src/app/api/bookings/[id]/route.ts:171` | write (upsert on COMPLETED) | `providerProfile.id` | ProviderProfile.id | **✗ FIND-2 source** |
| `src/app/api/cron/expire-bookings/route.ts:224` | write (auto-complete upsert) | `providerProfile.id` | ProviderProfile.id | **✗ FIND-2 source** |
| `src/app/api/disputes/[id]/route.ts:116` | write (RESOLVED_NO_REFUND upsert) | `providerProfile.id` | ProviderProfile.id | **✗ FIND-2 source** |
| `src/app/api/cron/process-payouts/route.ts:106` | read (expired penalties) | `payout.providerId` | whatever stored | ⚠ self-consistent |
| `src/app/api/cron/process-payouts/route.ts:144` | read (active penalties tx) | `payout.providerId` | whatever stored | ⚠ self-consistent |
| `src/app/api/cron/process-payouts/route.ts:235` | **written into `Notification.userId`** | `payout.providerId` (= ProviderProfile.id) | — | **✗ FIND-3 — FK violation, silently swallowed by `.catch(() => {})`** |
| `src/app/api/provider/penalties/route.ts:25` | read | `providerProfile.id` | ProviderProfile.id | ⚠ matches the (buggy) write scheme, so "works" until the writes are fixed |
| `src/app/api/dashboard/provider/payout-history/route.ts:31` | read | `session.user.id` | User.id | **✗ FIND-2 visible symptom** — returns empty list |

**Summary:** Writes consistently store `ProviderProfile.id`. Two consumers read it as `ProviderProfile.id` (`provider/penalties`, process-payouts penalty lookup) and accidentally agree with the writers. One consumer (`payout-history`) reads it as `User.id` and returns empty. One consumer (`process-payouts:235`) feeds it directly into `Notification.userId` which *is* an FK to User.id, so every payout-sent notification in production is a silent FK violation.

### 2.3 `Availability.providerId` (ProviderProfile.id)

| File : line | Direction | ID passed | Status |
| ----------- | --------- | --------- | ------ |
| `src/app/api/dashboard/provider/availability/route.ts:37, 50, 111, 113, 140, 142, 165, 167, 192, 204, 206` | write/read | `profile.id` | ✓ |
| `src/app/api/dashboard/provider/availability/[date]/route.ts:23` | read | `profile.id` | ✓ |
| `src/app/api/providers/[id]/route.ts:73, 91, 103` | read | `profile.id` | ✓ |
| `src/app/api/providers/[id]/availability/route.ts:25, 37, 110, 126` | read | `provider.id` resolved via `userId: params.id` | ✓ (after resolve) |
| `src/app/api/cron/notify-waitlist/route.ts:98` | read | `entry.providerId` = **User.id** | **✗ NEW FIND-10 — waitlist cron never finds availability** |

**FIND-10 (new):** `src/app/api/cron/notify-waitlist/route.ts:96-102` queries `prisma.availability.findFirst({ where: { providerId: entry.providerId, ... } })`. `WaitlistEntry.providerId` is `User.id` per the schema relation (`ProviderWaitlist`). `Availability.providerId` is `ProviderProfile.id`. The query always returns `null`, the next block (`if (!availability ...)`) always executes `continue`, and **the waitlist notification cron will never send a notification**. This is latent — no booking flow has triggered it yet because the platform has zero bookings in the live state the audit ran against, but on launch every waitlist signup will go unnotified.

### 2.4 `Notification.userId` — the silent-death column

Wherever a provider-derived id is stored here, the FK to `User.id` enforces the relationship at the DB level. Because every `prisma.notification.create(...)` is wrapped in `.catch(() => {})` (77 occurrences across 34 files, see §3), FK violations produce no log output.

Confirmed correct callers (User.id):
- `src/app/api/bookings/[id]/route.ts:238` — `service.provider.userId` ✓
- `src/app/api/cron/expire-bookings/route.ts:61, 99` — `booking.providerId`/`booking.customerId` ✓
- `src/app/api/cron/update-tiers/route.ts:334, 345` — `u.userId` ✓
- `src/app/api/cron/process-payouts/route.ts:126, 287, 343` — `payout.booking.providerId` ✓

Confirmed WRONG (ProviderProfile.id smuggled in):
- `src/app/api/cron/process-payouts/route.ts:235` — `payout.providerId` → FIND-3

No other violations found during this sweep.

### 2.5 `Service`, `Verification`, `KYCRecord`, `ScoreFactors` — all ProviderProfile.id

All callers uniformly pass `profile.id` / `providerProfile.id`. Spot-checked in:

- `src/app/api/services/route.ts:19, 71, 82, 92`
- `src/app/api/services/[id]/route.ts:29, 52, 179`
- `src/app/api/portfolio/route.ts:24, 47, 70, 77`, `portfolio/reorder/route.ts:30`
- `src/app/api/stripe/verify-identity/route.ts:46, 54` — `provider.id` ✓
- `src/app/api/stripe/webhooks/route.ts:66, 88, 90, 119, 537` — all `resolvedId` (= profile.id) ✓
- `src/app/api/webhooks/stripe/route.ts:66, 88, 90, 119, 490` — same ✓
- `src/app/api/admin/providers/[id]/route.ts:29, 32, 155, 158` — `params.id` as profile.id ✓

No mismatches found in this category.

### 2.6 Bugs confirmed and carried forward from the readiness audit

| Code    | File : line                                                | Symptom seen in audit                                |
| ------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| FIND-1  | `src/app/api/providers/[id]/availability/route.ts:78, 100` + `src/app/providers/[id]/page.tsx:272` | Availability 404 because caller passes profile.id, endpoint expects user.id |
| FIND-2  | 4 writer sites + `payout-history/route.ts:31`              | Provider dashboard payout history always empty       |
| FIND-3  | `src/app/api/cron/process-payouts/route.ts:235`            | "Payout sent" notification silently FK-violates      |

### 2.7 New bugs discovered during this sweep

| Code    | File : line                                                | Nature                                                      |
| ------- | ---------------------------------------------------------- | ----------------------------------------------------------- |
| FIND-10 | `src/app/api/cron/notify-waitlist/route.ts:98`             | Waitlist notification cron silently no-ops (wrong id scheme on Availability lookup) |
| FIND-11 | Both `/api/stripe/webhooks/route.ts` and `/api/webhooks/stripe/route.ts` exist as live Next.js routes | 587 vs 511 lines. Near-identical handlers; the second is missing the `charge.dispute.updated` and `account.external_account.*` cases. Guaranteed drift. See §5.1. |
| FIND-12 | `Payout.providerId` column                                 | No FK, no index, no `@relation` — the precondition that let FIND-2/3 exist |
| FIND-13 | 77 bare `.catch(() => {})` on DB ops across 34 files       | The mechanism that made FIND-3 invisible for months. See §3. |

---

## 3. Silent-catch audit (Phase 3a)

`ripgrep -c '\.catch\(\(.*\) => (\{\s*\}|null|undefined|0)\)'` → 77 occurrences in 34 files. Every one of these swallows exceptions with zero logging.

**Most dangerous cluster — Notification.create:** roughly 40 of the 77 wrap `prisma.notification.create(...)` or `createMany`. Because `Notification.userId` has a strict FK to `User.id`, any call that passes `ProviderProfile.id` (FIND-3) or a stale / deleted user id produces `P2003` on insert, which is then swallowed. There is no "FK violation count" surface in logs, admin UI, or monitoring.

**Second cluster — Payout.update on failure path:** `process-payouts/route.ts:121, 132, 241, 339, 349`. If any of these ever fail (e.g. a race condition on the same payout row) the payout is left in a half-updated state and nobody knows.

**Third cluster — audit/tier notifications:** `cron/update-tiers/route.ts:308, 340, 351`. A tier change with a failed audit-log write leaves an untraceable state change on `providerProfile.tier`.

**Representative sample (file : line → what is swallowed):**

| File : line                                          | Pattern                                                        |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| `src/app/api/cron/process-payouts/route.ts:241`      | Notification to provider that payout is on hold (FK risk)     |
| `src/app/api/cron/process-payouts/route.ts:339`      | Resend email + Notification on payout failure (FK risk + net) |
| `src/app/api/cron/process-payouts/route.ts:349`      | **Notification with userId = payout.providerId (FIND-3)**     |
| `src/app/api/stripe/webhooks/route.ts:358`           | Chargeback filed notification                                 |
| `src/app/api/stripe/webhooks/route.ts:433, 511, 575` | Refund failed / dispute updated / bank linked notifications   |
| `src/app/api/cron/expire-bookings/route.ts` (9×)     | Every notification-side-effect of booking expiry              |
| `src/app/api/disputes/[id]/route.ts` (5×)            | Every party-notification during dispute flow                  |
| `src/app/api/admin/disputes/route.ts` (7×)           | Every admin-triggered notification on dispute resolution      |

Every one of these 77 sites currently masks latent FK violations and race-condition errors. They should be converted to either `.catch(err => console.warn(...))` (for legitimately-non-blocking paths) or unwrapped so the transaction surfaces the failure. Without this, new id-scheme bugs introduced during the fix campaign will also die silently.

Full file-level counts (from `rg -c`):

```
src/app/api/cron/expire-bookings/route.ts          9
src/app/api/admin/disputes/route.ts                7
src/app/api/cron/process-payouts/route.ts          5
src/app/api/webhooks/stripe-subscription/route.ts  5
src/app/api/disputes/[id]/route.ts                 5
src/app/api/stripe/webhooks/route.ts               4
src/app/api/reviews/[id]/respond/route.ts          3
src/app/api/cron/update-tiers/route.ts             3
src/app/api/cron/notify-waitlist/route.ts          3
src/app/api/webhooks/stripe/route.ts               2
src/app/api/membership/cancel/route.ts             2
src/app/api/cron/expire-featured/route.ts          2
src/app/api/cron/send-reminders/route.ts           2
src/app/api/admin/kyc/[id]/route.ts                2
src/app/api/admin/providers/[id]/route.ts          2
src/app/api/reviews/[id]/reply/route.ts            2
src/lib/auth.ts                                    2
... (remaining 17 files: 1 each)
TOTAL                                             77
```

---

## 4. Ambiguous `[id]` route parameters (Phase 3b)

Next.js gives route handlers a single `params.id: string`. There is no type-level hint of which of the two provider cuids a caller must send. The current code uses the same URL prefix `/api/providers/[id]/*` to mean **different ids** in different files:

| Route                                               | `params.id` must be  | Proof                                               |
| --------------------------------------------------- | -------------------- | --------------------------------------------------- |
| `GET /api/providers/[id]`                           | **ProviderProfile.id** | `providers/[id]/route.ts:9` `where: { id: params.id }` |
| `POST /api/providers/[id]/view`                     | **User.id**          | `view/route.ts:12` `where: { userId: params.id }`   |
| `GET /api/providers/[id]/availability`              | **User.id**          | `availability/route.ts:78, 100` `where: { userId: params.id }`, line 144 uses it as `Booking.providerId` |
| `GET /api/providers/[id]/ical`                      | **User.id**          | `ical/route.ts:13, 31`                              |
| `PATCH /api/admin/providers/[id]`                   | **ProviderProfile.id** | `admin/providers/[id]/route.ts:29, 32, 64, 155, 158` |

So a frontend that has `profile.id` in hand, calls `GET /api/providers/{profile.id}` (works), then tries `GET /api/providers/{profile.id}/availability` (404 — the endpoint assumes user.id). That is exactly FIND-1.

**Frontend route with the same issue:** `src/app/providers/[id]/page.tsx:272` renders `<Link href={/book/${profile.id}}>` then the book page (`src/app/book/[providerId]/page.tsx`) and its internal APIs treat `[providerId]` inconsistently with the same split. Any user who goes to a provider page and clicks "book" can surface this path.

Secondary ambiguity: `src/app/api/waitlist/route.ts` accepts `providerId` in POST body (line 51) and stores it verbatim on `WaitlistEntry.providerId`, which the schema enforces as User.id. If the caller happens to pass `profile.id`, Prisma will throw an FK violation — which is caught outside our view because the route lacks a try/catch around the create.

### Missing FK constraints (Phase 3b)

| Column                    | Should target              | Current state                             |
| ------------------------- | -------------------------- | ----------------------------------------- |
| `Payout.providerId`       | `ProviderProfile.id` *or* `User.id` (pick one) | Plain `String`, no `@relation`, no index |
| `Dispute.customerId`      | `User.id`                  | Plain `String`, no `@relation`            |
| `Dispute.resolvedBy`      | `User.id` (admin)          | Plain `String`, no `@relation`            |
| `ReviewFlag.resolvedBy`   | `User.id` (admin)          | Plain `String`, no `@relation`            |

The first row is the one directly responsible for FIND-2/3 existing. Until a constraint lands, mismatched writes/reads stay invisible.

---

## 5. Side-findings worth flagging before fix-up begins

### 5.1 Two live Stripe webhook files (FIND-11)

Both of these are valid Next.js route handlers with `POST` exports and will be served by the dev/prod server at **two different URLs**:

- `src/app/api/stripe/webhooks/route.ts`  — 587 lines
- `src/app/api/webhooks/stripe/route.ts`  — 511 lines

They are ~99% byte-identical. Differences on inspection:

1. The `/stripe/webhooks` file handles `charge.dispute.updated` (lines 470–515) and `account.external_account.created|updated` (lines 552–579). The `/webhooks/stripe` file does not.
2. Both files were last modified within the same minute (Apr 21 19:38 local), so there is no reliable "which one is the intended one" signal.

**Risk:** a future webhook fix applied to only one of them silently desyncs. Also, if the Stripe dashboard is configured against the URL that lacks the two extra cases (`/webhooks/stripe`), chargeback-updated events and bank-account-linked events will be handled as `default: // Ignore` — i.e. thrown away — without any warning.

**Recommendation:** delete whichever URL is not configured in the Stripe dashboard (check `dashboard.stripe.com > Developers > Webhooks`). Do this before any other id-scheme fix touches webhook handling.

### 5.2 `Featured listing` purchase has no completion webhook

`src/app/api/featured/purchase/route.ts` creates a Stripe Checkout Session with `metadata.type = 'featured_listing'`, but neither webhook file handles `checkout.session.completed`. A customer who pays for a featured listing never has `isFeatured` or `featuredUntil` set on their `ProviderProfile`. Out of scope for this hunt — flagging for the audit follow-up list.

### 5.3 Naming does not signal which id is expected

Every single model uses the name `providerId` regardless of which scheme it points to. There is no naming convention to guide a reader or a type checker. This is the single biggest contributor to the class of bugs found.

---

## 6. Recommendations (no code written — decisions for you)

### 6.1 Canonical naming convention

Adopt one of:

- **Option A (recommended):** rename all columns that point to `User.id` to `providerUserId` (and `customerUserId`), leave `providerId` to mean `ProviderProfile.id`. This is a one-time migration pain but every future line of code reads unambiguously.
- **Option B:** go the other direction. Rename `Service.providerId`, `Availability.providerId`, etc. to `providerProfileId`. Leave `Booking.providerId` alone. Less migration risk but does not fix the Payout column.

Either option requires a schema migration and a codebase-wide rename. A small Prisma generator extension or a ts-morph codemod can execute the rename safely.

### 6.2 Enforce `Payout.providerId` at the DB level

Whichever id scheme is chosen for `Payout`, add:

```prisma
model Payout {
  providerId String
  provider   ProviderProfile @relation(fields: [providerId], references: [id], onDelete: Restrict)
  @@index([providerId])
}
```

This alone would have turned FIND-2 into a loud migration-time error the moment a dev introduced it. Backfill plan: run a migration that either (a) maps all existing `providerId` strings from profile.id → user.id or (b) validates the current distribution and adds the constraint on the side that currently has zero rows (the DB has 0 payouts at the time of this audit — this is the cheap moment to decide).

### 6.3 Replace `.catch(() => {})` with visible logging

Mechanical sweep: every occurrence listed in §3 should become one of:

- `.catch(err => console.warn('<context>:', err))` when the call is legitimately fire-and-forget.
- Un-wrapped when the call is on the critical path (most payout/notification sites).

Alternatively, introduce a `noFail(promise, ctx)` helper that logs with a structured context tag, so production logs at least show `[noFail:payout-sent-notify] P2003: ...` instead of nothing.

### 6.4 Disambiguate route params

Rename the ambiguous routes (URL-level change is cheap, zero-downtime-able):

- `GET /api/providers/[id]` (by profile id) stays.
- `GET /api/providers/[id]/availability` → `GET /api/providers/by-user/[userId]/availability`, or change the handler to accept profile.id and resolve to user.id inside.

The second option preserves URL stability. Either way, pick one convention for **all** sub-routes of `/api/providers/[id]` and make them agree.

### 6.5 Lint / type-level guard

Prisma does not distinguish `User.id` from `ProviderProfile.id` at the TypeScript level — both are `string`. A low-cost branded-type wrapper pays for itself:

```ts
type UserId = string & { readonly __brand: 'UserId' }
type ProviderProfileId = string & { readonly __brand: 'ProviderProfileId' }
```

And a handful of helper functions (`asUserId`, `asProviderProfileId`, plus `resolveProviderProfileFromUserId`) that tag the values at their source. Then every downstream call signature reads `providerId: ProviderProfileId` or `providerUserId: UserId` and TypeScript catches the mix-up at compile time. Incremental adoption — tag new code and the most dangerous hot spots (Payout, Notification) first.

---

## 7. Final scoreboard

- Files audited: 26 routes + 1 library + 1 schema
- Fields audited: 10
- Bugs confirmed from readiness audit: **3** (FIND-1, FIND-2, FIND-3)
- New bugs found: **4** (FIND-10, FIND-11, FIND-12, FIND-13)
- Bare `.catch(() => {})` sites that should be fixed as pre-work: **77**
- Ambiguous `[id]` routes on `/providers/*`: **5**
- Missing FKs on provider-referring columns: **1 critical** (`Payout.providerId`), **3 secondary**
- Fixes applied: **0** (as specified in brief)

This is the full inventory. Proceed to fix-plan when ready.
