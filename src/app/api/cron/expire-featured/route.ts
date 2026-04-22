import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // M-4: Notify providers 48h before featured listing expires (pre-expiry prompt)
    const soonExpiringFeatured = await prisma.providerProfile.findMany({
      where: {
        isFeatured: true,
        featuredUntil: {
          gte: new Date(),
          lte: new Date(Date.now() + 48 * 60 * 60 * 1000),
        },
      },
      include: { user: true },
    })

    for (const profile of soonExpiringFeatured) {
      // Check if a "expiring soon" notification was already sent recently (within 48h) to avoid duplicates
      const recentNotif = await prisma.notification.findFirst({
        where: {
          userId: profile.userId,
          title: 'Featured listing expiring soon',
          createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
        },
      })
      if (!recentNotif) {
        await prisma.notification.create({
          data: {
            userId: profile.userId,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            type: 'GENERAL' as any, // GENERAL enum value requires prisma db push
            title: 'Featured listing expiring soon',
            message: `Your featured listing expires in 48 hours. Renew now to stay at the top of search results.`,
            link: '/dashboard/provider/featured',
          },
        }).catch(() => {})
      }
    }

    // First find who's expiring
    const expiringProfiles = await prisma.providerProfile.findMany({
      where: {
        isFeatured: true,
        featuredUntil: { lt: new Date() },
      },
      select: { userId: true, id: true },
    })

    // Then update
    const expired = await prisma.providerProfile.updateMany({
      where: {
        isFeatured: true,
        featuredUntil: { lt: new Date() },
      },
      data: { isFeatured: false, featuredUntil: null },
    })

    // Notify each provider
    for (const profile of expiringProfiles) {
      await prisma.notification.create({
        data: {
          userId: profile.userId,
          type: 'PAYOUT_SENT',
          title: 'Your featured listing has expired',
          message: 'Your featured placement has ended. Renew to stay at the top of search results!',
          link: '/dashboard/provider/featured',
        },
      }).catch(() => {})
    }

    // Note: AuditLog requires a valid actorId (User FK), so system cron events are not logged here.

    return NextResponse.json({ expired: expired.count })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
