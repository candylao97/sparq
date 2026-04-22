import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * M16: Monthly earnings chart data for the provider dashboard.
 * Returns last 12 months of completed booking totals.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const providerProfile = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })
    if (!providerProfile) return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 })

    // Fetch completed bookings in the last 12 months
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11)
    twelveMonthsAgo.setDate(1)
    twelveMonthsAgo.setHours(0, 0, 0, 0)

    const completedBookings = await prisma.booking.findMany({
      where: {
        providerId: session.user.id,
        status: 'COMPLETED',
        completedAt: { gte: twelveMonthsAgo },
      },
      select: {
        totalPrice: true,
        platformFee: true,
        completedAt: true,
      },
    })

    // Group by year-month
    const monthMap: Record<string, { revenue: number; bookings: number }> = {}
    for (const booking of completedBookings) {
      if (!booking.completedAt) continue
      const d = new Date(booking.completedAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!monthMap[key]) monthMap[key] = { revenue: 0, bookings: 0 }
      monthMap[key].revenue += booking.totalPrice - booking.platformFee
      monthMap[key].bookings += 1
    }

    // Build last 12 months array (fill gaps with 0)
    const months: { month: string; label: string; revenue: number; bookings: number }[] = []
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })
      months.push({
        month: key,
        label,
        revenue: Math.round((monthMap[key]?.revenue ?? 0) * 100) / 100,
        bookings: monthMap[key]?.bookings ?? 0,
      })
    }

    return NextResponse.json({ months })
  } catch (error) {
    console.error('Earnings by month error:', error)
    return NextResponse.json({ error: 'Failed to fetch earnings data' }, { status: 500 })
  }
}
