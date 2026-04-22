import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSentinelDateString, getSentinelDate } from '@/lib/availability-sentinel'

function parseDateNoonUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
}

// P0-D/UX-H1: Batch availability — returns available dates for a date range (up to 60 days)
// Used by the booking calendar to grey out unavailable days.
async function getBatchAvailability(providerProfileId: string, fromStr: string, toStr: string) {
  const from = parseDateNoonUTC(fromStr)
  const to = parseDateNoonUTC(toStr)

  if (isNaN(from.getTime()) || isNaN(to.getTime())) return null

  // Clamp range to max 60 days
  const maxRange = 60 * 24 * 60 * 60 * 1000
  const actualTo = new Date(Math.min(to.getTime(), from.getTime() + maxRange))

  // Fetch all sentinel (weekly default) availability records for this provider
  const sentinelDates = [0, 1, 2, 3, 4, 5, 6].map(dow => getSentinelDate(dow))
  const sentinels = await prisma.availability.findMany({
    where: { providerProfileId, date: { in: sentinelDates } },
  })
  // Sentinel dates are in year 2000; map by DOW
  const sentinelByDow = new Map<number, typeof sentinels[0]>()
  for (const s of sentinels) {
    const dow = s.date.getUTCDay()
    sentinelByDow.set(dow, s)
  }

  // Fetch date-specific overrides in the requested range
  const overrides = await prisma.availability.findMany({
    where: {
      providerProfileId,
      date: { gte: from, lte: actualTo },
    },
  })
  const overrideMap = new Map(overrides.map(o => [o.date.toISOString().slice(0, 10), o]))

  // Build list of available dates
  const availableDates: string[] = []
  const current = new Date(from)
  while (current <= actualTo) {
    const dateStr = current.toISOString().slice(0, 10)
    const override = overrideMap.get(dateStr)
    let isAvailable: boolean

    if (override) {
      isAvailable = !override.isBlocked && override.timeSlots.length > 0
    } else {
      const dow = current.getUTCDay()
      const sentinel = sentinelByDow.get(dow)
      isAvailable = !!sentinel && !sentinel.isBlocked && sentinel.timeSlots.length > 0
    }

    if (isAvailable) availableDates.push(dateStr)

    // Advance by 1 day (using UTC)
    current.setUTCDate(current.getUTCDate() + 1)
    current.setUTCHours(12, 0, 0, 0)
  }

  return { availableDates }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url)

    // P0-D: Batch mode — return available dates for a range
    const fromStr = searchParams.get('from')
    const toStr = searchParams.get('to')
    if (fromStr && toStr) {
      // FIND-1 fix: URL param is ProviderProfile.id (consistent with
      // /api/providers/[id]). Previously this endpoint matched by userId,
      // so every call from the booking page (which passed ProviderProfile.id)
      // 404'd silently.
      const provider = await prisma.providerProfile.findUnique({
        where: { id: params.id },
        select: { id: true },
      })
      if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
      const result = await getBatchAvailability(provider.id, fromStr, toStr)
      if (!result) return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
      return NextResponse.json(result)
    }

    const dateStr = searchParams.get('date')
    if (!dateStr) return NextResponse.json({ error: 'date query param required' }, { status: 400 })

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return NextResponse.json({ error: 'Invalid date format, use YYYY-MM-DD' }, { status: 400 })
    }

    const date = parseDateNoonUTC(dateStr)
    if (isNaN(date.getTime())) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })

    // Find the provider profile. URL param is ProviderProfile.id (FIND-1).
    const provider = await prisma.providerProfile.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true },
    })
    if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })

    // Check for date-specific availability override
    // Use the same noon-UTC date for lookup since schema uses @db.Date
    let availability = await prisma.availability.findUnique({
      where: {
        providerProfileId_date: {
          providerProfileId: provider.id,
          date,
        },
      },
    })

    // If the match is a sentinel (year 2000), it's not a real override — ignore it
    const isOverride = availability && availability.date.getFullYear() !== 2000

    // If no date-specific override, fall back to weekly default
    if (!isOverride) {
      const dayOfWeek = date.getUTCDay() // Use UTC to match how we stored the date
      const sentinelDate = getSentinelDate(dayOfWeek)
      availability = await prisma.availability.findUnique({
        where: {
          providerProfileId_date: {
            providerProfileId: provider.id,
            date: sentinelDate,
          },
        },
      })
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
        providerUserId: provider.userId,
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
