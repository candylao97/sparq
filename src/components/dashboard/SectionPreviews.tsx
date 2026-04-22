'use client'

import Link from 'next/link'
import { LayoutGrid, BookOpen, Banknote, TrendingUp, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { DashboardEarnings } from '@/types/dashboard'

interface Props {
  services: Array<{ isActive: boolean }>
  pendingCount: number
  todayCount: number
  earnings: DashboardEarnings
  portfolioCount: number
  unrespondedCount: number
  avgResponseTimeHours: number
  totalReviews: number
}

interface SectionCard {
  icon: React.ElementType
  title: string
  metric: string
  status: string
  statusOk: boolean
  ctaLabel: string
  href: string
  alert?: string
}

export function SectionPreviews({
  services,
  pendingCount,
  todayCount,
  earnings,
  portfolioCount,
  unrespondedCount,
  avgResponseTimeHours,
  totalReviews,
}: Props) {
  const activeServices = services.filter(s => s.isActive).length
  const inactiveServices = services.filter(s => !s.isActive).length

  const monthlyGoal = Math.max(
    earnings.last3MonthsAvg > 0 ? earnings.last3MonthsAvg * 1.15 : 300,
    earnings.month + 50,
    200,
  )
  const goalProgress = Math.min(Math.round((earnings.month / monthlyGoal) * 100), 100)

  // Count growth issues
  const growthIssues =
    (unrespondedCount > 0 ? 1 : 0) +
    (portfolioCount < 4 ? 1 : 0) +
    (avgResponseTimeHours >= 8 ? 1 : 0)

  const sections: SectionCard[] = [
    {
      icon: LayoutGrid,
      title: 'Services',
      metric: `${activeServices} live`,
      status: inactiveServices > 0 ? `${inactiveServices} inactive` : 'All live',
      statusOk: inactiveServices === 0,
      ctaLabel: 'Manage',
      href: '/dashboard/provider/services',
      alert: inactiveServices > 0 ? `${inactiveServices} services hidden` : undefined,
    },
    {
      icon: BookOpen,
      title: 'Bookings',
      metric: todayCount > 0 ? `${todayCount} today` : 'No bookings today',
      status: pendingCount > 0 ? `${pendingCount} pending response` : 'All responded',
      statusOk: pendingCount === 0,
      ctaLabel: 'View all',
      href: '/dashboard/provider/bookings',
      alert: pendingCount > 0 ? `${pendingCount} need response` : undefined,
    },
    {
      icon: Banknote,
      title: 'Payments',
      metric: formatCurrency(earnings.month),
      status: `${goalProgress}% of monthly goal`,
      statusOk: goalProgress >= 80,
      ctaLabel: 'See details',
      href: '/dashboard/provider/payments',
    },
    {
      icon: TrendingUp,
      title: 'Growth',
      metric: totalReviews > 0 ? `${totalReviews} reviews` : 'No reviews yet',
      status: growthIssues > 0 ? `${growthIssues} improvement${growthIssues > 1 ? 's' : ''} available` : 'All signals good',
      statusOk: growthIssues === 0,
      ctaLabel: 'View playbook',
      href: '/dashboard/provider/growth',
      alert: unrespondedCount > 0 ? `${unrespondedCount} reviews need reply` : undefined,
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#717171]">
        Section overview
      </p>
      {sections.map(section => {
        const Icon = section.icon
        const StatusIcon = section.statusOk ? CheckCircle2 : AlertCircle
        return (
          <Link
            key={section.title}
            href={section.href}
            className="group flex items-center gap-4 rounded-2xl bg-white p-4 shadow-[0_1px_4px_rgba(26,31,54,0.07)] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(26,31,54,0.1)]"
          >
            {/* Icon */}
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#f9f2ef]">
              <Icon className="h-5 w-5 text-[#E96B56]" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-[#1A1A1A]">{section.title}</p>
                {section.alert && (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-micro font-bold text-amber-700">
                    {section.alert}
                  </span>
                )}
              </div>
              <p className="text-label text-[#717171]">{section.metric}</p>
              <div className={`mt-0.5 flex items-center gap-1 text-xs ${
                section.statusOk ? 'text-emerald-600' : 'text-amber-600'
              }`}>
                <StatusIcon className="h-3 w-3 flex-shrink-0" />
                {section.status}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex-shrink-0 text-[#e8e1de] transition-colors group-hover:text-[#E96B56]">
              <ChevronRight className="h-5 w-5" />
            </div>
          </Link>
        )
      })}
    </div>
  )
}
