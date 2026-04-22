import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { bookingDateFieldToUtc } from '@/lib/booking-time'
import { sendBookingExpiredEmail } from '@/lib/email'

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const expiredBookings = await prisma.booking.findMany({
      where: {
        status: 'PENDING',
        acceptDeadline: { lt: new Date() },
      },
      include: {
        customer: { select: { email: true, name: true } },
        provider: { select: { name: true } },
        service: { select: { title: true } },
      },
    })

    let expired = 0
    for (const booking of expiredBookings) {
      // Cancel Stripe PaymentIntent if exists to release the hold
      if (booking.stripePaymentId) {
        try {
          await stripe.paymentIntents.cancel(booking.stripePaymentId)
        } catch {
          // PI may already be cancelled or expired — safe to ignore
        }
      }

      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'EXPIRED',
          paymentStatus: 'AUTH_RELEASED',
        },
      })

      // Notify both parties that the booking request expired
      await prisma.notification.createMany({
        data: [
          {
            userId: booking.customerId,
            type: 'BOOKING_EXPIRED',
            title: 'Booking Request Expired',
            message: 'Your booking request was not responded to in time and has expired. You have not been charged.',
            link: `/dashboard/customer`,
          },
          {
            userId: booking.providerUserId,
            type: 'BOOKING_EXPIRED',
            title: 'Booking Request Expired',
            message: 'A booking request expired because you did not respond in time. Responding promptly helps your ranking.',
            link: `/dashboard/provider`,
          },
        ],
      }).catch(() => {})

      // Email the customer about the expired booking
      if (booking.customer?.email) {
        sendBookingExpiredEmail(
          booking.customer.email,
          booking.customer.name ?? 'there',
          booking.provider?.name ?? 'the artist',
          booking.service?.title ?? 'your service'
        ).catch(() => {})
      }

      expired++
    }

    // Also revert RESCHEDULE_REQUESTED bookings that haven't been responded to in 48h
    const stalledReschedules = await prisma.booking.findMany({
      where: {
        status: 'RESCHEDULE_REQUESTED',
        rescheduleRequestedAt: { lt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      },
    })
    let reverted = 0
    for (const booking of stalledReschedules) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CONFIRMED',
          rescheduleDate: null,
          rescheduleTime: null,
          rescheduleReason: null,
          rescheduleRequestedAt: null,
        },
      })
      await prisma.notification.create({
        data: {
          userId: booking.customerId,
          type: 'BOOKING_ACCEPTED',
          title: 'Reschedule Request Expired',
          message: 'The artist did not respond to your reschedule request. Your original booking is still confirmed.',
          link: '/dashboard/customer',
        },
      }).catch(() => {})
      reverted++
    }

    // P0-A/BL-C1: Auto-complete past CONFIRMED bookings
    // Find CONFIRMED bookings where the date's noon-UTC sentinel is before now
    // (rough DB filter), then refine in JS by checking actual appointment time.
    const pastConfirmed = await prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        date: { lt: new Date() },
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            providerProfile: true,
          },
        },
        service: { select: { title: true, duration: true } },
        dispute: { select: { status: true } },
      },
    })

    const now = new Date()
    let autoCompleted = 0
    for (const booking of pastConfirmed) {
      // P1-F: Use actual service duration instead of hardcoded 2-hour window.
      // Fall back to 60 minutes if service duration is somehow missing.
      const serviceDurationMs = (booking.service?.duration ?? 60) * 60 * 1000
      const appointmentUtc = bookingDateFieldToUtc(booking.date, booking.time)
      const nudgeAt = new Date(appointmentUtc.getTime() + serviceDurationMs)
      if (nudgeAt > now) continue

      // Check if we already sent a completion nudge notification to the provider
      const alreadyNudged = await prisma.notification.findFirst({
        where: {
          userId: booking.providerUserId,
          type: 'BOOKING_COMPLETED',
          link: `/bookings/${booking.id}`,
        },
      })

      if (!alreadyNudged) {
        // Check if current time is reasonable for the provider (8am–9pm in their local timezone)
        // P1-F: Use the provider's actual timezone rather than hardcoding Australia/Sydney.
        // P0-7: Validate the timezone string before using it. toLocaleString with a malformed or
        // empty timezone silently produces garbage output; parseInt then gets NaN (treated as 0),
        // which is < 8 so the booking auto-completes at 3am. Instead, validate via Intl and fall
        // back to Australia/Sydney, then use formatToParts for a robust numeric hour extraction.
        let tz = booking.provider?.providerProfile?.timezone ?? 'Australia/Sydney'
        try {
          new Intl.DateTimeFormat('en-AU', { timeZone: tz }).format(new Date())
        } catch {
          console.warn(`[EXPIRE_BOOKINGS] Invalid timezone "${tz}" for provider ${booking.providerUserId} — falling back to Australia/Sydney`)
          tz = 'Australia/Sydney'
        }
        const tzParts = new Intl.DateTimeFormat('en-AU', {
          timeZone: tz,
          hour: 'numeric',
          hour12: false,
        }).formatToParts(new Date())
        const hourStr = tzParts.find(p => p.type === 'hour')?.value ?? '0'
        const hourInTz = parseInt(hourStr, 10)
        if (isNaN(hourInTz)) {
          console.warn(`[EXPIRE_BOOKINGS] Could not parse hour from formatToParts for timezone "${tz}", booking ${booking.id} — skipping nudge`)
          continue
        }
        if (hourInTz < 8 || hourInTz >= 21) {
          continue
        }

        // First pass (T+2h): notify both parties, do not complete yet
        await prisma.notification.createMany({
          data: [
            {
              userId: booking.providerUserId,
              type: 'BOOKING_COMPLETED',
              title: 'Appointment completed?',
              message: 'Please mark this appointment as complete so your client can leave a review.',
              link: `/bookings/${booking.id}`,
            },
            {
              userId: booking.customerId,
              type: 'BOOKING_COMPLETED',
              title: 'How was your appointment?',
              message: 'Your appointment time has passed. Leave a review for your artist!',
              link: `/bookings/${booking.id}`,
            },
          ],
          skipDuplicates: true,
        }).catch(() => {})
        continue  // Don't auto-complete yet
      }

      // Second pass (T+48h): auto-complete only after nudge was sent
      const autoCompleteAt = new Date(appointmentUtc.getTime() + 48 * 60 * 60 * 1000)
      if (autoCompleteAt > now) continue

      const completedAt = now
      const disputeDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000)

      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'COMPLETED', completedAt, disputeDeadline },
      })

      // Schedule payout (mirrors manual COMPLETED logic in bookings/[id] route)
      const providerProfile = booking.provider.providerProfile
      const hasActiveDispute = booking.dispute &&
        ['OPEN', 'UNDER_REVIEW'].includes(booking.dispute.status)
      if (providerProfile && booking.totalPrice > 0 && !hasActiveDispute) {
        const providerPayout = booking.totalPrice - booking.platformFee - (booking.tipAmount ?? 0)
        await prisma.payout.upsert({
          where: { bookingId: booking.id },
          create: {
            bookingId: booking.id,
            providerUserId: providerProfile.id,
            amount: providerPayout,
            platformFee: booking.platformFee,
            status: 'SCHEDULED',
            scheduledAt: disputeDeadline,
          },
          update: {
            status: 'SCHEDULED',
            scheduledAt: disputeDeadline,
          },
        }).catch(e => console.error(`Auto-complete payout upsert failed for booking ${booking.id}:`, e))
      }

      // Recalculate completion rate
      const [totalCompleted, totalTerminal] = await Promise.all([
        prisma.booking.count({ where: { providerUserId: booking.providerUserId, status: 'COMPLETED' } }),
        prisma.booking.count({
          where: {
            providerUserId: booking.providerUserId,
            status: { in: ['COMPLETED', 'CANCELLED_BY_PROVIDER', 'CANCELLED_BY_CUSTOMER', 'DECLINED', 'EXPIRED'] },
          },
        }),
      ])
      if (totalTerminal > 0) {
        await prisma.providerProfile.update({
          where: { userId: booking.providerUserId },
          data: { completionRate: Math.round((totalCompleted / totalTerminal) * 100) },
        }).catch(() => {})
      }

      // Audit log
      await prisma.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: 'CONFIRMED',
          toStatus: 'COMPLETED',
          changedBy: 'system',
          reason: 'Auto-completed by cron: appointment time passed',
        },
      }).catch(() => {})

      // Notify both parties
      await prisma.notification.createMany({
        data: [
          {
            userId: booking.customerId,
            type: 'BOOKING_COMPLETED',
            title: 'Appointment Completed',
            message: `Your appointment for ${booking.service?.title ?? 'your service'} has been marked as complete. You have 48 hours to raise a dispute.`,
            link: '/bookings',
          },
          {
            userId: booking.providerUserId,
            type: 'BOOKING_COMPLETED',
            title: 'Appointment Auto-Completed',
            message: `Your appointment for ${booking.service?.title ?? 'a service'} was automatically completed. Payout is scheduled in 48 hours.`,
            link: '/dashboard/provider/bookings',
          },
        ],
      }).catch(() => {})

      // Send "book again" prompt to customer
      const providerName = booking.provider?.name ?? 'your artist'
      await prisma.notification.create({
        data: {
          userId: booking.customerId,
          type: 'BOOKING_COMPLETED',
          title: 'How was your appointment?',
          message: `Your appointment with ${providerName} is complete. Loved it? Book again or leave a review!`,
          link: `/providers/${booking.providerUserId}`,
        },
      }).catch(() => {})

      autoCompleted++
    }

    // P2-6: Expire featured listings and notify providers
    const expiredFeatured = await prisma.providerProfile.findMany({
      where: {
        isFeatured: true,
        featuredUntil: { lt: new Date() },
      },
      select: { id: true, userId: true },
    })
    let featuredExpired = 0
    for (const profile of expiredFeatured) {
      await prisma.providerProfile.update({
        where: { id: profile.id },
        data: { isFeatured: false },
      })
      await prisma.notification.create({
        data: {
          userId: profile.userId,
          type: 'GENERAL',
          title: 'Featured listing expired',
          message: 'Your featured listing has expired. Renew to stay at the top of search results.',
          link: '/dashboard/provider/featured',
        },
      }).catch(() => {})
      featuredExpired++
    }

    return NextResponse.json({ expired, reverted, autoCompleted, featuredExpired })
  } catch (error) {
    console.error('Expire bookings error:', error)
    return NextResponse.json({ error: 'Failed to expire bookings' }, { status: 500 })
  }
}
