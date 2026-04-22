/**
 * base.fixture.ts
 *
 * Extends Playwright's base `test` with:
 *  - adminPage  : Page already on /admin (authenticated)
 *  - apiContext : APIRequestContext authenticated as admin
 *  - testDb     : Lightweight DB helpers (read-only — use seed.helper for mutations)
 *
 * Usage:
 *   import { test, expect } from '../fixtures/base.fixture'
 */

import { test as base, type Page, type APIRequestContext } from '@playwright/test'
import { ADMIN_ROUTES, API_BASE } from '../helpers/constants'

// ── Types ──────────────────────────────────────────────────────────────────

export type AdminFixtures = {
  adminPage: Page
  apiContext: APIRequestContext
  artistId: string          // a seeded, unverified artist for KYC tests
  verifiedArtistId: string  // a seeded, verified artist
  customerId: string        // a seeded customer
  bookingId: string         // an active booking
  disputeId: string         // an open dispute
}

// ── Fixture definitions ────────────────────────────────────────────────────

export const test = base.extend<AdminFixtures>({

  adminPage: async ({ page }, use) => {
    await page.goto(ADMIN_ROUTES.dashboard)
    await use(page)
  },

  apiContext: async ({ request }, use) => {
    await use(request)
  },

  // These IDs are resolved by querying the API at runtime
  // (seeded by prisma/seed.ts before the test run)

  artistId: async ({ request }, use) => {
    const res = await request.get(`${API_BASE}/admin/kyc?status=PENDING&limit=1`)
    const data = await res.json()
    const id = data.providers?.[0]?.id ?? ''
    await use(id)
  },

  verifiedArtistId: async ({ request }, use) => {
    const res = await request.get(`${API_BASE}/admin/kyc?status=VERIFIED&limit=1`)
    const data = await res.json()
    const id = data.providers?.[0]?.id ?? ''
    await use(id)
  },

  customerId: async ({ request }, use) => {
    const res = await request.get(`${API_BASE}/admin/users?role=CUSTOMER&limit=1`)
    const data = await res.json()
    const id = data.users?.[0]?.id ?? ''
    await use(id)
  },

  bookingId: async ({ request }, use) => {
    const res = await request.get(`${API_BASE}/admin/bookings?status=CONFIRMED&limit=1`)
    const data = await res.json()
    const id = data.bookings?.[0]?.id ?? ''
    await use(id)
  },

  disputeId: async ({ request }, use) => {
    const res = await request.get(`${API_BASE}/admin/disputes?status=OPEN&limit=1`)
    const data = await res.json()
    const id = data.disputes?.[0]?.id ?? ''
    await use(id)
  },
})

export { expect } from '@playwright/test'
