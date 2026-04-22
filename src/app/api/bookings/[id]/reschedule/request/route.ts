import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSentinelDateString } from '@/lib/availability-sentinel'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { proposedDate, proposedTime, reason } = await req.json()
  if (!proposedDate || !proposedTime) {
    return NextResponse.json({ error: 'Proposed date and time are required.' }, { status: 400 })
  }

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: {
      provider: { select: { name: true } },
    },
  })

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (booking.customerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
    return NextResponse.json({ error: 'This booking cannot be rescheduled in its current state.' }, { status: 400 })
  }

  // Minimum notice: 4 hours (parse as Sydney wall-clock time, not UTC)
  // Compute current Sydney offset vs UTC so the 4-hour check uses local time correctly
  const nowInSydney = new Date(new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' }))
  const nowUtc = new Date()
  const sydneyOffsetMs = nowInSydney.getTime() - nowUtc.getTime()
  // proposedUtc = the wall-clock time the customer entered MINUS the Sydney UTC offset
  const proposedUtc = new Date(new Date(`${proposedDate}T${proposedTime}:00`).getTime() - sydneyOffsetMs)
  if (proposedUtc < new Date(Date.now() + 4 * 3600 * 1000)) {
    return NextResponse.json({ error: 'Reschedule must be at least 4 hours in the future.' }, { status: 400 })
  }

  const [y, m, d] = proposedDate.split('-').map(Number)
  const proposedDateNoon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))

  // P1-2: Fetch the service for this booking to get its duration, then do a
  // slot-based overlap check (mirrors the logic in POST /api/bookings).
  const bookingWithService = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { service: { select: { duration: true } } },
  })
  const serviceDuration = bookingWithService?.service?.duration ?? 60

  // Find all existing PENDING/CONFIRMED bookings for this provider on the proposed date
  const dayStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0))
  const dayEnd   = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999))
  const existingBookings = await prisma.booking.findMany({
    where: {
      providerId: booking.providerId,
      date: { gte: dayStart, lte: dayEnd },
      status: { in: ['PENDING', 'CONFIRMED'] },
      NOT: { id: params.id },
    },
    include: { service: { select: { duration: true } } },
  })

  // Build set of occupied 30-min slots from existing bookings
  const occupiedSlots = new Set<string>()
  for (const existing of existingBookings) {
    const [eh, em] = existing.time.split(':').map(Number)
    const dur = existing.service?.duration ?? 60
    const slotsNeeded = Math.ceil(dur / 30)
    for (let i = 0; i < slotsNeeded; i++) {
      const mins = eh * 60 + em + i * 30
      occupiedSlots.add(`${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`)
    }
  }

  // Check all 30-min slots the rescheduled service would occupy
  const [rh, rm] = proposedTime.split(':').map(Number)
  const newSlotsNeeded = Math.ceil(serviceDuration / 30)
  for (let i = 0; i < newSlotsNeeded; i++) {
    const mins = rh * 60 + rm + i * 30
    const slotKey = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
    if (occupiedSlots.has(slotKey)) {
      return NextResponse.json(
        { error: 'That time slot is already booked. Please choose a different time.' },
        { status: 409 }
      )
    }
  }

  // P1-A: Check that the proposed date is not in the provider's blocked dates
  const proposedDayOfWeek = proposedDateNoon.getUTCDay()
  const sentinelDateStr = getSentinelDateString(proposedDayOfWeek)
  const sentinelDate = new Date(`${sentinelDateStr}T12:00:00.000Z`)

  const blockedAvailability = await prisma.availability.findMany({
    where: {
      providerId: booking.providerId,
      isBlocked: true,
      date: { in: [proposedDateNoon, sentinelDate] },
    },
  })
  if (blockedAvailability.length > 0) {
    return NextResponse.json(
      { error: 'The artist is not available on that date. Please choose a different date.' },
      { status: 409 }
    )
  }

  // P1-1: Check that proposedTime is within the provider's available time slots
  const availabilityRecord = await prisma.availability.findFirst({
    where: {
      providerId: booking.providerId,
      isBlocked: false,
      OR: [
        { date: { equals: proposedDateNoon } },
        { date: { equals: sentinelDate } },
      ],
    },
    // Prefer exact-date override over sentinel: order by year DESC so year-2025 comes before year-2000
    orderBy: { date: 'desc' },
    select: { timeSlots: true },
  })

  if (!availabilityRecord || !availabilityRecord.timeSlots.includes(proposedTime)) {
    return NextResponse.json(
      { error: 'That time is outside the artist\'s available hours. Please choose a different time.' },
      { status: 409 }
    )
  }

  await prisma.booking.update({
    where: { id: params.id },
    data: {
      status: 'RESCHEDULE_REQUESTED',
      rescheduleDate: proposedDateNoon,
      rescheduleTime: proposedTime,
      rescheduleReason: reason ?? null,
      rescheduleRequestedAt: new Date(),
    },
  })

  // Notify provider
  await prisma.notification.create({
    data: {
      userId: booking.providerId,
      type: 'RESCHEDULE_REQUESTED',
      title: 'Reschedule request',
      message: `Your client wants to reschedule to ${new Date(proposedDate).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} at ${proposedTime}.${reason ? ` Reason: ${reason}` : ''}`,
      link: '/dashboard/provider/bookings',
    },
  }).catch(() => {})

  return NextResponse.json({ success: true })
}
