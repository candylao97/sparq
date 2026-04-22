'use client'

import { Crown, CheckCircle } from 'lucide-react'
import type { CustomerDashboardStats } from '@/types/dashboard'

interface CustomerSpending {
  thisMonth: number
  allTime: number
  averagePerBooking: number
  platformFeesSaved: number
}

interface Props {
  spending: CustomerSpending
  stats: CustomerDashboardStats
  membership: string
  spendingNarrative?: string | null
  aiLoading?: boolean
}

export function SpendingSnapshot({ membership }: Props) {
  if (membership === 'PREMIUM') {
    return (
      <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-emerald-200/60 bg-emerald-50 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-4 w-4 flex-shrink-0 text-emerald-600" />
          <p className="text-sm font-medium text-emerald-700">
            Premium member — booking fees waived on every appointment.
          </p>
        </div>
        <button
          onClick={async () => {
            const res = await fetch('/api/customer/billing-portal', { method: 'POST' })
            if (res.ok) {
              const { url } = await res.json() as { url: string }
              window.location.href = url
            }
          }}
          className="shrink-0 text-xs text-[#717171] underline underline-offset-2 transition-colors hover:text-[#1A1A1A]"
        >
          Manage subscription
        </button>
      </div>
    )
  }

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200/60 bg-amber-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Crown className="h-4 w-4 flex-shrink-0 text-[#E96B56]" />
        <div>
          <p className="text-sm font-semibold text-[#1A1A1A]">Skip booking fees with Premium</p>
          <p className="text-xs text-[#717171]">Save 15% on every appointment — no lock-in.</p>
        </div>
      </div>
      <button className="whitespace-nowrap rounded-full bg-[#E96B56] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#d45a45] sm:flex-shrink-0">
        Go Premium →
      </button>
    </div>
  )
}
