/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Admin authorization sweep — every /api/admin/** route must return 401 for
 * unauthenticated requests AND for authenticated non-ADMIN roles (CUSTOMER,
 * PROVIDER, BOTH).
 *
 * Item #1 in the Phase-2 plan. T+R impact: a regression that drops the role
 * check on any admin route hands the entire admin surface (refunds, user ban,
 * KYC, settings, vouchers) to whoever is signed in.
 *
 * Strategy: table of (path, method, label) × 3 unauthorized personas. Each
 * route is invoked with a stub request; only the 401 gate is asserted. We don't
 * validate the happy path here — the role gate is the immutable contract.
 */

import { NextRequest } from 'next/server'

// ─── Mocks ──────────────────────────────────────────────────────────────────
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), update: jest.fn() },
    booking: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    review: { findMany: jest.fn(), count: jest.fn(), update: jest.fn() },
    reviewReport: { findMany: jest.fn() },
    providerProfile: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    dispute: { findMany: jest.fn(), count: jest.fn(), update: jest.fn() },
    verification: { count: jest.fn() },
    payout: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
    kYCRecord: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    fraudSignal: { findMany: jest.fn() },
    auditLog: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
    adminNote: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    suburb: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    contactLeakageFlag: { findMany: jest.fn(), update: jest.fn() },
    giftVoucher: { findMany: jest.fn(), create: jest.fn() },
    category: { findMany: jest.fn() },
    setting: { findMany: jest.fn(), update: jest.fn(), upsert: jest.fn() },
    service: { findMany: jest.fn(), update: jest.fn() },
  },
}))
jest.mock('@/lib/stripe', () => ({
  stripe: {
    refunds: { create: jest.fn() },
    paymentIntents: { retrieve: jest.fn(), cancel: jest.fn() },
    transfers: { create: jest.fn(), reverse: jest.fn() },
  },
}))
jest.mock('@/lib/stripe-payouts', () => ({
  retryPayout: jest.fn(),
  computeCommissionForTier: jest.fn().mockReturnValue(0.15),
}))
jest.mock('@/lib/auditLog', () => ({
  logAdminAction: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('@/lib/settings', () => ({
  getSettingFloat: jest.fn().mockResolvedValue(0.15),
  getSettingString: jest.fn().mockResolvedValue(''),
  getSettingBool: jest.fn().mockResolvedValue(false),
  refreshSettingsCache: jest.fn(),
}))

import { getServerSession } from 'next-auth'
import { makeSession, mockSession } from '@/__tests__/helpers/sessionMock'

const mockedGetSession = getServerSession as jest.MockedFunction<typeof getServerSession>

// ─── Route manifest ─────────────────────────────────────────────────────────
// Each entry: [path, exported method name, takes params?]
interface RouteEntry {
  module: string
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  hasParams: boolean
  label: string
}

const ROUTES: RouteEntry[] = [
  { module: '@/app/api/admin/settings/route', method: 'GET', hasParams: false, label: 'GET /api/admin/settings' },
  { module: '@/app/api/admin/settings/route', method: 'PATCH', hasParams: false, label: 'PATCH /api/admin/settings' },
  { module: '@/app/api/admin/payments/route', method: 'GET', hasParams: false, label: 'GET /api/admin/payments' },
  { module: '@/app/api/admin/kyc/route', method: 'GET', hasParams: false, label: 'GET /api/admin/kyc' },
  { module: '@/app/api/admin/kyc/route', method: 'POST', hasParams: false, label: 'POST /api/admin/kyc' },
  { module: '@/app/api/admin/kyc/[id]/route', method: 'GET', hasParams: true, label: 'GET /api/admin/kyc/[id]' },
  { module: '@/app/api/admin/kyc/[id]/route', method: 'PATCH', hasParams: true, label: 'PATCH /api/admin/kyc/[id]' },
  { module: '@/app/api/admin/bookings/route', method: 'GET', hasParams: false, label: 'GET /api/admin/bookings' },
  { module: '@/app/api/admin/bookings/[id]/refund/route', method: 'POST', hasParams: true, label: 'POST /api/admin/bookings/[id]/refund' },
  { module: '@/app/api/admin/providers/route', method: 'GET', hasParams: false, label: 'GET /api/admin/providers' },
  { module: '@/app/api/admin/providers/[id]/route', method: 'PATCH', hasParams: true, label: 'PATCH /api/admin/providers/[id]' },
  { module: '@/app/api/admin/fraud-signals/route', method: 'GET', hasParams: false, label: 'GET /api/admin/fraud-signals' },
  { module: '@/app/api/admin/disputes/route', method: 'GET', hasParams: false, label: 'GET /api/admin/disputes' },
  { module: '@/app/api/admin/disputes/route', method: 'PATCH', hasParams: false, label: 'PATCH /api/admin/disputes' },
  { module: '@/app/api/admin/audit-log/route', method: 'GET', hasParams: false, label: 'GET /api/admin/audit-log' },
  { module: '@/app/api/admin/notes/route', method: 'GET', hasParams: false, label: 'GET /api/admin/notes' },
  { module: '@/app/api/admin/notes/route', method: 'POST', hasParams: false, label: 'POST /api/admin/notes' },
  { module: '@/app/api/admin/notes/[id]/route', method: 'PATCH', hasParams: true, label: 'PATCH /api/admin/notes/[id]' },
  { module: '@/app/api/admin/notes/[id]/route', method: 'DELETE', hasParams: true, label: 'DELETE /api/admin/notes/[id]' },
  { module: '@/app/api/admin/suburbs/route', method: 'GET', hasParams: false, label: 'GET /api/admin/suburbs' },
  { module: '@/app/api/admin/suburbs/route', method: 'POST', hasParams: false, label: 'POST /api/admin/suburbs' },
  { module: '@/app/api/admin/suburbs/[id]/route', method: 'PATCH', hasParams: true, label: 'PATCH /api/admin/suburbs/[id]' },
  { module: '@/app/api/admin/suburbs/[id]/route', method: 'DELETE', hasParams: true, label: 'DELETE /api/admin/suburbs/[id]' },
  { module: '@/app/api/admin/leakage-flags/route', method: 'GET', hasParams: false, label: 'GET /api/admin/leakage-flags' },
  { module: '@/app/api/admin/leakage-flags/route', method: 'PATCH', hasParams: false, label: 'PATCH /api/admin/leakage-flags' },
  { module: '@/app/api/admin/users/route', method: 'GET', hasParams: false, label: 'GET /api/admin/users' },
  { module: '@/app/api/admin/users/[id]/route', method: 'GET', hasParams: true, label: 'GET /api/admin/users/[id]' },
  { module: '@/app/api/admin/users/[id]/route', method: 'PATCH', hasParams: true, label: 'PATCH /api/admin/users/[id]' },
  { module: '@/app/api/admin/vouchers/route', method: 'GET', hasParams: false, label: 'GET /api/admin/vouchers' },
  { module: '@/app/api/admin/vouchers/route', method: 'POST', hasParams: false, label: 'POST /api/admin/vouchers' },
  { module: '@/app/api/admin/export/route', method: 'GET', hasParams: false, label: 'GET /api/admin/export' },
  { module: '@/app/api/admin/categories/route', method: 'GET', hasParams: false, label: 'GET /api/admin/categories' },
  { module: '@/app/api/admin/payouts/[id]/retry/route', method: 'POST', hasParams: true, label: 'POST /api/admin/payouts/[id]/retry' },
  { module: '@/app/api/admin/stats/route', method: 'GET', hasParams: false, label: 'GET /api/admin/stats' },
  { module: '@/app/api/admin/services/route', method: 'GET', hasParams: false, label: 'GET /api/admin/services' },
  { module: '@/app/api/admin/services/[id]/route', method: 'PATCH', hasParams: true, label: 'PATCH /api/admin/services/[id]' },
  { module: '@/app/api/admin/analytics/route', method: 'GET', hasParams: false, label: 'GET /api/admin/analytics' },
  { module: '@/app/api/admin/reports/route', method: 'GET', hasParams: false, label: 'GET /api/admin/reports' },
  { module: '@/app/api/admin/reviews/route', method: 'GET', hasParams: false, label: 'GET /api/admin/reviews' },
  { module: '@/app/api/admin/reviews/[id]/route', method: 'PATCH', hasParams: true, label: 'PATCH /api/admin/reviews/[id]' },
]

function buildRequest(method: string, bodyData?: unknown): NextRequest {
  const url = 'http://localhost/api/admin/test'
  const init: RequestInit & { headers: Record<string, string> } = {
    method,
    headers: {},
  }
  if (['POST', 'PATCH', 'PUT'].includes(method)) {
    init.body = JSON.stringify(bodyData ?? {})
    init.headers['Content-Type'] = 'application/json'
  }
  return new NextRequest(url, init)
}

async function invoke(entry: RouteEntry): Promise<Response> {
  const mod = await import(entry.module)
  const handler = mod[entry.method] as (...args: unknown[]) => Promise<Response>
  const req = buildRequest(entry.method)
  if (entry.hasParams) {
    return handler(req, { params: { id: 'stub-id' } })
  }
  // Some static routes are `GET()` with zero args; Next tolerates extras, but
  // matching the real signature avoids noise.
  return handler.length === 0 ? handler() : handler(req)
}

// ─── Test suites ────────────────────────────────────────────────────────────

describe(`admin authorization sweep — ${ROUTES.length} route/method combos`, () => {
  beforeEach(() => jest.clearAllMocks())

  describe('unauthenticated (no session) → 401', () => {
    ROUTES.forEach(entry => {
      it(`${entry.label} returns 401`, async () => {
        mockSession(null)
        const res = await invoke(entry)
        expect(res.status).toBe(401)
      })
    })
  })

  describe('CUSTOMER role → 401', () => {
    ROUTES.forEach(entry => {
      it(`${entry.label} rejects CUSTOMER`, async () => {
        mockSession(makeSession({ id: 'u-cust', role: 'CUSTOMER' }))
        const res = await invoke(entry)
        expect(res.status).toBe(401)
      })
    })
  })

  describe('PROVIDER role → 401', () => {
    ROUTES.forEach(entry => {
      it(`${entry.label} rejects PROVIDER`, async () => {
        mockSession(makeSession({ id: 'u-prov', role: 'PROVIDER' }))
        const res = await invoke(entry)
        expect(res.status).toBe(401)
      })
    })
  })

  describe('BOTH role → 401', () => {
    ROUTES.forEach(entry => {
      it(`${entry.label} rejects BOTH`, async () => {
        mockSession(makeSession({ id: 'u-both', role: 'BOTH' }))
        const res = await invoke(entry)
        expect(res.status).toBe(401)
      })
    })
  })

  describe('manifest completeness', () => {
    it('covers exactly 29 distinct route modules', () => {
      const uniq = new Set(ROUTES.map(r => r.module))
      expect(uniq.size).toBe(29)
    })

    it('covers the expected HTTP method count (>= 40)', () => {
      expect(ROUTES.length).toBeGreaterThanOrEqual(40)
    })
  })
})

// Ensure the mock bridge works even when suites reset
afterEach(() => {
  mockedGetSession.mockReset()
})
