import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function icalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z')
}

function icalEscape(str: string): string {
  return str.replace(/[\\;,]/g, c => '\\' + c).replace(/\n/g, '\\n')
}

function fold(line: string): string {
  // iCal RFC 5545 — fold lines longer than 75 octets
  if (line.length <= 75) return line
  const chunks: string[] = []
  chunks.push(line.slice(0, 75))
  let i = 75
  while (i < line.length) {
    chunks.push(' ' + line.slice(i, i + 74))
    i += 74
  }
  return chunks.join('\r\n')
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) {
    return new NextResponse('Missing token', { status: 400 })
  }

  // Token is the provider's icalToken (opaque UUID — not the userId)
  const provider = await prisma.providerProfile.findFirst({
    where: { icalToken: token },
    include: { user: { select: { name: true } } },
  })

  if (!provider) {
    return new NextResponse('Not found', { status: 404 })
  }

  // Fetch confirmed/pending bookings from last 30 days through next year
  const since = new Date()
  since.setDate(since.getDate() - 30)

  const bookings = await prisma.booking.findMany({
    where: {
      providerId: provider.userId,
      status: { in: ['CONFIRMED', 'PENDING', 'COMPLETED'] },
      date: { gte: since },
    },
    include: {
      service: { select: { title: true, duration: true } },
      customer: { select: { name: true } },
    },
    orderBy: { date: 'asc' },
    take: 500,
  })

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sparq//Bookings//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    fold(`X-WR-CALNAME:Sparq – ${provider.user.name ?? 'My'} Bookings`),
    'X-WR-TIMEZONE:Australia/Sydney',
    'X-WR-CALDESC:Your upcoming bookings from Sparq',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
  ]

  const now = icalDate(new Date())

  for (const booking of bookings) {
    const startDate = new Date(booking.date)
    const [h, m] = (booking.time ?? '00:00').split(':').map(Number)
    startDate.setHours(h, m, 0, 0)
    const endDate = new Date(startDate.getTime() + (booking.service.duration ?? 60) * 60_000)

    const summary = `${booking.service.title} – ${booking.customer.name ?? 'Client'}`
    const statusMap: Record<string, string> = {
      CONFIRMED: 'CONFIRMED',
      PENDING: 'TENTATIVE',
      COMPLETED: 'CONFIRMED',
    }

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:booking-${booking.id}@sparq.com.au`)
    lines.push(`DTSTAMP:${now}`)
    lines.push(`DTSTART:${icalDate(startDate)}`)
    lines.push(`DTEND:${icalDate(endDate)}`)
    lines.push(fold(`SUMMARY:${icalEscape(summary)}`))
    lines.push(`STATUS:${statusMap[booking.status] ?? 'TENTATIVE'}`)
    if (booking.address) {
      lines.push(fold(`LOCATION:${icalEscape(booking.address)}`))
    }
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')

  const ical = lines.join('\r\n') + '\r\n'

  return new NextResponse(ical, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="sparq-bookings.ics"',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
