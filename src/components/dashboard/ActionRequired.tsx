'use client'

import { useState, useMemo } from 'react'
import { CheckCircle, XCircle, Clock, Repeat, AlertTriangle, CalendarClock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { DeclineModal } from './DeclineModal'
import { RescheduleModal } from '@/components/booking/RescheduleModal'
import toast from 'react-hot-toast'
import type { PendingBooking } from '@/types/dashboard'

const URGENT_THRESHOLD_MINUTES = 60
const EXPIRING_THRESHOLD_MINUTES = 180

interface Props {
  bookings: PendingBooking[]
  onAction: (bookingId: string, status: 'CONFIRMED' | 'DECLINED') => void
  onRefresh?: () => void
}

function sortByPriority(bookings: PendingBooking[]): PendingBooking[] {
  return [...bookings].sort((a, b) => {
    // Soonest deadline first
    if (a.minutesUntilExpiry !== null && b.minutesUntilExpiry !== null) {
      if (a.minutesUntilExpiry !== b.minutesUntilExpiry) return a.minutesUntilExpiry - b.minutesUntilExpiry
    }
    if (a.minutesUntilExpiry !== null && b.minutesUntilExpiry === null) return -1
    if (a.minutesUntilExpiry === null && b.minutesUntilExpiry !== null) return 1
    // Repeat fans first
    if (b.repeatFanCount !== a.repeatFanCount) return b.repeatFanCount - a.repeatFanCount
    // Highest value first
    return b.totalPrice - a.totalPrice
  })
}

export function ActionRequired({ bookings, onAction, onRefresh }: Props) {
  const [declineTarget, setDeclineTarget] = useState<PendingBooking | null>(null)
  const [rescheduleTarget, setRescheduleTarget] = useState<PendingBooking | null>(null)

  const sorted = useMemo(() => sortByPriority(bookings), [bookings])

  if (bookings.length === 0) return null

  const handleDeclineConfirm = async (reason: string) => {
    if (!declineTarget) return
    try {
      const res = await fetch(`/api/bookings/${declineTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DECLINED', notes: reason }),
      })
      if (!res.ok) throw new Error('Failed to decline booking')
      onAction(declineTarget.id, 'DECLINED')
    } catch (err) {
      console.error('Decline error:', err)
      toast.error('Couldn\'t decline this booking — please try again.')
    } finally {
      setDeclineTarget(null)
    }
  }

  // Memoize bookingContext to avoid re-triggering DeclineModal's AI fetch
  const bookingContext = declineTarget ? {
    serviceName: declineTarget.service.title,
    customerName: declineTarget.customer.name,
    date: formatDate(declineTarget.date),
    time: formatTime(declineTarget.time),
  } : null

  return (
    <>
      <div className="mb-6 rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(26,31,54,0.07)]">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-lg font-bold text-[#1A1A1A]">Needs your response</h2>
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-label font-bold text-white">
            {bookings.length}
          </span>
        </div>

        <div className="space-y-3">
          {sorted.map(booking => {
            const isUrgent = booking.minutesUntilExpiry !== null && booking.minutesUntilExpiry < URGENT_THRESHOLD_MINUTES
            const isExpiring = booking.minutesUntilExpiry !== null && booking.minutesUntilExpiry < EXPIRING_THRESHOLD_MINUTES

            return (
              <div
                key={booking.id}
                className={`rounded-xl border p-4 ${
                  isUrgent
                    ? 'border-red-200 bg-red-50/50'
                    : isExpiring
                    ? 'border-amber-200 bg-amber-50/50'
                    : 'border-[#e8e1de] bg-[#f9f2ef]/50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Avatar name={booking.customer.name} src={booking.customer.image} size="sm" />
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A1A]">{booking.service.title}</p>
                      <p className="text-xs text-[#717171]">
                        {booking.customer.name} · {formatDate(booking.date)} · {formatTime(booking.time)}
                      </p>
                      <p className="mt-0.5 text-body-compact font-semibold text-[#1A1A1A]">{formatCurrency(booking.totalPrice)}</p>

                      {/* Smart labels */}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {booking.repeatFanCount > 1 && (
                          <Badge variant="info" size="sm">
                            <Repeat className="mr-1 h-3 w-3" />
                            Returning client · {booking.repeatFanCount} bookings
                          </Badge>
                        )}
                        {isUrgent && (
                          <Badge variant="danger" size="sm">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Expires in {booking.minutesUntilExpiry} min
                          </Badge>
                        )}
                        {!isUrgent && isExpiring && (
                          <Badge variant="warning" size="sm">
                            <Clock className="mr-1 h-3 w-3" />
                            Expires in {Math.round((booking.minutesUntilExpiry || 0) / 60)}h
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="primary" onClick={() => onAction(booking.id, 'CONFIRMED')}>
                    <CheckCircle className="mr-1 h-3.5 w-3.5" /> Accept
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setRescheduleTarget(booking)}>
                    <CalendarClock className="mr-1 h-3.5 w-3.5" /> Reschedule
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setDeclineTarget(booking)}>
                    <XCircle className="mr-1 h-3.5 w-3.5" /> Decline
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <DeclineModal
        open={!!declineTarget}
        onClose={() => setDeclineTarget(null)}
        onConfirm={handleDeclineConfirm}
        bookingContext={bookingContext}
      />

      {rescheduleTarget && (
        <RescheduleModal
          open={!!rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          bookingId={rescheduleTarget.id}
          currentDate={formatDate(rescheduleTarget.date)}
          currentTime={rescheduleTarget.time}
          serviceTitle={rescheduleTarget.service.title}
          onSuccess={() => onRefresh?.()}
        />
      )}
    </>
  )
}
