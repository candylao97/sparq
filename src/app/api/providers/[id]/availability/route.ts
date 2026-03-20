import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Sentinel dates for weekly defaults — must match dashboard availability route
const DAY_TO_SENTINEL: Record<number, string> = {
  1: '2000-01-03', // Monday
  2: '2000-01-04', // Tuesday
  3: '2000-01-05', // Wednesday
  4: '2000-01-06', // Thursday
  5: '2000-01-07', // Friday
  6: '2000-01-08', // Saturday
  0: '2000-01-09', // Sunday
}

function parseDateNoonUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url)
    const dateStr = searchParams.get('date')
    if (!dateStr) return NextResponse.json({ error: 'date query param required' }, { status: 400 })

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return NextResponse.json({ error: 'Invalid date format, use YYYY-MM-DD' }, { status: 400 })
    }

    const date = parseDateNoonUTC(dateStr)
    if (isNaN(date.getTime())) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })

    // Find the provider profile
    const provider = await prisma.providerProfile.findFirst({
      where: { userId: params.id },
      select: { id: true },
    })
    if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })

    // Check for date-specific availability override
    // Use the same noon-UTC date for lookup since schema uses @db.Date
    let availability = await prisma.availability.findUnique({
      where: {
        providerId_date: {
          providerId: provider.id,
          date,
        },
      },
    })

    // If the match is a sentinel (year 2000), it's not a real override — ignore it
    const isOverride = availability && availability.date.getFullYear() !== 2000

    // If no date-specific override, fall back to weekly default
    if (!isOverride) {
      const dayOfWeek = date.getUTCDay() // Use UTC to match how we stored the date
      const sentinel = DAY_TO_SENTINEL[dayOfWeek]
      if (sentinel) {
        const sentinelDate = parseDateNoonUTC(sentinel)
        availability = await prisma.availability.findUnique({
          where: {
            providerId_date: {
              providerId: provider.id,
              date: sentinelDate,
            },
          },
        })
      } else {
        availability = null
      }
    }

    if (!availability || availability.isBlocked) {
      return NextResponse.json({ availableSlots: [], isBlocked: !availability ? false : true })
    }

    // Get existing bookings for this provider on this date to exclude taken slots
    // Build a date range for the calendar day
    const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0))
    const dayEnd = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999))

    const existingBookings = await prisma.booking.findMany({
      where: {
        providerId: params.id,
        date: { gte: dayStart, lte: dayEnd },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      include: { service: { select: { duration: true } } },
    })

    // Calculate occupied time slots (each slot = 30 min)
    const occupiedSlots = new Set<string>()
    for (const booking of existingBookings) {
      const [hours, minutes] = booking.time.split(':').map(Number)
      const durationMinutes = booking.service.duration
      const slotsNeeded = Math.ceil(durationMinutes / 30)

      for (let i = 0; i < slotsNeeded; i++) {
        const slotMinutes = hours * 60 + minutes + i * 30
        const slotHour = Math.floor(slotMinutes / 60)
        const slotMin = slotMinutes % 60
        occupiedSlots.add(`${String(slotHour).padStart(2, '0')}:${String(slotMin).padStart(2, '0')}`)
      }
    }

    // Filter available slots
    const availableSlots = availability.timeSlots.filter(slot => !occupiedSlots.has(slot))

    return NextResponse.json({ availableSlots, isBlocked: false })
  } catch (error) {
    console.error('Availability fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
  }
}
