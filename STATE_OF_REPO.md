# State of the Repo — 2026-04-22

## TL;DR

**Deployability verdict: NOT SHIPPABLE.**

Sparq has had an intense but short recent work pass: a "40-bug audit" produced a
cluster of 11 `fix/audit-NNN-*` branches and 5 `test/coverage-*` branches, all
committed between 2026-04-21 14:01 and 20:10 local — the day before this review.
None have been merged. `main` is still the original `Initial commit` from
2026-03-20, and the repository cannot currently be deployed from any branch:
`next build` fails at TypeScript check in the customer dashboard page because
of drift between `CustomerDashboardData` and `src/app/dashboard/customer/page.tsx:145`.
On top of the broken build, `prisma/schema.prisma` has ~253 lines of uncommitted
drift with no corresponding migration, 8 required env vars are not documented in
any `.env.example`, Stripe webhooks live at two competing URLs, and 11 separate
launch-blocker issues (6 compliance + 5 code-level `FIND-*`) are open with no
branch against them. Multiple audit branches are stacked on each other rather
than on `main`, so merging them in any order other than the one the author
intended will produce conflict pain or silent drift.

The individual fixes on the audit branches look plausible — small diffs, tests
locked in — but the absence of CI, the build failure on `main`, the schema/env
drift, and the un-reconciled documentation (the same `FIND-10` / `FIND-11` /
`FIND-12` / `FIND-13` ids each mean two different bugs across two docs written
the same day) mean the project is in a fragile "lots of work done, nothing
landed" state. Priority 1 is unblocking `next build`; priority 2 is landing the
schema drift as a migration; priority 3 is deciding the six compliance
escalations so the remaining fixes can exist.

## Codebase health (Area 1)

### Stack
- [package.json](package.json): Next.js 14.2.35, React 18, TypeScript 5.9.3,
  Prisma 5.22.0, Stripe 20.4.0, NextAuth.js 4.24.13, Anthropic SDK 0.78,
  Tailwind 3.4, Zod 4.3
- Test runners: Jest 29.7 (unit/contract) + Playwright (aspirational —
  referenced in `package.json` scripts but not in `devDependencies`, per
  [TEST_COVERAGE_OUTPUT.md](TEST_COVERAGE_OUTPUT.md))

### Size
- **346** `.ts`/`.tsx` files in `src/`, **57,403** total lines
  - App code (excl. tests): **52,441** lines
  - Unit/contract tests (`src/__tests__/`): **5,046** lines across 15 suites
  - Playwright specs (`tests/`): **3,832** lines across 18 files
- [prisma/schema.prisma](prisma/schema.prisma): 728 lines, **31 models**
- 5 committed migrations; newest `prisma/migrations/20260408_p2_ux_polish/`

### Test status (`npx jest`)
- **7 of 15 suites failing**, **55 of 334 tests failing**, runtime 1.2s
- Passing suites: bookings, rescheduleFlow, expireBookings, dashboardContracts,
  rateLimit, middleware, addressPrivacy, bookingStateMachine
- Failing suites: auth, messages/leakage, providers, stripe/webhooks,
  BookingStatusPill, contentFilter, formatCurrency — most failures are
  **tests-vs-source drift** (e.g. `getLocationLabel('STUDIO')` expected
  `"At Studio"`, source now returns `"At a studio"`).

### Lint / typecheck
- `npm run lint`: **61 errors, 14 warnings** (common: `no-unused-vars`,
  `no-explicit-any`, `<img>` vs `next/image`). `next.config.mjs:27` sets
  `ignoreDuringBuilds: true`, so lint does not block `next build`.
- `npx tsc --noEmit`: **18 errors** including real app drift:
  - [src/app/dashboard/customer/page.tsx:145](src/app/dashboard/customer/page.tsx:145)
    reads `data.imminentBookings` missing from type
  - [src/app/dashboard/provider/page.tsx:113](src/app/dashboard/provider/page.tsx:113)
    missing `portfolioCount`, `unrespondedCount`
  - [src/app/dashboard/provider/payments/page.tsx:147](src/app/dashboard/provider/payments/page.tsx:147)
    references non-existent `tipStats`
  - [src/components/dashboard/customer/ArtistSections.tsx:245](src/components/dashboard/customer/ArtistSections.tsx:245)
    and [src/components/dashboard/customer/QuickNav.tsx:138](src/components/dashboard/customer/QuickNav.tsx:138)
    read `minPrice`, `offerAtHome`, `offerAtStudio` missing from
    `FavouriteTalent`

### Schema & migrations
- 31 Prisma models, 5 migrations, all additive / low-risk (enum values, new
  columns with defaults, `CREATE SEQUENCE`). No `DROP`, `TRUNCATE`, or data
  transforms.
- **⚠ Uncommitted schema drift: 253 insertions / 46 deletions** on
  [prisma/schema.prisma](prisma/schema.prisma) vs HEAD. No migration generated
  for it.

### Tech-debt indicators
- **0** real `TODO` / `FIXME` / `XXX` / `HACK` markers in src
  (one false-positive `XXX` placeholder in a URL pattern at
  [src/app/api/gift-cards/validate/route.ts:8](src/app/api/gift-cards/validate/route.ts:8)).
- **258** uncommitted / deleted files in the working tree vs HEAD.
- **9** planning/audit markdown files at repo root — more documentation than
  code-change artefacts.
- [ROOT_CAUSE_OUTPUT.md §3](ROOT_CAUSE_OUTPUT.md) counts **77 bare
  `.catch(() => {})`** across 34 files — silent-error anti-pattern across most
  notification / payout / webhook side-effects.

## Branch inventory (Area 2)

PRs **cannot be verified** — `gh` CLI not installed; remote is
`github.com/candylao97/sparq.git`. All rows are read from git only.

### Active branches (17)

| Branch | Audit id(s) | Ahead | Files | Last commit | Diff matches name? |
|---|---|---:|---:|---|---|
| `docs/escalations-memo` | — | 2 | 2 | 2026-04-21 17:10 | ✅ docs only |
| `fix/audit-001-subscription-tier-enforcement` | 001 | 5 | 13 | 2026-04-21 15:29 | ⚠ stacked on 004/005/006/007 |
| `fix/audit-004-availability-calendar` | 004 | 4 | 10 | 2026-04-21 14:43 | ⚠ stacked on 005/006/007 |
| `fix/audit-005-instant-book-confirmation-copy` | 005 | 1 | 4 | 2026-04-21 14:01 | ✅ |
| `fix/audit-006-login-gate-preserve-state` | 006 | 2 | 7 | 2026-04-21 14:36 | ⚠ also contains 005 |
| `fix/audit-007-retry-payment-preserve-state` | 007 | 3 | 7 | 2026-04-21 14:40 | ⚠ also contains 005/006 |
| `fix/audit-009-012-cancellation-policy-visibility` | 009, 012 | 8 | 27 | 2026-04-21 16:40 | ⚠ stacked on 001/004/005/006/007/014/021 |
| `fix/audit-011-next-payout-visibility` | 011 | 1 | 6 | 2026-04-21 16:46 | ✅ |
| `fix/audit-014-chargeback-defense-ui` | 014 | 7 | 22 | 2026-04-21 15:46 | ⚠ stacked on 001/004/005/006/007/021 |
| `fix/audit-017-velocity-checks` | 017 | 1 | 7 | 2026-04-21 16:59 | ✅ |
| `fix/audit-021-payment-reconciliation-cron` | 021 | 6 | 17 | 2026-04-21 15:39 | ⚠ stacked on 001/004/005/006/007 |
| `fix/audit-037-no-show-timezone` | 037 | 1 | 3 | 2026-04-21 17:06 | ✅ |
| `test/coverage-admin` | — | 2 | 9 | 2026-04-21 19:51 | ✅ stacked on coverage-infra |
| `test/coverage-bookings` (current) | — | 2 | 8 | 2026-04-21 20:10 | ✅ stacked on coverage-infra |
| `test/coverage-disputes` | — | 2 | 7 | 2026-04-21 20:05 | ✅ stacked on coverage-infra |
| `test/coverage-infra` | — | 1 | 5 | 2026-04-21 19:41 | ✅ |
| `test/coverage-payments` | — | 2 | 10 | 2026-04-21 20:01 | ✅ stacked on coverage-infra |

### Flags
- **No branches are 0-ahead.** **No WIP / asdf / trash commits** — all commit
  messages are conventional-commit style.
- **No branches are stale.** Every branch's last commit is 2026-04-21, one day
  before today (2026-04-22).
- **No branches are behind `main`** — `main` has stayed at `f15caca Initial
  commit` since 2026-03-20.
- **Audit-id gaps:** branches exist for ids 001, 004, 005, 006, 007, 009, 011,
  012, 014, 017, 021, 037. Missing ids from the "40-bug audit" claim: 002, 003,
  008, 010, 013, 015, 016, 018, 019, 020, 022-036 (except 036), 038-040. Most
  are either ESCALATED (see Area 5) or have no source describing them (see
  Area 3).
- **Branching hygiene issue:** `fix/audit-001`, `004`, `006`, `007`,
  `009-012`, `014`, `021` were cut on top of each other, not from `main`.
  E.g. `fix/audit-009-012` carries commits for 014, 021, 001, 004, 007, 006,
  005 as well as its own commit. A PR for any of these carries other audits'
  work. Merge order must be carefully chosen or the commits will all merge
  together in a single rebase.

## Bug queue snapshot (Area 3)

### Counts
- **AUDIT-NNN ids referenced anywhere:** 21 distinct ids (001, 002, 003, 004,
  005, 006, 007, 008, 009, 010, 011, 012, 013, 014, 015, 016, 017, 020, 021,
  036, 037). The `BATCH_G_HANDBACK.md` claims "40-bug audit" but only 21 are
  described in any source.
- **FIND-N ids referenced anywhere:** 13, with **4 of them (10/11/12/13)
  double-booked** — see Discrepancies.
- **Status breakdown:**
  - `IN_REVIEW` (branch exists, work committed, no PR): 11 audit branches +
    `docs/escalations-memo`
  - `MERGED` — AUDIT-008 only, and it's a documented no-op (no code change).
    Nothing else is on `main`.
  - `ESCALATED` — 8 audit ids (002, 003, 010, 013, 015, 016, 020, 036) per
    `ESCALATIONS.md` + 3 FIND ids (4, 5, 6) per `READINESS_OUTPUT.md`.
  - `OPEN` — 10 FIND ids (1, 2, 3, 7, 8, 9, plus the dual-meaning 10/11/12/13).
  - `UNKNOWN` — at least 19 claimed AUDIT ids (018, 019, 022–035 less 036,
    038–040) with zero supporting description in any doc, branch, or commit.

### Discrepancies between sources
1. **`FIND-10` / `FIND-11` / `FIND-12` / `FIND-13` each mean two different
   things** across [READINESS_OUTPUT.md](READINESS_OUTPUT.md) and
   [ROOT_CAUSE_OUTPUT.md](ROOT_CAUSE_OUTPUT.md), both dated the same day:
   - `FIND-10`: README says "no admin UI for PromoCode"; ROOT_CAUSE says
     "waitlist cron Availability id-scheme mismatch"
   - `FIND-11`: README says "search 'gel nails' returns 0"; ROOT_CAUSE says
     "two live Stripe webhook routes"
   - `FIND-12`: README says "Melbourne seed/copy drift"; ROOT_CAUSE says
     "`Payout.providerId` has no FK / index"
   - `FIND-13`: README says "register 500s on validation"; ROOT_CAUSE says
     "77 silent `.catch(() => {})`"
2. **`FIND-9` contradicts `AUDIT-008`.** READINESS marks "no PDF receipt" as a
   launch-blocker; BATCH_G_HANDBACK closes AUDIT-008 as a no-op because the
   browser-print flow from `ReceiptModal` is deemed sufficient. Product call
   needed.
3. **The user-prompt's "known escalations" do not match `ESCALATIONS.md`.**
   Only AUDIT-010 matches; AUDIT-002/003/013/020 are all different bugs in the
   prompt than in the memo. Detailed table in Area 5 and in `AGENT_BRIEF.md`.

## Deployment state (Area 4)

- **No deploy target on `main`.** No `vercel.json`, no `netlify.toml`, no
  `Dockerfile`, no `.github/workflows/`. Some audit branches carry a
  `vercel.json` (8 Vercel cron schedules including `process-payouts`,
  `expire-bookings`, `reconcile-payments`). Branch-specific, not merged.
- **No staging environment signal.** No `stage` branch, no stage env file.
- **No CI.** `[TEST_COVERAGE_OUTPUT.md §0](TEST_COVERAGE_OUTPUT.md)` corroborates:
  "Tests run locally only. No branch-gate enforcement of the passing suite."
- **Env surface:**
  - 21 vars in `.env` (gitignored; confirmed never committed to any branch).
  - 8 vars referenced in `src/` but NOT present in `.env`: `CRON_SECRET`,
    `NEXT_PUBLIC_DEV_MODE`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`,
    `STRIPE_PRICE_{ELITE,PREMIUM,PRO}`, `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET`.
  - 1 unused env var in `.env`: `ANTHROPIC_API_KEY` (no code references).
  - **No `.env.example`** — fresh-environment provisioning requires reverse-
    engineering the full list.
- **Secrets scan:**
  - No Stripe live keys, Stripe test keys, or embedded postgres passwords in
    any tracked file (`git ls-files | xargs grep ...` returns empty).
  - **Finding:** a GitHub personal-access-token is embedded in the local
    `.git/config` origin URL. Not in any committed file — a local-machine
    credential hygiene issue, not a repo-level leak. Recommend rotation + use
    of credential helper or SSH. Token value intentionally not quoted here.
- **Migrations:** 5 committed, all additive (`ADD COLUMN`, `ADD VALUE`,
  `CREATE SEQUENCE`, FK constraints). Newest directory name dates 2026-04-08
  (filesystem mtime 2026-04-21).
  - **⚠ 253 lines of uncommitted `schema.prisma` drift** with no migration
    generated. Deploying `prisma migrate deploy` would apply only the 5
    existing migrations, and the runtime Prisma client (generated from the
    drifted schema) would reference columns that do not exist in the
    production DB.

## Open escalations (Area 5)

| Id | Decision needed | Blocking | Owner | Source |
|---|---|---|---|---|
| AUDIT-002 | Commission rate schedule + T&Cs disclosure + notice window | AUDIT-001 in-code implementation | Legal + Finance + Product | [ESCALATIONS.md](ESCALATIONS.md) (memo branch) |
| AUDIT-003 | Merchant-of-record vs conduit for GST | AUDIT-008 receipt content, Stripe Tax enablement, `Booking.gstAmount` schema | Finance + Legal | ESCALATIONS.md |
| AUDIT-010 | Strict vs soft-launch KYC gate + hold-timer length | First-booking flow for providers; AUSTRAC posture | Compliance + Product | ESCALATIONS.md |
| AUDIT-013 | Ratify 6/24/48h tiers, or add NO_REFUND/CUSTOM | FIND-7 refund-enforcement implementation | Ops + Legal | ESCALATIONS.md |
| AUDIT-015 | Dispute SLA + auto-escalation ladder | Auto-escalate cron design; T&S headcount | Ops lead | ESCALATIONS.md |
| AUDIT-016 | Review takedown bar + appeal path | Review moderation UI; audit-log fields | T&S + Legal | ESCALATIONS.md |
| AUDIT-020 | Pricing-transparency level (single vs two-line vs full breakdown) | Booking-confirm page, receipt layout; ACL s.48 | Legal + Product | ESCALATIONS.md |
| AUDIT-036 | Data retention matrix (hard vs soft delete; 2y/7y timers) | FIND-5 deletion endpoint; APP 11.2 compliance | Legal + Privacy | ESCALATIONS.md |
| FIND-4 | ToS consent fields + version gate | Registration flow; launch | Legal + Product | [READINESS_OUTPUT.md](READINESS_OUTPUT.md) |
| FIND-5 | Deletion UX + retention (overlaps AUDIT-036) | Launch; APP 11.2 | Legal + Privacy | READINESS_OUTPUT.md |
| FIND-6 | Email categories + unsubscribe SLA | Launch; Spam Act 2003 | Legal + Marketing | READINESS_OUTPUT.md |
| — | Rebase-vs-combined-PR strategy for stacked audit branches | Any merge | Engineering | Area 2 of this report |
| — | Schema-drift + working-tree cleanup | All merges | Engineering | Area 4 of this report |
| — | FIND-9 vs AUDIT-008 PDF-receipt tiebreak | Launch receipt compliance | Product | Area 3 of this report |

## Deployability (Area 6)

**Verdict: NOT SHIPPABLE.**

Evidence:
- `next build` **fails at TS check** on
  [src/app/dashboard/customer/page.tsx:145](src/app/dashboard/customer/page.tsx:145)
  reading `data.imminentBookings` missing from `CustomerDashboardData`.
- Jest is red (55 failures).
- `tsc --noEmit` is red (18 errors).
- `prisma/schema.prisma` has 253 lines of uncommitted drift with no migration
  generated.
- 8 required env vars undocumented; no `.env.example` committed.
- No deployment target (`vercel.json` / `Dockerfile` / CI) configured on `main`.
- FIND-1, FIND-2, FIND-3 are code-level P0s with no branch open. FIND-4, FIND-5,
  FIND-6 are AU-law compliance blockers (Privacy Act APP 11, Spam Act 2003)
  with no branch open.
- 11 of the 12 non-`main` branches are un-merged; two audit branches that exist
  (`docs/escalations-memo` + 11× `fix/audit-*`) are stacked in a way that makes
  clean per-branch merging impossible without cherry-picking.

**Blockers to remove, in order:**

1. Fix the type drift that breaks `next build` (customer/provider dashboard
   pages, `FavouriteTalent`, `CustomerDashboardData`).
2. Either commit `schema.prisma` drift with a new migration, or revert.
3. Choose a deployment target; commit its config and a CI workflow.
4. Write and commit `.env.example` covering all 29 vars.
5. Decide FIND-4 / FIND-5 / FIND-6 policy and land the six legal blockers.
6. Open branches for FIND-1 / FIND-2 / FIND-3 / FIND-7 / FIND-8.
7. Decide the rebase strategy for stacked audit branches.
8. Commit the `docs/escalations-memo` PR so ESCALATIONS.md reaches `main`.

## Things I couldn't determine

1. **Whether any open PRs exist on GitHub** — `gh` CLI not installed and I did
   not attempt to authenticate with the remote.
2. **The true intended meaning of FIND-10 / FIND-11 / FIND-12 / FIND-13** —
   the two docs disagree. Whoever owns the readiness audit needs to declare
   which set is canonical (or renumber one set).
3. **The definitions of the 19 AUDIT ids with no source** (018, 019, 022–035,
   038–040). `BATCH_G_HANDBACK.md` says "23 out-of-scope items", matching the
   count roughly, but never names them.
4. **Whether AUDIT-008 is truly a no-op or whether FIND-9 is right.** The two
   verdicts were written the same day by the same author. A product decision
   is needed.
5. **Which of `/api/stripe/webhooks` or `/api/webhooks/stripe` is the one
   configured in the Stripe Dashboard.** ROOT_CAUSE_OUTPUT.md §5.1 flags this
   as FIND-11 (in its numbering). The two route handlers differ in event-type
   coverage — so chargeback-updated and external-account-linked events are
   silently dropped by one of them.
6. **Whether `prisma/seed.ts` drift** (which is modified in the working tree)
   matches the `schema.prisma` drift, or whether they have diverged
   independently. Not inspected in this read-only pass — left to a focused
   review.
7. **Whether any of the 5 `test/coverage-*` branches have been validated
   end-to-end** by the author (they're the most recent commits — 2026-04-21
   20:10, 20:05, 20:01, 19:51, 19:41 — and they all stack on
   `test/coverage-infra`).
8. **The provenance of the "40-bug audit"** — no `AGENT_BRIEF.md` or
   `GAP_ANALYSIS_OUTPUT.md` exists in the repo or any branch. The taxonomy
   predates all artefacts in this tree.
