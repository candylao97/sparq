'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CalendarDays, MapPin, Clock, StickyNote, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, formatTime } from '@/lib/utils'
import { hoursUntilBooking } from '@/lib/booking-time'
import type { DashboardData, PendingBooking, TodayBooking } from '@/types/dashboard'

// ─── Types ──────────────────────────────────────────────────────────────────

interface BookingItem {
  id: string
  date: string
  time: string
  totalPrice: number
  status: string
  locationType: string
  address: string | null
  notes: string | null
  rescheduleDate?: string | null
  rescheduleTime?: string | null
  rescheduleReason?: string | null
  service: { title: string; duration: number; category: string }
  customer: { id: string; name: string | null; image: string | null }
  acceptDeadline?: string | null
  minutesUntilExpiry?: number | null
  repeatFanCount?: number
}

type FilterTab = 'all' | 'upcoming' | 'pending' | 'completed' | 'cancelled'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBookingDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function getStatusBadge(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-50 text-amber-700 border border-amber-200'
    case 'CONFIRMED':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    case 'COMPLETED':
      return 'bg-[#f9f2ef] text-[#717171] border border-[#f0e8e4]'
    case 'CANCELLED':
    case 'DECLINED':
      return 'bg-red-50 text-red-600 border border-red-200'
    case 'RESCHEDULE_REQUESTED':
      return 'bg-purple-50 text-purple-700 border border-purple-200'
    default:
      return 'bg-[#f9f2ef] text-[#717171] border border-[#f0e8e4]'
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    DECLINED: 'Declined',
    RESCHEDULE_REQUESTED: 'Reschedule request',
  }
  return labels[status] ?? status
}

function getLocationLabel(locationType: string): string {
  switch (locationType) {
    case 'AT_HOME': return 'Comes to you'
    case 'STUDIO': return 'At studio'
    case 'BOTH': return 'Home & studio'
    default: return locationType
  }
}

function getInitial(name: string | null): string {
  return name ? name.charAt(0).toUpperCase() : '?'
}

// AUDIT-037: Previously hardcoded `+10:00` which only matches AEST. During
// AEDT (first Sunday October → first Sunday April) the real Sydney offset is
// +11:00, so the "No Show" button appeared an hour too early (or too late,
// depending on which direction the caller reads it) for roughly half the year.
// hoursUntilBooking() uses date-fns-tz with the IANA Australia/Sydney zone
// so DST is handled correctly year-round.
function isInPast(booking: BookingItem): boolean {
  const dateStr = booking.date.split('T')[0]
  return hoursUntilBooking(dateStr, booking.time) < 0
}

function mergeBookings(
  pending: PendingBooking[],
  today: TodayBooking[]
): BookingItem[] {
  const seenIds = new Set<string>()
  const items: BookingItem[] = []

  for (const b of pending) {
    if (seenIds.has(b.id)) continue
    seenIds.add(b.id)
    items.push({
      id: b.id,
      date: b.date,
      time: b.time,
      totalPrice: b.totalPrice,
      status: b.status,
      locationType: b.locationType,
      address: b.address,
      notes: b.notes,
      rescheduleDate: b.rescheduleDate,
      rescheduleTime: b.rescheduleTime,
      rescheduleReason: b.rescheduleReason,
      service: b.service,
      customer: b.customer,
      acceptDeadline: b.acceptDeadline,
      minutesUntilExpiry: b.minutesUntilExpiry,
      repeatFanCount: b.repeatFanCount,
    })
  }

  for (const b of today) {
    if (seenIds.has(b.id)) continue
    seenIds.add(b.id)
    items.push({
      id: b.id,
      date: b.date,
      time: b.time,
      totalPrice: b.totalPrice,
      status: b.status,
      locationType: b.locationType,
      address: b.address,
      notes: b.notes,
      service: b.service,
      customer: b.customer,
      repeatFanCount: b.repeatFanCount,
    })
  }

  return items
}

function applyFilter(bookings: BookingItem[], tab: FilterTab): BookingItem[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  switch (tab) {
    case 'all':
      return bookings
    case 'upcoming':
      return bookings.filter(b => {
        const bookingDate = new Date(b.date)
        bookingDate.setHours(0, 0, 0, 0)
        return (
          (b.status === 'CONFIRMED' || b.status === 'PENDING' || b.status === 'RESCHEDULE_REQUESTED') &&
          bookingDate >= today
        )
      })
    case 'pending':
      return bookings.filter(b => b.status === 'PENDING' || b.status === 'RESCHEDULE_REQUESTED')
    case 'completed':
      return bookings.filter(b => b.status === 'COMPLETED')
    case 'cancelled':
      return bookings.filter(b => b.status === 'CANCELLED' || b.status === 'DECLINED')
    default:
      return bookings
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ClientAvatar({ name, image }: { name: string | null; image: string | null }) {
  if (image) {
    return (
      <img
        src={image}
        alt={name ?? 'Client'}
        className="h-10 w-10 rounded-full object-cover flex-shrink-0"
      />
    )
  }
  return (
    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E96B56] to-[#a63a29] text-sm font-bold text-white">
      {getInitial(name)}
    </div>
  )
}

interface BookingCardProps {
  booking: BookingItem
  onAction: (id: string, status: string) => Promise<void>
  onRescheduleResponse: (id: string, action: 'ACCEPT' | 'DECLINE') => Promise<void>
  actionLoading: string | null
}

function BookingCard({ booking, onAction, onRescheduleResponse, actionLoading }: BookingCardProps) {
  const isPending = booking.status === 'PENDING'
  const isRescheduleRequested = booking.status === 'RESCHEDULE_REQUESTED'
  const isUrgent =
    isPending &&
    booking.minutesUntilExpiry !== null &&
    booking.minutesUntilExpiry !== undefined &&
    booking.minutesUntilExpiry < 60

  const isActioning = actionLoading === booking.id

  return (
    <div className="rounded-2xl border border-[#f0e8e4] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

        {/* Left: Client + Service Info */}
        <div className="flex min-w-0 flex-1 gap-3">
          <ClientAvatar name={booking.customer.name} image={booking.customer.image} />

          <div className="min-w-0 flex-1">
            {/* Client name + repeat badge */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-[#1A1A1A]">
                {booking.customer.name ?? 'Unknown client'}
              </span>
              {booking.repeatFanCount !== undefined && booking.repeatFanCount > 1 && (
                <span className="rounded-full bg-[#f9f2ef] px-2 py-0.5 text-[10px] font-semibold text-[#E96B56]">
                  {booking.repeatFanCount}× repeat
                </span>
              )}
            </div>

            {/* Service title */}
            <p className="mt-0.5 truncate font-semibold text-[#1A1A1A]">
              {booking.service.title}
            </p>

            {/* Date + time */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#717171]">
              <span className="flex items-center gap-1">
                <CalendarDays size={13} className="flex-shrink-0" />
                {formatBookingDate(booking.date)} · {formatTime(booking.time)}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={13} className="flex-shrink-0" />
                {booking.service.duration} min
              </span>
            </div>

            {/* Location chip */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 rounded-full bg-[#f9f2ef] px-2.5 py-1 text-xs font-medium text-[#717171]">
                <MapPin size={11} />
                {getLocationLabel(booking.locationType)}
              </span>
              {booking.address && (
                <span className="max-w-[200px] truncate text-xs text-[#717171]">
                  {booking.address}
                </span>
              )}
            </div>

            {/* Notes preview */}
            {booking.notes && (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-[#717171]">
                <StickyNote size={11} className="mt-0.5 flex-shrink-0" />
                <span className="line-clamp-1 italic">{booking.notes}</span>
              </div>
            )}

            {/* Urgency indicator */}
            {isUrgent && (
              <div className="mt-2 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                <span className="text-xs font-medium text-red-500">
                  Expires in {booking.minutesUntilExpiry}m — respond now
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Price + Status + Actions */}
        <div className="flex flex-row items-end justify-between gap-3 sm:flex-col sm:items-end sm:justify-start">
          <div className="text-right">
            <p className="text-lg font-bold text-[#1A1A1A]">
              {formatCurrency(booking.totalPrice)}
            </p>
            <span
              className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(booking.status)}`}
            >
              {getStatusLabel(booking.status)}
            </span>
          </div>

          {/* Action buttons for pending */}
          {isPending && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onAction(booking.id, 'DECLINED')}
                disabled={isActioning}
                className="rounded-xl border border-[#e8e1de] px-4 py-2 text-sm font-medium text-[#717171] transition-colors hover:border-[#c9c0bc] hover:text-[#1A1A1A] disabled:opacity-50"
              >
                Decline
              </button>
              <button
                onClick={() => onAction(booking.id, 'CONFIRMED')}
                disabled={isActioning}
                className="rounded-xl bg-[#E96B56] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#d45c47] disabled:opacity-60"
              >
                {isActioning ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          )}

          {/* No Show button for confirmed past bookings */}
          {booking.status === 'CONFIRMED' && isInPast(booking) && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onAction(booking.id, 'NO_SHOW')}
                disabled={isActioning}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#f9f2ef] text-[#717171] border border-[#e8e1de] hover:bg-[#f3ece9] transition-colors disabled:opacity-50"
              >
                {isActioning ? 'Saving…' : 'No Show'}
              </button>
            </div>
          )}

          {/* Accept/Decline buttons for reschedule requests */}
          {isRescheduleRequested && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onRescheduleResponse(booking.id, 'DECLINE')}
                disabled={isActioning}
                className="rounded-xl border border-[#e8e1de] px-3 py-2 text-sm font-medium text-[#717171] transition-colors hover:border-[#c9c0bc] hover:text-[#1A1A1A] disabled:opacity-50"
              >
                Decline
              </button>
              <button
                onClick={() => onRescheduleResponse(booking.id, 'ACCEPT')}
                disabled={isActioning}
                className="rounded-xl bg-[#E96B56] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#d45c47] disabled:opacity-60"
              >
                {isActioning ? 'Saving…' : 'Accept'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* P1-E: Reschedule request details — show proposed date/time, not current */}
      {isRescheduleRequested && (
        <div className="mt-3 rounded-xl bg-purple-50 border border-purple-100 px-4 py-3">
          <p className="text-xs font-semibold text-purple-700 mb-1">Client requested to move to:</p>
          <p className="text-sm font-medium text-purple-900">
            {booking.rescheduleDate
              ? new Date(booking.rescheduleDate).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
              : '—'
            }{' '}
            {booking.rescheduleTime ? `at ${formatTime(booking.rescheduleTime)}` : ''}
          </p>
          <p className="text-xs text-purple-600 mt-0.5">
            Original: {new Date(booking.date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} · {formatTime(booking.time)}
          </p>
          {booking.rescheduleReason && (
            <p className="text-xs text-purple-700 mt-1 italic">"{booking.rescheduleReason}"</p>
          )}
        </div>
      )}
    </div>
  )
}

function EmptyState({ tab }: { tab: FilterTab }) {
  const messages: Record<FilterTab, { heading: string; sub: string }> = {
    all: {
      heading: 'No bookings yet',
      sub: 'Your confirmed appointments will appear here once clients start booking.',
    },
    upcoming: {
      heading: 'No upcoming appointments',
      sub: 'Confirmed bookings scheduled for today or later will show here.',
    },
    pending: {
      heading: 'No pending requests',
      sub: 'New booking requests will appear here for you to confirm or decline.',
    },
    completed: {
      heading: 'No completed appointments',
      sub: 'Appointments you have finished will be listed here.',
    },
    cancelled: {
      heading: 'No cancelled bookings',
      sub: 'Cancelled or declined bookings will appear here.',
    },
  }

  const { heading, sub } = messages[tab]

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <CalendarDays size={44} className="mb-4 text-[#e8e1de]" />
      <p className="text-base font-semibold text-[#1A1A1A]">{heading}</p>
      <p className="mt-1 max-w-xs text-sm text-[#717171]">{sub}</p>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
]

export default function ProviderBookingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Auth guard
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && session?.user?.role === 'CUSTOMER') {
      router.push('/dashboard/customer')
    }
  }, [status, session, router])

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/provider')
      if (!res.ok) throw new Error('Failed to fetch')
      const d: DashboardData = await res.json()
      setDashboardData(d)
    } catch (err) {
      console.error('Bookings page fetch error:', err)
      toast.error('Could not load bookings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData()
      // Poll every 60s to keep expiry countdowns fresh
      const interval = setInterval(() => {
        fetchData()
      }, 60_000)
      return () => clearInterval(interval)
    }
  }, [status, fetchData])

  const handleAction = useCallback(
    async (bookingId: string, newStatus: string) => {
      setActionLoading(bookingId)
      try {
        const res = await fetch(`/api/bookings/${bookingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })
        if (!res.ok) throw new Error('Action failed')
        toast.success(
          newStatus === 'CONFIRMED' ? 'Booking confirmed!' :
          newStatus === 'NO_SHOW' ? 'Marked as no-show.' :
          'Booking declined'
        )
        await fetchData()
      } catch {
        toast.error('Something went wrong. Please try again.')
      } finally {
        setActionLoading(null)
      }
    },
    [fetchData]
  )

  const handleRescheduleResponse = useCallback(
    async (bookingId: string, action: 'ACCEPT' | 'DECLINE') => {
      setActionLoading(bookingId)
      try {
        const res = await fetch(`/api/bookings/${bookingId}/reschedule`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to respond')
        }
        toast.success(action === 'ACCEPT' ? 'Reschedule accepted!' : 'Reschedule declined — original booking stands.')
        await fetchData()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Something went wrong.')
      } finally {
        setActionLoading(null)
      }
    },
    [fetchData]
  )

  // ── Loading / auth states ──
  if (status === 'loading' || (loading && !dashboardData)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#FDFBF7_100%)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E96B56] border-t-transparent" />
      </div>
    )
  }

  // ── Derive bookings ──
  const allBookings: BookingItem[] = dashboardData
    ? mergeBookings(dashboardData.pendingBookings, dashboardData.todayBookings)
    : []

  const stats = dashboardData?.stats
  const todayCount = dashboardData?.todayBookings.length ?? 0

  const filtered = applyFilter(allBookings, activeTab)
  const totalShown = allBookings.length

  const isActionable = (s: string) => s === 'PENDING' || s === 'RESCHEDULE_REQUESTED'

  // Sort: actionable first, then by date
  const sorted = [...filtered].sort((a, b) => {
    if (isActionable(a.status) && !isActionable(b.status)) return -1
    if (!isActionable(a.status) && isActionable(b.status)) return 1
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#FDFBF7_100%)]">
      <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-8 lg:px-12 xl:px-20">

        {/* ── Top bar ── */}
        <div className="mb-8">
          <Link
            href="/dashboard/provider"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#717171] transition-colors hover:text-[#1A1A1A]"
          >
            <ArrowLeft size={15} />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-[#1A1A1A]">Bookings</h1>
          <p className="mt-1 text-sm text-[#717171]">Manage all your appointments</p>
        </div>

        {/* ── Stats strip ── */}
        {stats && (
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* Pending */}
            <div className="rounded-2xl border border-amber-100 bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <p className="text-xs font-medium text-[#717171]">Pending</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{stats.pendingBookings}</p>
            </div>

            {/* Today */}
            <div className="rounded-2xl border border-[#f0e8e4] bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <p className="text-xs font-medium text-[#717171]">Today</p>
              <p className="mt-1 text-2xl font-bold text-[#E96B56]">{todayCount}</p>
            </div>

            {/* Completed this month */}
            <div className="rounded-2xl border border-emerald-100 bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <p className="text-xs font-medium text-[#717171]">Completed this month</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{stats.completedThisMonth}</p>
            </div>

            {/* Total */}
            <div className="rounded-2xl border border-[#f0e8e4] bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <p className="text-xs font-medium text-[#717171]">Total bookings</p>
              <p className="mt-1 text-2xl font-bold text-[#1A1A1A]">{stats.totalBookings}</p>
            </div>
          </div>
        )}

        {/* ── Filter tabs ── */}
        <div className="mb-6 border-b border-[#f0e8e4]">
          <nav className="-mb-px flex gap-6 overflow-x-auto">
            {FILTER_TABS.map(tab => {
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`whitespace-nowrap pb-3 text-sm transition-colors ${
                    isActive
                      ? 'border-b-2 border-[#E96B56] font-semibold text-[#E96B56]'
                      : 'text-[#717171] hover:text-[#1A1A1A]'
                  }`}
                >
                  {tab.label}
                  {tab.key === 'pending' && allBookings && (() => {
                    const cnt = allBookings.filter(b => b.status === 'PENDING' || b.status === 'RESCHEDULE_REQUESTED').length
                    return cnt > 0 ? (
                      <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                        {cnt}
                      </span>
                    ) : null
                  })()}
                </button>
              )
            })}
          </nav>
        </div>

        {/* ── Limited data notice ── */}
        {totalShown > 0 && (
          <div className="mb-4 flex items-center gap-2 text-xs text-[#717171]">
            <AlertCircle size={13} />
            <span>Showing your {totalShown} most recent bookings</span>
          </div>
        )}

        {/* ── Booking list ── */}
        {sorted.length === 0 ? (
          <EmptyState tab={activeTab} />
        ) : (
          <div className="flex flex-col gap-3">
            {sorted.map(booking => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onAction={handleAction}
                onRescheduleResponse={handleRescheduleResponse}
                actionLoading={actionLoading}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
