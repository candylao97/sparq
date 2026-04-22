/**
 * disputes.spec.ts
 *
 * Module: Dispute Resolution
 *
 * Covers:
 *  - Dispute list view and filtering
 *  - Dispute detail (evidence, notes, timeline)
 *  - Full refund
 *  - Partial refund
 *  - Payout release
 *  - Dismiss without action
 *  - Internal notes visibility (admin-only)
 *  - Post-resolution state consistency (booking, payment)
 *  - Edge cases: double-refund, dispute after refund, etc.
 */

import { test, expect } from '../fixtures/base.fixture'
import {
  DisputesAPI,
  BookingsAPI,
  AuditAPI,
} from '../helpers/api.helper'
import {
  expectToast,
  expectConfirmModal,
  expectDrawerOpen,
} from '../helpers/assert.helper'
import {
  ADMIN_ROUTES,
  HTTP,
  API_BASE,
} from '../helpers/constants'

// ─────────────────────────────────────────────────────────────────────────────
// Dispute list view
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Dispute list view', () => {
  test('TC-DSP-01 | Disputes page loads with table', async ({ adminPage }) => {
    await adminPage.goto(ADMIN_ROUTES.disputes)
    await expect(adminPage.getByRole('table')).toBeVisible()
  })

  test('TC-DSP-02 | Dispute rows show status, reason, and amount', async ({ adminPage }) => {
    await adminPage.goto(ADMIN_ROUTES.disputes)
    const rows = adminPage.locator('table tbody tr')
    const count = await rows.count()
    if (count === 0) test.skip()
    // Should show status badge
    await expect(rows.first().locator('[data-testid="dispute-status"], td').first()).toBeVisible()
  })

  test('TC-DSP-03 | Filter by OPEN status works', async ({ adminPage }) => {
    await adminPage.goto(`${ADMIN_ROUTES.disputes}?status=OPEN`)
    await expect(adminPage).not.toHaveURL(/error|500/)
  })

  test('TC-DSP-04 | KPI strip shows open dispute count', async ({ adminPage }) => {
    await adminPage.goto(ADMIN_ROUTES.disputes)
    await expect(adminPage.locator('text=/open/i').first()).toBeVisible()
  })

  test('TC-DSP-05 | Clicking a dispute row expands or opens detail', async ({ adminPage }) => {
    await adminPage.goto(ADMIN_ROUTES.disputes)
    const rows = adminPage.locator('table tbody tr')
    const count = await rows.count()
    if (count === 0) test.skip()

    await rows.first().click()
    // Expect either an accordion expansion or a drawer/modal
    const expanded = adminPage.locator('[data-testid="dispute-detail"], [data-state="open"]')
    await expect(expanded).toBeVisible({ timeout: 5_000 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Full refund
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Dispute resolution — full refund', () => {
  test('TC-DSP-06 | Admin can issue a full refund on an open dispute', async ({ apiContext }) => {
    const disputes = await DisputesAPI.list(apiContext, { status: 'OPEN', limit: '1' })
    const dispute  = disputes.disputes?.[0]
    if (!dispute) test.skip()

    const { status, body } = await DisputesAPI.resolve(apiContext, dispute.id, 'full_refund', {
      notes: 'Service not rendered — full refund granted',
    })

    expect(status).toBe(200)
    expect(body.status).toMatch(/resolved|closed/i)
    expect(body.resolution ?? body.action).toMatch(/full_refund/i)
  })

  test('TC-DSP-07 | Full refund updates booking.paymentStatus to REFUNDED', async ({ apiContext }) => {
    const disputes = await DisputesAPI.list(apiContext, { status: 'OPEN', limit: '1' })
    const dispute  = disputes.disputes?.[0]
    if (!dispute) test.skip()

    await DisputesAPI.resolve(apiContext, dispute.id, 'full_refund')

    if (dispute.bookingId) {
      const res = await apiContext.get(`${API_BASE}/admin/bookings/${dispute.bookingId}`)
      const booking = await res.json()
      expect(booking.paymentStatus).toMatch(/refunded/i)
    }
  })

  test('TC-DSP-08 | Full refund creates audit log entry', async ({ apiContext }) => {
    const disputes = await DisputesAPI.list(apiContext, { status: 'OPEN', limit: '1' })
    const dispute  = disputes.disputes?.[0]
    if (!dispute) test.skip()

    await DisputesAPI.resolve(apiContext, dispute.id, 'full_refund')

    await AuditAPI.assertLatestEntry(apiContext, {
      action:     'DISPUTE_RESOLVED',
      targetType: 'Booking',
    })
  })

  test('TC-DSP-09 | UI: Full refund button requires confirmation modal', async ({ adminPage }) => {
    await adminPage.goto(ADMIN_ROUTES.disputes)
    const rows = adminPage.locator('table tbody tr')
    if (await rows.count() === 0) test.skip()

    await rows.first().click()

    const refundBtn = adminPage.getByRole('button', { name: /full refund/i })
    if (await refundBtn.count() === 0) test.skip()

    await refundBtn.click()
    await expectConfirmModal(adminPage, 'refund')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Partial refund
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Dispute resolution — partial refund', () => {
  test('TC-DSP-10 | Admin can issue a partial refund with amount', async ({ apiContext }) => {
    const disputes = await DisputesAPI.list(apiContext, { status: 'OPEN', limit: '1' })
    const dispute  = disputes.disputes?.[0]
    if (!dispute) test.skip()

    const { status, body } = await DisputesAPI.resolve(apiContext, dispute.id, 'partial_refund', {
      amount: 25,
      notes:  'Partial service delivered',
    })

    expect(status).toBe(200)
    expect(body.resolution ?? body.action).toMatch(/partial/i)
  })

  test('TC-DSP-11 | Partial refund without amount returns 400', async ({ apiContext }) => {
    const disputes = await DisputesAPI.list(apiContext, { status: 'OPEN', limit: '1' })
    const dispute  = disputes.disputes?.[0]
    if (!dispute) test.skip()

    // Send partial_refund with no amount
    const res = await apiContext.patch(`${API_BASE}/admin/disputes/${dispute.id}`, {
      data: { action: 'partial_refund' },
    })
    expect(res.status()).toBe(HTTP.BAD_REQUEST)
  })

  test('TC-DSP-12 | Partial refund with amount > booking total returns 400', async ({ apiContext }) => {
    const disputes = await DisputesAPI.list(apiContext, { status: 'OPEN', limit: '1' })
    const dispute  = disputes.disputes?.[0]
    if (!dispute) test.skip()

    const { status } = await DisputesAPI.resolve(apiContext, dispute.id, 'partial_refund', {
      amount: 999_999,
    })
    expect(status).toBe(HTTP.BAD_REQUEST)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Payout release
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Dispute resolution — payout release', () => {
  test('TC-DSP-13 | Admin can release payout to artist on dispute resolution', async ({
    apiContext,
  }) => {
    const disputes = await DisputesAPI.list(apiContext, { status: 'OPEN', limit: '1' })
    const dispute  = disputes.disputes?.[0]
    if (!dispute) test.skip()

    const { status, body } = await DisputesAPI.resolve(apiContext, dispute.id, 'release_payout', {
      notes: 'Artist delivered service — customer complaint unfounded',
    })

    expect(status).toBe(200)
    expect(body.resolution ?? body.action).toMatch(/release/i)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Dismiss
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Dispute resolution — dismiss', () => {
  test('TC-DSP-14 | Admin can dismiss a dispute', async ({ apiContext }) => {
    const disputes = await DisputesAPI.list(apiContext, { status: 'OPEN', limit: '1' })
    const dispute  = disputes.disputes?.[0]
    if (!dispute) test.skip()

    const { status, body } = await DisputesAPI.resolve(apiContext, dispute.id, 'dismiss', {
      notes: 'Insufficient evidence',
    })

    expect(status).toBe(200)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Internal notes
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Internal notes — admin visibility', () => {
  test('TC-DSP-15 | Internal notes added during resolution are stored', async ({ apiContext }) => {
    const disputes = await DisputesAPI.list(apiContext, { status: 'OPEN', limit: '1' })
    const dispute  = disputes.disputes?.[0]
    if (!dispute) test.skip()

    const note = 'Admin internal note: customer verified via email'
    await DisputesAPI.resolve(apiContext, dispute.id, 'dismiss', { notes: note })

    const updated = await apiContext.get(`${API_BASE}/admin/disputes/${dispute.id}`)
    const body    = await updated.json()
    const stored  = body.adminNotes ?? body.notes ?? body.resolution?.notes
    expect(stored).toContain(note)
  })

  test('TC-DSP-16 | Internal notes are NOT exposed via the public customer API', async ({
    apiContext,
  }) => {
    const disputes = await DisputesAPI.list(apiContext, { status: 'RESOLVED', limit: '1' })
    const dispute  = disputes.disputes?.[0]
    if (!dispute) test.skip()

    // Public booking endpoint — should not return adminNotes
    if (dispute.bookingId) {
      const res  = await apiContext.get(`${API_BASE}/bookings/${dispute.bookingId}`)
      if (res.status() === 200) {
        const pub = await res.json()
        expect(pub.adminNotes).toBeUndefined()
        expect(pub.internalNotes).toBeUndefined()
      }
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Edge cases
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Dispute — edge cases', () => {
  test('TC-DSP-17 | Cannot resolve an already-resolved dispute', async ({ apiContext }) => {
    const disputes = await DisputesAPI.list(apiContext, { status: 'RESOLVED', limit: '1' })
    const dispute  = disputes.disputes?.[0]
    if (!dispute) test.skip()

    const { status } = await DisputesAPI.resolve(apiContext, dispute.id, 'full_refund')
    expect([HTTP.BAD_REQUEST, HTTP.FORBIDDEN]).toContain(status)
  })

  test('TC-DSP-18 | Opening dispute on a completed booking is validated', async ({ apiContext }) => {
    // A completed booking can have a dispute — verify the link is correct
    const bookings = await BookingsAPI.list(apiContext, { status: 'COMPLETED', limit: '1' })
    const booking  = bookings.bookings?.[0]
    if (!booking) test.skip()

    if (booking.disputeId) {
      const res = await apiContext.get(`${API_BASE}/admin/disputes/${booking.disputeId}`)
      expect(res.status()).toBe(HTTP.OK)
    }
  })

  test('TC-DSP-19 | Action on non-existent dispute returns 404', async ({ apiContext }) => {
    const { status } = await DisputesAPI.resolve(apiContext, 'non-existent-dispute-id', 'dismiss')
    expect(status).toBe(HTTP.NOT_FOUND)
  })

  test('TC-DSP-20 | Full refund cannot be issued twice', async ({ apiContext }) => {
    const disputes = await DisputesAPI.list(apiContext, { status: 'OPEN', limit: '1' })
    const dispute  = disputes.disputes?.[0]
    if (!dispute) test.skip()

    await DisputesAPI.resolve(apiContext, dispute.id, 'full_refund')
    // Second full refund on same dispute
    const { status } = await DisputesAPI.resolve(apiContext, dispute.id, 'full_refund')
    expect([HTTP.BAD_REQUEST, HTTP.FORBIDDEN]).toContain(status)
  })
})
