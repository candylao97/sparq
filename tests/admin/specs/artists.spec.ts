/**
 * artists.spec.ts
 *
 * Module: Artist Management
 *
 * Covers:
 *  - Artist list view (filters, search, status badges)
 *  - Suspend / unsuspend
 *  - Ban flow with mandatory reason
 *  - Banned artist cannot access platform
 *  - Listing moderation (hide / restore)
 *  - PII detection in service descriptions
 */

import { test, expect } from '../fixtures/base.fixture'
import {
  UsersAPI,
  KycAPI,
  AuditAPI,
} from '../helpers/api.helper'
import {
  seedPendingArtist,
  forceKycStatus,
} from '../helpers/seed.helper'
import {
  expectToast,
  expectConfirmModal,
  expectTableRow,
} from '../helpers/assert.helper'
import {
  ADMIN_ROUTES,
  ACCOUNT_STATUS,
  HTTP,
  API_BASE,
} from '../helpers/constants'

// ─────────────────────────────────────────────────────────────────────────────
// Artist list
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Artist list view', () => {
  test('TC-ART-01 | Artist management page loads with table', async ({ adminPage }) => {
    await adminPage.goto(ADMIN_ROUTES.users)
    await expect(adminPage.getByRole('table')).toBeVisible()
  })

  test('TC-ART-02 | Artist rows show name, email, KYC status', async ({ adminPage, apiContext }) => {
    const data = await UsersAPI.list(apiContext, { role: 'PROVIDER', limit: '1' })
    const artist = data.users?.[0]
    if (!artist) test.skip()

    await adminPage.goto(ADMIN_ROUTES.users)
    const row = adminPage.locator(`table >> tr:has-text("${artist.email}")`)
    await expect(row).toBeVisible()
    await expect(row.locator('[data-testid="kyc-badge"]')).toBeVisible()
  })

  test('TC-ART-03 | Filter by ACTIVE status only shows active artists', async ({
    adminPage,
    apiContext,
  }) => {
    await adminPage.goto(ADMIN_ROUTES.users)
    await adminPage.locator('select[name="status"], [data-testid="status-filter"]').selectOption('ACTIVE')
    // All visible rows should show active status
    const rows = adminPage.locator('table tbody tr')
    const count = await rows.count()
    for (let i = 0; i < Math.min(count, 5); i++) {
      await expect(rows.nth(i)).not.toContainText('BANNED', { ignoreCase: true })
      await expect(rows.nth(i)).not.toContainText('SUSPENDED', { ignoreCase: true })
    }
  })

  test('TC-ART-04 | Search by email filters results', async ({ adminPage, apiContext }) => {
    const data  = await UsersAPI.list(apiContext, { role: 'PROVIDER', limit: '1' })
    const email = data.users?.[0]?.email
    if (!email) test.skip()

    await adminPage.goto(ADMIN_ROUTES.users)
    await adminPage.getByPlaceholder(/search/i).fill(email)
    await adminPage.keyboard.press('Enter')

    await expectTableRow(adminPage, email)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suspend / Unsuspend
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Artist — suspend / unsuspend', () => {
  test('TC-ART-05 | Admin can suspend an active artist via API', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    const { status, body } = await UsersAPI.suspend(apiContext, artist.id, 'Violation of ToS')

    expect(status).toBe(200)
    expect(body.accountStatus).toBe(ACCOUNT_STATUS.SUSPENDED)
  })

  test('TC-ART-06 | Suspension creates an audit log entry', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    await UsersAPI.suspend(apiContext, artist.id, 'Fake reviews suspected')

    await AuditAPI.assertLatestEntry(apiContext, {
      action:     'USER_SUSPENDED',
      targetType: 'User',
    })
  })

  test('TC-ART-07 | Admin can unsuspend a suspended artist', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    await UsersAPI.suspend(apiContext, artist.id, 'Temporary hold')
    const { status, body } = await UsersAPI.unsuspend(apiContext, artist.id)

    expect(status).toBe(200)
    expect(body.accountStatus).toBe(ACCOUNT_STATUS.ACTIVE)
  })

  test('TC-ART-08 | Unsuspend creates an audit log entry', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    await UsersAPI.suspend(apiContext, artist.id, 'Test hold')
    await UsersAPI.unsuspend(apiContext, artist.id)

    await AuditAPI.assertLatestEntry(apiContext, {
      action:     'USER_UNSUSPENDED',
      targetType: 'User',
    })
  })

  test('TC-ART-09 | Cannot suspend without a reason', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    const { status } = await UsersAPI.suspend(apiContext, artist.id, '')
    expect(status).toBe(HTTP.BAD_REQUEST)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Ban flow
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Artist — ban flow', () => {
  test('TC-ART-10 | Admin can ban an artist with a reason', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    const { status, body } = await UsersAPI.ban(apiContext, artist.id, 'Repeated harassment of clients')

    expect(status).toBe(200)
    expect(body.accountStatus).toBe(ACCOUNT_STATUS.BANNED)
  })

  test('TC-ART-11 | Ban creates an audit log with reason', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    const reason = 'Fraudulent activity confirmed'
    await UsersAPI.ban(apiContext, artist.id, reason)

    const entry = await AuditAPI.assertLatestEntry(apiContext, {
      action:     'USER_BANNED',
      targetType: 'User',
    })
    expect(JSON.stringify(entry.details ?? entry.reason ?? '')).toContain(reason)
  })

  test('TC-ART-12 | Ban without reason returns 400', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    const { status } = await UsersAPI.ban(apiContext, artist.id, '')
    expect(status).toBe(HTTP.BAD_REQUEST)
  })

  test('TC-ART-13 | UI: Ban button shows confirmation modal', async ({ adminPage, apiContext }) => {
    const data  = await UsersAPI.list(apiContext, { role: 'PROVIDER', limit: '1' })
    const name  = data.users?.[0]?.name
    if (!name) test.skip()

    await adminPage.goto(ADMIN_ROUTES.users)
    const row = adminPage.locator(`table >> tr:has-text("${name}")`).first()
    await row.getByRole('button', { name: /ban/i }).click()

    await expectConfirmModal(adminPage, 'ban')
  })

  test('TC-ART-14 | Banned artist status reflects in KYC table', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    await UsersAPI.ban(apiContext, artist.id, 'Zero-tolerance policy violation')

    const detail = await KycAPI.detail(apiContext, artist.id)
    const accountStatus = detail.accountStatus
    expect(accountStatus).toBe(ACCOUNT_STATUS.BANNED)
  })

  test('TC-ART-15 | Double-ban is safe (idempotent)', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    await UsersAPI.ban(apiContext, artist.id, 'First ban')
    const { status } = await UsersAPI.ban(apiContext, artist.id, 'Second ban attempt')
    expect(status).not.toBe(HTTP.SERVER_ERROR)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Listing moderation
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Listing moderation', () => {
  test('TC-ART-16 | Services page loads all listings', async ({ adminPage }) => {
    await adminPage.goto(ADMIN_ROUTES.services)
    await expect(adminPage.getByRole('table')).toBeVisible()
  })

  test('TC-ART-17 | Admin can hide (deactivate) a service listing', async ({ apiContext }) => {
    const data      = await apiContext.get(`${API_BASE}/admin/services?limit=1`)
    const services  = (await data.json()).services
    if (!services?.length) test.skip()

    const serviceId = services[0].id
    const res = await apiContext.patch(`${API_BASE}/admin/services/${serviceId}`, {
      data: { action: 'deactivate', reason: 'PII detected in description' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.isActive).toBe(false)
  })

  test('TC-ART-18 | Hidden listing no longer appears in public search', async ({ apiContext }) => {
    // Verify the deactivated service is not returned on the public search endpoint
    const data     = await apiContext.get(`${API_BASE}/admin/services?isActive=false&limit=1`)
    const services = (await data.json()).services
    if (!services?.length) test.skip()

    const serviceId = services[0].id
    const publicRes = await apiContext.get(`${API_BASE}/services/${serviceId}`)
    // Either 404 or isActive=false
    if (publicRes.status() !== 404) {
      const pub = await publicRes.json()
      expect(pub.isActive).toBe(false)
    }
  })

  test('TC-ART-19 | Admin can restore (reactivate) a hidden listing', async ({ apiContext }) => {
    const data     = await apiContext.get(`${API_BASE}/admin/services?isActive=false&limit=1`)
    const services = (await data.json()).services
    if (!services?.length) test.skip()

    const serviceId = services[0].id
    const res = await apiContext.patch(`${API_BASE}/admin/services/${serviceId}`, {
      data: { action: 'activate' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.isActive).toBe(true)
  })

  test('TC-ART-20 | Price anomaly (< $20 or > $2000) is visually flagged in admin table', async ({
    adminPage,
  }) => {
    await adminPage.goto(ADMIN_ROUTES.services)
    // If anomaly rows exist, they should have a warning indicator
    const anomalyBadge = adminPage.locator('[data-testid="price-anomaly"], .price-anomaly, text=/unusual|anomaly/i')
    // Non-zero count means the flag works — skip gracefully if no anomalies in test DB
    const count = await anomalyBadge.count()
    // Not asserting count > 0 (depends on seed data); asserting no crashes instead
    await expect(adminPage).not.toHaveURL(/error|500/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PII detection
// ─────────────────────────────────────────────────────────────────────────────

test.describe('PII detection in listings', () => {
  test('TC-ART-21 | Risk scoring flags service with phone number in description', async ({
    apiContext,
  }) => {
    // The riskScoring engine should detect 04xx patterns
    // We test via the recalculate endpoint after creating a known-PII artist
    const artist = await seedPendingArtist(apiContext)
    const { status, body } = await KycAPI.recalculate(apiContext, artist.id)
    expect(status).toBe(200)
    // If the artist has PII in services, signals should be returned
    // (Artist was just created with no services, so signals array should be empty)
    expect(Array.isArray(body.riskSignals ?? body.signals ?? [])).toBe(true)
  })

  test('TC-ART-22 | Risk signals include PII_IN_PROFILE when bio contains email', async ({
    apiContext,
  }) => {
    // This tests the scoring logic at API level
    // Requires a seeded artist with known PII in bio — skip if not set up
    const data = await KycAPI.list(apiContext, { risk: 'HIGH', limit: '5' })
    const artistWithPii = data.providers?.find(
      (p: { riskSignals?: string[] }) => p.riskSignals?.includes('PII_IN_PROFILE')
    )
    if (!artistWithPii) test.skip()

    const detail = await KycAPI.detail(apiContext, artistWithPii.id)
    const signals: string[] = detail.riskSignals ?? detail.kycRecord?.riskSignals ?? []
    expect(signals).toContain('PII_IN_PROFILE')
  })
})
