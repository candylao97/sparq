'use client'

import Link from 'next/link'
import { Camera, MessageSquare, Clock, ShieldCheck, LayoutGrid } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Nudge {
  icon: LucideIcon
  headline: string
  why: string
  impact: string
  ctaLabel: string
  href: string
}

interface Props {
  portfolioCount: number
  unrespondedCount: number
  avgResponseTimeHours: number
  isVerified: boolean
  serviceCount?: number
}

function buildNudges({
  portfolioCount,
  unrespondedCount,
  avgResponseTimeHours,
  isVerified,
  serviceCount = 1,
}: Props): Nudge[] {
  const all: Nudge[] = []

  if (portfolioCount < 4) {
    const need = 4 - portfolioCount
    all.push({
      icon: Camera,
      headline: `Add ${need} more photo${need !== 1 ? 's' : ''}`,
      why: 'Clients decide in seconds. Profiles with 4+ photos win more bookings.',
      impact: '3× more profile views',
      ctaLabel: 'Add photos',
      href: '/dashboard/provider/growth',
    })
  }

  if (unrespondedCount > 0) {
    all.push({
      icon: MessageSquare,
      headline: `Reply to ${unrespondedCount} review${unrespondedCount > 1 ? 's' : ''}`,
      why: 'Clients check your replies before booking. Show them you care.',
      impact: '2× repeat bookings',
      ctaLabel: 'Reply now',
      href: '/dashboard/provider/growth',
    })
  }

  if (avgResponseTimeHours >= 3) {
    all.push({
      icon: Clock,
      headline: 'Reply to requests faster',
      why: `Your response time is ${Math.round(avgResponseTimeHours)}h. Clients book the first artist who replies.`,
      impact: '+40% booking rate',
      ctaLabel: 'View requests',
      href: '/dashboard/provider/bookings',
    })
  }

  if (!isVerified) {
    all.push({
      icon: ShieldCheck,
      headline: 'Get your Verified badge',
      why: 'Verified artists rank higher in search and get trusted faster.',
      impact: '+40% avg earnings',
      ctaLabel: 'Get verified',
      href: '/dashboard/provider/verification',
    })
  }

  if (serviceCount < 2) {
    all.push({
      icon: LayoutGrid,
      headline: 'Add another service',
      why: 'More services means you appear in more searches and earn more per visit.',
      impact: 'More search visibility',
      ctaLabel: 'Create service',
      href: '/dashboard/provider/services/create',
    })
  }

  // Return top 2 only
  return all.slice(0, 2)
}

export function GrowthNudges(props: Props) {
  const nudges = buildNudges(props)

  if (nudges.length === 0) {
    return null
  }

  return (
    <div className="mb-8">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#717171]">
        2 ways to grow
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {nudges.map(nudge => {
          const Icon = nudge.icon
          return (
            <div
              key={nudge.headline}
              className="flex flex-col rounded-2xl border border-[#f0e8e4] bg-white p-5"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#f9f2ef]">
                <Icon className="h-4.5 w-4.5 text-[#E96B56]" />
              </div>
              <p className="text-sm font-bold text-[#1A1A1A]">{nudge.headline}</p>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-[#717171]">{nudge.why}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="rounded-full bg-[#f9f2ef] px-2.5 py-1 text-label font-bold text-[#E96B56]">
                  {nudge.impact}
                </span>
                <Link
                  href={nudge.href}
                  className="rounded-xl bg-[#1A1A1A] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#333]"
                >
                  {nudge.ctaLabel} →
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
