/**
 * constants.ts — Shared test constants
 */

export const API_BASE = '/api'

export const ADMIN_ROUTES = {
  dashboard:   '/admin',
  kyc:         '/admin/kyc',
  artists:     '/admin/users?role=PROVIDER',
  users:       '/admin/users',
  bookings:    '/admin/bookings',
  disputes:    '/admin/disputes',
  payments:    '/admin/payments',
  services:    '/admin/services',
  auditLog:    '/admin/audit-log',
  settings:    '/admin/settings',
} as const

export const KYC_STATUS = {
  PENDING:          'PENDING',
  REQUIRES_ACTION:  'REQUIRES_ACTION',
  UNDER_REVIEW:     'UNDER_REVIEW',
  VERIFIED:         'VERIFIED',
  REJECTED:         'REJECTED',
} as const

export const RISK_LEVEL = {
  LOW:    'LOW',
  MEDIUM: 'MEDIUM',
  HIGH:   'HIGH',
} as const

export const ACCOUNT_STATUS = {
  ACTIVE:        'ACTIVE',
  SUSPENDED:     'SUSPENDED',
  BANNED:        'BANNED',
  UNDER_REVIEW:  'UNDER_REVIEW',
} as const

export const BOOKING_STATUS = {
  PENDING:    'PENDING',
  CONFIRMED:  'CONFIRMED',
  COMPLETED:  'COMPLETED',
  CANCELLED:  'CANCELLED',
  DISPUTED:   'DISPUTED',
} as const

export const HTTP = {
  OK:          200,
  CREATED:     201,
  BAD_REQUEST: 400,
  UNAUTHORIZED:401,
  FORBIDDEN:   403,
  NOT_FOUND:   404,
  SERVER_ERROR:500,
} as const

/** Credentials for seeded test accounts */
export const CREDENTIALS = {
  admin:   { email: 'admin@sparq.com.au',     password: 'admin123456' },
  ops:     { email: 'ops@sparq.com.au',        password: 'ops123456'   },
  support: { email: 'support@sparq.com.au',    password: 'support123456' },
  artist:  { email: 'lily.nguyen@example.com', password: 'provider123' },
  customer:{ email: 'emma@customer.com',       password: 'password123' },
} as const
