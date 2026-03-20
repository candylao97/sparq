/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for /api/messages (GET, POST) — contact leakage prevention
 *
 * Strategy:
 *  - Mock next-auth's getServerSession to control authentication state
 *  - Mock @/lib/prisma to avoid hitting a real database
 *  - Mock @/lib/content-filter filterContactInfo to control flagged vs clean results
 *  - Construct real NextRequest objects and call the route handlers directly
 */

import { NextRequest } from 'next/server'

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

jest.mock('@/lib/content-filter', () => ({
  filterContactInfo: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    booking: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    contactLeakageFlag: {
      create: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
  },
}))

// ─── Imports (after mocks) ──────────────────────────────────────────────────

import { GET, POST } from '@/app/api/messages/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { filterContactInfo } from '@/lib/content-filter'

// ─── Helpers ────────────────────────────────────────────────────────────────

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockFilterContactInfo = filterContactInfo as jest.MockedFunction<typeof filterContactInfo>

const makeSession = (overrides: Partial<{ id: string; role: string }> = {}) => ({
  user: { id: 'user-customer-1', role: 'CUSTOMER', ...overrides },
  expires: new Date(Date.now() + 3600 * 1000).toISOString(),
})

function makeRequest(url: string, method: string = 'GET', body?: object): NextRequest {
  const init: RequestInit = { method }
  if (body) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }
  return new NextRequest(url, init)
}

const fakeBooking = {
  id: 'booking-1',
  customerId: 'user-customer-1',
  providerId: 'user-provider-1',
  status: 'CONFIRMED',
}

const fakeCreatedMessage = {
  id: 'msg-1',
  bookingId: 'booking-1',
  senderId: 'user-customer-1',
  text: 'Hello, looking forward to the session!',
  createdAt: new Date().toISOString(),
  sender: { id: 'user-customer-1', name: 'Emma' },
}

// ─── Test suite ─────────────────────────────────────────────────────────────

describe('POST /api/messages', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── Authentication & Authorization ──────────────────────────────────────

  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValueOnce(null)

    const req = makeRequest('http://localhost/api/messages', 'POST', {
      bookingId: 'booking-1',
      text: 'Hello',
    })
    const res = await POST(req)

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 403 when user is NOT a booking participant', async () => {
    mockGetServerSession.mockResolvedValueOnce(makeSession({ id: 'user-outsider' }) as any)
    ;(mockPrisma.booking.findUnique as jest.Mock).mockResolvedValueOnce(fakeBooking)

    const req = makeRequest('http://localhost/api/messages', 'POST', {
      bookingId: 'booking-1',
      text: 'Hello',
    })
    const res = await POST(req)

    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('Not authorized')
  })

  it('returns 404 when booking does not exist', async () => {
    mockGetServerSession.mockResolvedValueOnce(makeSession() as any)
    ;(mockPrisma.booking.findUnique as jest.Mock).mockResolvedValueOnce(null)

    const req = makeRequest('http://localhost/api/messages', 'POST', {
      bookingId: 'nonexistent',
      text: 'Hello',
    })
    const res = await POST(req)

    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe('Booking not found')
  })

  // ── Validation ──────────────────────────────────────────────────────────

  it('returns 400 when text is empty/whitespace', async () => {
    mockGetServerSession.mockResolvedValueOnce(makeSession() as any)

    const req = makeRequest('http://localhost/api/messages', 'POST', {
      bookingId: 'booking-1',
      text: '   ',
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Message text is required')
  })

  it('returns 400 when bookingId is missing', async () => {
    mockGetServerSession.mockResolvedValueOnce(makeSession() as any)

    const req = makeRequest('http://localhost/api/messages', 'POST', {
      text: 'Hello',
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('bookingId is required')
  })

  // ── Message Creation (Clean text) ───────────────────────────────────────

  it('creates message with clean text — stored as-is, no ContactLeakageFlag created', async () => {
    const cleanText = 'Looking forward to the session!'
    mockGetServerSession.mockResolvedValueOnce(makeSession() as any)
    ;(mockPrisma.booking.findUnique as jest.Mock).mockResolvedValueOnce(fakeBooking)
    mockFilterContactInfo.mockReturnValueOnce({
      text: cleanText,
      flagged: false,
      flagType: null,
      matches: [],
    })
    ;(mockPrisma.message.create as jest.Mock).mockResolvedValueOnce({
      ...fakeCreatedMessage,
      text: cleanText,
    })
    ;(mockPrisma.notification.create as jest.Mock).mockResolvedValueOnce({})
    ;(mockPrisma.booking.update as jest.Mock).mockResolvedValueOnce({})

    const req = makeRequest('http://localhost/api/messages', 'POST', {
      bookingId: 'booking-1',
      text: cleanText,
    })
    const res = await POST(req)

    expect(res.status).toBe(200)

    // The original text is stored (not sanitized)
    expect(mockPrisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ text: cleanText }),
      }),
    )

    // No ContactLeakageFlag created
    expect(mockPrisma.contactLeakageFlag.create).not.toHaveBeenCalled()
  })

  it('creates notification for the other party', async () => {
    mockGetServerSession.mockResolvedValueOnce(makeSession() as any)
    ;(mockPrisma.booking.findUnique as jest.Mock).mockResolvedValueOnce(fakeBooking)
    mockFilterContactInfo.mockReturnValueOnce({
      text: 'Hello',
      flagged: false,
      flagType: null,
      matches: [],
    })
    ;(mockPrisma.message.create as jest.Mock).mockResolvedValueOnce(fakeCreatedMessage)
    ;(mockPrisma.notification.create as jest.Mock).mockResolvedValueOnce({})
    ;(mockPrisma.booking.update as jest.Mock).mockResolvedValueOnce({})

    const req = makeRequest('http://localhost/api/messages', 'POST', {
      bookingId: 'booking-1',
      text: 'Hello',
    })
    await POST(req)

    // Customer sent the message, so provider should be notified
    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-provider-1',
          type: 'NEW_MESSAGE',
        }),
      }),
    )
  })

  it('returns the created message', async () => {
    mockGetServerSession.mockResolvedValueOnce(makeSession() as any)
    ;(mockPrisma.booking.findUnique as jest.Mock).mockResolvedValueOnce(fakeBooking)
    mockFilterContactInfo.mockReturnValueOnce({
      text: 'Hi there',
      flagged: false,
      flagType: null,
      matches: [],
    })
    ;(mockPrisma.message.create as jest.Mock).mockResolvedValueOnce(fakeCreatedMessage)
    ;(mockPrisma.notification.create as jest.Mock).mockResolvedValueOnce({})
    ;(mockPrisma.booking.update as jest.Mock).mockResolvedValueOnce({})

    const req = makeRequest('http://localhost/api/messages', 'POST', {
      bookingId: 'booking-1',
      text: 'Hi there',
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.message).toBeDefined()
    expect(json.message.id).toBe('msg-1')
    expect(json.message.sender).toBeDefined()
  })

  // ── Message Creation (Flagged text — leakage prevention) ────────────────

  it('stores SANITIZED text when phone number is detected', async () => {
    const rawText = 'call me at 0412345678'
    const sanitized = 'call me at [contact info hidden]'

    mockGetServerSession.mockResolvedValueOnce(makeSession() as any)
    ;(mockPrisma.booking.findUnique as jest.Mock).mockResolvedValueOnce(fakeBooking)
    mockFilterContactInfo.mockReturnValueOnce({
      text: sanitized,
      flagged: true,
      flagType: 'PHONE',
      matches: ['0412345678'],
    })
    ;(mockPrisma.message.create as jest.Mock).mockResolvedValueOnce({
      ...fakeCreatedMessage,
      id: 'msg-phone',
      text: sanitized,
    })
    ;(mockPrisma.contactLeakageFlag.create as jest.Mock).mockResolvedValueOnce({})
    ;(mockPrisma.notification.create as jest.Mock).mockResolvedValueOnce({})
    ;(mockPrisma.booking.update as jest.Mock).mockResolvedValueOnce({})

    const req = makeRequest('http://localhost/api/messages', 'POST', {
      bookingId: 'booking-1',
      text: rawText,
    })
    const res = await POST(req)

    expect(res.status).toBe(200)

    // Sanitized text is stored, NOT the raw text
    expect(mockPrisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ text: sanitized }),
      }),
    )
  })

  it('creates ContactLeakageFlag with correct fields when phone detected', async () => {
    const rawText = 'call me at 0412345678'
    const sanitized = 'call me at [contact info hidden]'

    mockGetServerSession.mockResolvedValueOnce(makeSession() as any)
    ;(mockPrisma.booking.findUnique as jest.Mock).mockResolvedValueOnce(fakeBooking)
    mockFilterContactInfo.mockReturnValueOnce({
      text: sanitized,
      flagged: true,
      flagType: 'PHONE',
      matches: ['0412345678'],
    })
    ;(mockPrisma.message.create as jest.Mock).mockResolvedValueOnce({
      ...fakeCreatedMessage,
      id: 'msg-phone-2',
      text: sanitized,
    })
    ;(mockPrisma.contactLeakageFlag.create as jest.Mock).mockResolvedValueOnce({})
    ;(mockPrisma.notification.create as jest.Mock).mockResolvedValueOnce({})
    ;(mockPrisma.booking.update as jest.Mock).mockResolvedValueOnce({})

    const req = makeRequest('http://localhost/api/messages', 'POST', {
      bookingId: 'booking-1',
      text: rawText,
    })
    await POST(req)

    expect(mockPrisma.contactLeakageFlag.create).toHaveBeenCalledWith({
      data: {
        messageId: 'msg-phone-2',
        userId: 'user-customer-1',
        bookingId: 'booking-1',
        flagType: 'PHONE',
        snippet: '0412345678',
      },
    })
  })

  it('sanitizes and flags when text contains email', async () => {
    const rawText = 'email me at jane@gmail.com'
    const sanitized = 'email me at [contact info hidden]'

    mockGetServerSession.mockResolvedValueOnce(makeSession() as any)
    ;(mockPrisma.booking.findUnique as jest.Mock).mockResolvedValueOnce(fakeBooking)
    mockFilterContactInfo.mockReturnValueOnce({
      text: sanitized,
      flagged: true,
      flagType: 'EMAIL',
      matches: ['jane@gmail.com'],
    })
    ;(mockPrisma.message.create as jest.Mock).mockResolvedValueOnce({
      ...fakeCreatedMessage,
      id: 'msg-email',
      text: sanitized,
    })
    ;(mockPrisma.contactLeakageFlag.create as jest.Mock).mockResolvedValueOnce({})
    ;(mockPrisma.notification.create as jest.Mock).mockResolvedValueOnce({})
    ;(mockPrisma.booking.update as jest.Mock).mockResolvedValueOnce({})

    const req = makeRequest('http://localhost/api/messages', 'POST', {
      bookingId: 'booking-1',
      text: rawText,
    })
    await POST(req)

    // Sanitized text stored
    expect(mockPrisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ text: sanitized }),
      }),
    )

    // Flag created with EMAIL type
    expect(mockPrisma.contactLeakageFlag.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        flagType: 'EMAIL',
        snippet: 'jane@gmail.com',
        messageId: 'msg-email',
      }),
    })
  })

  it('sanitizes and flags when text contains payment keyword', async () => {
    const rawText = 'pay me via paypal'
    const sanitized = 'pay me via [contact info hidden]'

    mockGetServerSession.mockResolvedValueOnce(makeSession() as any)
    ;(mockPrisma.booking.findUnique as jest.Mock).mockResolvedValueOnce(fakeBooking)
    mockFilterContactInfo.mockReturnValueOnce({
      text: sanitized,
      flagged: true,
      flagType: 'PAYMENT',
      matches: ['paypal'],
    })
    ;(mockPrisma.message.create as jest.Mock).mockResolvedValueOnce({
      ...fakeCreatedMessage,
      id: 'msg-payment',
      text: sanitized,
    })
    ;(mockPrisma.contactLeakageFlag.create as jest.Mock).mockResolvedValueOnce({})
    ;(mockPrisma.notification.create as jest.Mock).mockResolvedValueOnce({})
    ;(mockPrisma.booking.update as jest.Mock).mockResolvedValueOnce({})

    const req = makeRequest('http://localhost/api/messages', 'POST', {
      bookingId: 'booking-1',
      text: rawText,
    })
    await POST(req)

    // Sanitized text stored
    expect(mockPrisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ text: sanitized }),
      }),
    )

    // Flag created with PAYMENT type
    expect(mockPrisma.contactLeakageFlag.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        flagType: 'PAYMENT',
        snippet: 'paypal',
        messageId: 'msg-payment',
      }),
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/messages', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValueOnce(null)

    const req = makeRequest('http://localhost/api/messages?bookingId=booking-1')
    const res = await GET(req)

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 403 when user is NOT a booking participant', async () => {
    mockGetServerSession.mockResolvedValueOnce(makeSession({ id: 'user-outsider' }) as any)
    ;(mockPrisma.booking.findUnique as jest.Mock).mockResolvedValueOnce(fakeBooking)

    const req = makeRequest('http://localhost/api/messages?bookingId=booking-1')
    const res = await GET(req)

    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('Not authorized')
  })

  it('returns messages for a valid booking participant', async () => {
    mockGetServerSession.mockResolvedValueOnce(makeSession() as any)
    ;(mockPrisma.booking.findUnique as jest.Mock).mockResolvedValueOnce(fakeBooking)

    const fakeMessages = [
      { id: 'msg-1', text: 'Hello', sender: { id: 'user-customer-1', name: 'Emma' } },
      { id: 'msg-2', text: 'Hi there', sender: { id: 'user-provider-1', name: 'Sophie' } },
    ]
    ;(mockPrisma.message.findMany as jest.Mock).mockResolvedValueOnce(fakeMessages)

    const req = makeRequest('http://localhost/api/messages?bookingId=booking-1')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.messages).toHaveLength(2)
    expect(json.messages[0].id).toBe('msg-1')
    expect(json.messages[1].id).toBe('msg-2')

    // Verify ordering
    expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { bookingId: 'booking-1' },
        orderBy: { createdAt: 'asc' },
      }),
    )
  })
})
/* eslint-disable @typescript-eslint/no-explicit-any */
