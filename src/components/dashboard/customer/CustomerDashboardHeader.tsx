'use client'

import Link from 'next/link'
import { Sparkles, Crown } from 'lucide-react'
import { AiText } from '../AiText'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function getDateString() {
  return new Date().toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

interface Props {
  firstName: string
  userRole: string
  membership: string
  briefing: string | null | undefined
  aiLoading: boolean
  upcomingCount: number
  unreviewedCount: number
}

export function CustomerDashboardHeader({ firstName, userRole, membership, briefing, aiLoading, upcomingCount, unreviewedCount }: Props) {
  return (
    <>
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(userRole === 'BOTH' || userRole === 'ADMIN') && (
            <Link
              href="/dashboard/provider"
              className="flex items-center gap-1 text-xs font-medium text-[#717171] transition-colors hover:text-[#1A1A1A]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Switch to artist view
            </Link>
          )}
        </div>
        <div className="flex gap-2" />
      </div>

      {/* Greeting */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5">
          <h1 className="text-3xl font-bold leading-tight text-[#1A1A1A]">
            {getGreeting()}, <span className="text-[#E96B56]">{firstName}</span>
          </h1>
          {membership === 'PREMIUM' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-label font-semibold text-[#E96B56]">
              <Crown className="h-3 w-3" /> Premium
            </span>
          )}
        </div>
        <p className="mt-1 text-body-compact text-[#717171]">
          {getDateString()} · {upcomingCount} upcoming{unreviewedCount > 0 ? ` · ${unreviewedCount} to review` : ''}
        </p>
        <AiText text={briefing} loading={aiLoading} className="mt-2 text-body-compact font-medium text-[#717171]" skeletonWidth="w-96" />
      </div>
    </>
  )
}
