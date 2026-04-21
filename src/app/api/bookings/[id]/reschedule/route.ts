// UX-M5: Reschedule request with availability validation
// Customer submits a proposed reschedule date/time.
// The API validates against the provider's actual availability before accepting.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

const DAY_TO_SENTINEL: Record<number, string> = {
  1: '2000-01-03', 2: '2000-01-04', 3: '2000-01-05',
  4: '2000-01-06', 5: '2000-01-07', 6: '2000-01-08', 0: '2000-01-09',
}

function parseDateNoonUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // AUDIT-017: Velocity check. Reschedule requests are UX-sensitive (availability
  // re-checks, provider notifications) and a legitimate user almost never reschedules
  // more than a couple of times per booking. 10/hour is a comfortable ceiling.
  const allowed = await rateLimit(`booking-reschedule:${session.user.id}`, 10, 3600)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many reschedule requests. Please wait before trying again.' },
      { status: 429 },
    )
  }

  try {
    const { date, time, reason } = await req.json()

    if (!date || !time) {
      return NextResponse.json({ error: 'date and time are required' }, { status: 400 })
    }

    // Validate date/time formats
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Invalid date format — use YYYY-MM-DD' }, { status: 400 })
    }
    if (!/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json({ error: 'Invalid time format — use HH:MM' }, { status: 400 })
    }

    // BL16: Minimum 4-hour notice for the reschedule target date/time
    const [rh, rm] = time.split(':').map(Number)
    const rescheduleDateTime = new Date(date)
    rescheduleDateTime.setHours(rh, rm, 0, 0)
    const minimumNoticeMs = 4 * 60 * 60 * 1000
    if (rescheduleDateTime.getTime() - Date.now() < minimumNoticeMs) {
      return NextResponse.json(
        { error: 'Reschedule requests must target a time at least 4 hours in the future.' },
        { status: 400 }
      )
    }

    // Don't allow rescheduling to the past
    const proposedDateNoon = parseDateNoonUTC(date)
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    if (proposedDateNoon < today) {
      return NextResponse.json({ error: 'Cannot reschedule to a past date' }, { status: 400 })
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: { provider: { include: { providerProfile: true } } },
    })

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    if (booking.customerId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }
    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
      return NextResponse.json({ error: 'Only pending or confirmed bookings can be rescheduled' }, { status: 400 })
    }

    // BL-C3: Max 2 reschedule requests per booking to prevent loop abuse
    const rescheduleCount = await prisma.bookingStatusHistory.count({
      where: {
        bookingId: params.id,
        toStatus: 'RESCHEDULE_REQUESTED',
      },
    })
    if (rescheduleCount >= 2) {
      return NextResponse.json(
        { error: 'This booking has already been rescheduled the maximum number of times (2). Please cancel and rebook if needed.' },
        { status: 400 }
      )
    }

    const providerProfile = booking.provider.providerProfile
    if (!providerProfile) {
      return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 })
    }

    // UX-M5: Validate proposed date/time against provider availability
    // 1. Check for a date-specific block
    const exactAvailability = await prisma.availability.findUnique({
      where: { providerId_date: { providerId: providerProfile.id, date: proposedDateNoon } },
    })

    if (exactAvailability?.isBlocked) {
      return NextResponse.json(
        { error: 'The artist is not available on this date. Please choose a different day.' },
        { status: 409 }
      )
    }

    // 2. Fall back to weekly default for that day-of-week
    let effectiveAvailability = exactAvailability
    if (!effectiveAvailability) {
      const dow = proposedDateNoon.getUTCDay()
      const sentinelStr = DAY_TO_SENTINEL[dow]
      if (sentinelStr) {
        const sentinelDate = parseDateNoonUTC(sentinelStr)
        effectiveAvailability = await prisma.availability.findUnique({
          where: { providerId_date: { providerId: providerProfile.id, date: sentinelDate } },
        })
      }
    }

    // 3. If availability record exists, check the proposed time is in it
    if (effectiveAvailability && !effectiveAvailability.isBlocked) {
      if (effectiveAvailability.timeSlots.length > 0 && !effectiveAvailability.timeSlots.includes(time)) {
        return NextResponse.json(
          { error: `${time} is not an available time slot for this artist.` },
          { status: 409 }
        )
      }
    }

    // 4. Ensure no conflicting confirmed booking at the proposed slot
    const dayStart = new Date(Date.UTC(proposedDateNoon.getUTCFullYear(), proposedDateNoon.getUTCMonth(), proposedDateNoon.getUTCDate(), 0, 0, 0))
    const dayEnd   = new Date(Date.UTC(proposedDateNoon.getUTCFullYear(), proposedDateNoon.getUTCMonth(), proposedDateNoon.getUTCDate(), 23, 59, 59))
    const conflict = await prisma.booking.findFirst({
      where: {
        id: { not: params.id },
        providerId: booking.providerId,
        date: { gte: dayStart, lte: dayEnd },
        time,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    })
    if (conflict) {
      return NextResponse.json(
        { error: 'This time slot is already booked. Please choose a different time.' },
        { status: 409 }
      )
    }

    // All checks passed — record the reschedule request
    const updated = await prisma.booking.update({
      where: { id: params.id },
      data: {
        status: 'RESCHEDULE_REQUESTED',
        rescheduleDate: proposedDateNoon,
        rescheduleTime: time,
        rescheduleReason: reason?.trim() || null,
        rescheduleRequestedAt: new Date(),
      },
    })

    // Audit log
    await prisma.bookingStatusHistory.create({
      data: {
        bookingId: params.id,
        fromStatus: booking.status,
        toStatus: 'RESCHEDULE_REQUESTED',
        changedBy: session.user.id,
        reason: `Customer requested reschedule to ${date} ${time}`,
      },
    }).catch(() => {})

    // Notify provider
    await prisma.notification.create({
      data: {
        userId: booking.providerId,
        type: 'RESCHEDULE_REQUESTED',
        title: 'Reschedule requested',
        message: `A client wants to reschedule to ${date} at ${time}. Review and accept or decline.`,
        link: '/dashboard/provider/bookings',
      },
    }).catch(() => {})

    return NextResponse.json({ booking: updated })
  } catch (error) {
    console.error('Reschedule error:', error)
    return NextResponse.json({ error: 'Failed to submit reschedule request' }, { status: 500 })
  }
}

// GET: return available slots for a proposed reschedule date (used by the reschedule modal)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const dateStr = searchParams.get('date')
  if (!dateStr) return NextResponse.json({ error: 'date param required' }, { status: 400 })

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { provider: { include: { providerProfile: true } } },
  })
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (booking.customerId !== session.user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const providerId = booking.provider.providerProfile?.id
  if (!providerId) return NextResponse.json({ availableSlots: [] })

  const proposedDate = parseDateNoonUTC(dateStr)
  const exactAv = await prisma.availability.findUnique({
    where: { providerId_date: { providerId, date: proposedDate } },
  })

  if (exactAv?.isBlocked) return NextResponse.json({ availableSlots: [], isBlocked: true })

  let availability = exactAv
  if (!availability) {
    const dow = proposedDate.getUTCDay()
    const sentinel = DAY_TO_SENTINEL[dow]
    if (sentinel) {
      availability = await prisma.availability.findUnique({
        where: { providerId_date: { providerId, date: parseDateNoonUTC(sentinel) } },
      })
    }
  }

  if (!availability || availability.isBlocked || availability.timeSlots.length === 0) {
    return NextResponse.json({ availableSlots: [] })
  }

  // Exclude slots taken by other confirmed/pending bookings on that day
  const dayStart = new Date(Date.UTC(proposedDate.getUTCFullYear(), proposedDate.getUTCMonth(), proposedDate.getUTCDate(), 0, 0, 0))
  const dayEnd   = new Date(Date.UTC(proposedDate.getUTCFullYear(), proposedDate.getUTCMonth(), proposedDate.getUTCDate(), 23, 59, 59))
  const existing = await prisma.booking.findMany({
    where: {
      id: { not: params.id },
      providerId: booking.providerId,
      date: { gte: dayStart, lte: dayEnd },
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
    select: { time: true },
  })
  const occupied = new Set(existing.map(b => b.time))
  const availableSlots = availability.timeSlots.filter(s => !occupied.has(s))

  return NextResponse.json({ availableSlots })
}

// P1-E: Provider accepts or declines a reschedule request
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { action } = await req.json()
    if (action !== 'ACCEPT' && action !== 'DECLINE') {
      return NextResponse.json({ error: 'action must be ACCEPT or DECLINE' }, { status: 400 })
    }

    const booking = await prisma.booking.findUnique({ where: { id: params.id } })
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    if (booking.providerId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }
    if (booking.status !== 'RESCHEDULE_REQUESTED') {
      return NextResponse.json({ error: 'Booking is not in RESCHEDULE_REQUESTED state' }, { status: 400 })
    }

    let updated
    if (action === 'ACCEPT') {
      // Apply the proposed date/time and confirm
      updated = await prisma.booking.update({
        where: { id: params.id },
        data: {
          status: 'CONFIRMED',
          date: booking.rescheduleDate ?? booking.date,
          time: booking.rescheduleTime ?? booking.time,
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
          title: 'Reschedule accepted',
          message: `The artist accepted your reschedule request. Your booking has been updated.`,
          link: '/bookings',
        },
      }).catch(() => {})
    } else {
      // Decline — revert to CONFIRMED with original date/time
      updated = await prisma.booking.update({
        where: { id: params.id },
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
          type: 'BOOKING_CANCELLED',
          title: 'Reschedule declined',
          message: `The artist couldn't accommodate the new time. Your original booking remains confirmed.`,
          link: '/bookings',
        },
      }).catch(() => {})
    }

    await prisma.bookingStatusHistory.create({
      data: {
        bookingId: params.id,
        fromStatus: 'RESCHEDULE_REQUESTED',
        toStatus: 'CONFIRMED',
        changedBy: session.user.id,
        reason: action === 'ACCEPT' ? 'Provider accepted reschedule' : 'Provider declined reschedule',
      },
    }).catch(() => {})

    return NextResponse.json({ booking: updated })
  } catch (error) {
    console.error('Reschedule response error:', error)
    return NextResponse.json({ error: 'Failed to respond to reschedule request' }, { status: 500 })
  }
}
