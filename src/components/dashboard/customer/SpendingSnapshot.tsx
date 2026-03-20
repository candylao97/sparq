'use client'

import { DollarSign, Crown } from 'lucide-react'
import { AiText } from '../AiText'
import { formatCurrency } from '@/lib/utils'
import type { CustomerSpending, CustomerDashboardStats } from '@/types/dashboard'

interface Props {
  spending: CustomerSpending
  stats: CustomerDashboardStats
  membership: string
  spendingNarrative: string | null | undefined
  aiLoading: boolean
}

export function SpendingSnapshot({ spending, stats, membership, spendingNarrative, aiLoading }: Props) {
  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* This Month */}
        <div className="rounded-2xl bg-[#1A1A1A] p-5">
          <p className="mb-1 text-label font-medium uppercase tracking-wider text-white/50">
            THIS MONTH
          </p>
          <p className="text-3xl font-bold leading-none text-white">
            {formatCurrency(spending.thisMonth)}
          </p>
          <p className="mt-2 text-xs text-white/40">
            {stats.completedThisMonth} appointment{stats.completedThisMonth !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Average per Session */}
        <div className="rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(26,31,54,0.07)]">
          <p className="mb-1 text-label font-medium uppercase tracking-wider text-[#717171]">
            AVG. PER VISIT
          </p>
          <p className="text-3xl font-bold leading-none text-[#1A1A1A]">
            {formatCurrency(spending.averagePerBooking)}
          </p>
          <p className="mt-2 text-xs text-[#717171]">
            All time: {formatCurrency(spending.allTime)}
          </p>
        </div>

        {/* Savings / Premium */}
        {membership === 'PREMIUM' ? (
          <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50 p-5">
            <p className="mb-1 flex items-center gap-1 text-label font-medium uppercase tracking-wider text-emerald-700/60">
              <DollarSign className="h-3.5 w-3.5" /> Fees Saved
            </p>
            <p className="text-3xl font-bold leading-none text-emerald-600">
              {formatCurrency(spending.platformFeesSaved)}
            </p>
            <p className="mt-2 text-xs text-emerald-600/50">
              With your Premium membership
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200/60 bg-amber-50/50 p-5">
            <p className="mb-1 flex items-center gap-1 text-label font-medium uppercase tracking-wider text-[#E96B56]/60">
              <Crown className="h-3.5 w-3.5" /> Go Premium
            </p>
            <p className="text-base font-bold leading-tight text-[#1A1A1A]">
              Save 15% on every booking
            </p>
            <p className="mt-2 text-xs text-[#717171]">
              Upgrade to skip the service fee on every booking
            </p>
          </div>
        )}
      </div>

      <AiText text={spendingNarrative} loading={aiLoading} className="mt-3 text-body-compact text-[#717171]" skeletonWidth="w-full" />
    </div>
  )
}
