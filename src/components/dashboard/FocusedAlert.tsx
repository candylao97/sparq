'use client'

import Link from 'next/link'
import { Zap, MessageSquare, Banknote, CheckCircle2, ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { DashboardData } from '@/types/dashboard'

interface Alert {
  level: 'critical' | 'high'
  icon: LucideIcon
  headline: string
  subtext: string
  ctaLabel: string
  href: string
  timer?: number | null
}

function buildAlerts(data: DashboardData): Alert[] {
  const alerts: Alert[] = []

  // 1. Expiring booking requests — most urgent
  const expiring = data.pendingBookings.filter(
    b => b.minutesUntilExpiry !== null && b.minutesUntilExpiry < 60,
  )
  if (expiring.length > 0) {
    const mins = expiring[0].minutesUntilExpiry!
    alerts.push({
      level: 'critical',
      icon: Zap,
      headline: `Booking request expires in ${mins}m`,
      subtext: `${expiring[0].customer.name} is waiting. Don't lose this.`,
      ctaLabel: 'Respond now',
      href: '/dashboard/provider/bookings',
      timer: mins,
    })
  }

  // 2. No Stripe — can't earn
  if (!data.profile.stripeAccountId) {
    alerts.push({
      level: 'critical',
      icon: Banknote,
      headline: "You can't get paid for bookings yet",
      subtext: 'Connect your bank account — takes 2 minutes.',
      ctaLabel: 'Set up payments',
      href: '/dashboard/provider/payouts',
    })
  }

  // 3. Multiple pending bookings
  if (data.pendingBookings.length > 0 && expiring.length === 0) {
    const count = data.pendingBookings.length
    alerts.push({
      level: 'high',
      icon: Zap,
      headline: `${count} client${count > 1 ? 's are' : ' is'} waiting for you`,
      subtext: 'Reply within 1 hour to maximise your booking rate.',
      ctaLabel: `View request${count > 1 ? 's' : ''}`,
      href: '/dashboard/provider/bookings',
    })
  }

  // 4. Unresponded reviews
  if (data.unrespondedReviews.length > 0) {
    const count = data.unrespondedReviews.length
    alerts.push({
      level: 'high',
      icon: MessageSquare,
      headline: `${count} review${count > 1 ? 's need' : ' needs'} a reply`,
      subtext: 'Clients 2× more likely to book when they see active replies.',
      ctaLabel: 'Reply now',
      href: '/dashboard/provider/growth',
    })
  }

  // Max 2 alerts — primary + 1 secondary
  return alerts.slice(0, 2)
}

const LEVEL_STYLES = {
  critical: {
    wrap: 'border-l-4 border-l-[#E96B56] bg-[#fff8f7]',
    icon: 'bg-[#E96B56]',
    timer: 'text-[#E96B56] font-bold',
    cta: 'bg-[#E96B56] hover:bg-[#a63a29] text-white',
  },
  high: {
    wrap: 'border-l-4 border-l-amber-400 bg-amber-50/60',
    icon: 'bg-amber-400',
    timer: 'text-amber-600 font-bold',
    cta: 'bg-[#1A1A1A] hover:bg-[#333] text-white',
  },
}

interface Props {
  data: DashboardData
}

export function FocusedAlert({ data }: Props) {
  const alerts = buildAlerts(data)

  if (alerts.length === 0) {
    return (
      <div className="mb-8 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 px-5 py-4">
        <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500" />
        <div>
          <p className="text-sm font-semibold text-[#1A1A1A]">You&apos;re all caught up</p>
          <p className="text-xs text-[#717171]">
            Your profile is live and accepting bookings. Keep delivering great work.
          </p>
        </div>
      </div>
    )
  }

  const primary = alerts[0]
  const secondary = alerts[1]
  const PrimaryIcon = primary.icon

  return (
    <div className="mb-8 space-y-3">
      {/* Primary alert — prominent */}
      <div className={`rounded-2xl border border-transparent p-5 ${LEVEL_STYLES[primary.level].wrap}`}>
        <div className="flex items-start gap-4">
          <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${LEVEL_STYLES[primary.level].icon}`}>
            <PrimaryIcon className="h-4.5 w-4.5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold leading-snug text-[#1A1A1A]">
              {primary.headline}
              {primary.timer != null && (
                <span className={`ml-2 text-sm ${LEVEL_STYLES[primary.level].timer}`}>
                  ({primary.timer}m left)
                </span>
              )}
            </p>
            <p className="mt-0.5 text-sm text-[#717171]">{primary.subtext}</p>
          </div>
          <Link
            href={primary.href}
            className={`flex-shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${LEVEL_STYLES[primary.level].cta}`}
          >
            {primary.ctaLabel}
          </Link>
        </div>
      </div>

      {/* Secondary alert — smaller */}
      {secondary && (
        <Link
          href={secondary.href}
          className="flex items-center justify-between rounded-xl border border-[#f0e8e4] bg-white px-4 py-3 text-sm transition-colors hover:bg-[#fafafa]"
        >
          <span className="font-medium text-[#1A1A1A]">{secondary.headline}</span>
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-[#717171]" />
        </Link>
      )}
    </div>
  )
}
