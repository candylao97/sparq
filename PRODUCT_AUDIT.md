# Sparq — Complete Product Audit
**Date:** 2026-04-06
**Auditor:** Senior PM / QA Architect / Marketplace Growth
**Version:** MVP (Pre-launch)

---

## Executive Summary

Sparq has a **solid technical foundation** — the schema is well-modelled, the UI design is premium, and the core booking loop exists. But **the platform is not launch-ready**. There are critical business logic gaps (fake urgency data, broken cancel/reschedule, no email verification), several P0 trust & safety failures, and significant monetization leakage risk. This audit covers every layer of the product.

**Verdict:** 6–8 weeks of focused work needed before a safe public launch.

---

## 1. End-to-End Audit Summary

### 1.1 Customer Journey

| Step | Status | Notes |
|------|--------|-------|
| Land on homepage | ✅ Works | Trust strip is static/fake |
| Search by location | ⚠️ Partial | Date filter built but unused; suburbs hardcoded |
| View provider listing | ⚠️ Misleading | Urgency signals (booking count, next available) are **fabricated** |
| Select service | ✅ Works | Service selector functional |
| Book (payment) | ⚠️ Unclear | 4-step flow exists; Stripe integration status unknown |
| Receive confirmation | ⚠️ Unknown | No confirmation email visible |
| Manage booking (cancel/reschedule) | ❌ Broken | Buttons exist, zero functionality |
| Leave review | ⚠️ Partial | Schema exists, UI path unclear |
| Access receipt | ⚠️ Partial | ReceiptModal component exists |

### 1.2 Artist Journey

| Step | Status | Notes |
|------|--------|-------|
| Register | ✅ Works | No email verification |
| KYC / Identity | ⚠️ Partial | Admin flow built; artist-facing Stripe Connect UI partial |
| Create service | ✅ Works | Commission hardcoded at 85% |
| Set pricing | ✅ Works | No pricing tiers / add-ons wired |
| Set availability | ⚠️ Partial | Calendar UI exists; save/fetch uncertain |
| Receive booking | ⚠️ Partial | Today view works; no push notifications |
| Accept/decline | ⚠️ Unclear | Pending bookings shown; accept/decline action unclear |
| Get paid (payout) | ⚠️ Partial | Stripe Connect exists; payout history incomplete |

### 1.3 Admin Journey

| Step | Status | Notes |
|------|--------|-------|
| KYC approval/rejection | ✅ Built | Full admin UI built |
| Artist moderation | ✅ Built | Suspend/ban with audit log |
| Listing moderation | ✅ Built | Hide/restore services |
| Dispute resolution | ✅ Built | Refund/dismiss actions |
| Audit log | ✅ Built | Immutable, paginated |
| RBAC (roles) | ⚠️ Partial | Admin defined; Ops/Support not seeded |

---

## 2. Missing Feature List

### P0 — Critical (block launch)

| # | Feature | Gap | Impact |
|---|---------|-----|--------|
| P0-01 | **Booking cancellation** | Button exists, no handler or confirmation modal | Customers cannot cancel; will dispute charge |
| P0-02 | **Booking reschedule** | Button exists, no functionality | Core marketplace workflow broken |
| P0-03 | **Fake urgency signals** | Provider listing fabricates "3–10 bookings/week" and "Next available today at 9AM" from a hash of the provider ID | Misleading consumers = regulatory risk + trust destruction |
| P0-04 | **Email verification** | Users can register with any email and immediately book | Fraud vector; spam signups; chargebacks |
| P0-05 | **Forgot password** | Link exists on login page, no page or handler behind it | Password recovery broken |
| P0-06 | **Cancellation policy** | No policy definition per artist, no policy enforcement on refund | Undefined dispute outcomes |
| P0-07 | **Booking confirmation email** | No email sent after payment | Customers have no record; trust collapses |
| P0-08 | **Artist accept/decline flow** | Pending bookings show in dashboard but accept/decline action path unclear | Bookings may auto-expire silently |
| P0-09 | **Date/time availability cross-check** | Search date filter is built but **never sent to API**; artists may receive bookings when unavailable | Double bookings; cancellations; bad NPS |
| P0-10 | **Stripe payout setup completion** | Artist-facing Stripe Connect onboarding UI is partial | Artists cannot receive money |

### P1 — Important (fix within 2 weeks of launch)

| # | Feature | Gap |
|---|---------|-----|
| P1-01 | Notification system | Schema exists (10 types), no delivery mechanism (no email, no push, no SMS) |
| P1-02 | Review submission flow | Schema exists, customer-facing UI path to leave review unclear |
| P1-03 | Rebook flow | "Rebook" button on completed bookings likely not functional |
| P1-04 | Receipt / Invoice | ReceiptModal component exists but content and download unknown |
| P1-05 | Artist: accept/decline bookings | Core supplier workflow not confirmed working |
| P1-06 | Portfolio upload | Cloudinary configured but not wired; placeholder Unsplash images everywhere |
| P1-07 | Service add-ons pricing | ServiceAddon model in schema; not integrated into booking price calculation |
| P1-08 | URL state for search filters | Filters lost on refresh/back navigation; breaks sharing |
| P1-09 | Availability blocking persistence | Save/fetch logic for blocked times unclear |
| P1-10 | Holiday hours | Setup checklist step always shows "incomplete" (hardcoded `done: false`) |
| P1-11 | Wishlists / Favourites | Route exists (`/wishlists`), implementation unknown |
| P1-12 | Mobile responsive layout | Category tabs appear twice; filter state behaves differently mobile vs. desktop |
| P1-13 | Commission rate configuration | 85% hardcoded in UI; should be configurable from admin |
| P1-14 | Melbourne suburbs | 40 suburbs hardcoded as static array; must be dynamic or at least expanded |

### P2 — Nice-to-have (post-launch iteration)

| # | Feature |
|---|---------|
| P2-01 | Referral program |
| P2-02 | Gift cards (`/gift-cards` route exists) |
| P2-03 | Real-time booking (vs. request-to-book) toggle per artist |
| P2-04 | Group bookings (schema has `guestCount`) |
| P2-05 | Tip / gratuity in payment flow |
| P2-06 | AI-generated service descriptions (button exists) |
| P2-07 | Dark mode |
| P2-08 | Multi-language support |
| P2-09 | In-app onboarding tour |
| P2-10 | Sparq Score public display and explanation page |

---

## 3. UX Issues

### 3.1 Homepage

| Issue | Severity |
|-------|----------|
| Trust strip metrics are static ("4.8+ avg rating") — no live calculation | Medium |
| Hero search uses HTML form action (`/search?q=`) instead of client-side navigation — drops filter state | Low |
| Quick-search chips hardcoded — no personalisation | Low |
| "Nail & lash artists near you" label is hardcoded, not location-aware | Low |
| Service mode cards (`/search?mode=HOME`) use `mode` param but search page reads `serviceMode` — **param mismatch** | High |

### 3.2 Search

| Issue | Severity |
|-------|----------|
| Filters are not synced to URL — refreshing or sharing a URL loses all filter state | High |
| Category tabs appear in both the sticky search bar AND the filter bar below it — confusing duplication | High |
| Date filter is built but silently ignored — users select a date and get wrong results | **Critical** |
| Sort menu overflows on mobile (`absolute right-0`) | Medium |
| "No artists in this area" empty state has no suggestion / CTA | Medium |
| Location input conflates text search (suburb name) and numeric (postcode) without feedback | Medium |

### 3.3 Provider Listing Page

| Issue | Severity |
|-------|----------|
| **Fake urgency signals** ("3–10 bookings this week", "Next available today at 9AM") are generated from a deterministic hash — not real data | **Critical** |
| Availability times are fabricated — customers may book expecting a slot that isn't real | **Critical** |
| No calendar widget showing actual open slots before booking | High |
| No "How many hours notice required" per artist | Medium |

### 3.4 Booking Flow

| Issue | Severity |
|-------|----------|
| Reschedule button has no functionality | Critical |
| Cancel button has no functionality | Critical |
| No cancellation fee warning before confirming cancellation | High |
| No booking modification confirmation email | High |
| Status badges use raw Tailwind colour classes (text-blue-600) — inconsistent with design system | Low |

### 3.5 Artist Dashboard

| Issue | Severity |
|-------|----------|
| Style Insight card is hardcoded promotional content — feels jarring on an operational dashboard | Medium |
| "Holiday hours" setup step always shows as incomplete regardless of actual state | Medium |
| No visual distinction between "Earnings card is clickable" vs static content | Low |
| Setup steps navigate away without saving partial progress warning | Low |
| Today's schedule shows max 6 appointments with "+N more" but "+N more" link is unclear | Low |

### 3.6 Registration / Login

| Issue | Severity |
|-------|----------|
| Forgot password link points to a non-existent page (`/forgot-password`) | Critical |
| Google OAuth signup has no post-auth onboarding step (role selection) | High |
| Dev credentials are rendered in the DOM in plain text — even if hidden in prod, they're in the bundle | Medium |
| No password strength indicator beyond "Min. 8 characters" | Low |
| Back button missing on email entry step | Low |

### 3.7 General

| Issue | Severity |
|-------|----------|
| No loading skeletons on most pages — content flashes in or shows blank | High |
| No error boundaries — API failure renders white screen | High |
| Toast notifications exist but no retry logic on failure | Medium |
| Sticky header height assumed to be exactly 80px in layout offset (`top-[80px]`) — breaks if header height changes | Low |
| Placeholder images from Unsplash in production — GDPR/privacy risk (external tracking pixel) | Medium |

---

## 4. Business Logic Gaps

### 4.1 Booking State Machine

The Booking schema has 8 statuses: `PENDING → CONFIRMED → IN_PROGRESS → COMPLETED → CANCELLED → DISPUTED → REFUNDED → NO_SHOW`

**Gaps:**
- No defined timeout for PENDING bookings (how long before auto-expire?)
- No defined rule for what happens when CONFIRMED booking artist cancels (who initiates refund? penalty?)
- NO_SHOW status exists in schema but no logic to set it (no grace period timer, no trigger)
- DISPUTED status can be set but no escalation timer (disputes should auto-resolve after N days if no admin action)
- IN_PROGRESS status has no trigger (manual? time-based? on artist check-in?)

### 4.2 Cancellation Policy

**Currently: None exists.**

Required:
- Artist-defined cancellation window (e.g., "Free cancellation up to 24 hours before")
- Artist cancellation penalty (artist cancels → customer full refund, artist rating impact)
- Customer no-show policy (customer no-show after grace period → artist paid % or full)
- Last-minute cancellation fee (e.g., < 12 hours = 50% fee retained)
- Force majeure handling (admin can waive fees)

### 4.3 Double Booking

**No prevention mechanism exists.**

- Two customers can book the same artist at the same time slot
- Availability calendar does not cross-check confirmed bookings when accepting new bookings
- Must implement slot locking at booking creation time

### 4.4 Payment Timing

**Undefined behaviour on:**
- What triggers a Stripe charge — at booking request or at confirmation?
- If artist takes 2 days to confirm, is the customer's card held?
- Partial payment / deposit model — referenced in audit scope but not implemented
- Payout release schedule — is payout sent immediately after `COMPLETED` or after dispute window closes?
- Dispute window duration — not defined anywhere

### 4.5 KYC + Booking Gate

**Partially implemented but has gaps:**
- `canAcceptBooking` logic exists in admin API but unclear if it's enforced on the public booking endpoint
- An artist can complete registration, create services, and appear in search before KYC is approved
- Artists should be searchable but non-bookable until VERIFIED (current state unclear)

### 4.6 Commission Calculation

- 85% hardcoded in UI (`avgPrice * 0.85`)
- Unclear if this is enforced at Stripe Transfer time or just displayed
- No configurable per-category or per-tier commission
- No platform fee charged to customer (only artist-side commission?) — confirm model

### 4.7 Review System

- Review schema has `isVerified` and `aiSummaryText` fields
- No gating of reviews to verified bookings only (risk of fake reviews)
- No response mechanism (artist cannot respond to reviews)
- No minimum booking completion before review allowed
- No review moderation queue visible to admin

---

## 5. Trust & Safety Risks

### 5.1 Fake Data (Critical)

**The provider listing page generates urgency signals from a deterministic hash of the provider ID.** This means:

```typescript
// Actual code in providers/[id]/page.tsx
const weeklyBookings = (hash % 8) + 3  // Always 3–10, never real
const nextAvailTime  = times[hash % 4] // Always one of 4 hardcoded times
```

This is deceptive advertising. In Australia this violates the **ACCC's misleading conduct provisions** under the Australian Consumer Law. **Must be removed before any public traffic.**

### 5.2 Off-Platform Booking Risk

**PII masking exists in the messaging system** but:
- Risk scoring flags PII in artist bios and service descriptions
- No enforcement at save time (only detected retrospectively)
- Artists can share phone numbers in their bio on registration (not blocked)
- No clear consequence for detected PII leakage (flag only, no auto-action)

### 5.3 Email Verification Gap

- Users can register with any email address
- No verification required before booking
- Fraudsters can create unlimited accounts
- Chargebacks cannot be disputed without verified email

### 5.4 Review Authenticity

- Any user can presumably leave any review (not gated to booking completion)
- No detection for review bombing (multiple reviews from same IP, same device)
- `isVerified` flag on Review model never set (always false)
- AI summary generation may mask fake reviews

### 5.5 Identity Verification

- KYC system is built for admin review but:
  - No Government ID verification (no Stripe Identity or external provider)
  - No face match / liveness check
  - KYC can be "approved" by an admin with no actual document review
  - `isVerified` on ProviderProfile set by admin click, not by a verified document chain

### 5.6 Dispute Handling

- Dispute schema exists and admin UI works
- No customer-facing "Open a dispute" button
- No evidence upload mechanism
- No defined timeline for resolution
- No escalation to Stripe chargeback prevention

### 5.7 Artist Background Check

- No criminal background check integration
- No working with children check (critical for at-home beauty services)
- Trust is entirely based on reviews — which can be gamed

---

## 6. Monetization Gaps

### 6.1 How Sparq Makes Money (Current State)

```
Artist earns 85% of booking price
Sparq takes 15% platform fee (via Stripe Connect transfer)
```

**Problems:**
- 15% commission rate is hardcoded in the UI only — unclear if enforced at the Stripe layer
- No customer-facing booking fee (e.g., 5% service fee like Airbnb charges buyers)
- No configurable commission tiers (new artists vs. Pro vs. Elite)

### 6.2 Revenue Leakage Risks

| Risk | Severity | Likelihood |
|------|----------|------------|
| Off-platform booking (artist gives customer their number) | High | Very likely without enforcement |
| Cancellation before charge capture | Medium | Depends on payment timing |
| Chargeback after service delivered (no evidence chain) | High | Moderate |
| Artist promotes their own booking channel via Sparq profile | Medium | Moderate |
| Multiple bookings confirmed but payment never captured | Medium | Low (Stripe handles) |

### 6.3 Missing Monetization Features

| Feature | Revenue Potential |
|---------|-----------------|
| **Customer-side service fee (3–5%)** | +3–5% of every GMV dollar |
| **Boost / featured listing** (artist pays to appear top of search) | New revenue stream |
| **Subscription for artists** ("Pro" tier removes per-booking fee, pays monthly) | Predictable recurring revenue |
| **Gift cards** (route exists, not built) | Float + gifting use case |
| **Add-on upsell** (tip, product purchase) | +5–15% per transaction |
| **Cancellation fee retention** | Reduces revenue loss on no-shows |
| **Instant payout fee** (artist pays 1% to receive money same day vs. standard 7-day) | Payment feature revenue |

### 6.4 Commission Model Comparison

| Platform | Buyer Fee | Seller Fee | Notes |
|----------|-----------|------------|-------|
| Airbnb | 14.2% | 3% | Split fee model |
| Fiverr | 5.5% + $2.50 | 20% | Higher seller fee |
| **Sparq (current)** | 0% | 15% | Seller-only fee |
| **Sparq (recommended)** | 5% | 12% | Split, lower total, higher perceived fairness |

---

## 7. Recommended Feature Roadmap

### Phase 1: Launch-Blockers (Weeks 1–3)

```
1. Remove fake urgency signals from provider listing
2. Implement booking cancellation with modal + refund trigger
3. Implement booking reschedule (date/time change request flow)
4. Add email verification on registration
5. Build forgot password flow (token-based reset email)
6. Fix date filter on search (wire to API)
7. Fix homepage service mode URL param mismatch (mode vs serviceMode)
8. Implement booking confirmation email (Resend or similar)
9. Ensure KYC gate enforced at public booking API
10. Define and implement cancellation policy per artist
```

### Phase 2: Core Experience (Weeks 4–6)

```
11. Real availability calendar (cross-check booked slots at reservation time)
12. Double booking prevention (slot locking)
13. Artist accept/decline flow + expiry timer
14. Notification system (email initially, then push)
15. Review submission flow post-booking
16. Rebook from booking history
17. Receipt download (PDF)
18. Portfolio upload via Cloudinary
19. Wire service add-ons into booking price calculation
20. Payout history + earnings breakdown page
```

### Phase 3: Trust & Growth (Weeks 7–10)

```
21. Customer-facing service fee (3–5%) added at checkout
22. Cancellation fee enforcement
23. Dispute evidence upload (photos, messages)
24. Review gating (only after booking COMPLETED)
25. Artist response to reviews
26. URL state sync for search filters
27. Configurable commission rates from admin
28. Off-platform booking detection + consequence workflow
29. PII auto-redaction at save time (not just detection)
30. Live trust metrics on homepage (real avg rating from DB)
```

### Phase 4: Monetization & Scale (Post-launch)

```
31. Boost / featured listings (paid search placement)
32. Artist subscription tier (flat monthly fee vs. per-booking commission)
33. Gift cards
34. Instant payout (premium feature)
35. Group booking flow
36. Multi-city expansion (remove hardcoded Melbourne suburbs)
37. Background check integration (ACIC or similar)
38. Stripe Identity for government ID verification
39. Referral program
40. Artist analytics dashboard (conversion rate, profile views, repeat rate)
```

---

## 8. Fast Wins (MVP Improvements — Can ship this week)

These require minimal engineering effort but have high trust/conversion impact:

### 8.1 Remove fake urgency (30 minutes)
Delete the hash-based urgency signal generation in `providers/[id]/page.tsx`. Replace with actual booking count from DB or remove entirely. Fake data is an existential legal and trust risk.

### 8.2 Fix URL param mismatch on homepage cards (15 minutes)
Change homepage service mode cards from `/search?mode=HOME` to `/search?serviceMode=HOME` (or update search page to read `mode`).

### 8.3 Disable non-functional buttons (1 hour)
Reschedule and Cancel buttons should be visually disabled with a tooltip ("Coming soon") until the functionality is built. This prevents user confusion and support tickets.

### 8.4 Forgot password — redirect to message (30 minutes)
Add a `/forgot-password` page that shows "We're working on this — contact support@sparq.com.au" until the full flow is built. Better than a 404.

### 8.5 Fix the date filter wire-up (2 hours)
The date filter is built in the UI but the value is never sent to `fetchProviders()`. A 2-line fix that prevents completely wrong search results.

### 8.6 Seed real Ops/Support accounts (1 hour)
Add `ops@sparq.com.au` and `support@sparq.com.au` to `prisma/seed.ts`. Required to test RBAC before launch.

### 8.7 Replace Unsplash placeholders (2 hours)
Move all hardcoded Unsplash image URLs to `next.config.mjs` allowedDomains and add alt text. Or replace with local placeholder SVGs. Prevents 3rd-party tracking in prod.

### 8.8 Make trust strip metrics real (3 hours)
Pull actual `AVG(rating)`, `COUNT(isVerified=true)`, and `COUNT(bookings)` from DB and display them. One SQL query, cached at build or ISR.

### 8.9 Holiday hours toggle (1 hour)
Fix the hardcoded `done: false` on the provider setup checklist by reading `ProviderProfile.holidayMode` (field exists in schema).

### 8.10 Commission label (30 minutes)
Change "Avg you earn: 85%" to read from a config constant (even `process.env.PLATFORM_FEE_PERCENT ?? 15`) so it's not buried as a magic number in 3 files.

---

## 9. Long-Term Airbnb-Level Improvements

These are the features that separate an MVP from a category-defining marketplace.

### 9.1 Search & Discovery

- **Map view** — show artists geographically, not just in a list (Airbnb's most-used feature)
- **Personalised recommendations** — "Artists similar to ones you've booked"
- **Dynamic pricing signals** — show price variance by day/time (busy Saturdays cost more)
- **"Available this weekend" filter** — the highest-converting filter in service marketplaces
- **Neighbourhood-level filtering** — "Artists in Fitzroy", not just "Melbourne"
- **Search intent detection** — if query is "lash lift near me", surface LASHES category automatically

### 9.2 Trust Infrastructure

- **Verified reviews** — only customers who completed a booking can review; badge displayed
- **Response rate & response time** — "Typically responds within 1 hour"
- **Superhost equivalent (Sparq Elite)** — criteria: 4.8+ rating, <1% cancellation, 100+ bookings
- **ID verification badge** — government ID confirmed via Stripe Identity or Onfido
- **Working With Children check badge** — critical for at-home services
- **Insurance verification** — professional indemnity insurance upload
- **Artist profile completeness score** — drives conversion (Airbnb data: 100% complete profiles convert 3x better)

### 9.3 Booking Experience

- **Instant book vs. Request to book** — toggle per artist (instant book converts 40% better)
- **Pre-booking questionnaire** — artist asks custom questions before confirming (allergies, preferences)
- **Service bundle pricing** — "Gel nails + lash lift = 10% off"
- **Repeat customer pricing** — artist can offer loyalty discount
- **Automated reminder sequence** — 48h, 24h, 2h before appointment
- **Check-in/check-out confirmation** — both parties confirm start and end time
- **Post-service follow-up** — "How was your appointment?" nudge 2 hours after

### 9.4 Artist Tools

- **Booking analytics** — weekly/monthly booking count, revenue trend, cancellation rate
- **Customer CRM** — customer history, notes, preferences per client
- **Service performance** — which services convert best from profile views
- **Upsell suggestions** — "Your Gel Nails customers often add Nail Art (+$30)"
- **Waitlist management** — when fully booked, capture demand for open slots
- **Multi-artist studio accounts** — one account, multiple artists under a brand
- **Commission tier display** — show real-time what % they're paying vs. what they'd save on subscription

### 9.5 Payments & Finance

- **Split payment at checkout** — pay deposit now, remainder on day of service
- **Instant payout** — artist option to receive funds within hours (1–2% fee)
- **Earning forecasting** — "Based on your schedule, you'll earn ~$1,200 this month"
- **Tax summary** — monthly/annual earnings statement for BAS (Australian GST compliance)
- **Stripe Identity for KYC** — real government ID verification, not admin opinion

### 9.6 Retention & Growth

- **Loyalty points / Sparq Credits** — earn credits per booking, redeem on next
- **Referral programme** — "Give $20, Get $20"
- **Subscription for frequent customers** — "Book 4x/month, save 10%"
- **Artist newsletter** — weekly tips, trend reports, booking tips from Sparq
- **Social sharing** — "Share your look" post-booking with branded overlay
- **Waitlist for launch cities** — capture demand in non-Melbourne markets

### 9.7 Safety & Compliance

- **Two-way review system** — artist reviews customer too (deters bad behaviour)
- **Emergency contact flow** — for at-home services, customer can share live location with trusted contact
- **Background check verification** — ACIC check integration for at-home artists
- **Anti-money laundering monitoring** — flag unusual booking patterns (Stripe Radar custom rules)
- **GDPR/Privacy Act compliance** — data deletion request flow, data export
- **Accessibility** — WCAG 2.1 AA compliance on all booking flows

---

## 10. Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Fake urgency signals trigger ACCC complaint | High | Catastrophic | Remove immediately |
| Double bookings at launch | High | High | Implement slot locking before accepting payment |
| Artist off-platforms customer after first booking | High | High | Platform exit penalty + PII enforcement |
| Chargeback wave from unclear cancellation policy | Medium | High | Define and publish policy before launch |
| Artist cannot receive payout (Stripe incomplete) | Medium | High | Verify Stripe Connect flow end-to-end |
| Email notification failure causes missed booking | Medium | High | Implement confirmation emails before launch |
| Fake reviews gaming search ranking | Medium | Medium | Gate reviews to verified bookings |
| Admin password compromised (no 2FA) | Low | Catastrophic | Add MFA for admin accounts |
| Stripe webhook key exposed | Low | Catastrophic | Rotate key; confirm it's not in repo |

---

## Summary Scorecard

| Area | Score | Notes |
|------|-------|-------|
| Data Model | 8/10 | Well-structured; availability querying is weak |
| Auth & Security | 5/10 | No email verification, no MFA, no rate limiting |
| Customer Experience | 5/10 | Core broken (cancel/reschedule); fake data |
| Artist Experience | 6/10 | Dashboard solid; onboarding incomplete |
| Admin System | 8/10 | Comprehensive; RBAC needs more roles |
| Payments | 5/10 | Commission logic unclear at Stripe level |
| Trust & Safety | 4/10 | Fake urgency is critical; no ID verification |
| Monetization | 4/10 | No customer fee; no alternate revenue; leakage risk |
| Search & Discovery | 6/10 | Functional; date filter broken; no map view |
| Notifications | 2/10 | Schema only; zero delivery |
| **Overall** | **5.3/10** | **Not launch-ready — 6–8 weeks of work** |
