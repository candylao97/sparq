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
  subValue?: string
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
  href: string
  accent?: 'coral' | 'emerald' | 'amber'
}

export function KpiStrip({ earnings, stats }: Props) {
  const momChange = earnings.previousMonth > 0
    ? Math.round(((earnings.month - earnings.previousMonth) / earnings.previousMonth) * 100)
    : null
  const momUp = momChange !== null && momChange >= 0

  const tiles: Tile[] = [
    {
      label: 'Earned this month',
      value: formatCurrency(earnings.month),
      subValue: momChange !== null ? `${momUp ? '+' : ''}${momChange}% vs last month` : undefined,
      trend: momChange === null ? undefined : momUp ? 'up' : 'down',
      href: '/dashboard/provider/payments',
      accent: 'coral',
    },
    {
      label: 'Appointments',
      value: String(stats.completedThisMonth),
      subValue: stats.pendingBookings > 0 ? `${stats.pendingBookings} pending` : 'All clear',
      trend: stats.pendingBookings > 0 ? 'neutral' : 'neutral',
      href: '/dashboard/provider/bookings',
    },
    {
      label: 'Avg. rating',
      value: stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—',
      subValue: `${stats.totalReviews} review${stats.totalReviews !== 1 ? 's' : ''}`,
      href: '/dashboard/provider/growth',
      accent: 'emerald',
    },
    {
      label: 'Response time',
      value: stats.avgResponseTimeHours < 1 ? '<1h' : `${Math.round(stats.avgResponseTimeHours)}h`,
      subValue:
        stats.avgResponseTimeHours < 1
          ? 'Excellent'
          : stats.avgResponseTimeHours < 3
          ? 'Fast'
          : stats.avgResponseTimeHours < 8
          ? 'Could be faster'
          : 'Needs work',
      trend:
        stats.avgResponseTimeHours < 3 ? 'up' : stats.avgResponseTimeHours < 8 ? 'neutral' : 'down',
      href: '/dashboard/provider/growth',
      accent: stats.avgResponseTimeHours < 3 ? 'emerald' : stats.avgResponseTimeHours < 8 ? undefined : undefined,
    },
  ]

  const trendIcon = (tile: Tile) => {
    if (tile.trend === 'up') return <TrendingUp className="h-3 w-3 text-emerald-500" />
    if (tile.trend === 'down') return <TrendingDown className="h-3 w-3 text-red-400" />
    return null
  }

  const ACCENT_STYLES: Record<string, string> = {
    coral: 'text-[#E96B56]',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
  }

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map(tile => (
        <Link
          key={tile.label}
          href={tile.href}
          className="group flex flex-col rounded-2xl bg-white p-4 shadow-[0_1px_4px_rgba(26,31,54,0.07)] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(26,31,54,0.1)]"
        >
          <p className="mb-2 text-label font-medium uppercase tracking-wider text-[#717171]">
            {tile.label}
          </p>
          <p className={`text-2xl font-bold leading-none ${tile.accent ? ACCENT_STYLES[tile.accent] : 'text-[#1A1A1A]'}`}>
            {tile.value}
          </p>
          {tile.subValue && (
            <div className="mt-auto flex items-center gap-1 pt-2">
              {trendIcon(tile)}
              <span className="text-xs text-[#717171]">{tile.subValue}</span>
            </div>
          )}
        </Link>
      ))}
    </div>
  )
}
