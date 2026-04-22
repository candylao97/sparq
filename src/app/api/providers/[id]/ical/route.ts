import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  // Verify ical token from query param
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  const profile = await prisma.providerProfile.findFirst({
    where: { userId: params.id },
    select: { icalToken: true, icalTokenExpiresAt: true, userId: true, accountStatus: true },
  })

  if (!profile || !profile.icalToken || profile.icalToken !== token) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  if (profile.icalTokenExpiresAt && profile.icalTokenExpiresAt < new Date()) {
    return new NextResponse('iCal token has expired. Please regenerate it in your settings.', { status: 401 })
  }

  if (profile.accountStatus && profile.accountStatus !== 'ACTIVE') {
    return new NextResponse('Account suspended', { status: 403 })
  }

  const bookings = await prisma.booking.findMany({
    where: {
      providerUserId: params.id,
      status: { in: ['CONFIRMED', 'COMPLETED'] },
      date: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) }, // 30 days back
    },
    include: {
      service: { select: { title: true, duration: true } },
      customer: { select: { name: true } },
    },
    orderBy: { date: 'asc' },
  })

  const uid_domain = 'sparq.com.au'
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

  const events = bookings.map(b => {
    const startDate = new Date(b.date)
    if (b.time) {
      const [h, m] = b.time.split(':').map(Number)
      startDate.setUTCHours(h, m, 0, 0)
    }
    const endDate = new Date(startDate.getTime() + (b.service?.duration ?? 60) * 60 * 1000)
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

    return [
      'BEGIN:VEVENT',
      `UID:${b.id}@${uid_domain}`,
      `DTSTAMP:${now}`,
      `DTSTART:${fmt(startDate)}`,
      `DTEND:${fmt(endDate)}`,
      `SUMMARY:${b.service?.title ?? 'Appointment'} \u2014 ${b.customer?.name ?? 'Client'}`,
      `DESCRIPTION:Booking #${b.id.slice(0, 8)}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
    ].join('\r\n')
  })

  const ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sparq//Sparq Bookings//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Sparq Bookings',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')

  return new NextResponse(ical, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="sparq-bookings.ics"',
    },
  })
}
