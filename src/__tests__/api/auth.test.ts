/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for POST /api/auth/register
 *
 * Strategy:
 *  - Mock bcryptjs so we can verify hashing is called and inspect hashed values
 *  - Mock @/lib/prisma to control database responses
 *  - Import the route handler directly and call it with NextRequest objects
 */

import { NextRequest } from 'next/server'

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Mock bcrypt so tests don't actually hash (slow) and so we can assert it's called
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password_value'),
  compare: jest.fn().mockResolvedValue(true),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}))

// ─── Imports (after mocks) ───────────────────────────────────────────────────

import { POST as registerPOST } from '@/app/api/auth/register/route'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>

function makeRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const validCustomerBody = {
  name: 'Emma Smith',
  email: 'emma@example.com',
  phone: '0412345678',
  password: 'password123',
  role: 'CUSTOMER',
  // FIND-4: register now hard-requires this at the API boundary.
  acceptedTerms: true,
}

const validProviderBody = {
  name: 'Sophie Chen',
  email: 'sophie@example.com',
  phone: '0412345679',
  password: 'provider123',
  role: 'PROVIDER',
  acceptedTerms: true,
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── Success cases ──────────────────────────────────────────────────────────

  it('creates a CUSTOMER user and returns success + userId', async () => {
    ;(mockPrisma.user.findFirst as jest.Mock).mockResolvedValueOnce(null)
    ;(mockPrisma.user.create as jest.Mock).mockResolvedValueOnce({
      id: 'new-user-id',
      name: 'Emma Smith',
      email: 'emma@example.com',
      role: 'CUSTOMER',
    })

    const req = makeRequest(validCustomerBody)
    const res = await registerPOST(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.userId).toBe('new-user-id')
  })

  it('creates a PROVIDER user and returns success', async () => {
    ;(mockPrisma.user.findFirst as jest.Mock).mockResolvedValueOnce(null)
    ;(mockPrisma.user.create as jest.Mock).mockResolvedValueOnce({
      id: 'provider-user-id',
      name: 'Sophie Chen',
      email: 'sophie@example.com',
      role: 'PROVIDER',
    })

    const req = makeRequest(validProviderBody)
    const res = await registerPOST(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('hashes the password with bcrypt before saving', async () => {
    ;(mockPrisma.user.findFirst as jest.Mock).mockResolvedValueOnce(null)
    ;(mockPrisma.user.create as jest.Mock).mockResolvedValueOnce({ id: 'u1', name: 'Emma', email: 'emma@example.com', role: 'CUSTOMER' })

    const req = makeRequest(validCustomerBody)
    await registerPOST(req)

    // bcrypt.hash should have been called with the plain password and salt rounds 12
    expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 12)

    // The user.create call should use the hashed password, NOT the plain text
    const createCall = (mockPrisma.user.create as jest.Mock).mock.calls[0][0]
    expect(createCall.data.password).toBe('hashed_password_value')
    expect(createCall.data.password).not.toBe('password123')
  })

  it('uses email prefix as name when name is omitted', async () => {
    ;(mockPrisma.user.findFirst as jest.Mock).mockResolvedValueOnce(null)

    let capturedData: any = null
    ;(mockPrisma.user.create as jest.Mock).mockImplementationOnce((args) => {
      capturedData = args.data
      return Promise.resolve({ id: 'u2', ...args.data })
    })

    const req = makeRequest({
      email: 'newuser@example.com',
      phone: '0412345680',
      password: 'password123',
      role: 'CUSTOMER',
      acceptedTerms: true,
      // No name field
    })
    await registerPOST(req)

    expect(capturedData.name).toBe('newuser')
  })

  it('creates customerProfile when role is CUSTOMER', async () => {
    ;(mockPrisma.user.findFirst as jest.Mock).mockResolvedValueOnce(null)

    let capturedData: any = null
    ;(mockPrisma.user.create as jest.Mock).mockImplementationOnce((args) => {
      capturedData = args.data
      return Promise.resolve({ id: 'u3', ...args.data })
    })

    const req = makeRequest(validCustomerBody)
    await registerPOST(req)

    // The user.create call should nest customerProfile: { create: {} }
    expect(capturedData.customerProfile).toEqual({ create: {} })
    // And providerProfile should be undefined for a CUSTOMER
    expect(capturedData.providerProfile).toBeUndefined()
  })

  it('creates providerProfile (with scoreFactors) when role is PROVIDER', async () => {
    ;(mockPrisma.user.findFirst as jest.Mock).mockResolvedValueOnce(null)

    let capturedData: any = null
    ;(mockPrisma.user.create as jest.Mock).mockImplementationOnce((args) => {
      capturedData = args.data
      return Promise.resolve({ id: 'u4', ...args.data })
    })

    const req = makeRequest(validProviderBody)
    await registerPOST(req)

    expect(capturedData.providerProfile).toBeDefined()
    expect(capturedData.providerProfile.create.scoreFactors).toBeDefined()
    // And customerProfile should be undefined for a PROVIDER
    expect(capturedData.customerProfile).toBeUndefined()
  })

  // ── Rejection / error cases ─────────────────────────────────────────────────

  it('returns 400 when email is already in use', async () => {
    // Simulate an existing user with the same email
    ;(mockPrisma.user.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 'existing-user',
      email: 'emma@example.com',
    })

    const req = makeRequest(validCustomerBody)
    const res = await registerPOST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Phone number or email already in use')

    // user.create should NOT be called
    expect(mockPrisma.user.create).not.toHaveBeenCalled()
  })

  it('returns 500 when zod validation fails (invalid email format)', async () => {
    const req = makeRequest({
      email: 'not-an-email',
      phone: '0412345681',
      password: 'password123',
      role: 'CUSTOMER',
    })
    const res = await registerPOST(req)

    // Zod parse throws, which is caught by the try/catch → 500
    expect(res.status).toBe(500)
    expect(mockPrisma.user.create).not.toHaveBeenCalled()
  })

  it('returns 500 when password is too short (zod min 8)', async () => {
    const req = makeRequest({
      email: 'test@example.com',
      phone: '0412345682',
      password: 'short',
      role: 'CUSTOMER',
    })
    const res = await registerPOST(req)

    expect(res.status).toBe(500)
    expect(mockPrisma.user.create).not.toHaveBeenCalled()
  })

  it('returns 500 on database error during user creation', async () => {
    ;(mockPrisma.user.findFirst as jest.Mock).mockResolvedValueOnce(null)
    ;(mockPrisma.user.create as jest.Mock).mockRejectedValueOnce(new Error('DB crash'))

    const req = makeRequest(validCustomerBody)
    const res = await registerPOST(req)

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('Registration failed')
  })

  it('defaults role to CUSTOMER when role is not provided', async () => {
    ;(mockPrisma.user.findFirst as jest.Mock).mockResolvedValueOnce(null)

    let capturedData: any = null
    ;(mockPrisma.user.create as jest.Mock).mockImplementationOnce((args) => {
      capturedData = args.data
      return Promise.resolve({ id: 'u5', ...args.data })
    })

    const req = makeRequest({
      email: 'default@example.com',
      phone: '0412345683',
      password: 'password123',
      acceptedTerms: true,
      // No role field — should default to CUSTOMER per zod schema
    })
    await registerPOST(req)

    expect(capturedData.role).toBe('CUSTOMER')
  })
})
/* eslint-disable @typescript-eslint/no-explicit-any */
