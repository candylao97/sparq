import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Cron: update provider tiers based on ScoreFactors.
 * Runs daily at midnight (vercel.json schedule: "0 0 * * *")
 *
 * Before computing tiers, this cron:
 *  1. Computes real ScoreFactors from booking/review data (M08)
 *  2. Updates responseTimeHours on provider profiles (M09)
 *  3. Then runs the tier calculation with fresh data
 *
 * Tier thresholds (composite score out of 5):
 *   ELITE:   >= 4.8 AND >= 50 completed bookings
 *   PRO:     >= 4.5 AND >= 20 completed bookings
 *   TRUSTED: >= 4.0 AND >= 10 completed bookings
 *   RISING:  >= 3.0 AND >= 3  completed bookings
 *   NEWCOMER: everyone else
 */

function calcComposite(sf: {
  reviewScore: number
  completionScore: number
  responseScore: number
  consistencyScore: number
  verificationScore: number
}): number {
  return (
    sf.reviewScore      * 0.40 +
    sf.completionScore  * 0.25 +
    sf.responseScore    * 0.15 +
    sf.consistencyScore * 0.10 +
    sf.verificationScore * 0.10
  )
}

// Upgrade thresholds — must fully meet to gain a tier
function determineTierUpgrade(composite: number, completedCount: number): string {
  if (composite >= 4.8 && completedCount >= 50) return 'ELITE'
  if (composite >= 4.5 && completedCount >= 20) return 'PRO'
  if (composite >= 4.0 && completedCount >= 10) return 'TRUSTED'
  if (composite >= 3.0 && completedCount >= 3)  return 'RISING'
  return 'NEWCOMER'
}

// BL-M5: Hysteresis — downgrade requires score to fall 0.2 BELOW the tier floor
// and booking count to drop 20% below the threshold. This prevents oscillation at boundaries.
const DOWNGRADE_SCORE_BUFFER = 0.2
const DOWNGRADE_COUNT_BUFFER_PCT = 0.20 // 20% below the count threshold

function determineTierWithHysteresis(composite: number, completedCount: number, currentTier: string): string {
  const upgrade = determineTierUpgrade(composite, completedCount)

  // If score qualifies for an upgrade, apply immediately
  const TIER_ORDER = ['NEWCOMER', 'RISING', 'TRUSTED', 'PRO', 'ELITE']
  const currentIdx = TIER_ORDER.indexOf(currentTier)
  const upgradeIdx = TIER_ORDER.indexOf(upgrade)

  if (upgradeIdx >= currentIdx) {
    // Same tier or higher — apply directly
    return upgrade
  }

  // Potential downgrade — apply hysteresis buffer before lowering tier
  // A downgrade only fires when the composite is significantly below the current tier's floor
  const TIER_FLOORS: Record<string, { score: number; count: number }> = {
    ELITE:   { score: 4.8 - DOWNGRADE_SCORE_BUFFER, count: Math.floor(50 * (1 - DOWNGRADE_COUNT_BUFFER_PCT)) },
    PRO:     { score: 4.5 - DOWNGRADE_SCORE_BUFFER, count: Math.floor(20 * (1 - DOWNGRADE_COUNT_BUFFER_PCT)) },
    TRUSTED: { score: 4.0 - DOWNGRADE_SCORE_BUFFER, count: Math.floor(10 * (1 - DOWNGRADE_COUNT_BUFFER_PCT)) },
    RISING:  { score: 3.0 - DOWNGRADE_SCORE_BUFFER, count: Math.floor(3  * (1 - DOWNGRADE_COUNT_BUFFER_PCT)) },
  }

  const floor = TIER_FLOORS[currentTier]
  if (!floor) return upgrade // NEWCOMER has no floor — can only go up

  // Only apply downgrade if BOTH score and count are clearly below the floor
  if (composite < floor.score && completedCount < floor.count) {
    return upgrade // Drop the tier
  }

  // Within the hysteresis buffer — hold current tier
  return currentTier
}

// Normalise response time: <1h=5, 1-4h=4, 4-12h=3, 12-24h=2, >24h=1
function normaliseResponseTime(hours: number | undefined): number {
  if (hours === undefined) return 2.5 // unknown — neutral
  if (hours < 1) return 5
  if (hours < 4) return 4
  if (hours < 12) return 3
  if (hours < 24) return 2
  return 1
}

export async function GET(req: NextRequest) {
  // P2-3: Always validate CRON_SECRET — missing secret is a misconfiguration, not a bypass
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[CRON] CRON_SECRET not configured — refusing to run')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Load all active providers with their score factors
    const providers = await prisma.providerProfile.findMany({
      where: { accountStatus: 'ACTIVE' },
      select: {
        id: true,
        userId: true,
        tier: true,
        isVerified: true,  // needed for verificationScore
        scoreFactors: true,
      },
    })

    // Batch fetch completed booking counts
    const completedCounts = await prisma.booking.groupBy({
      by: ['providerId'],
      where: { status: 'COMPLETED' },
      _count: { id: true },
    })
    const countMap = new Map(completedCounts.map(c => [c.providerId, c._count.id]))

    // ── Compute ScoreFactors from real data (M08) ─────────────────────────────

    // Batch fetch all data needed to compute ScoreFactors
    const [ratingData, completionData, responseData, consistencyData] = await Promise.all([
      // reviewScore: average rating (0-5 scale, normalised to 0-5)
      prisma.$queryRaw<{ providerId: string; avg: number }[]>`
        SELECT b."providerId", AVG(r.rating)::float AS avg
        FROM "Review" r
        JOIN "Booking" b ON b.id = r."bookingId"
        WHERE r."isVisible" = true
        GROUP BY b."providerId"
      `,
      // completionScore: completion rate over last 90 days
      prisma.$queryRaw<{ providerId: string; total: bigint; completed: bigint }[]>`
        SELECT "providerId",
               COUNT(*) AS total,
               COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed
        FROM "Booking"
        WHERE "createdAt" >= NOW() - INTERVAL '90 days'
          AND status NOT IN ('PENDING', 'EXPIRED', 'DECLINED')
        GROUP BY "providerId"
      `,
      // responseScore: average accept-to-booking time (lower is better, normalised 0-5)
      prisma.$queryRaw<{ providerId: string; avg_hours: number }[]>`
        SELECT "providerId",
               EXTRACT(EPOCH FROM AVG("updatedAt" - "createdAt")) / 3600 AS avg_hours
        FROM "Booking"
        WHERE status = 'CONFIRMED'
          AND "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY "providerId"
      `,
      // consistencyScore: cancellation rate (lower is better)
      prisma.$queryRaw<{ providerId: string; total: bigint; cancelled: bigint }[]>`
        SELECT "providerId",
               COUNT(*) AS total,
               COUNT(*) FILTER (WHERE status IN ('CANCELLED_BY_PROVIDER', 'NO_SHOW')) AS cancelled
        FROM "Booking"
        WHERE "createdAt" >= NOW() - INTERVAL '90 days'
        GROUP BY "providerId"
      `,
    ])

    const ratingMap = new Map(ratingData.map(r => [r.providerId, r.avg]))
    const completionMap = new Map(completionData.map(r => [r.providerId, { total: Number(r.total), completed: Number(r.completed) }]))
    const responseMap = new Map(responseData.map(r => [r.providerId, r.avg_hours]))
    const consistencyMap = new Map(consistencyData.map(r => [r.providerId, { total: Number(r.total), cancelled: Number(r.cancelled) }]))

    // Batch upsert ScoreFactors for all providers
    const scoreUpserts: Promise<unknown>[] = []
    for (const provider of providers) {
      const avgRating = ratingMap.get(provider.userId) ?? 0
      const reviewScore = Math.min(5, Math.max(0, avgRating)) // already 0-5

      const comp = completionMap.get(provider.userId)
      const completionScore = comp && comp.total > 0
        ? Math.min(5, (comp.completed / comp.total) * 5)
        : 2.5 // neutral for new providers

      const avgResponseHours = responseMap.get(provider.userId)
      const responseScore = normaliseResponseTime(avgResponseHours)

      const consist = consistencyMap.get(provider.userId)
      const consistencyScore = consist && consist.total > 0
        ? Math.min(5, (1 - consist.cancelled / consist.total) * 5)
        : 5 // perfect consistency for new providers

      const verificationScore = provider.isVerified ? 5 : 0

      if (provider.scoreFactors) {
        scoreUpserts.push(
          prisma.scoreFactors.update({
            where: { providerId: provider.id },
            data: { reviewScore, completionScore, responseScore, consistencyScore, verificationScore },
          })
        )
      } else {
        scoreUpserts.push(
          prisma.scoreFactors.create({
            data: { providerId: provider.id, reviewScore, completionScore, responseScore, consistencyScore, verificationScore },
          })
        )
      }
    }

    await Promise.allSettled(scoreUpserts)

    // Build a freshScoreMap from the computed values so the tier loop uses
    // up-to-date data without a second DB round-trip
    const freshScoreMap = new Map(providers.map(p => [p.id, {
      reviewScore: ratingMap.get(p.userId) !== undefined
        ? Math.min(5, Math.max(0, ratingMap.get(p.userId)!))
        : 0,
      completionScore: (() => {
        const c = completionMap.get(p.userId)
        return c && c.total > 0 ? Math.min(5, (c.completed / c.total) * 5) : 2.5
      })(),
      responseScore: normaliseResponseTime(responseMap.get(p.userId)),
      consistencyScore: (() => {
        const c = consistencyMap.get(p.userId)
        return c && c.total > 0 ? Math.min(5, (1 - c.cancelled / c.total) * 5) : 5
      })(),
      verificationScore: p.isVerified ? 5 : 0,
    }]))

    // ── M09: Update responseTimeHours from real data ──────────────────────────
    const responseTimeUpdates: Promise<unknown>[] = []
    for (const provider of providers) {
      const avgHours = responseMap.get(provider.userId)
      if (avgHours !== undefined) {
        responseTimeUpdates.push(
          prisma.providerProfile.update({
            where: { id: provider.id },
            data: { responseTimeHours: Math.round(avgHours * 10) / 10 },
          })
        )
      }
    }
    await Promise.allSettled(responseTimeUpdates)

    // ── Tier calculation using fresh ScoreFactors ─────────────────────────────
    let updated = 0
    const updates: { providerId: string; userId: string; previousTier: string; newTier: string; compositeScore: number }[] = []

    for (const provider of providers) {
      const sf = freshScoreMap.get(provider.id) ?? provider.scoreFactors
      if (!sf) continue

      const compositeScore = calcComposite(sf)
      const completedCount = countMap.get(provider.userId) ?? 0
      let newTier = determineTierWithHysteresis(compositeScore, completedCount, provider.tier)

      // P1-H: Verified gate — unverified providers cannot hold PRO or ELITE tier.
      // If their score qualifies for PRO or ELITE but they are not verified, cap at TRUSTED.
      if (!provider.isVerified && (newTier === 'PRO' || newTier === 'ELITE')) {
        newTier = 'TRUSTED'
      }

      if (newTier !== provider.tier) {
        const previousTier = provider.tier

        updates.push({
          providerId: provider.id,
          userId: provider.userId,
          previousTier,
          newTier,
          compositeScore,
        })

        updated++
      }
    }

    // P1-7: Await all DB tier updates first, THEN run audit log + notifications
    await Promise.all(
      updates.map(u =>
        prisma.providerProfile.update({
          where: { id: u.providerId },
          data: { tier: u.newTier as 'NEWCOMER' | 'RISING' | 'TRUSTED' | 'PRO' | 'ELITE' },
        })
      )
    )

    // Now run audit logs + notifications (can be batched for speed)
    await Promise.all(
      updates.map(async u => {
        // Log tier change to audit log
        await prisma.auditLog.create({
          data: {
            actorId: u.userId,
            action: 'TIER_CHANGE',
            targetType: 'ProviderProfile',
            targetId: u.providerId,
            details: {
              previousTier: u.previousTier,
              newTier: u.newTier,
              compositeScore: u.compositeScore,
              scoreFactors: freshScoreMap.get(u.providerId) ?? null,
              changedAt: new Date().toISOString(),
            },
          },
        }).catch(() => {})

        // Notify provider of tier change (both upgrade and downgrade)
        const TIER_ORDER = ['NEWCOMER', 'RISING', 'TRUSTED', 'PRO', 'ELITE']
        const isUpgrade = TIER_ORDER.indexOf(u.newTier) > TIER_ORDER.indexOf(u.previousTier)
        const tierLabels: Record<string, string> = {
          NEWCOMER: 'Newcomer',
          RISING: 'Rising',
          TRUSTED: 'Top Rated',
          PRO: 'Sparq Pro',
          ELITE: 'Sparq Elite',
        }
        if (isUpgrade && ['RISING', 'TRUSTED', 'PRO', 'ELITE'].includes(u.newTier)) {
          const factors = freshScoreMap.get(u.providerId)
          const contextParts: string[] = []
          if (factors?.reviewScore) {
            contextParts.push(`${(factors.reviewScore).toFixed(1)}★ ratings`)
          }
          if (factors?.completionScore !== undefined) {
            contextParts.push(`${Math.round((factors.completionScore / 5) * 100)}% completion rate`)
          }
          const contextLine = contextParts.length > 0
            ? `Based on your ${contextParts.join(' and ')}.`
            : ''
          await prisma.notification.create({
            data: {
              userId: u.userId,
              type: 'TIER_CHANGE',
              title: `🎉 You've been promoted to ${tierLabels[u.newTier] ?? u.newTier}!`,
              message: `Your Sparq Score earned you a tier upgrade from ${u.previousTier} to ${u.newTier}. ${contextLine} View your Sparq Score →`.trim(),
              link: '/dashboard/provider',
            },
          }).catch(() => {})
        } else if (!isUpgrade) {
          // Downgrade notification — inform provider their tier has changed
          await prisma.notification.create({
            data: {
              userId: u.userId,
              type: 'TIER_CHANGE',
              title: `Your tier has been updated to ${tierLabels[u.newTier] ?? u.newTier}`,
              message: `Your Sparq tier has changed from ${tierLabels[u.previousTier] ?? u.previousTier} to ${tierLabels[u.newTier] ?? u.newTier}. Keep completing appointments and collecting reviews to move back up. View your Sparq Score →`,
              link: '/dashboard/provider',
            },
          }).catch(() => {})
        }
      })
    )

    return NextResponse.json({
      ok: true,
      checked: providers.length,
      updated,
    })
  } catch (error) {
    console.error('Tier update cron error:', error)
    return NextResponse.json({ error: 'Failed to update tiers' }, { status: 500 })
  }
}
