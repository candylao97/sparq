'use client'

import { TrendingUp, Clock, Eye, ArrowUpRight } from 'lucide-react'
import { AiText } from './AiText'
import type { DashboardStats } from '@/types/dashboard'

interface Props {
  stats: DashboardStats
  weeklyInsight: string | null | undefined
  benchmarkNote: string | null | undefined
  aiLoading: boolean
}

export function GrowthInsights({ stats, weeklyInsight, benchmarkNote, aiLoading }: Props) {
  return (
    <div className="mb-6 rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(26,31,54,0.07)]">
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-[#E96B56]" />
        <h2 className="text-lg font-bold text-[#1A1A1A]">Growth Insights</h2>
      </div>

      {/* AI Weekly Insight */}
      {(weeklyInsight || aiLoading) && (
        <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50/50 p-4">
          <AiText
            text={weeklyInsight}
            loading={aiLoading}
            className="text-body-compact leading-relaxed text-[#1A1A1A]"
            skeletonWidth="w-full"
          />
        </div>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-[#f9f2ef] p-4 text-center">
          <Clock className="mx-auto mb-1.5 h-5 w-5 text-[#E96B56]" />
          <p className="text-xl font-bold text-[#1A1A1A]">
            {stats.avgResponseTimeHours < 1
              ? '<1h'
              : `${Math.round(stats.avgResponseTimeHours)}h`}
          </p>
          <p className="text-label text-[#717171]">Response Time</p>
        </div>

        <div className="rounded-xl bg-[#f9f2ef] p-4 text-center">
          <Eye className="mx-auto mb-1.5 h-5 w-5 text-[#717171]" />
          <p className="text-xl font-bold text-[#717171]">-</p>
          <p className="text-label text-[#717171]">Profile Views</p>
          <p className="text-micro text-[#717171]">Coming soon</p>
        </div>

        <div className="rounded-xl bg-[#f9f2ef] p-4 text-center">
          <ArrowUpRight className="mx-auto mb-1.5 h-5 w-5 text-[#717171]" />
          <p className="text-xl font-bold text-[#717171]">-</p>
          <p className="text-label text-[#717171]">Conversion</p>
          <p className="text-micro text-[#717171]">Coming soon</p>
        </div>
      </div>

      {/* AI Benchmark Note */}
      <AiText
        text={benchmarkNote}
        loading={aiLoading}
        className="mt-3 text-xs text-[#717171]"
        skeletonWidth="w-80"
      />
    </div>
  )
}
