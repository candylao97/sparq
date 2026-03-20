'use client'

import Link from 'next/link'
import { Target, AlertTriangle, CreditCard } from 'lucide-react'
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

export function EarningsSnapshot({ earnings, stats, narrative, goalSuggestion, aiLoading, stripeAccountId }: Props) {
  const avgPerBooking = stats.completedBookings > 0
    ? earnings.allTime / stats.completedBookings
    : 0
  const monthName = new Date().toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
  const upcomingCount = stats.pendingBookings

  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Monthly Earnings - Dark card */}
        <div className="relative overflow-hidden rounded-2xl bg-[#1A1A1A] p-6">
          <div className="absolute -bottom-8 -right-5 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(212,130,10,0.2)_0%,transparent_70%)]" />
          <p className="mb-2 text-label font-semibold uppercase tracking-wider text-white/40">
            {monthName} earnings
          </p>
          <p className="mb-2 text-4xl font-bold leading-none text-white">
            {formatCurrency(earnings.month)}
          </p>
          {stats.completedThisMonth > 0 && (
            <p className="text-xs text-white/50">
              <span className="rounded-md bg-emerald-400/20 px-1.5 py-0.5 text-label font-bold text-emerald-300">
                ↑ {stats.completedThisMonth} completed
              </span>
            </p>
          )}
        </div>

        {/* Sessions this month */}
        <div className="rounded-2xl bg-white p-6 shadow-[0_1px_4px_rgba(26,31,54,0.07)]">
          <p className="mb-2 text-label font-medium uppercase tracking-wider text-[#717171]">
            Appointments this month
          </p>
          <p className="text-stat font-bold leading-none text-[#1A1A1A]">
            {stats.completedThisMonth}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-[#717171]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#E96B56]" />
            {upcomingCount} pending
          </p>
        </div>

        {/* Avg per booking */}
        <div className="rounded-2xl bg-white p-6 shadow-[0_1px_4px_rgba(26,31,54,0.07)]">
          <p className="mb-2 text-label font-medium uppercase tracking-wider text-[#717171]">
            Avg. per booking
          </p>
          <p className="text-stat font-bold leading-none text-[#1A1A1A]">
            {formatCurrency(avgPerBooking)}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-[#717171]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#E96B56]" />
            All time: {formatCurrency(earnings.allTime)}
          </p>
        </div>
      </div>

      {/* Payout setup CTA */}
      {!stripeAccountId && (
        <Link
          href="/dashboard/provider/payouts"
          className="mt-3 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 transition-colors hover:bg-amber-100"
        >
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-[#1A1A1A]">Get paid for your work</p>
            <p className="text-xs text-[#717171]">Connect your bank account through Stripe — it only takes 2 minutes</p>
          </div>
          <CreditCard className="h-4 w-4 flex-shrink-0 text-[#717171]" />
        </Link>
      )}

      {/* AI Earnings Narrative */}
      <AiText text={narrative} loading={aiLoading} className="mt-3 text-body-compact text-[#717171]" skeletonWidth="w-80" />

      {/* AI Goal Suggestion */}
      {(goalSuggestion || aiLoading) && (
        <div className="mt-2 flex items-center gap-2">
          <Target className="h-3.5 w-3.5 flex-shrink-0 text-[#E96B56]" />
          <AiText text={goalSuggestion} loading={aiLoading} className="text-xs font-medium text-[#E96B56]" skeletonWidth="w-64" />
        </div>
      )}
    </div>
  )
}
