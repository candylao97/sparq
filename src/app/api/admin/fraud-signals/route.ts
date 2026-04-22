// T&S-2: Fraud signal aggregation
// Returns users flagged by multiple risk signals:
//   - 3+ contact leakage flags in 7 days
//   - dispute rate > 30%
//   - cancellation rate > 50%
//   - 2+ chargebacks (refundStatus = PROCESSED on disputed bookings)

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    // 1. Users with 3+ contact leakage flags in the last 7 days
    const leakageFlagCounts = await prisma.contactLeakageFlag.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: sevenDaysAgo } },
      _count: { id: true },
      having: { id: { _count: { gte: 3 } } },
    })

    // 2. Customers with dispute rate > 30% (min 3 completed bookings)
    const allCustomerBookings = await prisma.booking.groupBy({
      by: ['customerId'],
      where: { status: { in: ['COMPLETED', 'DISPUTED'] } },
      _count: { id: true },
    })
    const disputedBookings = await prisma.booking.groupBy({
      by: ['customerId'],
      where: { status: 'DISPUTED' },
      _count: { id: true },
    })
    const disputedMap = new Map(disputedBookings.map(d => [d.customerId, d._count.id]))

    const highDisputeRate = allCustomerBookings
      .filter(b => {
        const total = b._count.id
        const disputed = disputedMap.get(b.customerId) ?? 0
        return total >= 3 && disputed / total > 0.3
      })
      .map(b => b.customerId)

    // 3. Customers with cancellation rate > 50% (min 3 terminal bookings)
    const allTerminalBookings = await prisma.booking.groupBy({
      by: ['customerId'],
      where: { status: { in: ['COMPLETED', 'CANCELLED_BY_CUSTOMER', 'NO_SHOW', 'DECLINED', 'EXPIRED'] } },
      _count: { id: true },
    })
    const cancelledBookings = await prisma.booking.groupBy({
      by: ['customerId'],
      where: { status: 'CANCELLED_BY_CUSTOMER' },
      _count: { id: true },
    })
    const cancelledMap = new Map(cancelledBookings.map(c => [c.customerId, c._count.id]))

    const highCancelRate = allTerminalBookings
      .filter(b => {
        const total = b._count.id
        const cancelled = cancelledMap.get(b.customerId) ?? 0
        return total >= 3 && cancelled / total > 0.5
      })
      .map(b => b.customerId)

    // 4. Users with 2+ refunded-on-dispute bookings (chargeback signals)
    const chargebackCounts = await prisma.booking.groupBy({
      by: ['customerId'],
      where: {
        status: 'DISPUTED',
        refundStatus: 'PROCESSED',
      },
      _count: { id: true },
      having: { id: { _count: { gte: 2 } } },
    })

    // Collect all flagged user IDs
    const flaggedUserIds = new Set<string>([
      ...leakageFlagCounts.map(f => f.userId),
      ...highDisputeRate,
      ...highCancelRate,
      ...chargebackCounts.map(c => c.customerId),
    ])

    if (flaggedUserIds.size === 0) {
      return NextResponse.json({ flaggedUsers: [] })
    }

    // Fetch user details for flagged IDs
    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(flaggedUserIds) } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })

    // Build enriched signal list
    const leakageMap = new Map(leakageFlagCounts.map(f => [f.userId, f._count.id]))
    const allTerminalMap = new Map(allTerminalBookings.map(b => [b.customerId, b._count.id]))
    const allCompletedDisputed = new Map(allCustomerBookings.map(b => [b.customerId, b._count.id]))
    const chargebackMap = new Map(chargebackCounts.map(c => [c.customerId, c._count.id]))

    const flaggedUsers = users.map(user => {
      const signals: string[] = []
      const leakCount = leakageMap.get(user.id) ?? 0
      if (leakCount >= 3) signals.push(`${leakCount} contact leakage flags (7d)`)

      const totalTerminal = allTerminalMap.get(user.id) ?? 0
      const totalCancelled = cancelledMap.get(user.id) ?? 0
      if (totalTerminal >= 3 && totalCancelled / totalTerminal > 0.5) {
        signals.push(`${Math.round(totalCancelled / totalTerminal * 100)}% cancellation rate`)
      }

      const totalCompletedDisputed = allCompletedDisputed.get(user.id) ?? 0
      const totalDisputed = disputedMap.get(user.id) ?? 0
      if (totalCompletedDisputed >= 3 && totalDisputed / totalCompletedDisputed > 0.3) {
        signals.push(`${Math.round(totalDisputed / totalCompletedDisputed * 100)}% dispute rate`)
      }

      const chargebacks = chargebackMap.get(user.id) ?? 0
      if (chargebacks >= 2) signals.push(`${chargebacks} disputed+refunded bookings`)

      return { ...user, signals, riskScore: signals.length }
    })
      .filter(u => u.signals.length > 0)
      .sort((a, b) => b.riskScore - a.riskScore)

    return NextResponse.json({ flaggedUsers })
  } catch (error) {
    console.error('Fraud signals error:', error)
    return NextResponse.json({ error: 'Failed to compute fraud signals' }, { status: 500 })
  }
}
