import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { sendBookingConfirmationEmail, sendBookingDeclinedEmail, sendBookingCancelledEmail } from '@/lib/email'
import { sendBookingConfirmedSms } from '@/lib/sms'
import { hoursUntilBooking, bookingDateFieldToUtc, utcToSydneyDateStr } from '@/lib/booking-time'
import { getSentinelDateString, getSentinelDate } from '@/lib/availability-sentinel'
import { rateLimit } from '@/lib/rate-limit'

function getSydneyOffsetMs(): number {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value ?? '0')
  const sydneyLocal = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return sydneyLocal - now.getTime()
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // AUDIT-017: Velocity check on booking status transitions. Higher ceiling
  // than booking-create because a busy provider may legitimately accept or
  // decline many PENDING requests in a short window after a notification
  // batch — but still catches scripted abuse (rapid CONFIRM/CANCEL cycles
  // to grief refunds / Stripe auth holds).
  const statusChangeAllowed = await rateLimit(
    `booking-patch:${session.user.id}`,
    60,
    3600,
  )
  if (!statusChangeAllowed) {
    return NextResponse.json(
      { error: 'Too many booking updates. Please wait a moment before trying again.' },
      { status: 429 },
    )
  }

  try {
    const body = await req.json()
    const { status } = body

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        service: { include: { provider: true } },
        provider: { include: { providerProfile: true } },
        customer: { select: { id: true, name: true, email: true } },
      },
    })
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    // Authorization check — must run before any other logic to prevent IDOR leakage
    const isProvider = session.user.id === booking.providerId
    const isCustomer = session.user.id === booking.customerId
    const isAdmin = session.user.role === 'ADMIN'
    if (!isProvider && !isCustomer && !isAdmin) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // BL-3: Block CONFIRMED if the provider has no active Stripe Connect account
    if (status === 'CONFIRMED') {
      const pp = booking.provider.providerProfile
      if (!pp?.stripeAccountId) {
        return NextResponse.json(
          { error: 'This artist has not set up their payment account yet and cannot accept bookings.' },
          { status: 400 }
        )
      }
      // Also verify Stripe Connect is still enabled (could have been disabled after booking was created)
      if (!pp.stripeChargesEnabled) {
        return NextResponse.json(
          { error: 'This artist\'s payment account is currently inactive. Please contact support.' },
          { status: 400 }
        )
      }

      // BL-2: Re-validate availability slot is still free before confirming
      const parseDateNoonUTC = (ds: string) => {
        const [y, m, d] = ds.split('-').map(Number)
        return new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
      }
      const bookingDateStr = booking.date.toISOString().split('T')[0]
      const bookingDateNoon = parseDateNoonUTC(bookingDateStr)
      const dow = bookingDateNoon.getUTCDay()
      const sentinelDate = getSentinelDate(dow)

      // Check for a blocking override on the exact date
      const exactAvailability = await prisma.availability.findUnique({
        where: { providerId_date: { providerId: booking.provider.id, date: bookingDateNoon } },
      })
      if (exactAvailability?.isBlocked) {
        return NextResponse.json(
          { error: 'This date is no longer available. Please contact the client to reschedule.' },
          { status: 409 }
        )
      }
      // Check the slot is still in the available list
      const availabilityEntry = exactAvailability ?? await prisma.availability.findUnique({
        where: { providerId_date: { providerId: booking.provider.id, date: sentinelDate } },
      })
      if (availabilityEntry && !availabilityEntry.isBlocked && availabilityEntry.timeSlots.length > 0) {
        if (!availabilityEntry.timeSlots.includes(booking.time)) {
          return NextResponse.json(
            { error: 'The requested time slot is no longer available.' },
            { status: 409 }
          )
        }
      }

      // P2-1: Re-validate promo code hasn't expired or been exhausted since booking was created
      const promoUsage = await prisma.promoCodeUsage.findUnique({
        where: { bookingId: params.id },
        include: { promoCode: true },
      })
      if (promoUsage?.promoCode) {
        const promo = promoUsage.promoCode
        if (!promo.isActive || (promo.expiresAt && promo.expiresAt < new Date()) || (promo.maxUses !== null && promo.currentUses > promo.maxUses)) {
          console.warn(`[P2-1] Promo code "${promo.code}" on booking ${params.id} is now invalid (expired/exhausted/inactive). Confirming anyway — customer booked in good faith.`)
        }
      }

      // Check for double-booking: another confirmed booking at the same date/time
      const conflict = await prisma.booking.findFirst({
        where: {
          id: { not: params.id },
          providerId: booking.providerId,
          date: bookingDateNoon,
          time: booking.time,
          status: { in: ['CONFIRMED', 'PENDING'] },
        },
      })
      if (conflict) {
        return NextResponse.json(
          { error: 'A conflict exists — another booking is already scheduled for this slot.' },
          { status: 409 }
        )
      }
    }

    // Authorization: who can set which status
    const CUSTOMER_STATUSES = ['CANCELLED_BY_CUSTOMER']
    const PROVIDER_STATUSES = ['CONFIRMED', 'DECLINED', 'CANCELLED_BY_PROVIDER', 'COMPLETED', 'NO_SHOW']

    if (isCustomer && !isAdmin && !CUSTOMER_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Customers can only cancel their own bookings' }, { status: 403 })
    }
    if (isProvider && !isAdmin && !PROVIDER_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status for provider' }, { status: 403 })
    }

    // Validate state transitions
    const VALID_TRANSITIONS: Record<string, string[]> = {
      PENDING: ['CONFIRMED', 'DECLINED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_PROVIDER', 'EXPIRED'],
      CONFIRMED: ['COMPLETED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_PROVIDER', 'DISPUTED', 'NO_SHOW'],
      RESCHEDULE_REQUESTED: ['CONFIRMED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_PROVIDER'],
      COMPLETED: ['REFUNDED', 'DISPUTED'],
      CANCELLED: [],
      CANCELLED_BY_CUSTOMER: [],
      CANCELLED_BY_PROVIDER: [],
      DECLINED: [],
      EXPIRED: [],
      REFUNDED: [],
      DISPUTED: ['REFUNDED', 'COMPLETED'],
    }
    const allowed = VALID_TRANSITIONS[booking.status] || []
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${booking.status} to ${status}` },
        { status: 400 }
      )
    }

    // P1-5: NO_SHOW can only be marked after the appointment has started
    if (status === 'NO_SHOW') {
      const offsetMs = getSydneyOffsetMs()
      const dateStr = booking.date.toISOString().split('T')[0]
      const appointmentStart = new Date(`${dateStr}T${booking.time}:00`)
      const appointmentStartUtc = new Date(appointmentStart.getTime() - offsetMs)
      if (new Date() < appointmentStartUtc) {
        return NextResponse.json({ error: 'Cannot mark as no-show before the appointment time.' }, { status: 400 })
      }
    }

    // BL-5: A booking that has already been refunded cannot be disputed.
    // Once COMPLETED → REFUNDED has occurred, COMPLETED → DISPUTED must be blocked.
    if (status === 'DISPUTED' && booking.refundStatus === 'PROCESSED') {
      return NextResponse.json(
        { error: 'This booking has already been refunded and cannot be disputed.' },
        { status: 400 }
      )
    }

    // T1: Rate-limit customer cancellations
    if (status === 'CANCELLED_BY_CUSTOMER' && isCustomer) {
      // P1-8: Global limit — max 5 cancellations in 7 days across all providers
      const globalCancelCount = await prisma.booking.count({
        where: {
          customerId: session.user.id,
          status: { in: ['CANCELLED_BY_CUSTOMER'] },
          updatedAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      })
      if (globalCancelCount >= 5) {
        return NextResponse.json(
          { error: 'You have cancelled too many bookings recently. Please wait before cancelling again.' },
          { status: 429 }
        )
      }

      // Per-provider limit — max 3 cancellations with a given artist in 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const recentCancels = await prisma.booking.count({
        where: {
          customerId: session.user.id,
          providerId: booking.providerId,
          status: 'CANCELLED_BY_CUSTOMER',
          updatedAt: { gte: sevenDaysAgo },
        },
      })
      if (recentCancels >= 3) {
        return NextResponse.json(
          { error: 'You have cancelled too many bookings with this artist recently. Please wait before cancelling again.' },
          { status: 429 }
        )
      }
    }

    // BL-M4: Re-validate availability when a provider confirms a reschedule request
    if (status === 'CONFIRMED' && booking.status === 'RESCHEDULE_REQUESTED' && booking.rescheduleDate && booking.rescheduleTime) {
      const newDateNoon = new Date(booking.rescheduleDate)
      newDateNoon.setUTCHours(12, 0, 0, 0)
      const conflict = await prisma.booking.findFirst({
        where: {
          id: { not: params.id },
          providerId: booking.providerId,
          date: {
            gte: new Date(Date.UTC(newDateNoon.getUTCFullYear(), newDateNoon.getUTCMonth(), newDateNoon.getUTCDate(), 0, 0, 0)),
            lte: new Date(Date.UTC(newDateNoon.getUTCFullYear(), newDateNoon.getUTCMonth(), newDateNoon.getUTCDate(), 23, 59, 59)),
          },
          time: booking.rescheduleTime,
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
      })
      if (conflict) {
        return NextResponse.json(
          { error: 'The proposed reschedule time conflicts with another booking.' },
          { status: 409 }
        )
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = { status }

    // Apply reschedule date/time if confirming from RESCHEDULE_REQUESTED
    if (status === 'CONFIRMED' && booking.status === 'RESCHEDULE_REQUESTED' && booking.rescheduleDate && booking.rescheduleTime) {
      updateData.date = booking.rescheduleDate
      updateData.time = booking.rescheduleTime
    }

    // Clear reschedule fields on ANY exit from RESCHEDULE_REQUESTED state
    // (not just CONFIRMED — also CANCELLED_BY_CUSTOMER, CANCELLED_BY_PROVIDER, DECLINED, etc.)
    if (booking.status === 'RESCHEDULE_REQUESTED') {
      updateData.rescheduleDate = null
      updateData.rescheduleTime = null
      updateData.rescheduleReason = null
      updateData.rescheduleRequestedAt = null
    }

    // Handle Stripe payment based on status change
    if (booking.stripePaymentId) {
      try {
        switch (status) {
          case 'CONFIRMED': {
            // P0-2: Capture the authorized payment. If capture fails, we return 400 below
            // (in the outer catch) so the booking is NOT confirmed. This prevents confirming
            // a booking backed by un-captured (or expired) funds.
            const capturedPI = await stripe.paymentIntents.capture(booking.stripePaymentId)
            // P0-6: Only proceed if Stripe confirms the capture actually succeeded.
            // If status is not 'succeeded', do NOT confirm the booking or schedule a payout.
            // The outer catch will surface a 400 to the caller.
            if (capturedPI.status !== 'succeeded') {
              throw new Error(
                `PaymentIntent capture returned unexpected status: ${capturedPI.status}. Expected 'succeeded'.`
              )
            }
            updateData.paymentStatus = 'CAPTURED'
            break
          }
          case 'DECLINED':
          case 'EXPIRED': {
            // Cancel PI to release the hold
            try {
              await stripe.paymentIntents.cancel(booking.stripePaymentId)
            } catch { /* PI may already be cancelled */ }
            updateData.paymentStatus = 'AUTH_RELEASED'
            // P2-B: Null stripePaymentId after release to prevent double-cancel on retry
            updateData.stripePaymentId = null
            break
          }
          case 'CANCELLED_BY_CUSTOMER': {
            const pi = await stripe.paymentIntents.retrieve(booking.stripePaymentId)
            if (pi.status === 'requires_capture') {
              // PENDING state — just release the hold (no cancellation fee)
              await stripe.paymentIntents.cancel(booking.stripePaymentId)
              updateData.paymentStatus = 'AUTH_RELEASED'
              // P2-B: Null stripePaymentId after release to prevent double-cancel on retry
              updateData.stripePaymentId = null
            } else if (pi.status === 'succeeded') {
              // CONFIRMED state — apply provider's cancellation policy.
              // BL-04/P0-4/P1-3/BL-C3: Read the actual cancellationPolicyType from provider profile.
              // When NULL, default to MODERATE and log so the missing policy can be identified and set.
              const dateStr = utcToSydneyDateStr(booking.date)
              const hoursLeft = hoursUntilBooking(dateStr, booking.time)
              const policyType = booking.provider.providerProfile?.cancellationPolicyType ?? 'MODERATE'
              if (!booking.provider.providerProfile?.cancellationPolicyType) {
                console.warn(`[CANCELLATION_POLICY] Provider ${booking.providerId} has no policy set — defaulting to MODERATE`)
              }

              // Determine refund percentage based on policy and time remaining
              let refundPct = 1.0 // default: full refund
              if (policyType === 'FLEXIBLE') {
                // Full refund if > 6h before; no refund if < 6h
                refundPct = hoursLeft >= 6 ? 1.0 : 0.0
              } else if (policyType === 'MODERATE') {
                // Full refund if > 24h; 50% if < 24h
                refundPct = hoursLeft >= 24 ? 1.0 : 0.5
              } else if (policyType === 'STRICT') {
                // Full refund if > 48h; 50% if 24-48h; no refund if < 24h
                if (hoursLeft >= 48) refundPct = 1.0
                else if (hoursLeft >= 24) refundPct = 0.5
                else refundPct = 0.0
              }

              // Refund is calculated on the service amount (tip always excluded from cancellation fee)
              const tipAmt = booking.tipAmount ?? 0
              const serviceBase = booking.totalPrice - tipAmt // service + platformFee (what customer paid excl. tip)
              const refundAmount = Math.round(serviceBase * refundPct * 100) // cents

              // Always refund the tip in full (never penalise the tip)
              const tipRefundCents = Math.round(tipAmt * 100)
              const totalRefundCents = refundAmount + tipRefundCents

              if (totalRefundCents > 0) {
                await stripe.refunds.create({
                  payment_intent: booking.stripePaymentId,
                  amount: Math.max(0, totalRefundCents),
                })
              }

              const refundedAmt = (totalRefundCents / 100)
              const isFullRefund = refundPct === 1.0
              updateData.paymentStatus = isFullRefund ? 'REFUNDED' : (refundPct > 0 ? 'PARTIAL_REFUND' : 'CAPTURED')
              updateData.refundStatus = 'PROCESSED'
              updateData.refundAmount = refundedAmt
              updateData.refundedAt = new Date()

              // If partial/no refund, schedule artist payout for their kept portion
              if (refundPct < 1.0) {
                const keptServiceBase = serviceBase * (1 - refundPct)
                // BL-R4: Platform only keeps the portion of the fee proportional to what the customer forfeited.
                // e.g. 50% refund → platform keeps 50% of the platformFee; artist keeps the rest of keptServiceBase.
                const artistKeep = Math.max(0, keptServiceBase - (booking.platformFee * (1 - refundPct)))
                const providerProfile = booking.provider.providerProfile
                if (providerProfile && artistKeep > 0) {
                  await prisma.payout.upsert({
                    where: { bookingId: booking.id },
                    create: {
                      bookingId: booking.id,
                      providerId: providerProfile.id,
                      amount: Math.max(0, artistKeep),
                      platformFee: booking.platformFee,
                      status: 'SCHEDULED',
                      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    },
                    update: { amount: Math.max(0, artistKeep), status: 'SCHEDULED' },
                  }).catch(() => {})
                }
              }
            }
            break
          }
          case 'CANCELLED_BY_PROVIDER': {
            const pi = await stripe.paymentIntents.retrieve(booking.stripePaymentId)
            if (pi.status === 'requires_capture') {
              await stripe.paymentIntents.cancel(booking.stripePaymentId)
              updateData.paymentStatus = 'AUTH_RELEASED'
              // P2-B: Null stripePaymentId after release to prevent double-cancel on retry
              updateData.stripePaymentId = null
            } else if (pi.status === 'succeeded') {
              // Tiered refund based on notice period
              const hoursUntilAppt = booking.date
                ? (new Date(booking.date).getTime() - Date.now()) / 3_600_000
                : 999
              let refundPercent = 1.0
              if (hoursUntilAppt < 2) {
                refundPercent = 0
              } else if (hoursUntilAppt < 24) {
                refundPercent = 0.5
              }
              // P0-5: Separate tip from service base — tip is always fully refunded;
              // only the service base is subject to the provider cancellation penalty.
              const tipAmt = booking.tipAmount ?? 0
              const serviceBase = booking.totalPrice - tipAmt
              const serviceRefundCents = Math.round(serviceBase * refundPercent * 100)
              // Tip always refunded in full (never penalise the customer's tip on provider cancel)
              const tipRefundCents = Math.round(tipAmt * 100)
              const totalRefundCents = serviceRefundCents + tipRefundCents
              if (totalRefundCents > 0) {
                await stripe.refunds.create({
                  payment_intent: booking.stripePaymentId,
                  amount: totalRefundCents,
                  reason: 'requested_by_customer',
                  metadata: { bookingId: booking.id, reason: 'provider_cancelled' },
                })
                updateData.refundStatus = 'PROCESSED'
                updateData.refundAmount = totalRefundCents / 100
                updateData.refundedAt = new Date()
                updateData.refundReason = 'Provider cancelled appointment'
              }
              // BL-R4 (provider cancel variant): artist keeps a portion only if within
              // the non-full-refund window. Platform keeps its proportional fee.
              const artistKeep = Math.max(0, serviceBase - serviceRefundCents / 100 - (booking.platformFee * refundPercent))
              if (refundPercent < 1.0 && artistKeep > 0) {
                const providerProfile = booking.provider.providerProfile
                if (providerProfile) {
                  await prisma.payout.upsert({
                    where: { bookingId: booking.id },
                    create: {
                      bookingId: booking.id,
                      providerId: providerProfile.id,
                      amount: artistKeep,
                      platformFee: booking.platformFee,
                      status: 'SCHEDULED',
                      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    },
                    update: { amount: artistKeep, status: 'SCHEDULED' },
                  }).catch(() => {})
                }
              }
              updateData.paymentStatus = refundPercent === 1.0 ? 'REFUNDED' : (totalRefundCents > 0 ? 'PARTIAL_REFUND' : 'CAPTURED')
            }
            break
          }
          case 'COMPLETED': {
            // BL-4 / BL-05: Provider cannot mark a booking complete until near the end of the
            // actual service duration (5-min grace before appointment end time).
            if (isProvider && !isAdmin) {
              const svc = await prisma.service.findUnique({
                where: { id: booking.serviceId },
                select: { duration: true },
              })
              const durationMins = svc?.duration ?? 60
              const appointmentEndTime = new Date(booking.date)
              if (booking.time) {
                const [h, m] = booking.time.split(':').map(Number)
                appointmentEndTime.setUTCHours(h, m, 0, 0)
              }
              appointmentEndTime.setTime(appointmentEndTime.getTime() + durationMins * 60 * 1000)

              const nowMs = Date.now()
              if (nowMs < appointmentEndTime.getTime() - 5 * 60 * 1000) {
                const minutesLeft = Math.ceil((appointmentEndTime.getTime() - nowMs) / 60000)
                return NextResponse.json(
                  { error: `Appointment is still in progress. You can mark it complete in ~${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.` },
                  { status: 400 }
                )
              }
            }
            // MF-P0-1: Capture the PaymentIntent when booking is marked completed.
            // This covers cases where the payment was authorized (requires_capture) but not yet
            // captured — e.g. instant-book flows or edge cases where CONFIRMED capture was skipped.
            if (booking.stripePaymentId && booking.stripePaymentId !== 'free' && !booking.stripePaymentId.startsWith('no_payment')) {
              try {
                await stripe.paymentIntents.capture(booking.stripePaymentId)
              } catch (captureErr: unknown) {
                // Log but don't fail — payout cron will retry; capture may have already occurred
                const msg = captureErr instanceof Error ? captureErr.message : String(captureErr)
                if (!msg.includes('already been captured') && !msg.includes('status is not requires_capture')) {
                  console.error('[BOOKING_COMPLETE_CAPTURE]', captureErr)
                }
              }
            }
            updateData.completedAt = new Date()
            updateData.disputeDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000)
            const providerProfile = booking.provider.providerProfile
            if (providerProfile && booking.totalPrice > 0) {
              // P0-1: Subtract tip from payout — tip stays with platform until processed separately
              const providerPayout = booking.totalPrice - booking.platformFee - (booking.tipAmount ?? 0)
              // Check no active dispute exists before scheduling payout
              const activeDispute = await prisma.dispute.findUnique({
                where: { bookingId: booking.id },
              })
              if (!activeDispute || activeDispute.status === 'RESOLVED_NO_REFUND') {
                try {
                  await prisma.payout.upsert({
                    where: { bookingId: booking.id },
                    create: {
                      bookingId: booking.id,
                      providerId: providerProfile.id,
                      amount: providerPayout,
                      platformFee: booking.platformFee,
                      status: 'SCHEDULED',
                      scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
                    },
                    update: {
                      status: 'SCHEDULED',
                      scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
                    },
                  })
                } catch (payoutError) {
                  console.error('Failed to schedule payout:', payoutError)
                }
              }
            }
            break
          }
          case 'NO_SHOW': {
            // Provider marks customer as no-show — no refund, payout proceeds.
            // P4-4: Set disputeDeadline so customers can open a dispute if they disagree
            // (e.g., they arrived but the provider was unavailable).
            updateData.completedAt = new Date()
            updateData.disputeDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000)
            // P0-5: Capture the PaymentIntent for no-shows, mirroring the COMPLETED handler.
            // Covers edge cases where the payment was authorized (requires_capture) but not yet
            // captured — e.g. if CONFIRMED capture was skipped for any reason.
            if (booking.stripePaymentId &&
                booking.stripePaymentId !== 'free' &&
                !booking.stripePaymentId.startsWith('no_payment')) {
              try {
                await stripe.paymentIntents.capture(booking.stripePaymentId)
              } catch (captureErr: unknown) {
                const msg = captureErr instanceof Error ? captureErr.message : String(captureErr)
                if (!msg.includes('already been captured') && !msg.includes('status is not requires_capture')) {
                  console.error('[NO_SHOW_CAPTURE]', captureErr)
                }
              }
            }
            const providerProfile = booking.provider.providerProfile
            if (providerProfile && booking.totalPrice > 0 && booking.stripePaymentId) {
              // Payment was already captured (CONFIRMED), so we keep it and pay provider
              // P0-1: Subtract tip from payout — tip stays with platform until processed separately
              const providerPayout = booking.totalPrice - booking.platformFee - (booking.tipAmount ?? 0)
              try {
                await prisma.payout.upsert({
                  where: { bookingId: booking.id },
                  create: {
                    bookingId: booking.id,
                    providerId: providerProfile.id,
                    amount: providerPayout,
                    platformFee: booking.platformFee,
                    status: 'SCHEDULED',
                    scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2h delay for no-shows
                  },
                  update: { status: 'SCHEDULED', scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000) },
                })
              } catch (payoutError) {
                console.error('Failed to schedule no-show payout:', payoutError)
              }
            }
            // Notify customer they were marked as no-show and can dispute
            await prisma.notification.create({
              data: {
                userId: booking.customerId,
                type: 'GENERAL',
                title: 'You were marked as a no-show',
                message: 'Your artist marked you as a no-show. If you believe this is incorrect, you can open a dispute within 48 hours.',
                link: `/bookings/${booking.id}`,
              },
            }).catch(() => {})
            break
          }
          case 'REFUNDED': {
            // P0-6: Admin-only guard — only admins may trigger a direct REFUNDED status transition
            if (!isAdmin) {
              return NextResponse.json({ error: 'Admin only' }, { status: 403 })
            }
            await stripe.refunds.create(
              {
                payment_intent: booking.stripePaymentId!,
                amount: Math.round(booking.totalPrice * 100),
              },
              { idempotencyKey: `booking_${booking.id}_full_refund` }
            )
            updateData.paymentStatus = 'REFUNDED'
            updateData.refundStatus = 'PROCESSED'
            updateData.refundAmount = booking.totalPrice
            updateData.refundedAt = new Date()
            break
          }
        }
      } catch (stripeError) {
        // For CONFIRMED, this is critical — block the transition
        if (status === 'CONFIRMED') {
          console.error('Stripe capture failed:', stripeError)
          return NextResponse.json(
            { error: 'Failed to capture payment. The card authorization may have expired.' },
            { status: 400 }
          )
        }
        // For other statuses, log but don't block
        console.error('Stripe payment handling error:', stripeError)
      }
    } else if (status === 'COMPLETED') {
      // Handle $0 bookings (voucher-covered) — still set dispute window
      updateData.completedAt = new Date()
      updateData.disputeDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000)
      const providerProfile = booking.provider.providerProfile
      if (providerProfile && booking.totalPrice > 0) {
        // P0-1: Subtract tip from payout — tip stays with platform until processed separately
        const providerPayout = booking.totalPrice - booking.platformFee - (booking.tipAmount ?? 0)
        // Check no active dispute exists before scheduling payout
        const activeDispute = await prisma.dispute.findUnique({
          where: { bookingId: booking.id },
        })
        if (!activeDispute || activeDispute.status === 'RESOLVED_NO_REFUND') {
          try {
            await prisma.payout.upsert({
              where: { bookingId: booking.id },
              create: {
                bookingId: booking.id,
                providerId: providerProfile.id,
                amount: providerPayout,
                platformFee: booking.platformFee,
                status: 'SCHEDULED',
                scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
              },
              update: {
                status: 'SCHEDULED',
                scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
              },
            })
          } catch (payoutError) {
            console.error('Failed to schedule payout:', payoutError)
          }
        }
      }
    }

    // NEW-03: Provider cancellation — tiered penalty + customer notification + SMS
    // Wrap booking update + penalty payout creation in a single transaction to
    // ensure both succeed or both fail atomically (FIX P1-2).
    // Penalty is computed inside the transaction so the booking date read is
    // consistent with the update under concurrent requests (no TOCTOU race).
    const { updated, refundPercent, penaltyPercent } = await prisma.$transaction(async (tx) => {
      // Re-read the booking inside the transaction for an accurate, race-free date snapshot
      const freshBooking = await tx.booking.findUnique({
        where: { id: params.id },
        select: { date: true, totalPrice: true },
      })

      let txRefundPercent = 1.0   // >24h: full refund
      let txPenaltyPercent = 0
      if (status === 'CANCELLED_BY_PROVIDER') {
        const hoursUntilAppointment = freshBooking?.date
          ? (new Date(freshBooking.date).getTime() - Date.now()) / 3_600_000
          : 999
        if (hoursUntilAppointment < 2) {
          txRefundPercent = 0        // <2h: no refund
          txPenaltyPercent = 0.25   // 25% penalty on provider
        } else if (hoursUntilAppointment < 24) {
          txRefundPercent = 0.5     // 2-24h: 50% refund
          txPenaltyPercent = 0.15   // 15% penalty on provider
        }
      }

      const result = await tx.booking.update({
        where: { id: params.id },
        data: updateData,
      })

      if (status === 'CANCELLED_BY_PROVIDER' && txPenaltyPercent > 0) {
        const penaltyAmount = -(booking.totalPrice * txPenaltyPercent)
        const providerProfile = booking.provider.providerProfile
        if (providerProfile) {
          await tx.payout.create({
            data: {
              bookingId: booking.id,
              providerId: providerProfile.id,
              amount: penaltyAmount,
              platformFee: 0,
              status: 'SCHEDULED',
              scheduledAt: new Date(),
            },
          })
        }
      }

      return { updated: result, refundPercent: txRefundPercent, penaltyPercent: txPenaltyPercent }
    })

    if (status === 'CANCELLED_BY_PROVIDER') {

      // Notify customer
      const cancelCustomer = await prisma.user.findUnique({
        where: { id: booking.customerId },
        select: { name: true, phone: true },
      })
      await prisma.notification.create({
        data: {
          userId: booking.customerId,
          type: 'BOOKING_CANCELLED',
          title: 'Your booking was cancelled',
          message: refundPercent > 0
            ? `Your artist cancelled your appointment. A ${Math.round(refundPercent * 100)}% refund has been initiated.`
            : 'Your artist cancelled your appointment. Due to the late notice, no refund is available.',
          link: '/dashboard/customer',
        },
      }).catch(() => {})

      // SMS customer (non-blocking, direct Twilio call)
      if (cancelCustomer?.phone) {
        const smsMessage = `Your Sparq booking was cancelled by your artist. ${refundPercent > 0 ? `A ${Math.round(refundPercent * 100)}% refund is on its way.` : 'Unfortunately no refund applies due to late cancellation.'}`
        const sid = process.env.TWILIO_ACCOUNT_SID
        const token = process.env.TWILIO_AUTH_TOKEN
        const from = process.env.TWILIO_FROM_NUMBER
        const phone = cancelCustomer.phone
        const normTo = phone.startsWith('0') ? '+61' + phone.slice(1) : phone
        if (sid && token && from) {
          const params = new URLSearchParams({ To: normTo, From: from, Body: smsMessage })
          fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
            method: 'POST',
            headers: {
              Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
          }).catch(() => {})
        }
      }
    }

    // MH-6: Cancellation strike system — warn at 3, flag for admin review at 6
    if (status === 'CANCELLED_BY_PROVIDER') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const providerProfile = await (prisma.providerProfile.update as any)({
        where: { userId: booking.providerId },
        data: { cancellationCount: { increment: 1 } },
      }).catch(() => null)

      if (providerProfile) {
        // Note: 'GENERAL' and 'cancellationCount' require `prisma db push` to take effect
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cancellationCount = (providerProfile as any).cancellationCount ?? 0
        if (cancellationCount === 3) {
          await prisma.notification.create({
            data: {
              userId: booking.providerId,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              type: 'GENERAL' as any,
              title: 'Cancellation warning',
              message: 'You have cancelled 3 bookings recently. Frequent cancellations may affect your standing on Sparq.',
              link: '/dashboard/provider',
            },
          }).catch(() => {})
        } else if (cancellationCount >= 6) {
          // Flag for admin review
          await prisma.providerProfile.update({
            where: { userId: booking.providerId },
            data: { accountStatus: 'UNDER_REVIEW' },
          }).catch(() => {})
          await prisma.notification.create({
            data: {
              userId: booking.providerId,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              type: 'GENERAL' as any,
              title: 'Account under review',
              message: 'Your account is under review due to a high cancellation rate. Please contact support.',
              link: '/dashboard/provider',
            },
          }).catch(() => {})
        }
      }
    }

    // MH-4: Track provider response time when booking is confirmed.
    // Uses a simple rolling-weighted average: new = (old * 0.8 + responseHours * 0.2)
    // This smooths out outliers while still reacting to recent changes.
    if (status === 'CONFIRMED') {
      const responseHours = (Date.now() - booking.createdAt.getTime()) / (1000 * 60 * 60)
      const providerProfile = booking.provider.providerProfile
      if (providerProfile) {
        const currentAvg = providerProfile.responseTimeHours ?? 24
        const newAvg = Math.round((currentAvg * 0.8 + responseHours * 0.2) * 10) / 10
        await prisma.providerProfile.update({
          where: { id: providerProfile.id },
          data: { responseTimeHours: newAvg },
        }).catch(() => {})
      }
    }

    // Recalculate provider's completionRate whenever a terminal status is set
    if (['COMPLETED', 'CANCELLED_BY_PROVIDER', 'CANCELLED_BY_CUSTOMER', 'DECLINED', 'EXPIRED'].includes(status)) {
      const [totalCompleted, totalTerminal] = await Promise.all([
        prisma.booking.count({
          where: { providerId: booking.providerId, status: 'COMPLETED' },
        }),
        prisma.booking.count({
          where: {
            providerId: booking.providerId,
            status: { in: ['COMPLETED', 'CANCELLED_BY_PROVIDER', 'CANCELLED_BY_CUSTOMER', 'DECLINED', 'EXPIRED'] },
          },
        }),
      ])
      if (totalTerminal > 0) {
        const rate = Math.round((totalCompleted / totalTerminal) * 100)
        await prisma.providerProfile.update({
          where: { userId: booking.providerId },
          data: { completionRate: rate },
        }).catch(() => {}) // Non-blocking
      }
    }

    // Log status change
    await prisma.bookingStatusHistory.create({
      data: {
        bookingId: params.id,
        fromStatus: booking.status,
        toStatus: status,
        changedBy: session.user.id,
        reason: body.reason || null,
      },
    }).catch(() => {}) // Non-blocking

    // Build notification
    const NOTIF_MAP: Record<string, { type: string; title: string; message: string }> = {
      CONFIRMED: {
        type: 'BOOKING_ACCEPTED',
        title: 'Booking Confirmed',
        message: `Your booking for ${booking.service.title} has been accepted and your card has been charged.`,
      },
      DECLINED: {
        type: 'BOOKING_DECLINED',
        title: 'Booking Declined',
        message: `Your booking for ${booking.service.title} was declined. Your card hold has been released.`,
      },
      CANCELLED_BY_CUSTOMER: {
        type: 'BOOKING_CANCELLED',
        title: 'Booking Cancelled by Customer',
        message: `The customer cancelled the booking for ${booking.service.title}.`,
      },
      CANCELLED_BY_PROVIDER: {
        type: 'BOOKING_CANCELLED',
        title: 'Booking Cancelled by Artist',
        message: `Your booking for ${booking.service.title} has been cancelled by the artist.`,
      },
      COMPLETED: {
        type: 'BOOKING_COMPLETED',
        title: 'Booking Completed',
        message: `Your booking for ${booking.service.title} has been marked as completed.`,
      },
      EXPIRED: {
        type: 'BOOKING_EXPIRED',
        title: 'Booking Expired',
        message: `Your booking request for ${booking.service.title} has expired.`,
      },
      REFUNDED: {
        type: 'BOOKING_CANCELLED',
        title: 'Booking Refunded',
        message: `Your booking for ${booking.service.title} has been refunded.`,
      },
      DISPUTED: {
        type: 'BOOKING_DISPUTED',
        title: 'Booking Disputed',
        message: `A dispute has been opened for your booking for ${booking.service.title}.`,
      },
      NO_SHOW: {
        type: 'BOOKING_CANCELLED',
        title: 'No-Show Recorded',
        message: `The artist marked your booking for ${booking.service.title} as a no-show.`,
      },
    }

    const notif = NOTIF_MAP[status]
    if (notif) {
      // Notify the other party (customer for provider actions, provider for customer actions)
      const notifyUserId = isCustomer ? booking.providerId : booking.customerId
      await prisma.notification.create({
        data: {
          userId: notifyUserId,
          type: notif.type as never,
          title: notif.title,
          message: notif.message,
          link: isCustomer ? `/dashboard/provider` : `/dashboard/customer`,
        },
      })
    }

    // P1-D: Send declined email to customer when provider declines
    if (status === 'DECLINED' && booking.customer?.email) {
      sendBookingDeclinedEmail(booking.customer.email, {
        name: booking.customer.name ?? 'there',
        serviceTitle: booking.service.title,
        providerName: booking.provider.name ?? 'the artist',
        bookingId: booking.id,
      }).catch(err => console.error('Booking declined email error:', err))
    }

    // M8: Notify provider by email when customer cancels
    if (status === 'CANCELLED_BY_CUSTOMER' && booking.provider?.email) {
      sendBookingCancelledEmail(booking.provider.email, {
        providerName: booking.provider.name ?? 'there',
        customerName: booking.customer?.name ?? 'A client',
        serviceTitle: booking.service.title,
        bookingDate: booking.date.toISOString().split('T')[0],
        bookingTime: booking.time,
        bookingId: booking.id,
      }).catch(err => console.error('Booking cancelled email error:', err))
    }

    // Send "book again" prompt to customer when provider marks booking completed
    if (status === 'COMPLETED' && isProvider) {
      const providerName = booking.provider.name ?? 'your artist'
      await prisma.notification.create({
        data: {
          userId: booking.customerId,
          type: 'BOOKING_COMPLETED',
          title: 'How was your appointment? 💅',
          message: `Your appointment with ${providerName} is complete. Loved it? Book again or leave a review!`,
          link: `/providers/${booking.providerId}`,
        },
      }).catch(() => {})

      // P2: Featured listing upsell after first completed booking
      const completedCount = await prisma.booking.count({
        where: { providerId: session.user.id, status: 'COMPLETED' },
      })
      if (completedCount === 1) {
        // First ever completion — send featured listing nudge
        await prisma.notification.create({
          data: {
            userId: session.user.id,
            type: 'GENERAL',
            title: 'Congratulations on your first booking! 🎉',
            message: 'Celebrate your first completed booking by getting featured on the homepage. Featured artists get 3× more profile views.',
            link: '/dashboard/provider/featured',
          },
        }).catch(() => {})
      }
    }

    // Send booking confirmation email to customer when provider confirms
    if (status === 'CONFIRMED' && booking.customer?.email) {
      sendBookingConfirmationEmail(booking.customer.email, {
        customerName: booking.customer.name ?? 'there',
        serviceTitle: booking.service.title,
        providerName: booking.provider.name ?? 'your artist',
        bookingDate: booking.date.toISOString().split('T')[0],
        bookingTime: booking.time,
        totalPrice: booking.totalPrice,
        bookingId: booking.id,
      }).catch(err => console.error('Booking confirmation email error:', err))

      // SMS confirmation to customer (non-blocking)
      prisma.user.findUnique({
        where: { id: booking.customer.id },
        select: { phone: true },
      }).then(u => sendBookingConfirmedSms(u?.phone, {
        customerName: booking.customer?.name ?? 'there',
        serviceTitle: booking.service.title,
        providerName: booking.provider.name ?? 'your artist',
        bookingDate: booking.date.toISOString().split('T')[0],
        bookingTime: booking.time,
      })).catch(err => console.error('Booking confirmed SMS error:', err))
    }

    return NextResponse.json({ booking: updated })
  } catch (error) {
    console.error('Booking update error:', error)
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: {
      service: true,
      customer: { select: { id: true, name: true, image: true } },
      provider: {
        select: {
          id: true,
          name: true,
          image: true,
          providerProfile: { select: { cancellationPolicyType: true } },
        },
      },
      review: true,
      messages: { include: { sender: { select: { id: true, name: true, image: true } } } },
    },
  })

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Only allow the customer, provider, or an admin to view this booking (IDOR guard)
  const isGetAdmin = session.user.role === 'ADMIN'
  if (booking.customerId !== session.user.id && booking.providerId !== session.user.id && !isGetAdmin) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  // Strip address for bookings that aren't pending, confirmed, or completed (privacy)
  // Providers can see the address from PENDING so they can assess travel distance before confirming
  const sanitizedBooking = {
    ...booking,
    address: ['PENDING', 'CONFIRMED', 'COMPLETED'].includes(booking.status) ? booking.address : null,
  }

  return NextResponse.json({ booking: sanitizedBooking })
}
