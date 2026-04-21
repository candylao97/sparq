'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import {
  TrendingUp, TrendingDown, CheckCircle2, Circle, ArrowRight, Plus,
  Home, MapPin, Star, X, Wand2, CalendarDays, Share2, Zap, AlertCircle,
  BarChart2, AlertTriangle, MessageSquare, BadgeCheck, CreditCard, Banknote,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { Avatar } from '@/components/ui/Avatar'
import { useDashboardData } from '@/hooks/useDashboardData'
import { formatCurrency, formatTime } from '@/lib/utils'
import type { DashboardData, TodayBooking, PendingBooking } from '@/types/dashboard'
import { ReferralWidget } from '@/components/dashboard/ReferralWidget'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSetupSteps(data: DashboardData) {
  return [
    { label: 'Create a service',         sub: 'Add at least one service so clients can book you', done: data.profile.services.length > 0,                href: '/dashboard/provider/services/create' },
    { label: 'Verify identity',          sub: 'Complete for instant payouts',                     done: data.profile.isVerified,                         href: '/dashboard/provider/kyc'        },
    { label: 'Curate portfolio',         sub: 'Add photos to rank higher in search',              done: data.stats.portfolioPhotoCount >= 3,             href: '/dashboard/provider/portfolio'  },
    { label: 'Connect payment account',  sub: 'Link Stripe to receive earnings',                  done: !!data.profile.stripeAccountId,                  href: '/dashboard/provider/payments'   },
    { label: 'Complete your bio',        sub: 'A great bio converts more bookings',               done: !!(data.profile.bio && data.profile.tagline),    href: '/profile'                       },
    { label: 'Set your service area',    sub: 'Add your suburb so clients can find you',          done: !!(data.profile.suburb || data.profile.latitude), href: '/profile'},
  ]
}

function todayLabel() {
  return new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function isStartingSoon(time: string, durationMin = 60): boolean {
  const now = new Date()
  // Get current time in Sydney so the "starting soon" window is correct regardless
  // of what timezone the server or browser is running in (AEST/AEDT vary by ±1h).
  const sydneyNow = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }))
  const [hStr, mStr] = time.split(':')
  const bookingDate = new Date(sydneyNow)
  bookingDate.setHours(parseInt(hStr), parseInt(mStr), 0, 0)
  const diffMs = bookingDate.getTime() - sydneyNow.getTime()
  // UX-6: Use service duration so a 90-min service shows as "Starting Soon" within 120min
  const thresholdMs = (durationMin + 30) * 60 * 1000
  return diffMs >= 0 && diffMs <= thresholdMs
}

function parseAMPM(time: string) {
  const [hStr, mStr] = time.split(':')
  const h = parseInt(hStr)
  const m = mStr ?? '00'
  return {
    clock: `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${m}`,
    period: h >= 12 ? 'PM' : 'AM',
  }
}

// ─── Appointment row ─────────────────────────────────────────────────────────

type AnyBooking = (TodayBooking & { kind: 'today' }) | (PendingBooking & { kind: 'pending' })

function AppointmentRow({
  booking,
  active,
  onAccept,
  onDecline,
}: {
  booking: AnyBooking
  active: boolean
  onAccept?: (id: string) => Promise<void>
  onDecline?: (id: string) => Promise<void>
}) {
  const [actioning, setActioning] = useState<string | null>(null)
  const { clock, period } = parseAMPM(booking.time)
  const isHome = booking.locationType === 'AT_HOME'

  if (active) {
    return (
      <div className="relative flex gap-6 p-6 rounded-xl bg-[#E96B56] text-white shadow-xl scale-[1.02] z-10">
        <div className="w-20 text-right shrink-0">
          <p className="text-lg font-bold font-headline leading-none">{clock}</p>
          <p className="text-[10px] uppercase tracking-widest opacity-70 mt-0.5">{period}</p>
        </div>
        <div className="w-px bg-white/20 self-stretch" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-xl font-bold font-headline leading-tight">{booking.customer.name}</h3>
              <p className="text-white/80 text-sm mt-1 truncate">{booking.service.title}</p>
              <div className="flex items-center gap-1 mt-1 text-white/60 text-xs">
                {isHome ? <Home className="h-3 w-3 flex-shrink-0" /> : <MapPin className="h-3 w-3 flex-shrink-0" />}
                <span>{booking.service.duration} min · {formatCurrency(booking.totalPrice)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Starting Soon</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isPending = booking.kind === 'pending'

  return (
    <div className="flex gap-6 p-6 rounded-xl bg-[#f9f9fb] border border-[#e8e1de]/40 hover:border-[#d7c1c1]/60 transition-all duration-300 group">
      <div className="w-20 text-right shrink-0">
        <p className="text-lg font-bold font-headline text-[#1A1A1A] leading-none">{clock}</p>
        <p className="text-[10px] uppercase tracking-widest text-[#857373] mt-0.5">{period}</p>
      </div>
      <div className="w-px bg-[#d7c1c1]/30 self-stretch" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold font-headline text-[#1A1A1A] truncate">{booking.customer.name}</h3>
              {booking.kind === 'pending' && 'repeatFanCount' in booking && booking.repeatFanCount > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-[#E96B56] bg-[#FAEEED] px-1.5 py-0.5 rounded-full flex-shrink-0">
                  <Star className="h-2.5 w-2.5 fill-current" /> Repeat
                </span>
              )}
            </div>
            <p className="text-[#717171] text-sm mt-1 truncate">{booking.service.title}</p>
            <div className="flex items-center gap-1 mt-1 text-[#717171] text-xs">
              {isHome ? <Home className="h-3 w-3 flex-shrink-0" /> : <MapPin className="h-3 w-3 flex-shrink-0" />}
              <span>{booking.service.duration} min · {formatCurrency(booking.totalPrice)}</span>
            </div>
          </div>
          {isPending ? (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actioning ? (
                <span className="w-4 h-4 border-2 border-[#E96B56] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <button
                    onClick={async () => {
                      setActioning(booking.id)
                      await onAccept?.(booking.id)
                      setActioning(null)
                    }}
                    className="bg-[#E96B56] text-white text-xs font-semibold px-3 py-1 rounded-full hover:bg-[#a63a29] transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={async () => {
                      setActioning(booking.id)
                      await onDecline?.(booking.id)
                      setActioning(null)
                    }}
                    className="border border-red-300 text-red-500 text-xs font-semibold px-3 py-1 rounded-full hover:bg-red-50 transition-colors"
                  >
                    Decline
                  </button>
                </>
              )}
            </div>
          ) : (
            <span className="bg-[#e5989b]/20 text-[#8b4c50] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest flex-shrink-0">
              Confirmed
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Appointments section ─────────────────────────────────────────────────────

function AppointmentsSection({
  data,
  onBookingAction,
}: {
  data: DashboardData
  onBookingAction: (id: string, status: string) => Promise<void>
}) {
  const allBookings: AnyBooking[] = [
    ...data.todayBookings.map(b => ({ ...b, kind: 'today' as const })),
    ...data.pendingBookings.map(b => ({ ...b, kind: 'pending' as const })),
  ]

  const hasBookings = allBookings.length > 0
  const upcomingCount = data.todayBookings.length

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between">
        <h2 className="text-2xl font-bold font-headline tracking-tight text-[#E96B56]">
          Today&apos;s Appointments
        </h2>
        <span className="text-sm text-[#717171] font-medium">{todayLabel()}</span>
      </div>

      {hasBookings ? (
        <div className="space-y-4">
          {allBookings.slice(0, 6).map(booking => (
            <AppointmentRow
              key={booking.id}
              booking={booking}
              active={booking.kind === 'today' && isStartingSoon(booking.time, booking.service?.duration ?? 60)}
              onAccept={booking.kind === 'pending' ? id => onBookingAction(id, 'CONFIRMED') : undefined}
              onDecline={booking.kind === 'pending' ? id => onBookingAction(id, 'DECLINED') : undefined}
            />
          ))}
          {allBookings.length > 6 && (
            <Link
              href="/dashboard/provider/bookings"
              className="block text-center text-sm font-semibold text-[#E96B56] hover:text-[#a63a29] transition-colors py-2"
            >
              +{allBookings.length - 6} more →
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-[#f9f9fb] border border-[#e8e1de]/40 rounded-xl p-8 text-center">
          <CalendarDays className="h-10 w-10 text-[#d7c1c1] mx-auto mb-3" />
          <h3 className="font-bold text-[#1A1A1A] mb-1">Nothing scheduled today</h3>
          <p className="text-sm text-[#717171] mb-5 max-w-xs mx-auto">
            Your calendar is clear. Share your profile to attract bookings.
          </p>
          <Link
            href="/dashboard/provider/availability"
            className="inline-flex items-center gap-2 bg-[#E96B56] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#a63a29] transition-colors"
          >
            Manage schedule
          </Link>
        </div>
      )}
    </section>
  )
}

// ─── Earnings card ────────────────────────────────────────────────────────────

function EarningsCard({ data }: { data: DashboardData }) {
  const momChange = data.earnings.previousMonth > 0
    ? Math.round(((data.earnings.month - data.earnings.previousMonth) / data.earnings.previousMonth) * 100)
    : null
  const positive = momChange !== null && momChange >= 0

  // Simple linear forecast: project end-of-month based on how far through the month we are
  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const dayOfMonth = today.getDate()
  const projected = dayOfMonth > 0 && data.earnings.month > 0
    ? Math.round((data.earnings.month / dayOfMonth) * daysInMonth)
    : null

  return (
    <Link
      href="/dashboard/provider/payments"
      className="relative block p-8 rounded-2xl overflow-hidden text-white group"
      style={{ background: 'linear-gradient(135deg, #8b4c50 0%, #e5989b 100%)' }}
    >
      {/* Aesthetic orb */}
      <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center text-center">
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-75 mb-2">
          Earnings · This month
        </span>
        <p className="text-5xl font-extrabold font-headline tracking-tighter mb-2">
          {formatCurrency(data.earnings.month)}
        </p>
        {projected !== null && dayOfMonth < daysInMonth && (
          <p className="text-white/70 text-xs mb-4">
            On track for ~{formatCurrency(projected)} this month
          </p>
        )}
        <div className="flex items-center gap-2 bg-white/15 border border-white/15 px-4 py-2 rounded-full backdrop-blur-sm group-hover:bg-white/20 transition-colors">
          {positive
            ? <TrendingUp className="h-4 w-4 flex-shrink-0" />
            : <TrendingDown className="h-4 w-4 flex-shrink-0" />
          }
          <span className="text-sm font-semibold">
            {momChange !== null
              ? `${positive ? '+' : ''}${momChange}% vs last month`
              : 'First month of data'}
          </span>
        </div>
      </div>
    </Link>
  )
}

// ─── Next payout card (AUDIT-011) ────────────────────────────────────────────

/**
 * AUDIT-011 — Surfaces the soonest queued payout so talents don't have to
 * open the payouts page to know when money lands. Returns null (renders
 * nothing) when there's nothing queued, so the aside doesn't show an empty
 * card for artists who haven't earned yet.
 */
function NextPayoutCard({ data }: { data: DashboardData }) {
  const np = data.nextPayout
  if (!np) return null

  const { next, totalScheduled, queuedCount } = np
  const scheduledDate = new Date(next.scheduledAt)
  const whenLabel = scheduledDate.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
  })

  return (
    <Link
      href="/dashboard/provider/payouts"
      className="block rounded-xl border border-[#e8e1de] bg-white p-5 transition-colors hover:border-[#d7c1c1] group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Banknote className="h-4 w-4 text-[#717171]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#717171]">
              Next payout
            </span>
          </div>
          <p className="text-2xl font-bold font-headline text-[#1A1A1A] tabular-nums">
            {formatCurrency(next.amount)}
          </p>
          <p className="mt-1 text-xs text-[#717171]">
            {next.isOverdue ? (
              <span className="inline-flex items-center gap-1 text-amber-700">
                <AlertCircle className="h-3 w-3" />
                Processing — expected shortly
              </span>
            ) : (
              <>Arriving {whenLabel}</>
            )}
          </p>
          {queuedCount > 1 && (
            <p className="mt-2 text-xs text-[#717171]">
              + {formatCurrency(totalScheduled - next.amount)} across{' '}
              {queuedCount - 1} more queued
            </p>
          )}
        </div>
        <ArrowRight className="h-4 w-4 flex-shrink-0 text-[#717171] transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  )
}

// ─── Studio next steps ────────────────────────────────────────────────────────

// ─── You're live banner ───────────────────────────────────────────────────────

function YouAreLiveBanner({ providerId, dismissed, onDismiss }: {
  providerId: string
  dismissed: boolean
  onDismiss: () => void
}) {
  if (dismissed) return null
  const profileUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/providers/${providerId}`

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'Check out my Sparq profile', url: profileUrl }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(profileUrl).catch(() => {})
    }
  }

  return (
    <div className="relative bg-gradient-to-br from-[#E96B56] to-[#a63a29] rounded-xl p-6 text-white overflow-hidden">
      <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 text-white/60 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="relative z-10">
        <p className="text-2xl font-bold font-headline mb-1">You&apos;re live! 🎉</p>
        <p className="text-white/80 text-sm mb-4">Your profile is complete and visible to clients. Share it to get your first booking.</p>
        <div className="flex items-center gap-3">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 bg-white text-[#E96B56] font-semibold text-sm px-4 py-2 rounded-full hover:bg-white/90 transition-colors"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share your profile
          </button>
          <Link
            href={`/providers/${providerId}`}
            className="text-white/80 hover:text-white text-sm font-medium transition-colors"
          >
            Preview my profile →
          </Link>
        </div>
      </div>
    </div>
  )
}

function StudioNextSteps({ data, dismissed, onDismiss }: {
  data: DashboardData
  dismissed: boolean
  onDismiss: () => void
}) {
  const steps = getSetupSteps(data)
  const allDone = steps.every(s => s.done)
  if (allDone || dismissed) return null

  const completedCount = steps.filter(s => s.done).length
  const completeness = Math.round((completedCount / steps.length) * 100)

  return (
    <div className="bg-[#f9f9fb] border border-[#e8e1de]/40 rounded-xl p-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold font-headline text-[#1A1A1A] flex items-center gap-3">
          <span className="text-[#E96B56]">✦</span> Studio Next Steps
        </h3>
        <button onClick={onDismiss} className="text-[#717171] hover:text-[#1A1A1A] transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Profile completeness bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-[#717171]">Profile completeness</span>
          <span className="text-xs font-bold text-[#1A1A1A]">{completeness}%</span>
        </div>
        <div className="h-2 bg-[#e8e1de] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#E96B56] rounded-full transition-all duration-500"
            style={{ width: `${completeness}%` }}
          />
        </div>
        <p className="text-[11px] text-[#717171] mt-1.5">
          Complete your profile to rank higher in search and win more bookings.
        </p>
      </div>
      <div className="space-y-4">
        {steps.map((step, i) => (
          <Link
            key={i}
            href={step.href}
            className={`flex items-start gap-4 p-4 rounded-lg transition-all ${
              step.done
                ? 'bg-white border border-[#e8e1de]/30 opacity-60 cursor-default pointer-events-none'
                : 'bg-white border border-[#e8e1de]/30 shadow-sm hover:border-[#d7c1c1]/60'
            }`}
          >
            {step.done
              ? <CheckCircle2 className="h-5 w-5 text-[#E96B56] flex-shrink-0 mt-0.5" />
              : <Circle className="h-5 w-5 text-[#e8e1de] flex-shrink-0 mt-0.5" />
            }
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#1A1A1A] leading-tight">{step.label}</p>
              <p className="text-xs text-[#717171] mt-0.5">{step.sub}</p>
              {!step.done && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#E96B56] mt-1.5 hover:gap-1.5 transition-all">
                  Take action <ArrowRight className="h-3 w-3" />
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── Upgrade to PRO CTA ───────────────────────────────────────────────────────

function UpgradeProCard({ tier }: { tier?: string }) {
  // Only show for NEWCOMER/RISING tiers — PRO/ELITE/TRUSTED don't need the nudge
  if (tier && ['PRO', 'ELITE', 'TRUSTED'].includes(tier)) return null
  return (
    <div className="bg-[#f9f9fb] border border-[#e8e1de]/40 rounded-xl p-6">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 bg-[#E96B56] rounded-lg flex items-center justify-center flex-shrink-0">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-[#1A1A1A] text-sm leading-tight">Unlock Sparq Pro</h3>
          <p className="text-xs text-[#717171] mt-0.5">Get featured placement, priority support, and badge</p>
        </div>
      </div>
      <ul className="space-y-1.5 mb-4">
        {['Featured in search results', 'Sparq Pro badge on your profile', 'Advanced analytics & insights'].map(f => (
          <li key={f} className="flex items-center gap-2 text-xs text-[#717171]">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#E96B56] flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      <Link
        href="/dashboard/provider/payments?upgrade=pro"
        className="block w-full text-center bg-[#E96B56] text-white font-semibold text-sm py-2.5 rounded-full hover:bg-[#a63a29] transition-colors"
      >
        Upgrade to Pro →
      </Link>
    </div>
  )
}

// ─── Analytics section ────────────────────────────────────────────────────────

interface AnalyticsData {
  currentMonthRevenue: number
  lastMonthRevenue: number
  revenueGrowth: number | null
  repeatCustomerRate: number
  revenueByService: { serviceName: string; totalRevenue: number; bookingCount: number }[]
}

function AnalyticsSection() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/provider/analytics')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-5 w-32 bg-[#f3ece9] rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-[#f3ece9] rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!data) return null

  const growthPositive = data.revenueGrowth !== null && data.revenueGrowth >= 0
  const topServices = data.revenueByService.slice(0, 3)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart2 className="h-4 w-4 text-[#717171]" />
        <h3 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-widest">Analytics</h3>
      </div>

      {/* 3 stat chips */}
      <div className="grid grid-cols-3 gap-3">
        {/* Current month */}
        <div className="bg-[#f9f2ef] rounded-xl p-3 flex flex-col gap-1">
          <span className="text-[10px] text-[#717171] font-semibold uppercase tracking-wider">This month</span>
          <span className="font-bold text-[#1A1A1A] text-base leading-tight">
            ${data.currentMonthRevenue.toFixed(0)}
          </span>
          {data.revenueGrowth !== null && (
            <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${growthPositive ? 'text-emerald-600' : 'text-red-500'}`}>
              {growthPositive
                ? <TrendingUp className="h-2.5 w-2.5" />
                : <TrendingDown className="h-2.5 w-2.5" />}
              {growthPositive ? '+' : ''}{data.revenueGrowth}%
            </span>
          )}
        </div>

        {/* Last month */}
        <div className="bg-[#f9f2ef] rounded-xl p-3 flex flex-col gap-1">
          <span className="text-[10px] text-[#717171] font-semibold uppercase tracking-wider">Last month</span>
          <span className="font-bold text-[#1A1A1A] text-base leading-tight">
            ${data.lastMonthRevenue.toFixed(0)}
          </span>
        </div>

        {/* Repeat client rate */}
        <div className="bg-[#f9f2ef] rounded-xl p-3 flex flex-col gap-1">
          <span className="text-[10px] text-[#717171] font-semibold uppercase tracking-wider">Repeat clients</span>
          <span className="font-bold text-[#1A1A1A] text-base leading-tight">
            {data.repeatCustomerRate}%
          </span>
          <span className="text-[10px] text-[#717171]">of total</span>
        </div>
      </div>

      {/* Top services */}
      {topServices.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-[#717171] uppercase tracking-wider">Top services (30 days)</p>
          {topServices.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-[#1A1A1A] font-medium">{s.serviceName}</span>
              <span className="text-[#717171] flex-shrink-0">${s.totalRevenue.toFixed(0)} · {s.bookingCount} appts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Style insight card ───────────────────────────────────────────────────────

function StyleInsightCard() {
  return (
    <div className="relative h-64 rounded-xl overflow-hidden group border border-[#e8e1de]/40 shadow-sm">
      <Image
        src="https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&h=500&fit=crop&q=85"
        alt="Style inspiration"
        fill
        sizes="(max-width: 1024px) 100vw, 40vw"
        className="object-cover grayscale-[20%] group-hover:scale-110 transition-transform duration-700"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mb-1">Style Insight</p>
        <h4 className="text-white font-bold font-headline text-lg leading-tight">
          Mastering the &lsquo;Soft Chrome&rsquo; aesthetic for winter clients.
        </h4>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProviderDashboardPage() {
  const { data: session } = useSession()
  const { data, loading, status, handleBookingAction } = useDashboardData()
  const [setupDismissed, setSetupDismissed] = useState(false)
  const [liveBannerDismissed, setLiveBannerDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('sparq_live_banner_dismissed') === 'true'
  })

  const dismissLiveBanner = () => {
    setLiveBannerDismissed(true)
    localStorage.setItem('sparq_live_banner_dismissed', 'true')
  }
  const [dismissedFeaturedUpsell, setDismissedFeaturedUpsell] = useState(() => typeof window !== 'undefined' && localStorage.getItem('sparq_featured_upsell_dismissed') === 'true')
  const [failedPayouts, setFailedPayouts] = useState<{ id: string }[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetch('/api/dashboard/provider/payout-history')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.payouts) {
          setFailedPayouts(d.payouts.filter((p: { status: string }) => p.status === 'FAILED'))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/messages/unread-count')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.count != null) setUnreadCount(d.count) })
      .catch(() => {})
  }, [])

  const firstName = useMemo(() => {
    const name = session?.user?.name ?? ''
    return name.split(' ')[0] || 'Artist'
  }, [session])

  const todayCount = data?.todayBookings.length ?? 0

  if (status === 'loading' || loading || !data) {
    return (
      <div className="flex-1 overflow-y-auto px-8 py-10 space-y-8">
        <Skeleton className="h-24 w-96 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
          <div className="lg:col-span-5 space-y-4">
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 md:px-12 pb-16 pt-8">

      {/* ── Hero header ── */}
      <header className="mb-12">
        <h1 className="font-headline text-5xl md:text-6xl font-bold tracking-tighter text-[#1A1A1A] mb-2 leading-[1]">
          Welcome back, {firstName}
        </h1>
        <p className="text-lg text-[#717171] leading-relaxed max-w-2xl">
          {todayCount > 0
            ? `Your studio is set for a great day. ${todayCount} client${todayCount !== 1 ? 's are' : ' is'} awaiting your touch today.`
            : 'Your calendar is clear today — a great time to plan ahead.'}
        </p>
      </header>

      {/* ── Failed payout alert ── */}
      {failedPayouts.length > 0 && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-red-900">
              {failedPayouts.length} payout{failedPayouts.length !== 1 ? 's' : ''} failed
            </p>
            <p className="text-xs text-red-700 mt-0.5">
              Please check your payment settings to ensure your bank details are correct.
            </p>
            <a href="/dashboard/provider/payments" className="text-xs font-semibold text-red-700 underline mt-1 inline-block">
              View payment settings →
            </a>
          </div>
        </div>
      )}

      {/* Suspension / review banner */}
      {data.profile.accountStatus === 'SUSPENDED' && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-red-800">Your account has been suspended</p>
            <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
              {data.profile.suspendReason
                ? `Reason: ${data.profile.suspendReason}`
                : 'Your account has been suspended. New bookings are paused.'}
              {' '}Please <a href="/contact" className="underline font-semibold">contact support</a> to resolve this.
            </p>
          </div>
        </div>
      )}
      {data.profile.accountStatus === 'UNDER_REVIEW' && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-amber-800">Your account is under review</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Our team is reviewing your account. You may receive fewer bookings during this time. We&apos;ll notify you when the review is complete.
            </p>
          </div>
        </div>
      )}

      {/* KYC action-required banner */}
      {!data.profile.isVerified && data.profile.accountStatus === 'ACTIVE' && (
        <div className="mb-6 rounded-2xl border border-[#e8e1de] bg-[#f9f2ef] px-5 py-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
              <BadgeCheck className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-sm text-[#1A1A1A]">Verify your identity to unlock payouts</p>
              <p className="text-xs text-[#717171] mt-0.5">
                Identity verification is required to receive payments from bookings. Takes about 2 minutes.
              </p>
            </div>
          </div>
          <a
            href="/dashboard/provider/kyc"
            className="flex-shrink-0 inline-flex items-center gap-1 rounded-full bg-[#1A1A1A] px-4 py-2 text-xs font-bold text-white hover:bg-[#333] transition-colors"
          >
            Verify now →
          </a>
        </div>
      )}

      {/* Stripe connect banner */}
      {!data.profile.stripeAccountId && (
        <div className="mb-6 rounded-2xl border border-[#e8e1de] bg-[#f9f2ef] px-5 py-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-50">
              <CreditCard className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-sm text-[#1A1A1A]">Connect your payment account</p>
              <p className="text-xs text-[#717171] mt-0.5">
                Link your bank account via Stripe to receive earnings from bookings.
              </p>
            </div>
          </div>
          <a
            href="/dashboard/provider/payments"
            className="flex-shrink-0 inline-flex items-center gap-1 rounded-full bg-[#1A1A1A] px-4 py-2 text-xs font-bold text-white hover:bg-[#333] transition-colors"
          >
            Connect →
          </a>
        </div>
      )}

      {/* Featured listing upsell — shown only after first completed booking */}
      {data.stats.completedBookings === 1 && !data.profile.isFeatured && !dismissedFeaturedUpsell && (
        <div className="mb-6 relative rounded-2xl bg-gradient-to-r from-[#E96B56] to-[#a63a29] p-5 text-white overflow-hidden">
          <button
            onClick={() => { setDismissedFeaturedUpsell(true); localStorage.setItem('sparq_featured_upsell_dismissed', 'true') }}
            className="absolute top-3 right-3 text-white/60 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">🎉 First booking complete!</p>
          <h3 className="font-headline text-lg font-bold mb-1">Get featured on Sparq</h3>
          <p className="text-sm text-white/80 mb-3">Featured artists get 3× more profile views and 2× more bookings. Lock in your spot now.</p>
          <a
            href="/dashboard/provider/featured"
            className="inline-flex items-center gap-1.5 bg-white text-[#E96B56] text-sm font-bold px-4 py-2 rounded-full hover:bg-[#f9f2ef] transition-colors"
          >
            Get featured →
          </a>
        </div>
      )}

      {/* ── Asymmetric grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* ── Left: Appointments (7 cols) ── */}
        <div className="lg:col-span-7">
          <AppointmentsSection data={data} onBookingAction={handleBookingAction} />
        </div>

        {/* ── Right: Aside (5 cols) ── */}
        <aside className="lg:col-span-5 space-y-6">
          <EarningsCard data={data} />
          {/* AUDIT-011: Next payout — only renders when something is queued */}
          <NextPayoutCard data={data} />
          {/* Messages quick-link with unread badge */}
          <Link
            href="/dashboard/provider/messages"
            className="flex items-center justify-between px-5 py-3.5 rounded-xl bg-[#f9f9fb] border border-[#e8e1de]/40 hover:border-[#d7c1c1]/60 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="h-4 w-4 text-[#717171] group-hover:text-[#1A1A1A] transition-colors" />
              <span className="text-sm font-semibold text-[#1A1A1A]">Messages</span>
              {unreadCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-[#E96B56] text-white text-[10px] font-bold px-1">
                  {unreadCount}
                </span>
              )}
            </div>
            <ArrowRight className="h-4 w-4 text-[#717171] group-hover:text-[#1A1A1A] transition-colors" />
          </Link>
          {/* P2-C: Account health — cancellation strike count */}
          {(data.profile.cancellationCount ?? 0) > 0 && (
            <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
              (data.profile.cancellationCount ?? 0) >= 6 ? 'bg-red-50 text-red-700' :
              (data.profile.cancellationCount ?? 0) >= 3 ? 'bg-amber-50 text-amber-700' :
              'bg-[#f9f2ef] text-[#717171]'
            }`}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>
                {data.profile.cancellationCount} cancellation{data.profile.cancellationCount !== 1 ? 's' : ''}
                {(data.profile.cancellationCount ?? 0) >= 6 ? ' — account under review' :
                 (data.profile.cancellationCount ?? 0) >= 3 ? ' — warning threshold' : ''}
              </span>
            </div>
          )}
          {/* UX-H5: Show "You're live!" once all setup steps are done */}
          {getSetupSteps(data).every(s => s.done) ? (
            <YouAreLiveBanner
              providerId={data.profile.id}
              dismissed={liveBannerDismissed}
              onDismiss={dismissLiveBanner}
            />
          ) : (
            <StudioNextSteps
              data={data}
              dismissed={setupDismissed}
              onDismiss={() => setSetupDismissed(true)}
            />
          )}
          {/* MON-R8: Upgrade prompt for NEWCOMER/RISING artists */}
          <UpgradeProCard tier={data.profile.tier} />
          <div className="bg-[#f9f9fb] border border-[#e8e1de]/40 rounded-xl p-6">
            <AnalyticsSection />
          </div>
          <StyleInsightCard />
          {/* Referral widget */}
          <ReferralWidget />
        </aside>
      </div>

      {/* ── Floating action button ── */}
      <Link
        href="/dashboard/provider/services/create"
        className="fixed bottom-8 right-8 w-14 h-14 bg-[#E96B56] text-white rounded-full shadow-[0_10px_30px_rgba(233,107,86,0.35)] flex items-center justify-center hover:scale-110 hover:bg-[#a63a29] active:scale-95 transition-all z-50"
        aria-label="New service"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  )
}
