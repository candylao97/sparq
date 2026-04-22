// P1-C: Send review reminder emails 24 hours after appointment completion.
// Runs hourly via cron. Only sends once per booking (checked via notificationLog).

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendReviewReminderEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const window24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const window48h = new Date(now.getTime() - 48 * 60 * 60 * 1000)

    // Find COMPLETED bookings where:
    // - completedAt is between 24h and 48h ago (i.e., reminder window)
    // - no review has been left yet
    // - no review reminder notification has been sent
    const bookings = await prisma.booking.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: {
          gte: window48h,
          lte: window24h,
        },
        review: null,
      },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        provider: { select: { name: true } },
        service: { select: { title: true } },
      },
    })

    // Filter out bookings that have already received a review reminder notification
    const bookingIds = bookings.map(b => b.id)
    const alreadySent = await prisma.notification.findMany({
      where: {
        type: 'REVIEW_REMINDER',
        link: { in: bookingIds.map(id => `/reviews/new?bookingId=${id}`) },
      },
      select: { link: true },
    })
    const sentBookingIds = new Set(
      alreadySent
        .map(n => n.link?.replace('/reviews/new?bookingId=', ''))
        .filter(Boolean)
    )

    let sent = 0
    for (const booking of bookings) {
      if (sentBookingIds.has(booking.id)) continue
      if (!booking.customer.email) continue

      // Send email reminder
      sendReviewReminderEmail(booking.customer.email, {
        name: booking.customer.name ?? 'there',
        serviceTitle: booking.service?.title ?? 'your service',
        providerName: booking.provider.name ?? 'your artist',
        bookingId: booking.id,
      }).catch(err => console.error(`Review reminder email failed for booking ${booking.id}:`, err))

      // Create in-app notification (also serves as idempotency marker)
      await prisma.notification.create({
        data: {
          userId: booking.customerId,
          type: 'REVIEW_REMINDER',
          title: 'How was your experience?',
          message: `Leave a review for your ${booking.service?.title ?? 'appointment'} — your feedback helps other clients find great artists.`,
          link: `/reviews/new?bookingId=${booking.id}`,
        },
      }).catch(() => {})

      sent++
    }

    return NextResponse.json({ sent, checked: bookings.length })
  } catch (error) {
    console.error('Review reminder cron error:', error)
    return NextResponse.json({ error: 'Failed to send review reminders' }, { status: 500 })
  }
}
