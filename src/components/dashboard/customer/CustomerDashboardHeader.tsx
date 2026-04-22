'use client'

import Link from 'next/link'
import { Sparkles, Crown, Search, Home, Building2, RotateCcw, Clock } from 'lucide-react'
import { AiText } from '../AiText'
import type { CustomerBooking } from '@/types/dashboard'

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
  lastBooking: CustomerBooking | null
  daysSinceLastBooking: number | null
}

export function CustomerDashboardHeader({
  firstName, userRole, membership, briefing, aiLoading,
  upcomingCount, unreviewedCount, lastBooking, daysSinceLastBooking,
}: Props) {
  const showPersonalisedCard = upcomingCount === 0 && lastBooking !== null
  const isRefillDue = daysSinceLastBooking !== null && daysSinceLastBooking >= 14

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
      <div className="mb-5">
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

      {/* Personalised state card — only when no upcoming bookings */}
      {showPersonalisedCard && (
        <div className="mb-5">
          {isRefillDue ? (
            /* Refill nudge — warm, action-forward */
            <div className="relative overflow-hidden rounded-2xl bg-[#1A1A1A] p-6">
              <div className="absolute -right-10 -top-12 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(233,107,86,0.25)_0%,transparent_70%)]" />
              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-600 text-xs font-bold text-white">
                      {lastBooking.provider.name.charAt(0)}
                    </div>
                    <p className="text-xs text-white/50">
                      With {lastBooking.provider.name} · {daysSinceLastBooking} days ago
                    </p>
                  </div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#E96B56]">
                    Time for a refill?
                  </p>
                  <h2 className="font-headline text-xl font-bold text-white">
                    Your {lastBooking.service.title} might be due
                  </h2>
                </div>
                <div className="flex flex-shrink-0 flex-wrap gap-2">
                  <Link href={`/book/${lastBooking.provider.id}`}>
                    <button className="flex items-center gap-1.5 rounded-xl bg-[#E96B56] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#d45a45]">
                      <RotateCcw className="h-3.5 w-3.5" />
                      Book again
                    </button>
                  </Link>
                  <Link href="/search">
                    <button className="rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.18]">
                      Browse artists
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* Recent booking — subtle "based on your last" */
            <div className="flex items-center justify-between rounded-2xl border border-[#e8e1de] bg-white px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-600 text-sm font-bold text-white">
                  {lastBooking.provider.name.charAt(0)}
                </div>
                <div>
                  <p className="text-xs text-[#717171]">Based on your last booking</p>
                  <p className="text-sm font-semibold text-[#1A1A1A]">
                    {lastBooking.service.title} with {lastBooking.provider.name}
                  </p>
                </div>
              </div>
              <Link href={`/book/${lastBooking.provider.id}`}>
                <button className="flex items-center gap-1.5 rounded-xl bg-[#E96B56] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#d45a45]">
                  <Clock className="h-3 w-3" />
                  Rebook
                </button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="mb-8 flex flex-wrap gap-2">
        <Link href="/search">
          <button className="flex items-center gap-1.5 rounded-full border border-[#e8e1de] bg-white px-4 py-2 text-sm font-medium text-[#1A1A1A] transition-colors hover:border-[#E96B56] hover:text-[#E96B56]">
            <Search className="h-3.5 w-3.5" /> Browse artists
          </button>
        </Link>
        <Link href="/search?mode=AT_HOME">
          <button className="flex items-center gap-1.5 rounded-full border border-[#e8e1de] bg-white px-4 py-2 text-sm font-medium text-[#1A1A1A] transition-colors hover:border-[#E96B56] hover:text-[#E96B56]">
            <Home className="h-3.5 w-3.5" /> At home
          </button>
        </Link>
        <Link href="/search?mode=AT_STUDIO">
          <button className="flex items-center gap-1.5 rounded-full border border-[#e8e1de] bg-white px-4 py-2 text-sm font-medium text-[#1A1A1A] transition-colors hover:border-[#E96B56] hover:text-[#E96B56]">
            <Building2 className="h-3.5 w-3.5" /> Studio visit
          </button>
        </Link>
      </div>
    </>
  )
}
