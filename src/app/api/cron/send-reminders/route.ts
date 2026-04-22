import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendBookingReminderEmail } from '@/lib/email'
import { sendAppointmentReminderSms } from '@/lib/sms'
import { utcToSydneyDateStr } from '@/lib/booking-time'

export async function POST(req: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Find confirmed bookings that are 24-48 hours away and haven't been reminded yet
    const now = new Date()
    const windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24h from now
    const windowEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000)   // 48h from now

    const upcomingBookings = await prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        date: { gte: windowStart, lte: windowEnd },
        reminderSentAt: null,
      },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        provider: { select: { id: true, name: true } },
        service: { select: { title: true } },
      },
    })

    let reminded = 0
    let skipped = 0

    for (const booking of upcomingBookings) {
      if (!booking.customer?.email) {
        skipped++
        continue
      }

      // BL-1: Use Sydney local date for display (not raw UTC split which can be off by 1 day
      // when DST shifts the UTC representation across midnight).
      const bookingDate = utcToSydneyDateStr(booking.date)

      try {
        await sendBookingReminderEmail(booking.customer.email, {
          name: booking.customer.name ?? 'there',
          serviceTitle: booking.service.title,
          providerName: booking.provider.name ?? 'your artist',
          bookingDate,
          bookingTime: booking.time,
          locationType: booking.locationType,
          address: booking.address,
          bookingId: booking.id,
        })

        // Create an in-app notification as well
        await prisma.notification.create({
          data: {
            userId: booking.customerId,
            type: 'NEW_BOOKING',
            title: 'Upcoming Appointment Tomorrow',
            message: `Reminder: your ${booking.service.title} with ${booking.provider.name ?? 'your artist'} is tomorrow at ${booking.time}.`,
            link: '/dashboard/customer',
          },
        }).catch(() => {}) // Non-blocking

        // SMS reminder (non-blocking — never causes the loop to skip)
        sendAppointmentReminderSms(booking.customer?.phone, {
          customerName: booking.customer?.name ?? 'there',
          serviceTitle: booking.service.title,
          providerName: booking.provider.name ?? 'your artist',
          bookingDate,
          bookingTime: booking.time,
          address: booking.address,
        }).catch(smsErr => console.error(`SMS reminder failed for booking ${booking.id}:`, smsErr))

        // Mark booking as reminded to prevent duplicate reminders
        await prisma.booking.update({
          where: { id: booking.id },
          data: { reminderSentAt: new Date() },
        }).catch(() => {})

        reminded++
      } catch (emailError) {
        console.error(`Failed to send reminder for booking ${booking.id}:`, emailError)
        skipped++
      }
    }

    return NextResponse.json({ reminded, skipped, total: upcomingBookings.length })
  } catch (error) {
    console.error('Send reminders cron error:', error)
    return NextResponse.json({ error: 'Failed to send reminders' }, { status: 500 })
  }
}
