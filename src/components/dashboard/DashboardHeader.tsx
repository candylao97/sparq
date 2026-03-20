'use client'

import Link from 'next/link'
import { Users, Wand2, CalendarDays, ShieldCheck, ShieldAlert, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { AiText } from './AiText'
import type { DashboardProfile } from '@/types/dashboard'

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
  profile: DashboardProfile
  firstName: string
  userRole: string
  briefing: string | null | undefined
  aiLoading: boolean
  pendingCount: number
  todayCount: number
}

export function DashboardHeader({ profile, firstName, userRole, briefing, aiLoading, pendingCount, todayCount }: Props) {
  return (
    <>
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(userRole === 'BOTH' || userRole === 'ADMIN') && (
            <Link
              href="/dashboard/customer"
              className="flex items-center gap-1 text-xs font-medium text-[#717171] transition-colors hover:text-[#1A1A1A]"
            >
              <Users className="h-3.5 w-3.5" />
              Switch to client view
            </Link>
          )}
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/provider/services">
            <Button variant="secondary" size="sm">
              <Wand2 className="mr-1.5 h-4 w-4" />
              Create with AI
            </Button>
          </Link>
          <Link href="/dashboard/provider/availability">
            <Button variant="primary" size="sm">
              <CalendarDays className="mr-1.5 h-4 w-4" />
              Availability
            </Button>
          </Link>
        </div>
      </div>

      {/* Greeting */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5">
          <h1 className="text-3xl font-bold leading-tight text-[#1A1A1A]">
            {getGreeting()}, <span className="text-[#E96B56]">{firstName}</span>
          </h1>
          {profile.isVerified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-label font-semibold text-emerald-600">
              <ShieldCheck className="h-3 w-3" /> Verified
            </span>
          ) : profile.verification?.stripeVerificationSessionId ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-label font-semibold text-amber-600">
              <Clock className="h-3 w-3" /> Pending
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-label font-semibold text-blue-600">
              <ShieldAlert className="h-3 w-3" /> Verify now
            </span>
          )}
        </div>
        <p className="mt-1 text-body-compact text-[#717171]">
          {getDateString()} · {pendingCount} pending · {todayCount} today
        </p>
        <AiText text={briefing} loading={aiLoading} className="mt-2 text-body-compact text-[#717171] font-medium" skeletonWidth="w-96" />
      </div>
    </>
  )
}
