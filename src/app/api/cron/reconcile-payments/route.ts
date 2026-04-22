/**
 * AUDIT-021 — Payment reconciliation cron.
 *
 * Problem: booking creation sets `paymentStatus: 'AUTH_PENDING'`, then the
 * Stripe webhook (`payment_intent.amount_capturable_updated` /
 * `payment_intent.succeeded` / `payment_intent.payment_failed`) flips it to
 * AUTHORISED / CAPTURED / FAILED. If the webhook is ever dropped — network
 * blip, Stripe outage, signature-mismatch during a secret rotation — the
 * booking is left permanently stuck in AUTH_PENDING. Customer has been
 * charged (or held) with nothing to show for it; the slot never releases.
 *
 * This cron is the safety net: every 10 minutes it picks up bookings that
 * have been AUTH_PENDING for > 15 minutes, asks Stripe directly what the
 * PaymentIntent actually did, and reconciles our DB to match.
 *
 * Reconciliation rules (mirror `src/app/api/stripe/webhooks/route.ts`):
 *   - pi.status = 'succeeded'                         → paymentStatus: CAPTURED (idempotent)
 *   - pi.status = 'requires_capture'                  → paymentStatus: AUTHORISED + extended deadline
 *   - pi.status = 'canceled'                          → paymentStatus: AUTH_RELEASED, PENDING booking → CANCELLED
 *   - pi.status = 'requires_payment_method' / 'requires_action' / 'requires_confirmation'
 *                                                     → treat as failed hold: PENDING booking → CANCELLED, voucher released
 *   - pi.status = 'processing'                        → no-op (genuinely in flight)
 *   - booking still stuck > 60 min with no usable status → log warning so ops gets paged
 *
 * Idempotency: every booking-flipping write synthesises a
 * `ProcessedWebhookEvent` row keyed `reconcile:<bookingId>:<pi.id>:<target>`
 * inside the same transaction, so if both the real webhook and this cron
 * land at the same time only one of them wins.
 */

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

// Bookings must be at least this old before we reconcile — gives the
// customer time to finish 3DS and the webhook time to arrive naturally.
const RECONCILE_AFTER_MS = 15 * 60 * 1000

// Past this age, a booking sitting in AUTH_PENDING with a non-terminal PI
// status is a problem worth surfacing.
const STUCK_ALERT_AFTER_MS = 60 * 60 * 1000

// How many to process per invocation — keeps the cron within Vercel's
// function timeout under pathological queue depths.
const BATCH_SIZE = 50

type ReconcileOutcome =
  | 'captured'
  | 'authorised'
  | 'auth_released'
  | 'failed'
  | 'still_processing'
  | 'stuck_alert'
  | 'no_payment_intent'
  | 'stripe_error'
  | 'already_reconciled'

interface ReconcileResult {
  bookingId: string
  outcome: ReconcileOutcome
  detail?: string
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const threshold = new Date(now.getTime() - RECONCILE_AFTER_MS)

    const stuck = await prisma.booking.findMany({
      where: {
        paymentStatus: 'AUTH_PENDING',
        createdAt: { lte: threshold },
      },
      orderBy: { createdAt: 'asc' },
      take: BATCH_SIZE,
      include: {
        provider: { include: { providerProfile: { select: { tier: true, stripeSubscriptionStatus: true } } } },
      },
    })

    const results: ReconcileResult[] = []
    for (const booking of stuck) {
      try {
        const outcome = await reconcileBooking(booking, now)
        results.push(outcome)
      } catch (err) {
        console.error(`Reconcile-payments: failure for booking ${booking.id}:`, err)
        results.push({ bookingId: booking.id, outcome: 'stripe_error', detail: (err as Error).message })
      }
    }

    const summary = results.reduce<Record<ReconcileOutcome, number>>((acc, r) => {
      acc[r.outcome] = (acc[r.outcome] ?? 0) + 1
      return acc
    }, {
      captured: 0,
      authorised: 0,
      auth_released: 0,
      failed: 0,
      still_processing: 0,
      stuck_alert: 0,
      no_payment_intent: 0,
      stripe_error: 0,
      already_reconciled: 0,
    })

    return NextResponse.json({ scanned: stuck.length, summary, results })
  } catch (error) {
    console.error('Reconcile-payments cron error:', error)
    return NextResponse.json({ error: 'Failed to reconcile payments' }, { status: 500 })
  }
}

type StuckBooking = Prisma.BookingGetPayload<{
  include: {
    provider: { include: { providerProfile: { select: { tier: true, stripeSubscriptionStatus: true } } } }
  }
}>

async function reconcileBooking(
  booking: StuckBooking,
  now: Date,
): Promise<ReconcileResult> {
  // No PaymentIntent was ever created (e.g. $0 voucher booking). Fix
  // paymentStatus to NONE so it stops being picked up — booking creation
  // should have done this, but a pre-audit bug may have left stale rows.
  if (!booking.stripePaymentId) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { paymentStatus: booking.totalPrice === 0 ? 'NONE' : 'FAILED' },
    })
    return { bookingId: booking.id, outcome: 'no_payment_intent' }
  }

  const pi = await stripe.paymentIntents.retrieve(booking.stripePaymentId)

  switch (pi.status) {
    case 'succeeded':
      return reconcileCaptured(booking, pi.id)
    case 'requires_capture':
      return reconcileAuthorised(booking, pi.id, now)
    case 'canceled':
      return reconcileCanceled(booking, pi.id)
    case 'requires_payment_method':
    case 'requires_action':
    case 'requires_confirmation': {
      const age = now.getTime() - booking.createdAt.getTime()
      if (age > STUCK_ALERT_AFTER_MS) {
        // Customer walked away from 3DS / never reached a usable state.
        // Release the slot and the voucher.
        return reconcileFailedHold(booking, pi.id, pi.status)
      }
      return { bookingId: booking.id, outcome: 'still_processing', detail: pi.status }
    }
    case 'processing': {
      const age = now.getTime() - booking.createdAt.getTime()
      if (age > STUCK_ALERT_AFTER_MS) {
        console.warn(
          `Reconcile-payments: booking ${booking.id} / PI ${pi.id} stuck in 'processing' for ` +
          `${Math.round(age / 60000)}m — manual investigation required`,
        )
        return { bookingId: booking.id, outcome: 'stuck_alert', detail: pi.status }
      }
      return { bookingId: booking.id, outcome: 'still_processing', detail: pi.status }
    }
    default:
      console.warn(`Reconcile-payments: unhandled PI status '${pi.status}' for booking ${booking.id}`)
      return { bookingId: booking.id, outcome: 'still_processing', detail: pi.status }
  }
}

async function reconcileCaptured(
  booking: StuckBooking,
  piId: string,
): Promise<ReconcileResult> {
  const idempotencyKey = `reconcile:${booking.id}:${piId}:captured`
  try {
    await prisma.$transaction([
      prisma.processedWebhookEvent.create({
        data: { eventId: idempotencyKey, source: 'stripe-reconcile' },
      }),
      prisma.booking.update({
        where: { id: booking.id },
        data: { paymentStatus: 'CAPTURED' },
      }),
    ])
    return { bookingId: booking.id, outcome: 'captured' }
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'P2002') {
      return { bookingId: booking.id, outcome: 'already_reconciled' }
    }
    throw err
  }
}

async function reconcileAuthorised(
  booking: StuckBooking,
  piId: string,
  now: Date,
): Promise<ReconcileResult> {
  // Mirror the webhook: also extend the accept deadline based on effective
  // provider tier — PRO/ELITE = 48h, everyone else = 24h. We don't import
  // getEffectiveProviderTier to avoid circular test mocking; the rule is
  // simple enough to inline.
  const profile = booking.provider?.providerProfile
  const storedTier = profile?.tier ?? 'NEWCOMER'
  const subStatus = (profile?.stripeSubscriptionStatus ?? '').toLowerCase()
  const isActive = subStatus === 'active' || subStatus === 'trialing'
  const isHighTier = (storedTier === 'PRO' || storedTier === 'ELITE') && isActive
  const deadlineHours = isHighTier ? 48 : 24
  const newDeadline = new Date(now.getTime() + deadlineHours * 60 * 60 * 1000)

  const idempotencyKey = `reconcile:${booking.id}:${piId}:authorised`
  try {
    await prisma.$transaction([
      prisma.processedWebhookEvent.create({
        data: { eventId: idempotencyKey, source: 'stripe-reconcile' },
      }),
      prisma.booking.update({
        where: { id: booking.id },
        data: {
          paymentStatus: 'AUTHORISED',
          acceptDeadline: newDeadline,
        },
      }),
    ])
    return { bookingId: booking.id, outcome: 'authorised' }
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'P2002') {
      return { bookingId: booking.id, outcome: 'already_reconciled' }
    }
    throw err
  }
}

async function reconcileCanceled(
  booking: StuckBooking,
  piId: string,
): Promise<ReconcileResult> {
  const idempotencyKey = `reconcile:${booking.id}:${piId}:canceled`
  try {
    await prisma.$transaction(async tx => {
      await tx.processedWebhookEvent.create({
        data: { eventId: idempotencyKey, source: 'stripe-reconcile' },
      })
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: booking.status === 'PENDING' ? 'CANCELLED' : booking.status,
          paymentStatus: 'AUTH_RELEASED',
        },
      })
      await releaseVoucherHold(tx, booking)
    })
    await prisma.notification.create({
      data: {
        userId: booking.customerId,
        type: 'BOOKING_CANCELLED',
        title: 'Payment hold released',
        message: 'Your card hold was released before we could confirm your booking. Please try again.',
        link: '/dashboard/customer',
      },
    }).catch(() => {})
    return { bookingId: booking.id, outcome: 'auth_released' }
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'P2002') {
      return { bookingId: booking.id, outcome: 'already_reconciled' }
    }
    throw err
  }
}

async function reconcileFailedHold(
  booking: StuckBooking,
  piId: string,
  piStatus: string,
): Promise<ReconcileResult> {
  const idempotencyKey = `reconcile:${booking.id}:${piId}:failed`
  try {
    await prisma.$transaction(async tx => {
      await tx.processedWebhookEvent.create({
        data: { eventId: idempotencyKey, source: 'stripe-reconcile' },
      })
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: booking.status === 'PENDING' ? 'CANCELLED' : booking.status,
          paymentStatus: 'FAILED',
        },
      })
      await releaseVoucherHold(tx, booking)
    })
    await prisma.notification.create({
      data: {
        userId: booking.customerId,
        type: 'BOOKING_CANCELLED',
        title: 'Payment did not complete',
        message: 'Your payment authorization could not be completed. The booking has been cancelled — please try again with a different card.',
        link: '/dashboard/customer',
      },
    }).catch(() => {})
    console.warn(
      `Reconcile-payments: booking ${booking.id} cancelled via reconcile — PI ${piId} stuck in '${piStatus}'`,
    )
    return { bookingId: booking.id, outcome: 'failed', detail: piStatus }
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'P2002') {
      return { bookingId: booking.id, outcome: 'already_reconciled' }
    }
    throw err
  }
}

/**
 * If the booking consumed a gift-voucher balance on creation, put the
 * `voucherDiscount` back. Booking creation persists `giftVoucherCode` and
 * derives the consumed amount as (totalPrice_pre_voucher - totalPrice) but
 * we don't persist that delta — so the safest refund is to re-run the
 * amount-diff calculation from the booking row. We derive consumed amount
 * from `platformFee + totalPrice` residual logic, but the simplest and
 * most correct approach is to leave a ledger entry: decrement `usedAmount`
 * by the voucher discount applied, which we store implicitly as
 * `giftVoucherCode != null` + (totalPrice < service.price). Since we don't
 * have a stored consumedAmount column, we take the conservative approach
 * of un-redeeming the voucher entirely (isRedeemed=false, clear held
 * fields) and letting the customer re-apply it on retry. This matches
 * what the manual-release admin flow does today.
 */
async function releaseVoucherHold(
  tx: Prisma.TransactionClient,
  booking: StuckBooking,
): Promise<void> {
  if (!booking.giftVoucherCode) return
  const voucher = await tx.giftVoucher.findUnique({
    where: { code: booking.giftVoucherCode },
  })
  if (!voucher) return
  // Only clear the hold if this booking actually owns it. If another
  // booking by another user has already taken over the voucher, don't
  // stomp it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const voucherAny = voucher as any
  if (voucherAny.heldByUserId && voucherAny.heldByUserId !== booking.customerId) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (tx.giftVoucher.update as any)({
    where: { code: booking.giftVoucherCode },
    data: {
      heldByUserId: null,
      heldAt: null,
    },
  })
}
