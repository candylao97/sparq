'use client'

import Link from 'next/link'
import { TrendingUp, Clock, Star, Camera, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AiText } from './AiText'
import type { DashboardStats } from '@/types/dashboard'

interface Props {
  stats: DashboardStats
  portfolioCount: number
  unrespondedCount: number
  weeklyInsight: string | null | undefined
  benchmarkNote: string | null | undefined
  aiLoading: boolean
}

type CardStatus = 'good' | 'needs-attention' | 'critical'

interface PlaybookCard {
  icon: LucideIcon
  status: CardStatus
  metric: string
  metricSub?: string
  label: string
  statusLabel: string
  tip: string
  cta?: string
  href?: string
}

const STATUS_STYLES: Record<CardStatus, {
  card: string
  icon: string
  metric: string
  badge: string
  cta: string
}> = {
  good: {
    card: 'border-emerald-100 bg-gradient-to-br from-emerald-50/40 to-white',
    icon: 'text-emerald-500',
    metric: 'text-[#1A1A1A]',
    badge: 'bg-emerald-100 text-emerald-700',
    cta: 'text-emerald-600',
  },
  'needs-attention': {
    card: 'border-amber-100 bg-gradient-to-br from-amber-50/40 to-white',
    icon: 'text-amber-500',
    metric: 'text-[#1A1A1A]',
    badge: 'bg-amber-100 text-amber-700',
    cta: 'text-[#E96B56]',
  },
  critical: {
    card: 'border-red-100 bg-gradient-to-br from-red-50/40 to-white',
    icon: 'text-red-500',
    metric: 'text-red-600',
    badge: 'bg-red-100 text-red-700',
    cta: 'text-red-600',
  },
}

function getResponseStatus(hours: number): { status: CardStatus; label: string } {
  if (hours < 1) return { status: 'good', label: 'Excellent · top 15%' }
  if (hours < 3) return { status: 'good', label: 'Fast · clients love this' }
  if (hours < 8) return { status: 'needs-attention', label: 'Could be quicker' }
  return { status: 'critical', label: 'Slow · losing bookings' }
}

export function GrowthInsights({
  stats,
  portfolioCount,
  unrespondedCount,
  weeklyInsight,
  benchmarkNote,
  aiLoading,
}: Props) {
  const responseDisplay = stats.avgResponseTimeHours < 1
    ? '<1h'
    : `${Math.round(stats.avgResponseTimeHours)}h`
  const responseInfo = getResponseStatus(stats.avgResponseTimeHours)

  const reviewStatus: CardStatus =
    unrespondedCount === 0 && stats.totalReviews > 0
      ? 'good'
      : unrespondedCount > 0 && unrespondedCount <= 2
      ? 'needs-attention'
      : unrespondedCount > 2
      ? 'critical'
      : 'needs-attention'

  const portfolioStatus: CardStatus =
    portfolioCount >= 6 ? 'good' : portfolioCount >= 3 ? 'needs-attention' : 'critical'

  const cards: PlaybookCard[] = [
    {
      icon: Clock,
      status: responseInfo.status,
      metric: responseDisplay,
      label: 'Response Time',
      statusLabel: responseInfo.label,
      tip:
        responseInfo.status === 'good'
          ? 'Clients book faster when artists reply quickly. You\'re doing great — keep it up.'
          : responseInfo.status === 'needs-attention'
          ? 'Aim for under 1 hour. Faster replies win bookings before clients look elsewhere.'
          : 'Urgent: clients are likely booking other artists. Set up reply reminders.',
      cta: responseInfo.status !== 'good' ? 'View requests' : undefined,
      href: responseInfo.status !== 'good' ? '/dashboard/provider/bookings' : undefined,
    },
    {
      icon: Star,
      status: reviewStatus,
      metric: stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—',
      metricSub: stats.totalReviews > 0 ? `${stats.totalReviews} reviews` : 'No reviews yet',
      label: 'Review Health',
      statusLabel:
        unrespondedCount > 0
          ? `${unrespondedCount} need${unrespondedCount === 1 ? 's' : ''} a reply`
          : stats.totalReviews === 0
          ? 'No reviews yet'
          : 'All replied ✓',
      tip:
        unrespondedCount > 0
          ? 'Replying builds trust and increases repeat bookings by 2×. Don\'t leave these open.'
          : stats.totalReviews === 0
          ? 'After your first booking, ask clients to leave a review — it dramatically boosts visibility.'
          : 'Great review health. Keep delivering excellent work and responding to every review.',
      cta: unrespondedCount > 0 ? `Reply to ${unrespondedCount}` : undefined,
      href: unrespondedCount > 0 ? '#reviews' : undefined,
    },
    {
      icon: Camera,
      status: portfolioStatus,
      metric: `${portfolioCount}`,
      metricSub: 'photos',
      label: 'Portfolio',
      statusLabel:
        portfolioCount >= 6
          ? 'Looking great'
          : portfolioCount >= 3
          ? `Add ${6 - portfolioCount} more`
          : `Need ${4 - portfolioCount} more`,
      tip:
        portfolioCount < 3
          ? 'You need photos urgently. Artists with no photos are almost never booked.'
          : portfolioCount < 6
          ? 'Profiles with 6+ photos appear higher in search and get 3× more enquiries.'
          : 'Strong portfolio — clients love seeing real work before they book.',
      cta: portfolioCount < 6 ? 'Add photos' : undefined,
      href: portfolioCount < 6 ? '/dashboard/provider/portfolio' : undefined,
    },
  ]

  return (
    <div className="mb-6 rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(26,31,54,0.07)]">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-[#E96B56]" />
        <h2 className="text-lg font-bold text-[#1A1A1A]">Growth playbook</h2>
        <span className="ml-auto text-xs text-[#717171]">3 signals tracked</span>
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

      {/* Playbook cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map(card => {
          const style = STATUS_STYLES[card.status]
          const Icon = card.icon
          const StatusIcon = card.status === 'good' ? CheckCircle2 : AlertCircle

          return (
            <div key={card.label} className={`flex flex-col rounded-xl border p-4 ${style.card}`}>
              {/* Top */}
              <div className="mb-3 flex items-start justify-between gap-2">
                <Icon className={`h-4 w-4 flex-shrink-0 ${style.icon}`} />
                <span className={`rounded-full px-2 py-0.5 text-micro font-semibold ${style.badge}`}>
                  {card.statusLabel}
                </span>
              </div>

              {/* Metric */}
              <div className="mb-1">
                <span className={`text-2xl font-bold leading-none ${style.metric}`}>{card.metric}</span>
                {card.metricSub && (
                  <span className="ml-1.5 text-xs text-[#717171]">{card.metricSub}</span>
                )}
              </div>
              <p className="mb-2 text-label font-semibold text-[#1A1A1A]">{card.label}</p>

              {/* Tip */}
              <p className="mb-3 flex-1 text-xs leading-relaxed text-[#717171]">{card.tip}</p>

              {/* Footer */}
              {card.cta && card.href ? (
                <Link
                  href={card.href}
                  className={`inline-flex items-center gap-1 text-xs font-bold ${style.cta} hover:underline`}
                >
                  {card.cta} <ChevronRight className="h-3 w-3" />
                </Link>
              ) : (
                <div className={`flex items-center gap-1 text-xs font-semibold ${style.cta}`}>
                  <StatusIcon className="h-3.5 w-3.5" />
                  Performing well
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* AI Benchmark */}
      {(benchmarkNote || aiLoading) && (
        <AiText
          text={benchmarkNote}
          loading={aiLoading}
          className="mt-3 text-xs text-[#717171]"
          skeletonWidth="w-80"
        />
      )}
    </div>
  )
}
