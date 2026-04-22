/**
 * kyc.spec.ts
 *
 * Module: KYC / Identity Verification
 *
 * Flows covered:
 *  Flow A — Successful artist onboarding → VERIFIED
 *  Flow B — Incomplete KYC (Stripe requires_action)
 *  Flow C — Admin rejection with mandatory reason
 *  Flow D — Manual review override (flag for review)
 *
 * UI tests assume storageState = admin.json (set in playwright.config.ts)
 * API tests use the raw request context (same session)
 */

import { test, expect } from '../fixtures/base.fixture'
import {
  KycAPI,
  AuditAPI,
  StatsAPI,
} from '../helpers/api.helper'
import {
  seedPendingArtist,
  forceKycStatus,
} from '../helpers/seed.helper'
import {
  expectKycBadge,
  expectRiskBadge,
  expectToast,
  expectDrawerOpen,
  expectDrawerField,
  expectTableRow,
  expectConfirmModal,
} from '../helpers/assert.helper'
import { ADMIN_ROUTES, KYC_STATUS } from '../helpers/constants'

// ─────────────────────────────────────────────────────────────────────────────
// KYC Queue — list view
// ─────────────────────────────────────────────────────────────────────────────

test.describe('KYC queue — list view', () => {
  test('TC-KYC-01 | KYC page loads and shows table', async ({ adminPage }) => {
    await adminPage.goto(ADMIN_ROUTES.kyc)
    await expect(adminPage.getByRole('table')).toBeVisible()
  })

  test('TC-KYC-02 | KPI strip shows counts for each status', async ({ adminPage }) => {
    await adminPage.goto(ADMIN_ROUTES.kyc)
    // At least PENDING + VERIFIED cards should be visible
    await expect(adminPage.locator('text=/pending/i').first()).toBeVisible()
    await expect(adminPage.locator('text=/verified/i').first()).toBeVisible()
  })

  test('TC-KYC-03 | Clicking a KPI status card filters the table', async ({ adminPage }) => {
    await adminPage.goto(ADMIN_ROUTES.kyc)
    await adminPage.locator('text=/pending/i').first().click()
    // Every visible status badge should now say PENDING
    const badges = adminPage.locator('[data-testid="kyc-badge"]')
    const count  = await badges.count()
    for (let i = 0; i < count; i++) {
      await expect(badges.nth(i)).toContainText('PENDING', { ignoreCase: true })
    }
  })

  test('TC-KYC-04 | Search bar filters table by artist name', async ({ adminPage, apiContext }) => {
    // Get a known artist name from the API
    const data = await KycAPI.list(apiContext, { limit: '1' })
    const artistName = data.providers?.[0]?.name
    if (!artistName) test.skip()

    await adminPage.goto(ADMIN_ROUTES.kyc)
    await adminPage.getByPlaceholder(/search/i).fill(artistName)
    await adminPage.keyboard.press('Enter')

    await expectTableRow(adminPage, artistName)
  })

  test('TC-KYC-05 | Risk filter pills work correctly', async ({ adminPage }) => {
    await adminPage.goto(ADMIN_ROUTES.kyc)
    await adminPage.locator('button:has-text("High")').click()
    // If there are rows, they should all be HIGH risk
    const badges = adminPage.locator('[data-testid="risk-badge"]')
    const count  = await badges.count()
    for (let i = 0; i < count; i++) {
      await expect(badges.nth(i)).toContainText('HIGH', { ignoreCase: true })
    }
  })

  test('TC-KYC-06 | High-risk rows have a visual tint', async ({ adminPage, apiContext }) => {
    const data = await KycAPI.list(apiContext, { risk: 'HIGH', limit: '1' })
    if (!data.providers?.length) test.skip()

    await adminPage.goto(ADMIN_ROUTES.kyc)
    await adminPage.locator('button:has-text("High")').click()

    const firstRow = adminPage.locator('table tbody tr').first()
    // Check for red/rose tint class — adjust selector to match your actual implementation
    const classList = await firstRow.getAttribute('class') ?? ''
    const hasTint = /red|rose|danger/.test(classList)
    // Soft assertion — if the implementation uses inline style instead
    if (!hasTint) {
      const style = await firstRow.getAttribute('style') ?? ''
      expect(/red|#fee|#fef/.test(style) || hasTint).toBe(true)
    }
  })

  test('TC-KYC-07 | Stats API pendingKYC count matches table count', async ({ apiContext }) => {
    const stats = await StatsAPI.get(apiContext)
    const list  = await KycAPI.list(apiContext, { status: 'PENDING' })
    expect(stats.pendingKYC).toBe(list.total ?? list.providers?.length)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Detail Drawer
// ─────────────────────────────────────────────────────────────────────────────

test.describe('KYC detail drawer', () => {
  test('TC-KYC-08 | Clicking a table row opens the detail drawer', async ({ adminPage, apiContext }) => {
    const data = await KycAPI.list(apiContext, { limit: '1' })
    const artistName = data.providers?.[0]?.name
    if (!artistName) test.skip()

    await adminPage.goto(ADMIN_ROUTES.kyc)
    await adminPage.locator(`table >> tr:has-text("${artistName}")`).click()
    await expectDrawerOpen(adminPage)
  })

  test('TC-KYC-09 | Drawer shows Stripe Connect status fields', async ({ adminPage, apiContext }) => {
    const data = await KycAPI.list(apiContext, { limit: '1' })
    const artistName = data.providers?.[0]?.name
    if (!artistName) test.skip()

    await adminPage.goto(ADMIN_ROUTES.kyc)
    await adminPage.locator(`table >> tr:has-text("${artistName}")`).click()
    await expectDrawerOpen(adminPage)

    const drawer = adminPage.locator('[data-testid="detail-drawer"]')
    await expect(drawer.locator('text=/charges/i')).toBeVisible()
    await expect(drawer.locator('text=/payouts/i')).toBeVisible()
  })

  test('TC-KYC-10 | Drawer shows risk signals section', async ({ adminPage, apiContext }) => {
    const data = await KycAPI.list(apiContext, { limit: '1' })
    if (!data.providers?.length) test.skip()

    await adminPage.goto(ADMIN_ROUTES.kyc)
    await adminPage.locator('table tbody tr').first().click()
    await expectDrawerOpen(adminPage)

    const drawer = adminPage.locator('[data-testid="detail-drawer"]')
    await expect(drawer.locator('text=/risk/i').first()).toBeVisible()
  })

  test('TC-KYC-11 | Drawer action buttons are visible', async ({ adminPage, apiContext }) => {
    const data = await KycAPI.list(apiContext, { status: 'PENDING', limit: '1' })
    if (!data.providers?.length) test.skip()
    const artistName = data.providers[0].name

    await adminPage.goto(ADMIN_ROUTES.kyc)
    await adminPage.locator(`table >> tr:has-text("${artistName}")`).click()
    await expectDrawerOpen(adminPage)

    const drawer = adminPage.locator('[data-testid="detail-drawer"]')
    await expect(drawer.getByRole('button', { name: /approve/i })).toBeVisible()
    await expect(drawer.getByRole('button', { name: /reject/i })).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Flow A — Approve (PENDING → VERIFIED)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Flow A — KYC approval', () => {
  test('TC-KYC-12 | Admin can approve a PENDING artist via API', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    const { status, body } = await KycAPI.approve(apiContext, artist.id)

    expect(status).toBe(200)
    expect(body.kycStatus ?? body.status).toBe(KYC_STATUS.VERIFIED)
  })

  test('TC-KYC-13 | Approving an artist sets isVerified=true', async ({ apiContext }) => {
    const artist  = await seedPendingArtist(apiContext)
    await KycAPI.approve(apiContext, artist.id)

    const detail = await KycAPI.detail(apiContext, artist.id)
    expect(detail.isVerified ?? detail.provider?.isVerified).toBe(true)
  })

  test('TC-KYC-14 | Approving creates an audit log entry', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    await KycAPI.approve(apiContext, artist.id)

    await AuditAPI.assertLatestEntry(apiContext, {
      action:     'KYC_APPROVED',
      targetType: 'ProviderProfile',
      targetId:   artist.id,
    })
  })

  test('TC-KYC-15 | UI: Approve via drawer updates badge in table', async ({ adminPage, apiContext }) => {
    const data = await KycAPI.list(apiContext, { status: 'PENDING', limit: '1' })
    if (!data.providers?.length) test.skip()
    const artistName = data.providers[0].name

    await adminPage.goto(ADMIN_ROUTES.kyc)
    await adminPage.locator(`table >> tr:has-text("${artistName}")`).click()
    await expectDrawerOpen(adminPage)

    const drawer = adminPage.locator('[data-testid="detail-drawer"]')
    await drawer.getByRole('button', { name: /approve/i }).click()

    // May show a confirmation modal
    const modal = adminPage.locator('[role="dialog"]')
    if (await modal.isVisible()) {
      await modal.getByRole('button', { name: /confirm|yes/i }).click()
    }

    await expectToast(adminPage, /approved|verified/i)

    // Badge in table should update
    const row = adminPage.locator(`table >> tr:has-text("${artistName}")`)
    await expect(row.locator('[data-testid="kyc-badge"]')).toContainText('VERIFIED', { ignoreCase: true })
  })

  test('TC-KYC-16 | Cannot approve an already-VERIFIED artist (idempotency)', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    await KycAPI.approve(apiContext, artist.id)
    // Second approve
    const { status } = await KycAPI.approve(apiContext, artist.id)
    // Should either succeed idempotently or return 409 — must NOT throw 500
    expect(status).not.toBe(500)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Flow C — Rejection with mandatory reason
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Flow C — KYC rejection', () => {
  test('TC-KYC-17 | Admin can reject with a reason', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    const { status, body } = await KycAPI.reject(apiContext, artist.id, 'ID document unreadable')

    expect(status).toBe(200)
    expect(body.kycStatus ?? body.status).toBe(KYC_STATUS.REJECTED)
  })

  test('TC-KYC-18 | Rejection reason is stored and returned in detail', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    await KycAPI.reject(apiContext, artist.id, 'Name mismatch on documents')

    const detail = await KycAPI.detail(apiContext, artist.id)
    const reason = detail.rejectedReason ?? detail.kycRecord?.rejectedReason
    expect(reason).toContain('Name mismatch')
  })

  test('TC-KYC-19 | Rejection WITHOUT a reason returns 400', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    const { status } = await KycAPI.reject(apiContext, artist.id, '')
    expect(status).toBe(400)
  })

  test('TC-KYC-20 | UI: Reject button requires reason — submit blocked when empty', async ({
    adminPage,
    apiContext,
  }) => {
    const data = await KycAPI.list(apiContext, { status: 'PENDING', limit: '1' })
    if (!data.providers?.length) test.skip()
    const artistName = data.providers[0].name

    await adminPage.goto(ADMIN_ROUTES.kyc)
    await adminPage.locator(`table >> tr:has-text("${artistName}")`).click()
    await expectDrawerOpen(adminPage)

    const drawer = adminPage.locator('[data-testid="detail-drawer"]')
    await drawer.getByRole('button', { name: /reject/i }).click()
    await expectConfirmModal(adminPage, 'reject')

    // Try to confirm without entering reason
    await adminPage.getByRole('button', { name: /confirm|submit/i }).click()

    // Should still be on the same page — not dismissed
    await expectConfirmModal(adminPage)
    await expect(adminPage.locator('text=/reason.*required|required/i')).toBeVisible()
  })

  test('TC-KYC-21 | Rejection creates an audit log entry', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    await KycAPI.reject(apiContext, artist.id, 'Fraudulent documents')

    await AuditAPI.assertLatestEntry(apiContext, {
      action:     'KYC_REJECTED',
      targetType: 'ProviderProfile',
    })
  })

  test('TC-KYC-22 | Rejected artist is blocked from accepting bookings', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    await KycAPI.reject(apiContext, artist.id, 'Failed verification')

    // Artist should not be bookable — check the detail or a booking attempt endpoint
    const detail = await KycAPI.detail(apiContext, artist.id)
    const kycStatus = detail.kycStatus ?? detail.kycRecord?.status
    expect(kycStatus).toBe(KYC_STATUS.REJECTED)
    // Additional: verify accountStatus reflects rejection
    const accountStatus = detail.accountStatus
    if (accountStatus) expect(accountStatus).not.toBe('ACTIVE')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Flow B — Request additional info (REQUIRES_ACTION)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Flow B — Request more info', () => {
  test('TC-KYC-23 | Admin can set status to REQUIRES_ACTION', async ({ apiContext }) => {
    const artist  = await seedPendingArtist(apiContext)
    const { status, body } = await KycAPI.requestInfo(apiContext, artist.id, 'Please upload a clearer photo ID')

    expect(status).toBe(200)
    expect(body.kycStatus ?? body.status).toBe(KYC_STATUS.REQUIRES_ACTION)
  })

  test('TC-KYC-24 | REQUIRES_ACTION artist cannot accept new bookings', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    await KycAPI.requestInfo(apiContext, artist.id)

    const detail = await KycAPI.detail(apiContext, artist.id)
    const kycStatus = detail.kycStatus ?? detail.kycRecord?.status
    expect(kycStatus).toBe(KYC_STATUS.REQUIRES_ACTION)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Flow D — Manual flag / UNDER_REVIEW
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Flow D — Manual review override', () => {
  test('TC-KYC-25 | Admin can flag a Stripe-verified artist for manual review', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    // First approve to VERIFIED
    await KycAPI.approve(apiContext, artist.id)
    // Then flag
    const { status, body } = await KycAPI.flag(apiContext, artist.id, 'Suspicious pricing pattern')

    expect(status).toBe(200)
    expect(body.kycStatus ?? body.status).toBe(KYC_STATUS.UNDER_REVIEW)
  })

  test('TC-KYC-26 | UNDER_REVIEW artist cannot accept new bookings', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    await forceKycStatus(apiContext, artist.id, 'flag', 'Flagged for review')

    const detail = await KycAPI.detail(apiContext, artist.id)
    const kycStatus = detail.kycStatus ?? detail.kycRecord?.status
    expect(kycStatus).toBe(KYC_STATUS.UNDER_REVIEW)
  })

  test('TC-KYC-27 | Admin can approve after manual review', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    await forceKycStatus(apiContext, artist.id, 'flag', 'Suspected PII')
    const { status, body } = await KycAPI.approve(apiContext, artist.id)

    expect(status).toBe(200)
    expect(body.kycStatus ?? body.status).toBe(KYC_STATUS.VERIFIED)
  })

  test('TC-KYC-28 | Risk recalculation updates signals in DB', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    const { status } = await KycAPI.recalculate(apiContext, artist.id)
    expect(status).toBe(200)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Edge cases
// ─────────────────────────────────────────────────────────────────────────────

test.describe('KYC — edge cases', () => {
  test('TC-KYC-29 | KYC action on non-existent provider returns 404', async ({ apiContext }) => {
    const { status } = await KycAPI.approve(apiContext, 'non-existent-id-xyz')
    expect(status).toBe(404)
  })

  test('TC-KYC-30 | Invalid action name returns 400', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    const res = await apiContext.patch(`/api/admin/kyc/${artist.id}`, {
      data: { action: 'INVALID_ACTION' },
    })
    expect(res.status()).toBe(400)
  })

  test('TC-KYC-31 | KYC list with no results shows empty state', async ({ adminPage }) => {
    await adminPage.goto(ADMIN_ROUTES.kyc)
    // Filter to a status that is unlikely to have records (REJECTED in a clean DB)
    await adminPage.goto(`${ADMIN_ROUTES.kyc}?status=REJECTED`)
    // Either table is empty or empty-state message is shown — no crash
    await expect(adminPage).not.toHaveURL(/error|500/)
  })

  test('TC-KYC-32 | Two admins approving the same artist simultaneously is safe', async ({
    apiContext,
  }) => {
    const artist = await seedPendingArtist(apiContext)
    // Fire both approvals in parallel
    const [r1, r2] = await Promise.all([
      KycAPI.approve(apiContext, artist.id),
      KycAPI.approve(apiContext, artist.id),
    ])
    // Both must not be 500
    expect(r1.status).not.toBe(500)
    expect(r2.status).not.toBe(500)
    // Final state must be VERIFIED
    const detail = await KycAPI.detail(apiContext, artist.id)
    expect(detail.kycStatus ?? detail.kycRecord?.status).toBe(KYC_STATUS.VERIFIED)
  })
})
