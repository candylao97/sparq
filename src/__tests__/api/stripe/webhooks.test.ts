/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for POST /api/stripe/webhooks
 *
 * Strategy:
 *  - Mock @/lib/stripe with webhooks.constructEvent returning controlled event objects
 *  - Mock @/lib/prisma to avoid hitting a real database
 *  - Construct NextRequest objects with proper headers and raw text body
 */

import { NextRequest } from 'next/server'

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: jest.fn(),
    },
  },
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    booking: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    verification: {
      update: jest.fn(),
    },
    providerProfile: {
      update: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}))

// ─── Imports (after mocks are registered) ───────────────────────────────────

import { POST } from '@/app/api/stripe/webhooks/route'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

// ─── Typed mock references ──────────────────────────────────────────────────

const mockConstructEvent = stripe.webhooks.constructEvent as jest.Mock
const mockPrisma = prisma as jest.Mocked<typeof prisma>

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Build a Stripe-like event object */
function makeStripeEvent(type: string, dataObject: Record<string, any>): any {
  return {
    id: `evt_test_${Date.now()}`,
    type,
    data: { object: dataObject },
  }
}

/** Build a NextRequest with raw text body and optional stripe-signature header */
function makeWebhookRequest(body: string = '{}', signature?: string): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (signature) {
    headers['stripe-signature'] = signature
  }
  return new NextRequest('http://localhost/api/stripe/webhooks', {
    method: 'POST',
    body,
    headers,
  })
}

const fakeBookingPending = {
  id: 'booking-1',
  customerId: 'customer-1',
  providerId: 'provider-1',
  status: 'PENDING',
  stripePaymentId: 'pi_test_123',
}

const fakeBookingConfirmed = {
  id: 'booking-2',
  customerId: 'customer-2',
  providerId: 'provider-2',
  status: 'CONFIRMED',
  stripePaymentId: 'pi_test_456',
}

// ─── Test suite ─────────────────────────────────────────────────────────────

describe('POST /api/stripe/webhooks', () => {
  beforeEach(() => jest.clearAllMocks())

  // ─── Signature Verification ─────────────────────────────────────────────

  describe('Signature verification', () => {
    it('returns 400 when stripe-signature header is missing', async () => {
      const req = makeWebhookRequest('{}') // no signature
      const res = await POST(req)

      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBe('Missing stripe-signature header')
      expect(mockConstructEvent).not.toHaveBeenCalled()
    })

    it('returns 400 when signature verification fails', async () => {
      mockConstructEvent.mockImplementationOnce(() => {
        throw new Error('Invalid signature')
      })

      const req = makeWebhookRequest('{}', 'sig_invalid')
      const res = await POST(req)

      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBe('Webhook signature verification failed')
    })

    it('returns 200 with valid signature', async () => {
      mockConstructEvent.mockReturnValueOnce(
        makeStripeEvent('unknown.event', {})
      )

      const req = makeWebhookRequest('{}', 'sig_valid')
      const res = await POST(req)

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.received).toBe(true)
    })
  })

  // ─── payment_intent.amount_capturable_updated ───────────────────────────

  describe('payment_intent.amount_capturable_updated', () => {
    it('updates booking paymentStatus to AUTHORISED when booking exists', async () => {
      const event = makeStripeEvent('payment_intent.amount_capturable_updated', {
        id: 'pi_test_123',
        metadata: { bookingId: 'booking-1' },
      })
      mockConstructEvent.mockReturnValueOnce(event)
      ;(mockPrisma.booking.findUnique as jest.Mock).mockResolvedValueOnce(fakeBookingPending)
      ;(mockPrisma.booking.update as jest.Mock).mockResolvedValueOnce({})

      const req = makeWebhookRequest('{}', 'sig_valid')
      const res = await POST(req)

      expect(res.status).toBe(200)
      expect(mockPrisma.booking.findUnique).toHaveBeenCalledWith({
        where: { id: 'booking-1' },
      })
      expect(mockPrisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking-1' },
        data: { paymentStatus: 'AUTHORISED' },
      })
    })

    it('handles missing booking gracefully (no error)', async () => {
      const event = makeStripeEvent('payment_intent.amount_capturable_updated', {
        id: 'pi_test_missing',
        metadata: { bookingId: 'nonexistent' },
      })
      mockConstructEvent.mockReturnValueOnce(event)
      ;(mockPrisma.booking.findUnique as jest.Mock).mockResolvedValueOnce(null)

      const req = makeWebhookRequest('{}', 'sig_valid')
      const res = await POST(req)

      expect(res.status).toBe(200)
      expect(mockPrisma.booking.update).not.toHaveBeenCalled()
    })
  })

  // ─── payment_intent.succeeded ───────────────────────────────────────────

  describe('payment_intent.succeeded', () => {
    it('updates booking paymentStatus to CAPTURED', async () => {
      const event = makeStripeEvent('payment_intent.succeeded', {
        id: 'pi_test_123',
        metadata: { bookingId: 'booking-1' },
      })
      mockConstructEvent.mockReturnValueOnce(event)
      ;(mockPrisma.booking.findUnique as jest.Mock).mockResolvedValueOnce(fakeBookingPending)
      ;(mockPrisma.booking.update as jest.Mock).mockResolvedValueOnce({})

      const req = makeWebhookRequest('{}', 'sig_valid')
      const res = await POST(req)

      expect(res.status).toBe(200)
      expect(mockPrisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking-1' },
        data: { paymentStatus: 'CAPTURED' },
      })
    })
  })

  // ─── payment_intent.payment_failed ──────────────────────────────────────

  describe('payment_intent.payment_failed', () => {
    it('sets booking status to CANCELLED when PENDING', async () => {
      const event = makeStripeEvent('payment_intent.payment_failed', {
        id: 'pi_test_123',
        metadata: { bookingId: 'booking-1' },
      })
      mockConstructEvent.mockReturnValueOnce(event)
      ;(mockPrisma.booking.findUnique as jest.Mock).mockResolvedValueOnce(fakeBookingPending)
      ;(mockPrisma.booking.update as jest.Mock).mockResolvedValueOnce({})
      ;(mockPrisma.notification.create as jest.Mock).mockResolvedValueOnce({})

      const req = makeWebhookRequest('{}', 'sig_valid')
      const res = await POST(req)

      expect(res.status).toBe(200)
      expect(mockPrisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking-1' },
        data: { status: 'CANCELLED' },
      })
    })

    it('creates notification for customer on payment failure', async () => {
      const event = makeStripeEvent('payment_intent.payment_failed', {
        id: 'pi_test_123',
        metadata: { bookingId: 'booking-1' },
      })
      mockConstructEvent.mockReturnValueOnce(event)
      ;(mockPrisma.booking.findUnique as jest.Mock).mockResolvedValueOnce(fakeBookingPending)
      ;(mockPrisma.booking.update as jest.Mock).mockResolvedValueOnce({})
      ;(mockPrisma.notification.create as jest.Mock).mockResolvedValueOnce({})

      const req = makeWebhookRequest('{}', 'sig_valid')
      await POST(req)

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'customer-1',
          type: 'BOOKING_CANCELLED',
          title: 'Payment failed',
          link: '/dashboard/customer',
        }),
      })
    })

    it('does NOT cancel non-PENDING bookings', async () => {
      const event = makeStripeEvent('payment_intent.payment_failed', {
        id: 'pi_test_456',
        metadata: { bookingId: 'booking-2' },
      })
      mockConstructEvent.mockReturnValueOnce(event)
      ;(mockPrisma.booking.findUnique as jest.Mock).mockResolvedValueOnce(fakeBookingConfirmed)

      const req = makeWebhookRequest('{}', 'sig_valid')
      const res = await POST(req)

      expect(res.status).toBe(200)
      expect(mockPrisma.booking.update).not.toHaveBeenCalled()
      expect(mockPrisma.notification.create).not.toHaveBeenCalled()
    })
  })

  // ─── payment_intent.canceled ────────────────────────────────────────────

  describe('payment_intent.canceled', () => {
    it('sets paymentStatus to AUTH_RELEASED and cancels PENDING bookings', async () => {
      const event = makeStripeEvent('payment_intent.canceled', {
        id: 'pi_test_123',
        metadata: { bookingId: 'booking-1' },
      })
      mockConstructEvent.mockReturnValueOnce(event)
      ;(mockPrisma.booking.findUnique as jest.Mock).mockResolvedValueOnce(fakeBookingPending)
      ;(mockPrisma.booking.update as jest.Mock).mockResolvedValueOnce({})
      ;(mockPrisma.notification.create as jest.Mock).mockResolvedValueOnce({})

      const req = makeWebhookRequest('{}', 'sig_valid')
      const res = await POST(req)

      expect(res.status).toBe(200)
      expect(mockPrisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking-1' },
        data: {
          status: 'CANCELLED',
          paymentStatus: 'AUTH_RELEASED',
        },
      })
    })

    it('creates notification for customer when PENDING booking is canceled', async () => {
      const event = makeStripeEvent('payment_intent.canceled', {
        id: 'pi_test_123',
        metadata: { bookingId: 'booking-1' },
      })
      mockConstructEvent.mockReturnValueOnce(event)
      ;(mockPrisma.booking.findUnique as jest.Mock).mockResolvedValueOnce(fakeBookingPending)
      ;(mockPrisma.booking.update as jest.Mock).mockResolvedValueOnce({})
      ;(mockPrisma.notification.create as jest.Mock).mockResolvedValueOnce({})

      const req = makeWebhookRequest('{}', 'sig_valid')
      await POST(req)

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'customer-1',
          type: 'BOOKING_CANCELLED',
          title: 'Booking expired',
          link: '/dashboard/customer',
        }),
      })
    })

    it('does NOT change status of CONFIRMED bookings but still sets AUTH_RELEASED', async () => {
      const event = makeStripeEvent('payment_intent.canceled', {
        id: 'pi_test_456',
        metadata: { bookingId: 'booking-2' },
      })
      mockConstructEvent.mockReturnValueOnce(event)
      ;(mockPrisma.booking.findUnique as jest.Mock).mockResolvedValueOnce(fakeBookingConfirmed)
      ;(mockPrisma.booking.update as jest.Mock).mockResolvedValueOnce({})

      const req = makeWebhookRequest('{}', 'sig_valid')
      const res = await POST(req)

      expect(res.status).toBe(200)
      expect(mockPrisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking-2' },
        data: {
          status: 'CONFIRMED',
          paymentStatus: 'AUTH_RELEASED',
        },
      })
      expect(mockPrisma.notification.create).not.toHaveBeenCalled()
    })
  })

  // ─── charge.refunded ───────────────────────────────────────────────────

  describe('charge.refunded', () => {
    it('updates paymentStatus to REFUNDED and refundStatus to PROCESSED', async () => {
      const event = makeStripeEvent('charge.refunded', {
        id: 'ch_test_123',
        payment_intent: 'pi_test_123',
      })
      mockConstructEvent.mockReturnValueOnce(event)
      ;(mockPrisma.booking.findFirst as jest.Mock).mockResolvedValueOnce(fakeBookingPending)
      ;(mockPrisma.booking.update as jest.Mock).mockResolvedValueOnce({})
      ;(mockPrisma.notification.create as jest.Mock).mockResolvedValueOnce({})

      const req = makeWebhookRequest('{}', 'sig_valid')
      const res = await POST(req)

      expect(res.status).toBe(200)
      expect(mockPrisma.booking.findFirst).toHaveBeenCalledWith({
        where: { stripePaymentId: 'pi_test_123' },
      })
      expect(mockPrisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking-1' },
        data: expect.objectContaining({
          paymentStatus: 'REFUNDED',
          refundStatus: 'PROCESSED',
        }),
      })
    })

    it('creates notification for customer on refund', async () => {
      const event = makeStripeEvent('charge.refunded', {
        id: 'ch_test_123',
        payment_intent: 'pi_test_123',
      })
      mockConstructEvent.mockReturnValueOnce(event)
      ;(mockPrisma.booking.findFirst as jest.Mock).mockResolvedValueOnce(fakeBookingPending)
      ;(mockPrisma.booking.update as jest.Mock).mockResolvedValueOnce({})
      ;(mockPrisma.notification.create as jest.Mock).mockResolvedValueOnce({})

      const req = makeWebhookRequest('{}', 'sig_valid')
      await POST(req)

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'customer-1',
          type: 'BOOKING_CANCELLED',
          title: 'Refund processed',
          link: '/dashboard/customer',
        }),
      })
    })
  })

  // ─── identity.verification_session.verified ────────────────────────────

  describe('identity.verification_session.verified', () => {
    it('updates verification status to APPROVED and sets isVerified to true', async () => {
      const event = makeStripeEvent('identity.verification_session.verified', {
        id: 'vs_test_123',
        metadata: { provider_id: 'provider-1' },
      })
      mockConstructEvent.mockReturnValueOnce(event)
      ;(mockPrisma.verification.update as jest.Mock).mockResolvedValueOnce({})
      ;(mockPrisma.providerProfile.update as jest.Mock).mockResolvedValueOnce({})

      const req = makeWebhookRequest('{}', 'sig_valid')
      const res = await POST(req)

      expect(res.status).toBe(200)
      expect(mockPrisma.verification.update).toHaveBeenCalledWith({
        where: { providerId: 'provider-1' },
        data: expect.objectContaining({
          status: 'APPROVED',
        }),
      })
      expect(mockPrisma.providerProfile.update).toHaveBeenCalledWith({
        where: { id: 'provider-1' },
        data: { isVerified: true },
      })
    })
  })

  // ─── identity.verification_session.requires_input ──────────────────────

  describe('identity.verification_session.requires_input', () => {
    it('updates verification status to REJECTED', async () => {
      const event = makeStripeEvent('identity.verification_session.requires_input', {
        id: 'vs_test_456',
        metadata: { provider_id: 'provider-2' },
      })
      mockConstructEvent.mockReturnValueOnce(event)
      ;(mockPrisma.verification.update as jest.Mock).mockResolvedValueOnce({})

      const req = makeWebhookRequest('{}', 'sig_valid')
      const res = await POST(req)

      expect(res.status).toBe(200)
      expect(mockPrisma.verification.update).toHaveBeenCalledWith({
        where: { providerId: 'provider-2' },
        data: expect.objectContaining({
          status: 'REJECTED',
        }),
      })
      expect(mockPrisma.providerProfile.update).not.toHaveBeenCalled()
    })
  })

  // ─── Unhandled event types ─────────────────────────────────────────────

  describe('Unhandled event types', () => {
    it('returns 200 (ack) without DB changes', async () => {
      const event = makeStripeEvent('some.unknown.event', { id: 'obj_123' })
      mockConstructEvent.mockReturnValueOnce(event)

      const req = makeWebhookRequest('{}', 'sig_valid')
      const res = await POST(req)

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.received).toBe(true)

      expect(mockPrisma.booking.findUnique).not.toHaveBeenCalled()
      expect(mockPrisma.booking.findFirst).not.toHaveBeenCalled()
      expect(mockPrisma.booking.update).not.toHaveBeenCalled()
      expect(mockPrisma.notification.create).not.toHaveBeenCalled()
      expect(mockPrisma.verification.update).not.toHaveBeenCalled()
      expect(mockPrisma.providerProfile.update).not.toHaveBeenCalled()
    })
  })
})
/* eslint-disable @typescript-eslint/no-explicit-any */
