'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { Avatar } from '@/components/ui/Avatar'
import { Clock, MapPin, Calendar } from 'lucide-react'
import { formatTime, formatDate, getLocationLabel } from '@/lib/utils'
import type { TodayBooking } from '@/types/dashboard'

interface Props {
  open: boolean
  onClose: () => void
  booking: TodayBooking | null
}

export function PrepBriefModal({ open, onClose, booking }: Props) {
  const [brief, setBrief] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !booking) return
    setBrief('')
    setLoading(true)

    const controller = new AbortController()

    const locationLabel = booking.locationType === 'AT_HOME'
      ? `at their home${booking.address ? ` in ${booking.address}` : ''}`
      : 'at your studio'

    fetch('/api/ai/guide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        persona: 'provider',
        messages: [{
          role: 'user',
          content: `Generate a concise session prep brief for me. Here are the details:
- Service: ${booking.service.title} (${booking.service.duration} minutes)
- Client: ${booking.customer.name} (${booking.repeatFanCount > 1 ? `returning client, ${booking.repeatFanCount} previous bookings` : 'first-time client'})
- Time: ${formatTime(booking.time)} today
- Location: ${locationLabel}
${booking.notes ? `- Client's notes: "${booking.notes}"` : '- No special notes from the client'}

Write a helpful 3-4 sentence prep brief covering what I need to know and any preparation tips for this type of service. Be warm and specific.`,
        }],
      }),
      signal: controller.signal,
    })
      .then(r => r.json())
      .then(data => {
        setBrief(data.message || data.response || data.content || 'Could not generate brief.')
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          setBrief('Could not generate brief. Check your connection.')
        }
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [open, booking, booking?.id])

  if (!booking) return null

  const displayLocation = getLocationLabel(booking.locationType)

  return (
    <Modal open={open} onClose={onClose} title="Appointment Prep Brief" size="md">
      <div className="space-y-4">
        {/* Booking summary */}
        <div className="rounded-xl bg-[#f9f2ef] p-4">
          <div className="flex items-center gap-3">
            <Avatar name={booking.customer.name} src={booking.customer.image} size="md" />
            <div>
              <p className="text-sm font-semibold text-[#1A1A1A]">{booking.customer.name}</p>
              <p className="text-xs text-[#717171]">{booking.service.title}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#717171]">
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(booking.date)}</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatTime(booking.time)} · {booking.service.duration} mins</span>
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {displayLocation}</span>
          </div>
          {booking.notes && (
            <p className="mt-2 rounded-lg bg-white p-2 text-xs italic text-[#717171]">
              &ldquo;{booking.notes}&rdquo;
            </p>
          )}
        </div>

        {/* AI Brief */}
        <div>
          <h3 className="mb-2 text-body-compact font-semibold text-[#1A1A1A]">Prep Brief</h3>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full rounded-full" />
              <Skeleton className="h-4 w-5/6 rounded-full" />
              <Skeleton className="h-4 w-4/6 rounded-full" />
            </div>
          ) : (
            <p className="text-body-compact leading-relaxed text-[#717171]">{brief}</p>
          )}
        </div>
      </div>
    </Modal>
  )
}
