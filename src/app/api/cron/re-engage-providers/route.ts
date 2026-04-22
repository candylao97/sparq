import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000)
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 3600 * 1000)

  // Find providers with ACTIVE accounts (accountStatus = ACTIVE)
  const inactiveProviders = await prisma.providerProfile.findMany({
    where: {
      accountStatus: 'ACTIVE',
    },
    select: {
      userId: true,
      user: { select: { name: true } },
    },
  })

  const providerUserIds = inactiveProviders.map(p => p.userId)

  // Batch-fetch the most recent booking per provider (avoids N individual queries)
  const recentBookings = await prisma.booking.findMany({
    where: { providerUserId: { in: providerUserIds } },
    orderBy: { createdAt: 'desc' },
    distinct: ['providerUserId'],
    select: { providerUserId: true, createdAt: true },
  })
  const lastBookingMap = new Map(recentBookings.map(b => [b.providerUserId, b.createdAt]))

  // Batch-fetch dedup notifications — one query for all providers (avoids N individual queries)
  // P2-B: Dedup by type + recency rather than title text — avoids brittle string matching.
  const thirtyDaysAgoDedup = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const recentNudges = await prisma.notification.findMany({
    where: {
      userId: { in: providerUserIds },
      type: 'NEW_BOOKING',  // type used for re-engagement nudges
      createdAt: { gt: thirtyDaysAgoDedup },
    },
    select: { userId: true },
  })
  const recentNudgeSet = new Set(recentNudges.map(n => n.userId))

  let notified = 0

  for (const provider of inactiveProviders) {
    const lastBookingDate = lastBookingMap.get(provider.userId)

    if (!lastBookingDate) continue  // Never had a booking — skip
    if (lastBookingDate > thirtyDaysAgo) continue  // Active recently — skip

    // A provider should not receive a re-engagement nudge more than once per 30 days.
    if (recentNudgeSet.has(provider.userId)) continue  // Already nudged — skip

    await prisma.notification.create({
      data: {
        userId: provider.userId,
        type: 'NEW_BOOKING',  // closest available type for re-engagement nudge
        title: 'Your clients are missing you ✨',
        message: `It's been a while since your last booking on Sparq. Update your availability to start getting requests again!`,
      },
    }).catch(() => {})

    notified++
  }

  return NextResponse.json({ checked: inactiveProviders.length, notified })
}
