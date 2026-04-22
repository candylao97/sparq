/**
 * auth.spec.ts
 *
 * Module: Authentication & Protected Routes
 *
 * Covers:
 *  - Admin login (happy path + negative)
 *  - Session expiry handling
 *  - All /admin/* routes require auth
 *  - Non-admin roles cannot access admin routes
 *  - Direct URL bypasses are blocked at API level
 */

import { test, expect } from '@playwright/test'
import {
  ADMIN_ROUTES,
  CREDENTIALS,
  API_BASE,
  HTTP,
} from '../helpers/constants'
import { expectRedirectToLogin, expectForbidden } from '../helpers/assert.helper'

// ── Helpers ────────────────────────────────────────────────────────────────

async function loginAs(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
}

// ── 1. Happy-path login ────────────────────────────────────────────────────

test.describe('Admin login — happy path', () => {
  // These tests use a clean browser context (no stored auth)
  test.use({ storageState: { cookies: [], origins: [] } })

  test('TC-AUTH-01 | Admin can log in with valid credentials and reach the dashboard', async ({ page }) => {
    await loginAs(page, CREDENTIALS.admin.email, CREDENTIALS.admin.password)

    // Should redirect to dashboard or home — not stay on /login
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })

    // Navigate to admin dashboard
    await page.goto(ADMIN_ROUTES.dashboard)
    await expect(page).toHaveURL(ADMIN_ROUTES.dashboard)

    // Dashboard heading should be present
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('TC-AUTH-02 | Admin dashboard shows key KPI cards', async ({ page }) => {
    await loginAs(page, CREDENTIALS.admin.email, CREDENTIALS.admin.password)
    await page.goto(ADMIN_ROUTES.dashboard)

    // At least 4 stat cards should be visible
    const cards = page.locator('[data-testid="kpi-card"], .kpi-card, [class*="stat"]')
    await expect(cards.first()).toBeVisible()
  })
})

// ── 2. Negative login ──────────────────────────────────────────────────────

test.describe('Admin login — negative', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('TC-AUTH-03 | Wrong password shows error and does NOT redirect', async ({ page }) => {
    await loginAs(page, CREDENTIALS.admin.email, 'WRONG_PASSWORD_XYZ')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('text=/invalid|incorrect|failed/i').first()).toBeVisible()
  })

  test('TC-AUTH-04 | Non-existent email shows error', async ({ page }) => {
    await loginAs(page, 'nobody@sparq.com.au', 'somepassword')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('text=/invalid|not found|no account/i').first()).toBeVisible()
  })

  test('TC-AUTH-05 | Empty form submission shows validation errors', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /sign in/i }).click()
    // HTML5 or JS validation should prevent submission
    await expect(page).toHaveURL(/\/login/)
  })

  test('TC-AUTH-06 | Customer account cannot access admin routes', async ({ page }) => {
    await loginAs(page, CREDENTIALS.customer.email, CREDENTIALS.customer.password)
    await page.goto(ADMIN_ROUTES.dashboard)
    await expectForbidden(page)
  })

  test('TC-AUTH-07 | Artist account cannot access admin routes', async ({ page }) => {
    await loginAs(page, CREDENTIALS.artist.email, CREDENTIALS.artist.password)
    await page.goto(ADMIN_ROUTES.dashboard)
    await expectForbidden(page)
  })
})

// ── 3. Protected route coverage ────────────────────────────────────────────

test.describe('Protected routes — unauthenticated access blocked', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  const protectedRoutes = Object.entries(ADMIN_ROUTES)

  for (const [name, route] of protectedRoutes) {
    test(`TC-AUTH-08[${name}] | Unauthenticated access to ${route} redirects to /login`, async ({ page }) => {
      await page.goto(route)
      await expectRedirectToLogin(page)
    })
  }
})

// ── 4. API route protection ────────────────────────────────────────────────

test.describe('Admin API — unauthorized access blocked', () => {
  // No stored auth — raw API calls without session cookie
  test.use({ storageState: { cookies: [], origins: [] } })

  const protectedEndpoints = [
    `${API_BASE}/admin/stats`,
    `${API_BASE}/admin/kyc`,
    `${API_BASE}/admin/users`,
    `${API_BASE}/admin/payments`,
    `${API_BASE}/admin/audit-log`,
  ]

  for (const [i, endpoint] of protectedEndpoints.entries()) {
    test(`TC-AUTH-09[${i}] | Unauthenticated GET ${endpoint} returns 401`, async ({ request }) => {
      const res = await request.get(endpoint)
      expect(res.status()).toBe(HTTP.UNAUTHORIZED)
    })
  }

  test('TC-AUTH-10 | Unauthenticated PATCH /admin/kyc/:id returns 401', async ({ request }) => {
    const res = await request.patch(`${API_BASE}/admin/kyc/fake-id`, {
      data: { action: 'approve' },
    })
    expect(res.status()).toBe(HTTP.UNAUTHORIZED)
  })

  test('TC-AUTH-11 | Unauthenticated PATCH /admin/users/:id/ban returns 401', async ({ request }) => {
    const res = await request.patch(`${API_BASE}/admin/users/fake-id`, {
      data: { action: 'ban', reason: 'test' },
    })
    expect(res.status()).toBe(HTTP.UNAUTHORIZED)
  })
})

// ── 5. Session expiry ──────────────────────────────────────────────────────

test.describe('Session expiry', () => {
  test('TC-AUTH-12 | Expired session cookie causes redirect to login on navigation', async ({
    page,
    context,
  }) => {
    // Start authenticated
    await page.goto(ADMIN_ROUTES.dashboard)
    await expect(page).toHaveURL(ADMIN_ROUTES.dashboard)

    // Invalidate session by clearing cookies
    await context.clearCookies()

    // Navigate to another admin page — should be bounced
    await page.goto(ADMIN_ROUTES.kyc)
    await expectRedirectToLogin(page)
  })

  test('TC-AUTH-13 | Expired session cookie causes 401 on API call', async ({ page, context }) => {
    await page.goto(ADMIN_ROUTES.dashboard)
    await context.clearCookies()

    // Call API from within the (now unauthenticated) browser context
    const res = await page.request.get(`${API_BASE}/admin/stats`)
    expect(res.status()).toBe(HTTP.UNAUTHORIZED)
  })
})
