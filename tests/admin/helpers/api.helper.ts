/**
 * api.helper.ts
 *
 * Typed wrappers around Playwright's APIRequestContext.
 * Each helper asserts the HTTP status and returns the parsed body.
 *
 * Usage:
 *   const { status, body } = await AdminAPI.kyc.approve(request, artistId, 'Verified OK')
 */

import type { APIRequestContext } from '@playwright/test'
import { expect } from '@playwright/test'
import { API_BASE, HTTP } from './constants'

// ── KYC ───────────────────────────────────────────────────────────────────

export const KycAPI = {
  list: async (req: APIRequestContext, params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString()
    const res = await req.get(`${API_BASE}/admin/kyc${qs ? `?${qs}` : ''}`)
    expect(res.status()).toBe(HTTP.OK)
    return res.json()
  },

  detail: async (req: APIRequestContext, providerId: string) => {
    const res = await req.get(`${API_BASE}/admin/kyc/${providerId}`)
    expect(res.status()).toBe(HTTP.OK)
    return res.json()
  },

  approve: async (req: APIRequestContext, providerId: string) => {
    const res = await req.patch(`${API_BASE}/admin/kyc/${providerId}`, {
      data: { action: 'approve' },
    })
    return { status: res.status(), body: await res.json() }
  },

  reject: async (req: APIRequestContext, providerId: string, reason: string) => {
    const res = await req.patch(`${API_BASE}/admin/kyc/${providerId}`, {
      data: { action: 'reject', reason },
    })
    return { status: res.status(), body: await res.json() }
  },

  requestInfo: async (req: APIRequestContext, providerId: string, notes?: string) => {
    const res = await req.patch(`${API_BASE}/admin/kyc/${providerId}`, {
      data: { action: 'request_info', notes },
    })
    return { status: res.status(), body: await res.json() }
  },

  flag: async (req: APIRequestContext, providerId: string, reason: string) => {
    const res = await req.patch(`${API_BASE}/admin/kyc/${providerId}`, {
      data: { action: 'flag', reason },
    })
    return { status: res.status(), body: await res.json() }
  },

  recalculate: async (req: APIRequestContext, providerId: string) => {
    const res = await req.patch(`${API_BASE}/admin/kyc/${providerId}`, {
      data: { action: 'recalculate_risk' },
    })
    return { status: res.status(), body: await res.json() }
  },
}

// ── Users / Artists ───────────────────────────────────────────────────────

export const UsersAPI = {
  list: async (req: APIRequestContext, params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString()
    const res = await req.get(`${API_BASE}/admin/users${qs ? `?${qs}` : ''}`)
    expect(res.status()).toBe(HTTP.OK)
    return res.json()
  },

  detail: async (req: APIRequestContext, userId: string) => {
    const res = await req.get(`${API_BASE}/admin/users/${userId}`)
    expect(res.status()).toBe(HTTP.OK)
    return res.json()
  },

  suspend: async (req: APIRequestContext, userId: string, reason: string) => {
    const res = await req.patch(`${API_BASE}/admin/users/${userId}`, {
      data: { action: 'suspend', reason },
    })
    return { status: res.status(), body: await res.json() }
  },

  ban: async (req: APIRequestContext, userId: string, reason: string) => {
    const res = await req.patch(`${API_BASE}/admin/users/${userId}`, {
      data: { action: 'ban', reason },
    })
    return { status: res.status(), body: await res.json() }
  },

  unsuspend: async (req: APIRequestContext, userId: string) => {
    const res = await req.patch(`${API_BASE}/admin/users/${userId}`, {
      data: { action: 'unsuspend' },
    })
    return { status: res.status(), body: await res.json() }
  },
}

// ── Bookings ──────────────────────────────────────────────────────────────

export const BookingsAPI = {
  list: async (req: APIRequestContext, params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString()
    const res = await req.get(`${API_BASE}/admin/bookings${qs ? `?${qs}` : ''}`)
    expect(res.status()).toBe(HTTP.OK)
    return res.json()
  },

  cancel: async (req: APIRequestContext, bookingId: string, reason: string) => {
    const res = await req.patch(`${API_BASE}/admin/bookings/${bookingId}`, {
      data: { action: 'cancel', reason },
    })
    return { status: res.status(), body: await res.json() }
  },
}

// ── Disputes ──────────────────────────────────────────────────────────────

export const DisputesAPI = {
  list: async (req: APIRequestContext, params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString()
    const res = await req.get(`${API_BASE}/admin/disputes${qs ? `?${qs}` : ''}`)
    expect(res.status()).toBe(HTTP.OK)
    return res.json()
  },

  resolve: async (
    req: APIRequestContext,
    disputeId: string,
    resolution: 'full_refund' | 'partial_refund' | 'release_payout' | 'dismiss',
    opts: { amount?: number; notes?: string } = {}
  ) => {
    const res = await req.patch(`${API_BASE}/admin/disputes/${disputeId}`, {
      data: { action: resolution, ...opts },
    })
    return { status: res.status(), body: await res.json() }
  },
}

// ── Payments ──────────────────────────────────────────────────────────────

export const PaymentsAPI = {
  list: async (req: APIRequestContext, params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString()
    const res = await req.get(`${API_BASE}/admin/payments${qs ? `?${qs}` : ''}`)
    expect(res.status()).toBe(HTTP.OK)
    return res.json()
  },
}

// ── Audit Log ─────────────────────────────────────────────────────────────

export const AuditAPI = {
  list: async (req: APIRequestContext, params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString()
    const res = await req.get(`${API_BASE}/admin/audit-log${qs ? `?${qs}` : ''}`)
    expect(res.status()).toBe(HTTP.OK)
    return res.json()
  },

  /** Assert that the most recent log entry matches expected shape */
  assertLatestEntry: async (
    req: APIRequestContext,
    expected: {
      action?: string
      targetType?: string
      targetId?: string
    }
  ) => {
    const data = await AuditAPI.list(req, { limit: '1' })
    const entry = data.logs?.[0]
    if (expected.action) expect(entry.action).toBe(expected.action)
    if (expected.targetType) expect(entry.targetType).toBe(expected.targetType)
    if (expected.targetId) expect(entry.targetId).toBe(expected.targetId)
    expect(entry.actorId).toBeTruthy()
    expect(entry.createdAt).toBeTruthy()
    return entry
  },
}

// ── Admin Stats ───────────────────────────────────────────────────────────

export const StatsAPI = {
  get: async (req: APIRequestContext) => {
    const res = await req.get(`${API_BASE}/admin/stats`)
    expect(res.status()).toBe(HTTP.OK)
    return res.json()
  },
}
