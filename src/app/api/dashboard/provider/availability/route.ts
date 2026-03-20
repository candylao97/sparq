import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Sentinel dates for weekly defaults (year 2000)
// 2000-01-03 = Monday (.getDay() = 1) through 2000-01-09 = Sunday (.getDay() = 0)
const DAY_TO_SENTINEL: Record<number, string> = {
  1: '2000-01-03', // Monday
  2: '2000-01-04', // Tuesday
  3: '2000-01-05', // Wednesday
  4: '2000-01-06', // Thursday
  5: '2000-01-07', // Friday
  6: '2000-01-08', // Saturday
  0: '2000-01-09', // Sunday
}

function parseDateSafe(dateStr: string): Date {
  // Use noon UTC to prevent timezone shifts when Prisma stores as @db.Date
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
    })
    if (!profile) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })

    // Fetch weekly defaults (sentinel dates in year 2000)
    const defaults = await prisma.availability.findMany({
      where: {
        providerId: profile.id,
        date: { gte: new Date(Date.UTC(2000, 0, 2)), lte: new Date(Date.UTC(2000, 0, 10)) },
      },
    })

    // Fetch date overrides (today → 90 days out)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const futureEnd = new Date(today)
    futureEnd.setDate(futureEnd.getDate() + 90)

    const overrides = await prisma.availability.findMany({
      where: {
        providerId: profile.id,
        date: { gte: today, lte: futureEnd },
      },
      orderBy: { date: 'asc' },
    })

    // Fetch booked slots for visual indicators
    const bookings = await prisma.booking.findMany({
      where: {
        providerId: session.user.id,
        date: { gte: today, lte: futureEnd },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      select: { date: true, time: true },
    })

    // Map sentinel dates to day-of-week
    const weeklyDefaults: Record<number, { timeSlots: string[]; isBlocked: boolean }> = {}
    for (const d of defaults) {
      const dow = d.date.getDay()
      weeklyDefaults[dow] = { timeSlots: d.timeSlots, isBlocked: d.isBlocked }
    }

    return NextResponse.json({
      weeklyDefaults,
      overrides: overrides.map(o => ({
        date: o.date.toISOString().split('T')[0],
        timeSlots: o.timeSlots,
        isBlocked: o.isBlocked,
      })),
      bookedSlots: bookings.map(b => ({
        date: b.date.toISOString().split('T')[0],
        time: b.time,
      })),
    })
  } catch (error) {
    console.error('Availability GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
    })
    if (!profile) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })

    const body = await req.json()

    // Mode 1: Batch save weekly defaults
    if (body.batch && Array.isArray(body.entries)) {
      const ops = body.entries.map((entry: { dayOfWeek: number; timeSlots: string[]; isBlocked: boolean }) => {
        const sentinel = DAY_TO_SENTINEL[entry.dayOfWeek]
        if (!sentinel) throw new Error(`Invalid dayOfWeek: ${entry.dayOfWeek}`)
        const date = parseDateSafe(sentinel)

        return prisma.availability.upsert({
          where: { providerId_date: { providerId: profile.id, date } },
          update: { timeSlots: entry.timeSlots, isBlocked: entry.isBlocked },
          create: { providerId: profile.id, date, timeSlots: entry.timeSlots, isBlocked: entry.isBlocked },
        })
      })

      await prisma.$transaction(ops)
      return NextResponse.json({ success: true, count: ops.length })
    }

    // Mode 2: Block a date range (vacation mode)
    if (body.blockRange && body.startDate && body.days) {
      const start = parseDateSafe(body.startDate)
      const days = Math.min(body.days, 30) // cap at 30 days
      const ops = []

      for (let i = 0; i < days; i++) {
        const date = new Date(start)
        date.setDate(date.getDate() + i)

        ops.push(
          prisma.availability.upsert({
            where: { providerId_date: { providerId: profile.id, date } },
            update: { isBlocked: true, timeSlots: [] },
            create: { providerId: profile.id, date, isBlocked: true, timeSlots: [] },
          })
        )
      }

      await prisma.$transaction(ops)
      return NextResponse.json({ success: true, count: ops.length })
    }

    // Mode 3: Single date upsert
    if (!body.date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    const date = parseDateSafe(body.date)
    const timeSlots: string[] = body.timeSlots || []
    const isBlocked: boolean = body.isBlocked || false

    const record = await prisma.availability.upsert({
      where: { providerId_date: { providerId: profile.id, date } },
      update: { timeSlots, isBlocked },
      create: { providerId: profile.id, date, timeSlots, isBlocked },
    })

    return NextResponse.json({
      date: record.date.toISOString().split('T')[0],
      timeSlots: record.timeSlots,
      isBlocked: record.isBlocked,
    })
  } catch (error) {
    console.error('Availability POST error:', error)
    return NextResponse.json({ error: 'Failed to save availability' }, { status: 500 })
  }
}
