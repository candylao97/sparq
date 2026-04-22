'use client'

import Link from 'next/link'
import { Users, Wand2, CalendarDays, ShieldCheck, ShieldAlert, Clock, BookOpen, Banknote, LayoutGrid, Sparkles, TrendingUp, Settings } from 'lucide-react'
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
      <div className="mb-6 flex items-center justify-between gap-4">
        {/* Left: role switcher + quick nav */}
        <div className="flex items-center gap-3">
          {(userRole === 'BOTH' || userRole === 'ADMIN') && (
            <Link
              href="/dashboard/customer"
              className="flex items-center gap-1 text-xs font-medium text-[#717171] transition-colors hover:text-[#1A1A1A]"
            >
              <Users className="h-3.5 w-3.5" />
              Client view
            </Link>
          )}
          {/* Quick nav — segmented pill container */}
          <nav className="hidden items-center rounded-xl bg-[#f9f2ef] p-1 sm:flex">
            {[
              { href: '/dashboard/provider/services',     icon: LayoutGrid,  label: 'Services'     },
              { href: '/dashboard/provider/bookings',     icon: BookOpen,    label: 'Bookings'     },
              { href: '/dashboard/provider/availability', icon: CalendarDays, label: 'Availability' },
              { href: '/dashboard/provider/payments',     icon: Banknote,    label: 'Payments'     },
              { href: '/dashboard/provider/growth',       icon: TrendingUp,  label: 'Growth'       },
              { href: '/dashboard/provider/settings',     icon: Settings,    label: 'Settings'     },
            ].map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#717171] transition-all hover:bg-white hover:text-[#1A1A1A] hover:shadow-sm"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: action buttons */}
        <div className="flex flex-shrink-0 gap-2">
          <Link href="/dashboard/provider/services/create">
            <Button variant="secondary" size="sm">
              <Wand2 className="mr-1.5 h-4 w-4" />
              New Service
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
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-headline text-3xl font-bold leading-tight text-[#1A1A1A]">
            {getGreeting()}, <span className="text-[#E96B56]">{firstName}</span>
          </h1>
          {profile.isVerified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-label font-semibold text-emerald-600 ring-1 ring-emerald-100">
              <ShieldCheck className="h-3 w-3" /> Verified
            </span>
          ) : profile.verification?.stripeVerificationSessionId ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-label font-semibold text-amber-600 ring-1 ring-amber-100">
              <Clock className="h-3 w-3" /> Under review
            </span>
          ) : (
            <Link
              href="/dashboard/provider/verification"
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-label font-semibold text-blue-600 ring-1 ring-blue-100 transition-colors hover:bg-blue-100"
            >
              <ShieldAlert className="h-3 w-3" /> Get verified →
            </Link>
          )}
        </div>

        {/* Sub-line: date + live stats */}
        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-body-compact text-[#717171]">
          <span>{getDateString()}</span>
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#E96B56]/10 px-2 py-0.5 text-xs font-semibold text-[#E96B56]">
              {pendingCount} pending
            </span>
          )}
          {todayCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
              {todayCount} today
            </span>
          )}
          {pendingCount === 0 && todayCount === 0 && (
            <span className="text-xs text-[#717171]">All caught up ✓</span>
          )}
        </div>

        {/* AI briefing */}
        {(briefing || aiLoading) && (
          <div className="mt-3 flex items-start gap-2">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#E96B56]" />
            <AiText text={briefing} loading={aiLoading} className="text-body-compact font-medium text-[#717171]" skeletonWidth="w-96" />
          </div>
        )}
      </div>
    </>
  )
}
