'use client'

import { Target, TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { AiText } from './AiText'
import type { DashboardEarnings, DashboardStats } from '@/types/dashboard'

interface Props {
  earnings: DashboardEarnings
  stats: DashboardStats
  narrative: string | null | undefined
  goalSuggestion: string | null | undefined
  aiLoading: boolean
  stripeAccountId?: string | null
}

export function EarningsSnapshot({ earnings, stats, narrative, goalSuggestion, aiLoading }: Props) {
  const avgPerBooking = stats.completedBookings > 0
    ? earnings.allTime / stats.completedBookings
    : 0

  const monthName = new Date().toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })

  // Monthly goal: 15% above 3-month average, or at least $50 above current
  const monthlyGoal = Math.round(Math.max(
    earnings.last3MonthsAvg > 0 ? earnings.last3MonthsAvg * 1.15 : 300,
    earnings.month + 50,
    200,
  ))
  const goalProgress = Math.min(Math.round((earnings.month / monthlyGoal) * 100), 100)
  const remaining = Math.max(0, monthlyGoal - earnings.month)
  const goalReached = remaining === 0

  // Month-over-month
  const momChange = earnings.previousMonth > 0
    ? Math.round(((earnings.month - earnings.previousMonth) / earnings.previousMonth) * 100)
    : null
  const momUp = momChange !== null && momChange >= 0

  // End-of-month earnings projection (linear extrapolation)
  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const dayOfMonth = today.getDate()
  const projection =
    stats.completedThisMonth > 0 && dayOfMonth > 0 && dayOfMonth < daysInMonth
      ? Math.round((earnings.month / dayOfMonth) * daysInMonth)
      : null

  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

        {/* ── Hero card: monthly earnings + goal progress ── */}
        <div className="relative overflow-hidden rounded-2xl bg-[#1A1A1A] p-6">
          {/* Decorative glow */}
          <div className="pointer-events-none absolute -bottom-12 -right-10 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(233,107,86,0.22)_0%,transparent_65%)]" />
          <div className="pointer-events-none absolute -left-8 -top-8 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.04)_0%,transparent_70%)]" />

          <p className="mb-1 text-label font-semibold uppercase tracking-widest text-white/40">
            {monthName}
          </p>

          <p className="mb-4 font-headline text-4xl font-bold leading-none text-white">
            {formatCurrency(earnings.month)}
          </p>

          {/* Goal progress bar */}
          <div className="mb-4">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs text-white/40">Monthly goal</span>
              <span className="text-xs font-bold text-white/60">
                {goalReached ? '🎉 Reached!' : `${goalProgress}% of ${formatCurrency(monthlyGoal)}`}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  goalReached
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-300'
                    : 'bg-gradient-to-r from-[#E96B56] to-[#f5a090]'
                }`}
                style={{ width: `${goalProgress}%` }}
              />
            </div>
            {!goalReached && (
              <p className="mt-1 text-xs text-white/30">
                {formatCurrency(remaining)} more to hit your goal
              </p>
            )}
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2">
            {stats.completedThisMonth > 0 && (
              <span className="rounded-md bg-emerald-400/15 px-2 py-0.5 text-label font-bold text-emerald-300">
                {stats.completedThisMonth} completed
              </span>
            )}
            {momChange !== null && (
              <span className={`flex items-center gap-0.5 rounded-md px-2 py-0.5 text-label font-bold ${
                momUp ? 'bg-emerald-400/15 text-emerald-300' : 'bg-red-400/15 text-red-300'
              }`}>
                {momUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {momUp ? '+' : ''}{momChange}% vs last month
              </span>
            )}
          </div>
        </div>

        {/* ── Appointments this month + projection ── */}
        <div className="flex flex-col rounded-2xl bg-white p-6 shadow-[0_1px_4px_rgba(26,31,54,0.07)]">
          <p className="mb-1 text-label font-medium uppercase tracking-wider text-[#717171]">
            Appointments
          </p>
          <p className="text-stat font-bold leading-none text-[#1A1A1A]">
            {stats.completedThisMonth}
          </p>
          <p className="mt-0.5 text-xs text-[#717171]">completed this month</p>

          {/* Projection chip */}
          {projection !== null && projection > earnings.month && (
            <div className="mt-auto pt-4">
              <div className="rounded-xl bg-[#f9f2ef] px-3 py-2.5">
                <p className="text-label text-[#717171]">Projected month-end</p>
                <p className="text-base font-bold text-[#E96B56]">{formatCurrency(projection)}</p>
                <p className="text-micro text-[#717171]">based on current pace</p>
              </div>
            </div>
          )}

          {stats.pendingBookings > 0 && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-[#717171]">
              <span className="inline-block h-2 w-2 rounded-full bg-[#E96B56]" />
              {stats.pendingBookings} pending response
            </p>
          )}
        </div>

        {/* ── Avg per booking + breakdown ── */}
        <div className="flex flex-col rounded-2xl bg-white p-6 shadow-[0_1px_4px_rgba(26,31,54,0.07)]">
          <p className="mb-1 text-label font-medium uppercase tracking-wider text-[#717171]">
            Avg. per booking
          </p>
          <p className="text-stat font-bold leading-none text-[#1A1A1A]">
            {formatCurrency(avgPerBooking)}
          </p>
          <p className="mt-0.5 text-xs text-[#717171]">per appointment</p>

          <div className="mt-auto space-y-2 pt-4">
            <div className="flex items-center justify-between rounded-lg bg-[#f9f2ef] px-3 py-2">
              <span className="text-xs text-[#717171]">All time earned</span>
              <span className="text-xs font-bold text-[#1A1A1A]">{formatCurrency(earnings.allTime)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-[#f9f2ef] px-3 py-2">
              <span className="text-xs text-[#717171]">3-month avg</span>
              <span className="text-xs font-bold text-[#1A1A1A]">{formatCurrency(earnings.last3MonthsAvg)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* AI narrative + goal */}
      {(narrative || aiLoading) && (
        <AiText text={narrative} loading={aiLoading} className="mt-3 text-body-compact text-[#717171]" skeletonWidth="w-80" />
      )}
      {(goalSuggestion || aiLoading) && (
        <div className="mt-2 flex items-center gap-2">
          <Target className="h-3.5 w-3.5 flex-shrink-0 text-[#E96B56]" />
          <AiText text={goalSuggestion} loading={aiLoading} className="text-xs font-medium text-[#E96B56]" skeletonWidth="w-64" />
        </div>
      )}
    </div>
  )
}
