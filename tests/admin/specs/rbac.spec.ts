/**
 * rbac.spec.ts
 *
 * Module: Role-Based Access Control
 *
 * Permission matrix:
 * ┌─────────────────────────────┬───────┬─────┬─────────┐
 * │ Action                      │ ADMIN │ OPS │ SUPPORT │
 * ├─────────────────────────────┼───────┼─────┼─────────┤
 * │ View dashboard              │   ✓   │  ✓  │    ✓    │
 * │ View KYC queue              │   ✓   │  ✓  │    ✗    │
 * │ Approve / reject KYC        │   ✓   │  ✓  │    ✗    │
 * │ View artist list            │   ✓   │  ✓  │    ✗    │
 * │ Ban artist                  │   ✓   │  ✗  │    ✗    │
 * │ View bookings               │   ✓   │  ✓  │    ✓    │
 * │ Force-cancel booking        │   ✓   │  ✓  │    ✗    │
 * │ View disputes               │   ✓   │  ✓  │    ✓    │
 * │ Issue full refund           │   ✓   │  ✗  │    ✗    │
 * │ Issue partial refund        │   ✓   │  ✓  │    ✗    │
 * │ View payments               │   ✓   │  ✓  │    ✗    │
 * │ View audit log              │   ✓   │  ✗  │    ✗    │
 * │ Modify audit log            │   ✗   │  ✗  │    ✗    │
 * └─────────────────────────────┴───────┴─────┴─────────┘
 *
 * Playwright pattern: each describe block calls test.use({ storageState })
 * to load the correct session before every test in that block.
 */

import { test, expect } from '@playwright/test'
import path from 'path'
import { ADMIN_ROUTES, API_BASE, HTTP } from '../helpers/constants'
import { expectForbidden } from '../helpers/assert.helper'

const authDir = path.resolve(__dirname, '../.auth')

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — full access
// ─────────────────────────────────────────────────────────────────────────────

test.describe('RBAC — ADMIN role', () => {
  test.use({ storageState: path.join(authDir, 'admin.json') })

  test('TC-RBAC-01 | Admin can access dashboard', async ({ page }) => {
    await page.goto(ADMIN_ROUTES.dashboard)
    await expect(page).toHaveURL(ADMIN_ROUTES.dashboard)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('TC-RBAC-02 | Admin can access KYC module', async ({ page }) => {
    await page.goto(ADMIN_ROUTES.kyc)
    await expect(page).toHaveURL(ADMIN_ROUTES.kyc)
  })

  test('TC-RBAC-03 | Admin can access audit log', async ({ page }) => {
    await page.goto(ADMIN_ROUTES.auditLog)
    await expect(page).toHaveURL(ADMIN_ROUTES.auditLog)
  })

  test('TC-RBAC-04 | Admin can access payments module', async ({ page }) => {
    await page.goto(ADMIN_ROUTES.payments)
    await expect(page).toHaveURL(ADMIN_ROUTES.payments)
  })

  test('TC-RBAC-05 | Admin sees Ban button on artist row', async ({ page }) => {
    await page.goto(ADMIN_ROUTES.users)
    const banBtn = page.getByRole('button', { name: /ban/i }).first()
    await expect(banBtn).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// OPS — operational access, no finance controls, no audit log
// ─────────────────────────────────────────────────────────────────────────────

test.describe('RBAC — OPS role', () => {
  test.use({ storageState: path.join(authDir, 'ops.json') })

  test('TC-RBAC-06 | Ops can access dashboard', async ({ page }) => {
    await page.goto(ADMIN_ROUTES.dashboard)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('TC-RBAC-07 | Ops can access KYC module', async ({ page }) => {
    await page.goto(ADMIN_ROUTES.kyc)
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByRole('heading')).toBeVisible()
  })

  test('TC-RBAC-08 | Ops CANNOT access audit log', async ({ page }) => {
    await page.goto(ADMIN_ROUTES.auditLog)
    await expectForbidden(page)
  })

  test('TC-RBAC-09 | Ops CANNOT ban an artist via API', async ({ request }) => {
    const res = await request.patch(`${API_BASE}/admin/users/any-id`, {
      data: { action: 'ban', reason: 'ops-ban-attempt' },
    })
    expect([HTTP.FORBIDDEN, HTTP.UNAUTHORIZED]).toContain(res.status())
  })

  test('TC-RBAC-10 | Ops CANNOT issue a full refund', async ({ request }) => {
    const res = await request.patch(`${API_BASE}/admin/disputes/any-id`, {
      data: { action: 'full_refund' },
    })
    expect([HTTP.FORBIDDEN, HTTP.UNAUTHORIZED]).toContain(res.status())
  })

  test('TC-RBAC-11 | Ban button NOT visible to Ops role', async ({ page }) => {
    await page.goto(ADMIN_ROUTES.users)
    const banBtn = page.getByRole('button', { name: /^ban$/i })
    await expect(banBtn).toHaveCount(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SUPPORT — bookings + disputes only
// ─────────────────────────────────────────────────────────────────────────────

test.describe('RBAC — SUPPORT role', () => {
  test.use({ storageState: path.join(authDir, 'support.json') })

  test('TC-RBAC-12 | Support can view bookings', async ({ page }) => {
    await page.goto(ADMIN_ROUTES.bookings)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('TC-RBAC-13 | Support can view disputes', async ({ page }) => {
    await page.goto(ADMIN_ROUTES.disputes)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('TC-RBAC-14 | Support CANNOT access KYC module', async ({ page }) => {
    await page.goto(ADMIN_ROUTES.kyc)
    await expectForbidden(page)
  })

  test('TC-RBAC-15 | Support CANNOT access payments module', async ({ page }) => {
    await page.goto(ADMIN_ROUTES.payments)
    await expectForbidden(page)
  })

  test('TC-RBAC-16 | Support CANNOT approve KYC via API', async ({ request }) => {
    const res = await request.patch(`${API_BASE}/admin/kyc/any-id`, {
      data: { action: 'approve' },
    })
    expect([HTTP.FORBIDDEN, HTTP.UNAUTHORIZED]).toContain(res.status())
  })

  test('TC-RBAC-17 | Support CANNOT ban an artist via API', async ({ request }) => {
    const res = await request.patch(`${API_BASE}/admin/users/any-id`, {
      data: { action: 'ban', reason: 'support-ban-attempt' },
    })
    expect([HTTP.FORBIDDEN, HTTP.UNAUTHORIZED]).toContain(res.status())
  })

  test('TC-RBAC-18 | Support CANNOT force-cancel a booking via API', async ({ request }) => {
    const res = await request.patch(`${API_BASE}/admin/bookings/any-id`, {
      data: { action: 'cancel', reason: 'support-cancel-attempt' },
    })
    expect([HTTP.FORBIDDEN, HTTP.UNAUTHORIZED]).toContain(res.status())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Privilege escalation prevention
// (use support session — lowest privilege available)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('RBAC — privilege escalation prevention', () => {
  test.use({ storageState: path.join(authDir, 'support.json') })

  test('TC-RBAC-19 | Support cannot grant themselves admin via profile API', async ({ request }) => {
    const res = await request.patch(`${API_BASE}/user`, {
      data: { role: 'ADMIN' },
    })
    expect([HTTP.FORBIDDEN, HTTP.UNAUTHORIZED, HTTP.BAD_REQUEST, HTTP.NOT_FOUND]).toContain(
      res.status()
    )
  })
})

test.describe('RBAC — Ops cannot access audit log entries', () => {
  test.use({ storageState: path.join(authDir, 'ops.json') })

  test('TC-RBAC-20 | Ops cannot access audit log via API', async ({ request }) => {
    const res = await request.get(`${API_BASE}/admin/audit-log`)
    expect([HTTP.FORBIDDEN, HTTP.UNAUTHORIZED]).toContain(res.status())
  })
})
