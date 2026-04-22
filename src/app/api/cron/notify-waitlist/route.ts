// P1-2: Waitlist notification cron
// Runs hourly. When a booking is cancelled/declined/expired, the freed slot triggers
// notifications to waitlisted customers for that provider + date combination.
// This cron finds recently freed slots and notifies un-notified waitlist entries.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWaitlistNotificationEmail } from '@/lib/email'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function POST(req: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const lookAheadDays = 30
    const cutoff = new Date(now.getTime() + lookAheadDays * 24 * 60 * 60 * 1000)

    // Find all un-notified waitlist entries for upcoming dates
    const waitlistEntries = await prisma.waitlistEntry.findMany({
      where: {
        notified: false,
        date: {
          gte: now,
          lte: cutoff,
        },
      },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        provider: { select: { id: true, name: true } },
      },
      orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }],
      take: 100, // process in batches
    })

    if (waitlistEntries.length === 0) {
      return NextResponse.json({ notified: 0, message: 'No pending waitlist entries' })
    }

    let notifiedCount = 0

    for (const entry of waitlistEntries) {
      // P1-E: Validate that the linked service (if any) is still active and not deleted.
      // Skip notification if the service has been deactivated or soft-deleted.
      if (entry.serviceId) {
        const service = await prisma.service.findUnique({
          where: { id: entry.serviceId },
          select: { isActive: true, isDeleted: true },
        })
        if (!service || !service.isActive || service.isDeleted) {
          // Mark as notified to prevent repeated checks for a dead service
          await prisma.waitlistEntry.update({
            where: { id: entry.id },
            data: { notified: true },
          }).catch(() => {})
          continue
        }
      } else {
        // No specific service — validate that the provider profile still exists
        const providerProfile = await prisma.providerProfile.findUnique({
          where: { userId: entry.providerId },
          select: { id: true, accountStatus: true },
        })
        if (!providerProfile || providerProfile.accountStatus !== 'ACTIVE') {
          await prisma.waitlistEntry.update({
            where: { id: entry.id },
            data: { notified: true },
          }).catch(() => {})
          continue
        }
      }

      // Check if this provider has any available (non-booked) time on that date.
      // A slot is considered available if the provider is not fully booked (has availability
      // and no confirmed booking conflict for the day).
      const bookingDateStr = entry.date.toISOString().split('T')[0]
      const [y, m, d] = bookingDateStr.split('-').map(Number)
      const dayStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0))
      const dayEnd   = new Date(Date.UTC(y, m - 1, d, 23, 59, 59))

      // Count confirmed bookings for this provider on the date
      const confirmedCount = await prisma.booking.count({
        where: {
          providerId: entry.providerId,
          date: { gte: dayStart, lte: dayEnd },
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
      })

      // Check provider has availability set for the day
      const availability = await prisma.availability.findFirst({
        where: {
          providerId: entry.providerId,
          isBlocked: false,
          date: { gte: dayStart, lte: dayEnd },
        },
      })

      // Only notify if provider has availability and has fewer confirmed bookings than slots
      const slotCount = availability?.timeSlots?.length ?? 0
      if (!availability || slotCount === 0 || confirmedCount >= slotCount) {
        // No availability to offer — skip for now
        continue
      }

      // Send notification email
      if (entry.customer.email) {
        const providerFirstName = (entry.provider.name ?? 'your artist').split(' ')[0]
        const bookUrl = entry.serviceId
          ? `${APP_URL}/book/${entry.providerId}?service=${entry.serviceId}`
          : `${APP_URL}/providers/${entry.providerId}`

        try {
          await sendWaitlistNotificationEmail(entry.customer.email, {
            name: entry.customer.name ?? 'there',
            providerName: entry.provider.name ?? 'your artist',
            serviceTitle: `${providerFirstName}'s appointment`,
            date: bookingDateStr,
            bookUrl,
          })
          notifiedCount++
        } catch (emailErr) {
          console.error(`Waitlist email failed for entry ${entry.id}:`, emailErr)
        }
      }

      // Mark as notified regardless of email success to avoid repeat sends
      await prisma.waitlistEntry.update({
        where: { id: entry.id },
        data: { notified: true },
      })

      // Also create an in-app notification
      await prisma.notification.create({
        data: {
          userId: entry.customerId,
          type: 'NEW_BOOKING',
          title: 'A spot opened up!',
          message: `A slot with ${entry.provider.name ?? 'your artist'} on ${bookingDateStr} may be available. Book now before it goes.`,
          link: entry.serviceId
            ? `/book/${entry.providerId}?service=${entry.serviceId}`
            : `/providers/${entry.providerId}`,
        },
      }).catch(() => {}) // non-blocking
    }

    return NextResponse.json({
      notified: notifiedCount,
      processed: waitlistEntries.length,
    })
  } catch (error) {
    console.error('Waitlist notification cron error:', error)
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}
