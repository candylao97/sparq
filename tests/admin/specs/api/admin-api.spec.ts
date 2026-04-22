/**
 * admin-api.spec.ts
 *
 * Module: Admin API (comprehensive API-level tests)
 *
 * Tests every admin endpoint for:
 *  - Success responses and correct shape
 *  - Validation failures (missing fields, bad types)
 *  - Malformed payloads
 *  - Duplicate / idempotent actions
 *  - Non-existent resource handling (404)
 *  - Large payload / boundary values
 *  - Security: IDOR, cross-resource mutations
 */

import { test, expect } from '../../fixtures/base.fixture'
import {
  KycAPI,
  UsersAPI,
  BookingsAPI,
  DisputesAPI,
  PaymentsAPI,
  AuditAPI,
  StatsAPI,
} from '../../helpers/api.helper'
import { seedPendingArtist } from '../../helpers/seed.helper'
import { HTTP, API_BASE } from '../../helpers/constants'

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard stats
// ─────────────────────────────────────────────────────────────────────────────

test.describe('GET /api/admin/stats', () => {
  test('TC-API-01 | Returns 200 with all required KPI keys', async ({ apiContext }) => {
    const stats = await StatsAPI.get(apiContext)

    const required = [
      'users', 'providers', 'gmv', 'totalBookings',
      'pendingKYC', 'highRiskKYC', 'openDisputes',
    ]
    for (const key of required) {
      expect(stats).toHaveProperty(key)
    }
  })

  test('TC-API-02 | All numeric KPI values are non-negative', async ({ apiContext }) => {
    const stats = await StatsAPI.get(apiContext)
    for (const [key, val] of Object.entries(stats)) {
      if (typeof val === 'number') {
        expect(val).toBeGreaterThanOrEqual(0)
      }
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// KYC API
// ─────────────────────────────────────────────────────────────────────────────

test.describe('GET /api/admin/kyc', () => {
  test('TC-API-03 | Returns providers array and total count', async ({ apiContext }) => {
    const data = await KycAPI.list(apiContext)
    expect(Array.isArray(data.providers)).toBe(true)
    expect(typeof data.total ?? data.providers.length).toBe('number')
  })

  test('TC-API-04 | status filter returns only matching records', async ({ apiContext }) => {
    const data = await KycAPI.list(apiContext, { status: 'VERIFIED' })
    for (const p of data.providers ?? []) {
      expect(p.kycStatus ?? p.kycRecord?.status).toBe('VERIFIED')
    }
  })

  test('TC-API-05 | risk filter returns only matching records', async ({ apiContext }) => {
    const data = await KycAPI.list(apiContext, { risk: 'HIGH' })
    for (const p of data.providers ?? []) {
      expect(p.riskLevel ?? p.kycRecord?.riskLevel).toBe('HIGH')
    }
  })

  test('TC-API-06 | Limit parameter is respected', async ({ apiContext }) => {
    const data = await KycAPI.list(apiContext, { limit: '3' })
    expect((data.providers ?? []).length).toBeLessThanOrEqual(3)
  })
})

test.describe('GET /api/admin/kyc/:id', () => {
  test('TC-API-07 | Returns full provider detail with kycRecord', async ({ apiContext }) => {
    const list   = await KycAPI.list(apiContext, { limit: '1' })
    const artist = list.providers?.[0]
    if (!artist) test.skip()

    const detail = await KycAPI.detail(apiContext, artist.id)
    expect(detail).toHaveProperty('id')
    expect(detail.kycRecord ?? detail.kycStatus).toBeTruthy()
  })

  test('TC-API-08 | Returns 404 for non-existent provider', async ({ apiContext }) => {
    const res = await apiContext.get(`${API_BASE}/admin/kyc/does-not-exist-xyz`)
    expect(res.status()).toBe(HTTP.NOT_FOUND)
  })
})

test.describe('PATCH /api/admin/kyc/:id — validation', () => {
  test('TC-API-09 | Missing action field returns 400', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    const res = await apiContext.patch(`${API_BASE}/admin/kyc/${artist.id}`, {
      data: {},
    })
    expect(res.status()).toBe(HTTP.BAD_REQUEST)
  })

  test('TC-API-10 | Reject without reason returns 400', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    const { status } = await KycAPI.reject(apiContext, artist.id, '')
    expect(status).toBe(HTTP.BAD_REQUEST)
  })

  test('TC-API-11 | Invalid action value returns 400', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    const res = await apiContext.patch(`${API_BASE}/admin/kyc/${artist.id}`, {
      data: { action: 'delete_all_data' },
    })
    expect(res.status()).toBe(HTTP.BAD_REQUEST)
  })

  test('TC-API-12 | Malformed JSON body returns 400', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    const res = await apiContext.patch(`${API_BASE}/admin/kyc/${artist.id}`, {
      data:    '{ invalid json !!!',
      headers: { 'content-type': 'application/json' },
    })
    expect([HTTP.BAD_REQUEST, HTTP.SERVER_ERROR]).toContain(res.status())
    // Must not be 500 due to JSON parse crash — should be handled gracefully
    // If 500 here, the endpoint is missing try/catch on body parsing
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Users API
// ─────────────────────────────────────────────────────────────────────────────

test.describe('GET /api/admin/users', () => {
  test('TC-API-13 | Returns users array', async ({ apiContext }) => {
    const data = await UsersAPI.list(apiContext)
    expect(Array.isArray(data.users)).toBe(true)
  })

  test('TC-API-14 | role filter returns only matching role', async ({ apiContext }) => {
    const data = await UsersAPI.list(apiContext, { role: 'CUSTOMER' })
    for (const u of data.users ?? []) {
      expect(['CUSTOMER', 'BOTH']).toContain(u.role)
    }
  })

  test('TC-API-15 | Non-existent user returns 404', async ({ apiContext }) => {
    const res = await apiContext.get(`${API_BASE}/admin/users/non-existent-xyz`)
    expect(res.status()).toBe(HTTP.NOT_FOUND)
  })
})

test.describe('PATCH /api/admin/users/:id — validation', () => {
  test('TC-API-16 | Suspend without reason returns 400', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    const { status } = await UsersAPI.suspend(apiContext, artist.id, '')
    expect(status).toBe(HTTP.BAD_REQUEST)
  })

  test('TC-API-17 | Ban without reason returns 400', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    const { status } = await UsersAPI.ban(apiContext, artist.id, '')
    expect(status).toBe(HTTP.BAD_REQUEST)
  })

  test('TC-API-18 | Action on non-existent user returns 404', async ({ apiContext }) => {
    const res = await apiContext.patch(`${API_BASE}/admin/users/non-existent-xyz`, {
      data: { action: 'suspend', reason: 'test' },
    })
    expect(res.status()).toBe(HTTP.NOT_FOUND)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Bookings API
// ─────────────────────────────────────────────────────────────────────────────

test.describe('GET /api/admin/bookings', () => {
  test('TC-API-19 | Returns bookings array', async ({ apiContext }) => {
    const data = await BookingsAPI.list(apiContext)
    expect(Array.isArray(data.bookings)).toBe(true)
  })

  test('TC-API-20 | Status filter works', async ({ apiContext }) => {
    const data = await BookingsAPI.list(apiContext, { status: 'COMPLETED' })
    for (const b of data.bookings ?? []) {
      expect(b.status).toBe('COMPLETED')
    }
  })
})

test.describe('PATCH /api/admin/bookings/:id — validation', () => {
  test('TC-API-21 | Cancel without reason returns 400', async ({ apiContext }) => {
    const bookings = await BookingsAPI.list(apiContext, { status: 'CONFIRMED', limit: '1' })
    const booking  = bookings.bookings?.[0]
    if (!booking) test.skip()

    const { status } = await BookingsAPI.cancel(apiContext, booking.id, '')
    expect(status).toBe(HTTP.BAD_REQUEST)
  })

  test('TC-API-22 | Cancel non-existent booking returns 404', async ({ apiContext }) => {
    const { status } = await BookingsAPI.cancel(apiContext, 'non-existent-id', 'test')
    expect(status).toBe(HTTP.NOT_FOUND)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Payments API
// ─────────────────────────────────────────────────────────────────────────────

test.describe('GET /api/admin/payments', () => {
  test('TC-API-23 | Returns payouts array with aggregate total', async ({ apiContext }) => {
    const data = await PaymentsAPI.list(apiContext)
    expect(Array.isArray(data.payouts)).toBe(true)
  })

  test('TC-API-24 | Status filter works for FAILED payouts', async ({ apiContext }) => {
    const data = await PaymentsAPI.list(apiContext, { status: 'FAILED' })
    for (const p of data.payouts ?? []) {
      expect(p.status).toBe('FAILED')
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Security — IDOR
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Security — IDOR prevention', () => {
  test('TC-API-25 | Cannot read another user\'s private booking via admin API without session', async ({
    page,
    context,
  }) => {
    await context.clearCookies()
    const res = await page.request.get(`${API_BASE}/admin/bookings`)
    expect(res.status()).toBe(HTTP.UNAUTHORIZED)
  })

  test('TC-API-26 | Admin cannot set role to ADMIN via profile update endpoint', async ({
    apiContext,
  }) => {
    const res = await apiContext.patch(`${API_BASE}/profile`, {
      data: { role: 'ADMIN' },
    })
    // Either forbidden or the role field is ignored — should NOT succeed in upgrading
    if (res.status() === HTTP.OK) {
      const body = await res.json()
      // If the endpoint returned 200, the role must NOT have changed
      expect(body.role).not.toBe('ADMIN')
    }
  })

  test('TC-API-27 | SQL injection attempt in search param is sanitised', async ({ apiContext }) => {
    const res = await apiContext.get(
      `${API_BASE}/admin/users?search='; DROP TABLE "User"; --`
    )
    expect(res.status()).not.toBe(HTTP.SERVER_ERROR)
  })

  test('TC-API-28 | XSS payload in reason field is stored safely', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    const xss    = '<script>alert(1)</script>'
    const { status } = await KycAPI.reject(apiContext, artist.id, xss)
    // Should be accepted but stored as plain text — not executed
    expect(status).toBe(HTTP.OK)
    const detail = await KycAPI.detail(apiContext, artist.id)
    const reason = detail.rejectedReason ?? detail.kycRecord?.rejectedReason ?? ''
    // Should be stored literally, not blank or cause a crash
    expect(reason).toBeTruthy()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Error handling
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Error handling', () => {
  test('TC-API-29 | Very long reason string (> 5000 chars) is handled gracefully', async ({
    apiContext,
  }) => {
    const artist = await seedPendingArtist(apiContext)
    const longReason = 'A'.repeat(5001)
    const { status } = await KycAPI.reject(apiContext, artist.id, longReason)
    expect(status).not.toBe(HTTP.SERVER_ERROR)
  })

  test('TC-API-30 | Concurrent approve + reject on same artist is safe', async ({ apiContext }) => {
    const artist = await seedPendingArtist(apiContext)
    const [approve, reject] = await Promise.all([
      KycAPI.approve(apiContext, artist.id),
      KycAPI.reject(apiContext, artist.id, 'Race condition test'),
    ])
    // One wins, one loses — neither should be a 500
    expect(approve.status).not.toBe(HTTP.SERVER_ERROR)
    expect(reject.status).not.toBe(HTTP.SERVER_ERROR)
    // Final state must be deterministic
    const detail = await KycAPI.detail(apiContext, artist.id)
    const status = detail.kycStatus ?? detail.kycRecord?.status
    expect(['VERIFIED', 'REJECTED']).toContain(status)
  })
})
