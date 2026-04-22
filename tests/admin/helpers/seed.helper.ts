/**
 * seed.helper.ts
 *
 * Test data factories using the admin API.
 * These create minimal, isolated records for a single test.
 *
 * Note: These call the live API (or a test DB endpoint).
 * For CI, point TEST_BASE_URL at a test-schema Postgres instance.
 */

import type { APIRequestContext } from '@playwright/test'
import { expect } from '@playwright/test'
import { API_BASE } from './constants'

export interface SeedArtist {
  id: string
  email: string
  name: string
  kycStatus: string
}

export interface SeedBooking {
  id: string
  providerId: string
  customerId: string
  status: string
}

/**
 * Registers a new artist via the public API and returns their user id.
 * The artist starts with KYC status = PENDING.
 */
export async function seedPendingArtist(req: APIRequestContext): Promise<SeedArtist> {
  const suffix = Date.now()
  const email  = `test.artist.${suffix}@sparq-test.com`

  const res = await req.post(`${API_BASE}/auth/register`, {
    data: {
      name:     `Test Artist ${suffix}`,
      email,
      password: 'TestPass123!',
      role:     'PROVIDER',
    },
  })
  expect(res.status()).toBeLessThan(300)
  const body = await res.json()
  return {
    id:        body.user?.id ?? body.id,
    email,
    name:      `Test Artist ${suffix}`,
    kycStatus: 'PENDING',
  }
}

/**
 * Creates a booking between an existing customer and provider.
 * Uses the internal test endpoint (guarded by TEST_SECRET header).
 */
export async function seedBooking(
  req: APIRequestContext,
  opts: { providerId: string; customerId: string }
): Promise<SeedBooking> {
  const res = await req.post(`${API_BASE}/test/seed/booking`, {
    headers: { 'x-test-secret': process.env.TEST_SECRET ?? 'test-secret-local' },
    data: { providerId: opts.providerId, customerId: opts.customerId },
  })
  // Gracefully skip if test seed endpoint not implemented
  if (res.status() === 404) {
    return { id: 'SKIP', providerId: opts.providerId, customerId: opts.customerId, status: 'PENDING' }
  }
  expect(res.status()).toBe(201)
  const body = await res.json()
  return { id: body.id, providerId: opts.providerId, customerId: opts.customerId, status: 'PENDING' }
}

/**
 * Forces a KYC status change via the admin API.
 * Used to set up preconditions without going through the UI.
 */
export async function forceKycStatus(
  req: APIRequestContext,
  providerId: string,
  action: 'approve' | 'reject' | 'request_info' | 'flag',
  reason?: string
) {
  const res = await req.patch(`${API_BASE}/admin/kyc/${providerId}`, {
    data: { action, reason: reason ?? 'test-setup' },
  })
  expect(res.status()).toBeLessThan(300)
  return res.json()
}
