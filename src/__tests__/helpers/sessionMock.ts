/**
 * Session helpers for API route tests.
 *
 * Use alongside `jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))`.
 * Provides a typed builder for the session shape the app actually consumes and a
 * tiny `mockSession` helper that wires the next-auth mock to return that session.
 */

import { getServerSession } from 'next-auth'

export type MockRole = 'CUSTOMER' | 'PROVIDER' | 'ADMIN' | 'BOTH'
export type MockAccountStatus = 'ACTIVE' | 'UNDER_REVIEW' | 'SUSPENDED' | 'BANNED'

export interface MockSessionUser {
  id: string
  role: MockRole
  email?: string
  name?: string
  image?: string | null
  accountStatus?: MockAccountStatus
}

export interface MockSession {
  user: MockSessionUser
  expires: string
}

/**
 * Build a minimal authenticated session. Overrides are shallow-merged onto the
 * default CUSTOMER user. The expires field is set 1 hour into the future.
 */
export function makeSession(overrides: Partial<MockSessionUser> = {}): MockSession {
  return {
    user: {
      id: 'user-test-1',
      role: 'CUSTOMER',
      email: 'test@example.com',
      name: 'Test User',
      accountStatus: 'ACTIVE',
      ...overrides,
    },
    expires: new Date(Date.now() + 3600 * 1000).toISOString(),
  }
}

/**
 * Resolve the mocked getServerSession to the given session (or null for
 * unauthenticated). Uses mockResolvedValueOnce so tests can chain per-call.
 */
export function mockSession(session: MockSession | null): void {
  const mocked = getServerSession as jest.MockedFunction<typeof getServerSession>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mocked.mockResolvedValueOnce(session as any)
}

/** Shorthand for an unauthenticated request. */
export function mockNoSession(): void {
  mockSession(null)
}

/** Shorthand for authenticated with role=ADMIN. */
export function mockAdminSession(overrides: Partial<MockSessionUser> = {}): MockSession {
  const s = makeSession({ id: 'user-admin-1', role: 'ADMIN', ...overrides })
  mockSession(s)
  return s
}

/** Shorthand for authenticated with role=PROVIDER. */
export function mockProviderSession(overrides: Partial<MockSessionUser> = {}): MockSession {
  const s = makeSession({ id: 'user-provider-1', role: 'PROVIDER', ...overrides })
  mockSession(s)
  return s
}

/** Shorthand for authenticated with role=CUSTOMER. */
export function mockCustomerSession(overrides: Partial<MockSessionUser> = {}): MockSession {
  const s = makeSession({ id: 'user-customer-1', role: 'CUSTOMER', ...overrides })
  mockSession(s)
  return s
}
