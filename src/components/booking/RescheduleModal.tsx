'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Calendar, Clock } from 'lucide-react'
import { formatTime } from '@/lib/utils'
import toast from 'react-hot-toast'

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']

interface Props {
  open: boolean
  onClose: () => void
  bookingId: string
  currentDate: string
  currentTime: string
  serviceTitle: string
  onSuccess: () => void
}

export function RescheduleModal({ open, onClose, bookingId, currentDate, currentTime, serviceTitle, onSuccess }: Props) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [loading, setLoading] = useState(false)

  const handleReschedule = async () => {
    if (!date || !time) {
      toast.error('Pick a new date and time to continue')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, time }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success('Done! Your new time has been requested.')
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'We couldn\u2019t reschedule this booking. Please try again.'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setDate('')
      setTime('')
      onClose()
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Pick a new time" size="md">
      <div className="space-y-5">
        <div className="rounded-xl bg-amber-50 p-3">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{serviceTitle}</span>
            <span className="mx-1.5 text-amber-400">·</span>
            Currently {currentDate} at {formatTime(currentTime)}
          </p>
        </div>

        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-[#1A1A1A]">
            <Calendar className="h-4 w-4" />
            New Date
          </div>
          <Input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-[#1A1A1A]">
            <Clock className="h-4 w-4" />
            New Time
          </div>
          <div className="grid grid-cols-5 gap-2">
            {TIME_SLOTS.map(slot => (
              <button
                key={slot}
                onClick={() => setTime(slot)}
                className={`rounded-xl py-2.5 text-sm font-semibold transition-all ${
                  time === slot
                    ? 'bg-[#E96B56] text-white shadow-sm'
                    : 'bg-[#f9f2ef] text-[#1A1A1A] hover:bg-[#f3ece9]'
                }`}
              >
                {formatTime(slot)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={handleClose} fullWidth disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleReschedule}
            disabled={!date || !time}
            loading={loading}
            fullWidth
          >
            Reschedule
          </Button>
        </div>

        <p className="text-center text-xs text-[#717171]">
          Your artist will need to confirm the new time. Your payment hold stays in place.
        </p>
      </div>
    </Modal>
  )
}
