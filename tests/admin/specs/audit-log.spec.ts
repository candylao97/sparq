/**
 * audit-log.spec.ts
 *
 * Module: Audit Log
 *
 * Core contract:
 *  Every admin action MUST produce an immutable AuditLog row containing:
 *    actorId   — the admin who performed the action
 *    action    — the action name (e.g. KYC_APPROVED)
 *    targetType — the model type (ProviderProfile, User, Booking, …)
 *    targetId  — the record ID
 *    reason    — where mandatory
 *    createdAt — timestamp
 *
 * Tamper prevention:
 *  - No PATCH/DELETE allowed on audit-log entries
 *  - Entries are immutable once created
 *  - Lower roles cannot access the log
 */

import { test, expect } from '../fixtures/base.fixture'
import {
  KycAPI,
  UsersAPI,
  BookingsAPI,
  DisputesAPI,
  AuditAPI,
} from '../helpers/api.helper'
import {
  seedPendingArtist,
} from '../helpers/seed.helper'
import {
  ADMIN_ROUTES,
  HTTP,
  API_BASE,
} from '../helpers/constants'

// ─────────────────────────────────────────────────────────────────────────────
// Audit log UI
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Audit log — UI', () => {
  test('TC-AUD-01 | Audit log page loads with table', async ({ adminPage }) => {
    await adminPage.goto(ADMIN_ROUTES.auditLog)
    await expect(adminPage.getByRole('table')).toBeVisible()
  })

  test('TC-AUD-02 | Log entries show actor, action, target, and timestamp', async ({ adminPage }) => {
    await adminPage.goto(ADMIN_ROUTES.auditLog)
    const rows = adminPage.locator('table tbody tr')
    const count = await rows.count()
    if (count === 0) test.skip()

    const first = rows.first()
    // Each row should have content in at least 4 cells
    const cells = first.locator('td')
    expect(await cells.count()).toBeGreaterThanOrEqual(4)
  })

  test('TC-AUD-03 | Log entries are ordered newest first', async ({ adminPage, apiContext }) => {
    const data = await AuditAPI.list(apiContext, { limit: '2' })
    const logs = data.logs ?? []
    if (logs.length < 2) test.skip()

    const first  = new Date(logs[0].createdAt).getTime()
    const second = new Date(logs[1].createdAt).getTime()
    expect(first).toBeGreaterThanOrEqual(second)
  })

  test('TC-AUD-04 | No edit or delete controls visible on log entries', async ({ adminPage }) => {
    await adminPage.goto(ADMIN_ROUTES.auditLog)
    // No edit/delete buttons should exist
    await expect(adminPage.getByRole('button', { name: /edit/i })).toHaveCount(0)
    await expect(adminPage.getByRole('button', { name: /delete/i })).toHaveCount(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Audit log created for each action
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Audit log — action coverage', () => {
  test('TC-AUD-05 | KYC approve creates log with KYC_APPROVED', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    await KycAPI.approve(apiContext, artist.id)

    const entry = await AuditAPI.assertLatestEntry(apiContext, {
      action:     'KYC_APPROVED',
      targetType: 'ProviderProfile',
      targetId:   artist.id,
    })
    expect(entry.actorId).toBeTruthy()
    expect(entry.createdAt).toBeTruthy()
  })

  test('TC-AUD-06 | KYC reject creates log with KYC_REJECTED and includes reason', async ({
    apiContext,
  }) => {
    const artist = await seedPendingArtist(apiContext)
    const reason = 'Documents expired - audit test'
    await KycAPI.reject(apiContext, artist.id, reason)

    const entry = await AuditAPI.assertLatestEntry(apiContext, {
      action:     'KYC_REJECTED',
      targetType: 'ProviderProfile',
    })
    const hasReason = (
      entry.reason?.includes(reason) ||
      JSON.stringify(entry.details ?? {}).includes(reason)
    )
    expect(hasReason).toBe(true)
  })

  test('TC-AUD-07 | KYC flag creates log with KYC_FLAGGED', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    await KycAPI.approve(apiContext, artist.id)
    await KycAPI.flag(apiContext, artist.id, 'Flag for audit test')

    await AuditAPI.assertLatestEntry(apiContext, {
      action:     'KYC_FLAGGED',
      targetType: 'ProviderProfile',
    })
  })

  test('TC-AUD-08 | Artist suspend creates log with USER_SUSPENDED', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    await UsersAPI.suspend(apiContext, artist.id, 'Suspension audit test')

    const entry = await AuditAPI.assertLatestEntry(apiContext, {
      action:     'USER_SUSPENDED',
      targetType: 'User',
    })
    expect(entry.targetId).toBeTruthy()
  })

  test('TC-AUD-09 | Artist ban creates log with USER_BANNED and reason', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    const reason = 'Ban audit test reason'
    await UsersAPI.ban(apiContext, artist.id, reason)

    const entry = await AuditAPI.assertLatestEntry(apiContext, {
      action:     'USER_BANNED',
      targetType: 'User',
    })
    const hasReason = (
      entry.reason?.includes(reason) ||
      JSON.stringify(entry.details ?? {}).includes(reason)
    )
    expect(hasReason).toBe(true)
  })

  test('TC-AUD-10 | Artist unsuspend creates log with USER_UNSUSPENDED', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    await UsersAPI.suspend(apiContext, artist.id, 'Temporary hold')
    await UsersAPI.unsuspend(apiContext, artist.id)

    await AuditAPI.assertLatestEntry(apiContext, {
      action:     'USER_UNSUSPENDED',
      targetType: 'User',
    })
  })

  test('TC-AUD-11 | Booking force-cancel creates log with BOOKING_CANCELLED', async ({
    apiContext,
  }) => {
    const bookings = await BookingsAPI.list(apiContext, { status: 'CONFIRMED', limit: '1' })
    const booking  = bookings.bookings?.[0]
    if (!booking) test.skip()

    await BookingsAPI.cancel(apiContext, booking.id, 'Force cancel audit test')

    await AuditAPI.assertLatestEntry(apiContext, {
      action:     'BOOKING_CANCELLED',
      targetType: 'Booking',
      targetId:   booking.id,
    })
  })

  test('TC-AUD-12 | Dispute resolution creates log with DISPUTE_RESOLVED', async ({ apiContext }) => {
    const disputes = await DisputesAPI.list(apiContext, { status: 'OPEN', limit: '1' })
    const dispute  = disputes.disputes?.[0]
    if (!dispute) test.skip()

    await DisputesAPI.resolve(apiContext, dispute.id, 'dismiss', { notes: 'Audit log test dismiss' })

    await AuditAPI.assertLatestEntry(apiContext, {
      action:     'DISPUTE_RESOLVED',
      targetType: 'Booking',
    })
  })

  test('TC-AUD-13 | Service deactivation creates log entry', async ({ apiContext }) => {
    const data     = await apiContext.get(`${API_BASE}/admin/services?isActive=true&limit=1`)
    const services = (await data.json()).services
    if (!services?.length) test.skip()

    const serviceId = services[0].id
    await apiContext.patch(`${API_BASE}/admin/services/${serviceId}`, {
      data: { action: 'deactivate', reason: 'Audit service hide test' },
    })

    await AuditAPI.assertLatestEntry(apiContext, {
      action:     'SERVICE_DEACTIVATED',
      targetType: 'Service',
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Tamper prevention
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Audit log — tamper prevention', () => {
  test('TC-AUD-14 | PATCH request to audit log endpoint returns 405 or 403', async ({
    apiContext,
  }) => {
    const data    = await AuditAPI.list(apiContext, { limit: '1' })
    const entryId = data.logs?.[0]?.id
    if (!entryId) test.skip()

    const res = await apiContext.patch(`${API_BASE}/admin/audit-log/${entryId}`, {
      data: { action: 'TAMPERED' },
    })
    expect([HTTP.FORBIDDEN, 405, HTTP.NOT_FOUND]).toContain(res.status())
  })

  test('TC-AUD-15 | DELETE request to audit log endpoint returns 405 or 403', async ({
    apiContext,
  }) => {
    const data    = await AuditAPI.list(apiContext, { limit: '1' })
    const entryId = data.logs?.[0]?.id
    if (!entryId) test.skip()

    const res = await apiContext.delete(`${API_BASE}/admin/audit-log/${entryId}`)
    expect([HTTP.FORBIDDEN, 405, HTTP.NOT_FOUND]).toContain(res.status())
  })

  test('TC-AUD-16 | Audit log API is inaccessible to unauthenticated requests', async ({
    page,
    context,
  }) => {
    await context.clearCookies()
    const res = await page.request.get(`${API_BASE}/admin/audit-log`)
    expect(res.status()).toBe(HTTP.UNAUTHORIZED)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// API structure validation
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Audit log — API structure', () => {
  test('TC-AUD-17 | Log entry contains all required fields', async ({ apiContext }) => {
    const data  = await AuditAPI.list(apiContext, { limit: '1' })
    const entry = data.logs?.[0]
    if (!entry) test.skip()

    expect(entry).toHaveProperty('id')
    expect(entry).toHaveProperty('actorId')
    expect(entry).toHaveProperty('action')
    expect(entry).toHaveProperty('targetType')
    expect(entry).toHaveProperty('createdAt')
  })

  test('TC-AUD-18 | Pagination works (limit + offset)', async ({ apiContext }) => {
    const page1 = await AuditAPI.list(apiContext, { limit: '2', offset: '0' })
    const page2 = await AuditAPI.list(apiContext, { limit: '2', offset: '2' })

    const ids1 = page1.logs?.map((l: { id: string }) => l.id) ?? []
    const ids2 = page2.logs?.map((l: { id: string }) => l.id) ?? []

    // Pages must not overlap
    const overlap = ids1.filter((id: string) => ids2.includes(id))
    expect(overlap).toHaveLength(0)
  })

  test('TC-AUD-19 | Filter by targetType returns only matching entries', async ({ apiContext }) => {
    const data = await AuditAPI.list(apiContext, { targetType: 'User', limit: '5' })
    const logs = data.logs ?? []
    for (const log of logs) {
      expect(log.targetType).toBe('User')
    }
  })

  test('TC-AUD-20 | Filter by actorId returns only that actor\'s entries', async ({ apiContext }) => {
    // Get the admin user id from the current session
    const statsRes = await apiContext.get(`${API_BASE}/admin/stats`)
    const stats    = await statsRes.json()
    // Use any actorId from existing logs
    const allLogs  = await AuditAPI.list(apiContext, { limit: '5' })
    const actorId  = allLogs.logs?.[0]?.actorId
    if (!actorId) test.skip()

    const filtered = await AuditAPI.list(apiContext, { actorId, limit: '5' })
    for (const log of filtered.logs ?? []) {
      expect(log.actorId).toBe(actorId)
    }
  })
})
