'use client'
import { useState, useRef, useMemo } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { X, ChevronLeft, ChevronRight, Check, ArrowRight, RotateCcw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const TIME_SLOTS = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
  '6:00 PM',
]

function generateDays(count = 30) {
  const days = []
  const today = new Date()
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  for (let i = 0; i < count; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    days.push({
      label: dayNames[d.getDay()],
      date: d.getDate(),
      key: d.toISOString().split('T')[0],
      isToday: i === 0,
    })
  }
  return days
}

interface Service {
  id: string
  title: string
  category: string
  price: number
  duration: number
  description?: string
}

interface PortfolioPhoto {
  id: string
  url: string
}

interface SchedulingModalProps {
  isOpen: boolean
  onClose: () => void
  profileId: string
  services: Service[]
  portfolio: PortfolioPhoto[]
}

export function SchedulingModal({
  isOpen,
  onClose,
  profileId,
  services,
  portfolio,
}: SchedulingModalProps) {
  const router = useRouter()
  const days = useMemo(() => generateDays(30), [])
  const [selectedDay, setSelectedDay] = useState(days[0].key)
  const [selectedService, setSelectedService] = useState<Service>(services[0])
  const [selectedTime, setSelectedTime] = useState<string>('')
  const dateRef = useRef<HTMLDivElement>(null)

  const scrollDates = (dir: 'left' | 'right') =>
    dateRef.current?.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' })

  const handleContinue = () => {
    if (!selectedService || !selectedTime) return
    const params = new URLSearchParams({
      service: selectedService.id,
      date: selectedDay,
      time: selectedTime,
    })
    router.push(`/book/${profileId}?${params}`)
    onClose()
  }

  if (!isOpen) return null

  const thumb = portfolio[0]?.url

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white w-full sm:max-w-md sm:mx-4 sm:rounded-2xl rounded-t-3xl max-h-[92vh] overflow-y-auto shadow-2xl">

        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[#e8e1de]" />
        </div>

        {/* Sticky header */}
        <div className="sticky top-0 bg-white border-b border-[#e8e1de] px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-base font-semibold text-[#1A1A1A]">Book an appointment</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#f3ece9] flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-[#717171]" />
          </button>
        </div>

        <div className="px-6 pb-8 pt-5 space-y-6">

          {/* ── Service display / selection ── */}
          {services.length === 1 ? (
            // Single service — just show it, no selection needed
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#f9f2ef]">
              {thumb && (
                <div className="w-12 h-12 rounded-xl overflow-hidden relative flex-shrink-0">
                  <Image
                    src={thumb}
                    alt={selectedService.title}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
              )}
              <div>
                <p className="font-semibold text-sm text-[#1A1A1A]">{selectedService.title}</p>
                <p className="text-xs text-[#717171] mt-0.5">
                  {formatCurrency(selectedService.price)} AUD
                  {selectedService.duration ? ` · ${selectedService.duration} min` : ''}
                </p>
              </div>
            </div>
          ) : (
            // Multiple services — pick one
            <div>
              <p className="text-xs font-semibold text-[#717171] uppercase tracking-wider mb-2.5">
                Select a service
              </p>
              <div className="space-y-2">
                {services.map(service => (
                  <button
                    key={service.id}
                    onClick={() => { setSelectedService(service); setSelectedTime('') }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                      selectedService?.id === service.id
                        ? 'border-[#E96B56] bg-[#fff8f7]'
                        : 'border-[#e8e1de] hover:border-[#E96B56]/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                          selectedService?.id === service.id
                            ? 'border-[#E96B56] bg-[#E96B56]'
                            : 'border-[#e8e1de]'
                        }`}
                      >
                        {selectedService?.id === service.id && (
                          <Check className="w-2.5 h-2.5 text-white" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#1A1A1A] truncate">{service.title}</p>
                        {service.duration && (
                          <p className="text-xs text-[#717171]">{service.duration} min</p>
                        )}
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-[#1A1A1A] flex-shrink-0 ml-3">
                      {formatCurrency(service.price)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Date strip ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-[#717171] uppercase tracking-wider">
                Pick a date
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => scrollDates('left')}
                  className="w-7 h-7 rounded-full border border-[#e8e1de] flex items-center justify-center hover:border-[#1A1A1A] transition-colors"
                  aria-label="Scroll dates left"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => scrollDates('right')}
                  className="w-7 h-7 rounded-full border border-[#e8e1de] flex items-center justify-center hover:border-[#1A1A1A] transition-colors"
                  aria-label="Scroll dates right"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div ref={dateRef} className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {days.map(day => (
                <button
                  key={day.key}
                  onClick={() => { setSelectedDay(day.key); setSelectedTime('') }}
                  className={`flex-shrink-0 flex flex-col items-center gap-0.5 w-[46px] py-2.5 rounded-xl border transition-all ${
                    selectedDay === day.key
                      ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white'
                      : 'border-[#e8e1de] text-[#1A1A1A] hover:border-[#1A1A1A]'
                  }`}
                >
                  <span
                    className={`text-[10px] font-medium ${
                      selectedDay === day.key ? 'text-white/70' : 'text-[#717171]'
                    }`}
                  >
                    {day.label}
                  </span>
                  <span className="text-sm font-bold">{day.date}</span>
                  {day.isToday && (
                    <span
                      className={`text-[8px] font-medium leading-none ${
                        selectedDay === day.key ? 'text-white/50' : 'text-[#E96B56]'
                      }`}
                    >
                      Today
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── Time grid ── */}
          <div>
            <p className="text-xs font-semibold text-[#717171] uppercase tracking-wider mb-3">
              Pick a time
            </p>
            <div className="grid grid-cols-4 gap-2">
              {TIME_SLOTS.map(slot => (
                <button
                  key={slot}
                  onClick={() => setSelectedTime(prev => (prev === slot ? '' : slot))}
                  className={`py-2.5 rounded-xl text-xs font-medium border transition-all ${
                    selectedTime === slot
                      ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white'
                      : 'border-[#e8e1de] text-[#1A1A1A] hover:border-[#1A1A1A]'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          {/* ── CTA ── */}
          <div>
            <button
              onClick={handleContinue}
              disabled={!selectedService || !selectedTime}
              className={`w-full font-semibold py-3.5 rounded-full text-sm transition-all flex items-center justify-center gap-2 ${
                selectedService && selectedTime
                  ? 'bg-[#E96B56] hover:bg-[#d45a45] active:scale-[.98] text-white shadow-sm'
                  : 'bg-[#f3ece9] text-[#BEBEBE] cursor-not-allowed'
              }`}
            >
              {selectedService && selectedTime ? (
                <>
                  Continue to book <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                'Select a date & time to continue'
              )}
            </button>

            {/* Confirmation summary */}
            {selectedService && selectedTime && (
              <p className="text-center text-xs text-[#717171] mt-2">
                {selectedService.title} · {selectedTime} · {formatCurrency(selectedService.price)} AUD
              </p>
            )}

            {/* Cancellation assurance */}
            <div className="flex items-center justify-center gap-1.5 mt-3">
              <RotateCcw className="w-3 h-3 text-[#E96B56] flex-shrink-0" />
              <p className="text-xs text-[#717171]">Free cancellation up to 24h before</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
