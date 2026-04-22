'use client'

import Link from 'next/link'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { DashboardEarnings, DashboardStats } from '@/types/dashboard'

interface Props {
  earnings: DashboardEarnings
  stats: DashboardStats
}

interface Tile {
  label: string
  value: string
  insight: string
  insightColor: 'emerald' | 'amber' | 'muted' | 'coral'
  trend?: 'up' | 'down'
  href: string
}

function buildTiles(earnings: DashboardEarnings, stats: DashboardStats): Tile[] {
  // — Earnings insight —
  const monthlyGoal = Math.max(
    earnings.last3MonthsAvg > 0 ? earnings.last3MonthsAvg * 1.15 : 300,
    earnings.month + 50,
    200,
  )
  const goalPct = Math.round((earnings.month / monthlyGoal) * 100)
  const momChange = earnings.previousMonth > 0
    ? Math.round(((earnings.month - earnings.previousMonth) / earnings.previousMonth) * 100)
    : null
  const daysLeft = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()

  let earningsInsight: string
  let earningsColor: Tile['insightColor']
  if (goalPct >= 100) {
    earningsInsight = 'Goal reached 🎉'
    earningsColor = 'emerald'
  } else if (goalPct >= 60) {
    earningsInsight = `${goalPct}% to goal — ${daysLeft}d left`
    earningsColor = 'emerald'
  } else {
    earningsInsight = `${goalPct}% to ${formatCurrency(monthlyGoal)} goal`
    earningsColor = 'amber'
  }

  // — Appointments insight —
  let apptInsight: string
  let apptColor: Tile['insightColor']
  if (stats.pendingBookings > 0) {
    apptInsight = `${stats.pendingBookings} pending your reply`
    apptColor = 'amber'
  } else if (stats.completedThisMonth > 0) {
    const avg = stats.completedBookings > 0 ? earnings.allTime / stats.completedBookings : 0
    apptInsight = `${formatCurrency(avg)} avg per booking`
    apptColor = 'muted'
  } else {
    apptInsight = 'No bookings yet this month'
    apptColor = 'muted'
  }

  // — Rating insight —
  let ratingInsight: string
  let ratingColor: Tile['insightColor']
  if (stats.totalReviews === 0) {
    ratingInsight = 'No reviews yet'
    ratingColor = 'muted'
  } else if (stats.averageRating >= 4.7) {
    ratingInsight = 'Exceptional — top 10%'
    ratingColor = 'emerald'
  } else if (stats.averageRating >= 4.3) {
    ratingInsight = 'Great — keep it up'
    ratingColor = 'emerald'
  } else {
    ratingInsight = 'Reply to reviews to improve'
    ratingColor = 'amber'
  }

  // — Response time insight —
  let responseInsight: string
  let responseColor: Tile['insightColor']
  if (stats.avgResponseTimeHours < 1) {
    responseInsight = 'Faster than 85% of artists'
    responseColor = 'emerald'
  } else if (stats.avgResponseTimeHours < 3) {
    responseInsight = 'Good — aim for under 1h'
    responseColor = 'muted'
  } else {
    responseInsight = 'Slow — this costs bookings'
    responseColor = 'amber'
  }

  return [
    {
      label: 'Earned this month',
      value: formatCurrency(earnings.month),
      insight: earningsInsight,
      insightColor: earningsColor,
      trend: momChange === null ? undefined : momChange >= 0 ? 'up' : 'down',
      href: '/dashboard/provider/payments',
    },
    {
      label: 'Appointments',
      value: String(stats.completedThisMonth),
      insight: apptInsight,
      insightColor: apptColor,
      href: '/dashboard/provider/bookings',
    },
    {
      label: 'Avg. rating',
      value: stats.averageRating > 0 ? `${stats.averageRating.toFixed(1)} ★` : '—',
      insight: ratingInsight,
      insightColor: ratingColor,
      href: '/dashboard/provider/growth',
    },
    {
      label: 'Response time',
      value: stats.avgResponseTimeHours < 1 ? '<1h' : `${Math.round(stats.avgResponseTimeHours)}h`,
      insight: responseInsight,
      insightColor: responseColor,
      href: '/dashboard/provider/growth',
    },
  ]
}

const INSIGHT_STYLES: Record<Tile['insightColor'], string> = {
  emerald: 'text-emerald-600',
  amber: 'text-amber-600',
  muted: 'text-[#717171]',
  coral: 'text-[#E96B56]',
}

export function PerformanceGrid({ earnings, stats }: Props) {
  const tiles = buildTiles(earnings, stats)

  return (
    <div className="mb-8">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#717171]">
        This month
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map(tile => (
          <Link
            key={tile.label}
            href={tile.href}
            className="group rounded-2xl border border-[#f0e8e4] bg-white p-4 transition-all hover:border-[#E96B56]/30 hover:shadow-[0_2px_12px_rgba(233,107,86,0.08)]"
          >
            <p className="mb-2 text-label font-medium uppercase tracking-wider text-[#717171]">
              {tile.label}
            </p>
            <div className="flex items-baseline gap-1.5">
              <p className="text-2xl font-bold leading-none text-[#1A1A1A]">{tile.value}</p>
              {tile.trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
              {tile.trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-red-400" />}
            </div>
            <p className={`mt-1.5 text-xs font-medium ${INSIGHT_STYLES[tile.insightColor]}`}>
              {tile.insight}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
