'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  MapPin,
  Home,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  RotateCcw,
  Lock,
  BadgeCheck,
} from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { StripePaymentForm } from '@/components/booking/StripePaymentForm'
import {
  formatCurrency,
  formatDate,
  formatTime,
  calculatePlatformFee,
  getCategoryLabel,
} from '@/lib/utils'
import toast from 'react-hot-toast'

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00',
]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

// ─── Summary row ─────────────────────────────────────────────────────────────
function SummaryRow({
  label,
  value,
  muted = false,
}: {
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-[#717171] flex-shrink-0">{label}</span>
      <span className={`text-right ${muted ? 'text-[#717171]' : 'font-medium text-[#1A1A1A]'}`}>
        {value}
      </span>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function BookingPage({ params }: { params: { providerId: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const serviceId = searchParams.get('service')

  const [provider, setProvider] = useState<any>(null)
  const [selectedService, setSelectedService] = useState<any>(null)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<string[]>(TIME_SLOTS)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [paymentPhase, setPaymentPhase] = useState(false)
  const [isMember, setIsMember] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth())
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear())
  const [bookingData, setBookingData] = useState({
    date: '',
    time: '',
    locationType: '' as '' | 'AT_HOME' | 'STUDIO',
    address: '',
    notes: '',
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/login'); return }

    fetch(`/api/providers/${params.providerId}`)
      .then(r => r.json())
      .then(d => {
        setProvider(d)
        const service = serviceId
          ? d.profile?.services?.find((s: any) => s.id === serviceId)
          : d.profile?.services?.[0]
        setSelectedService(service)

        // Auto-select location when only one option available
        if (d.profile?.offerAtHome && !d.profile?.offerAtStudio) {
          setBookingData(prev => ({ ...prev, locationType: 'AT_HOME' }))
        } else if (!d.profile?.offerAtHome && d.profile?.offerAtStudio) {
          setBookingData(prev => ({ ...prev, locationType: 'STUDIO' }))
        } else {
          setBookingData(prev => ({ ...prev, locationType: 'AT_HOME' }))
        }
      })

    fetch('/api/customer/membership')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.membership === 'PREMIUM') setIsMember(true) })
      .catch(() => {})
  }, [params.providerId, serviceId, session, status, router])

  const fetchAvailability = async (date: string) => {
    if (!date) return
    setLoadingSlots(true)
    try {
      const res = await fetch(`/api/providers/${params.providerId}/availability?date=${date}`)
      if (res.ok) {
        const data = await res.json()
        if (data.isBlocked) {
          setAvailableSlots([])
        } else if (data.availableSlots?.length > 0) {
          setAvailableSlots(data.availableSlots)
        } else {
          setAvailableSlots([])
        }
      }
    } catch {
      setAvailableSlots(TIME_SLOTS)
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleBook = async () => {
    if (bookingId && clientSecret) { setPaymentPhase(true); return }
    if (!selectedService || !bookingData.date || !bookingData.time) {
      toast.error('Please complete all required fields')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selectedService.id,
          date: bookingData.date,
          time: bookingData.time,
          locationType: bookingData.locationType,
          address: bookingData.locationType === 'AT_HOME' ? bookingData.address : undefined,
          notes: bookingData.notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setBookingId(data.booking.id)
      if (data.clientSecret) {
        setClientSecret(data.clientSecret)
        setPaymentPhase(true)
      } else {
        toast.success('Booking confirmed!')
        router.push('/dashboard/customer?booking=success')
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Calendar ──
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth)
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth)
  const monthName = new Date(calendarYear, calendarMonth).toLocaleString('en-AU', {
    month: 'long',
    year: 'numeric',
  })
  const calendarDays = useMemo(() => {
    const days: { day: number; dateStr: string; isPast: boolean }[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({ day: d, dateStr, isPast: dateStr < todayStr })
    }
    return days
  }, [calendarYear, calendarMonth, daysInMonth, todayStr])

  const handleDateClick = (dateStr: string) => {
    setBookingData(prev => ({ ...prev, date: dateStr, time: '' }))
    fetchAvailability(dateStr)
  }
  const prevMonth = () => {
    if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1) }
    else setCalendarMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1) }
    else setCalendarMonth(m => m + 1)
  }

  // ── Loading ──
  if (!provider || !selectedService) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
        <div className="animate-spin w-7 h-7 border-[3px] border-[#E96B56] border-t-transparent rounded-full" />
      </div>
    )
  }

  // ── Derived values ──
  const platformFee = calculatePlatformFee(selectedService.price, isMember)
  const total = selectedService.price + platformFee
  const providerName = provider.profile?.user?.name || 'Artist'
  const firstName = providerName.split(' ')[0]
  const coverPhoto = provider.profile?.portfolio?.[0]?.url || provider.profile?.user?.image
  const specialty = provider.profile?.services?.[0]
    ? getCategoryLabel(provider.profile.services[0].category)
    : 'Beauty'
  const location = [provider.profile?.suburb, provider.profile?.city].filter(Boolean).join(', ')
  const offerBoth = provider.profile?.offerAtHome && provider.profile?.offerAtStudio

  const STEPS = [
    { label: 'Service', num: 1 },
    { label: 'When & where', num: 2 },
    { label: 'Review & pay', num: 3 },
  ]

  return (
    <div className="min-h-screen bg-[#FDFBF7]">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#1A1A1A]/5">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="font-sans text-xl font-bold text-[#1A1A1A]"
            style={{ letterSpacing: '-0.03em' }}
          >
            Sparq<span className="text-[#E96B56]">·</span>
          </Link>
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-full border border-[#e8e1de] flex items-center justify-center text-[#717171] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-colors"
            aria-label="Close booking"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex gap-12 items-start">

          {/* ════════ Main content ════════ */}
          <div className="flex-1 min-w-0">

            {/* Progress */}
            <div className="flex items-center mb-10">
              {STEPS.map((s, i) => (
                <div key={s.num} className="flex items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                        step > s.num
                          ? 'bg-[#E96B56] text-white'
                          : step === s.num
                          ? 'bg-[#1A1A1A] text-white'
                          : 'bg-[#f3ece9] text-[#BEBEBE]'
                      }`}
                    >
                      {step > s.num
                        ? <Check className="w-3 h-3" />
                        : <span className="text-[10px] font-bold">{s.num}</span>}
                    </div>
                    <span
                      className={`text-sm font-medium whitespace-nowrap ${
                        step === s.num
                          ? 'text-[#1A1A1A]'
                          : step > s.num
                          ? 'text-[#717171]'
                          : 'text-[#BEBEBE]'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`w-8 h-px mx-3 flex-shrink-0 transition-colors ${
                        step > s.num ? 'bg-[#E96B56]/40' : 'bg-[#e8e1de]'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* ─── Step 1: Service ─── */}
            {step === 1 && (
              <div>
                <h1 className="font-headline text-2xl text-[#1A1A1A] mb-1">Choose a service</h1>
                <p className="text-sm text-[#717171] mb-6">
                  Select what you&apos;d like to book with {firstName}.
                </p>

                <div className="space-y-3 mb-8">
                  {provider.profile?.services?.map((service: any) => (
                    <button
                      key={service.id}
                      onClick={() => setSelectedService(service)}
                      className={`w-full p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                        selectedService?.id === service.id
                          ? 'border-[#E96B56] bg-[#fff8f7]'
                          : 'border-[#e8e1de] bg-white hover:border-[#E96B56]/30 hover:bg-[#fff8f7]/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-[#1A1A1A]">{service.title}</p>
                            {selectedService?.id === service.id && (
                              <span className="w-4 h-4 rounded-full bg-[#E96B56] flex items-center justify-center flex-shrink-0">
                                <Check className="w-2.5 h-2.5 text-white" />
                              </span>
                            )}
                          </div>
                          {service.description && (
                            <p className="text-sm text-[#717171] mt-1 line-clamp-2">
                              {service.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            {service.duration && (
                              <span className="text-xs text-[#717171] flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {service.duration} min
                              </span>
                            )}
                            {service.locationTypes && (
                              <span className="text-xs text-[#717171]">
                                {service.locationTypes === 'AT_HOME'
                                  ? '· Mobile'
                                  : service.locationTypes === 'STUDIO'
                                  ? '· Studio'
                                  : service.locationTypes === 'BOTH'
                                  ? '· Mobile or studio'
                                  : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="font-semibold text-lg text-[#1A1A1A] flex-shrink-0">
                          {formatCurrency(service.price)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setStep(2)}
                  className="w-full sm:w-auto bg-[#E96B56] hover:bg-[#d45a45] active:scale-[.98] text-white font-semibold px-8 py-3.5 rounded-full transition-all flex items-center justify-center gap-2"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ─── Step 2: When & where ─── */}
            {step === 2 && (
              <div>
                <h1 className="font-headline text-2xl text-[#1A1A1A] mb-1">
                  When would you like to come?
                </h1>
                <p className="text-sm text-[#717171] mb-6">
                  Pick a date and time that works for you.
                </p>

                {/* Calendar */}
                <div className="bg-white rounded-2xl border border-[#e8e1de] p-6 mb-5">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-semibold text-[#1A1A1A]">{monthName}</h3>
                    <div className="flex gap-1">
                      <button
                        onClick={prevMonth}
                        className="w-8 h-8 rounded-full border border-[#e8e1de] flex items-center justify-center hover:border-[#1A1A1A] transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4 text-[#717171]" />
                      </button>
                      <button
                        onClick={nextMonth}
                        className="w-8 h-8 rounded-full border border-[#e8e1de] flex items-center justify-center hover:border-[#1A1A1A] transition-colors"
                      >
                        <ChevronRight className="h-4 w-4 text-[#717171]" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-y-1 text-center">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                      <div key={i} className="text-[11px] font-semibold text-[#BEBEBE] pb-2">
                        {d}
                      </div>
                    ))}
                    {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                    {calendarDays.map(({ day, dateStr, isPast }) => {
                      const isSelected = bookingData.date === dateStr
                      return (
                        <button
                          key={dateStr}
                          disabled={isPast}
                          onClick={() => handleDateClick(dateStr)}
                          className={`h-9 w-9 mx-auto text-sm rounded-full transition-all font-medium ${
                            isSelected
                              ? 'bg-[#E96B56] text-white shadow-sm'
                              : isPast
                              ? 'text-[#BEBEBE] cursor-not-allowed'
                              : 'text-[#1A1A1A] hover:bg-[#f3ece9]'
                          }`}
                        >
                          {day}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Time slots */}
                {bookingData.date && (
                  <div className="mb-5">
                    <p className="text-xs font-semibold text-[#717171] uppercase tracking-wider mb-3">
                      Available times —{' '}
                      {new Date(bookingData.date + 'T00:00:00').toLocaleDateString('en-AU', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </p>
                    {loadingSlots ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin w-5 h-5 border-2 border-[#E96B56] border-t-transparent rounded-full" />
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="text-center py-6 bg-white rounded-2xl border border-[#e8e1de]">
                        <p className="text-sm text-[#717171]">
                          No availability on this date — try another day
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                        {availableSlots.map(slot => (
                          <button
                            key={slot}
                            onClick={() => setBookingData(p => ({ ...p, time: slot }))}
                            className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${
                              bookingData.time === slot
                                ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white'
                                : 'border-[#e8e1de] bg-white text-[#1A1A1A] hover:border-[#E96B56] hover:text-[#E96B56]'
                            }`}
                          >
                            {formatTime(slot)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Location — only when artist offers both options */}
                {bookingData.date && bookingData.time && offerBoth && (
                  <div className="mb-5">
                    <p className="text-xs font-semibold text-[#717171] uppercase tracking-wider mb-3">
                      Where?
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setBookingData(p => ({ ...p, locationType: 'AT_HOME' }))}
                        className={`p-4 rounded-2xl border-2 text-left transition-all ${
                          bookingData.locationType === 'AT_HOME'
                            ? 'border-[#E96B56] bg-[#fff8f7]'
                            : 'border-[#e8e1de] bg-white hover:border-[#E96B56]/40'
                        }`}
                      >
                        <Home className="w-5 h-5 text-[#717171] mb-2" />
                        <p className="font-semibold text-sm text-[#1A1A1A]">My place</p>
                        <p className="text-xs text-[#717171] mt-0.5">Artist comes to you</p>
                      </button>
                      <button
                        onClick={() => setBookingData(p => ({ ...p, locationType: 'STUDIO' }))}
                        className={`p-4 rounded-2xl border-2 text-left transition-all ${
                          bookingData.locationType === 'STUDIO'
                            ? 'border-[#E96B56] bg-[#fff8f7]'
                            : 'border-[#e8e1de] bg-white hover:border-[#E96B56]/40'
                        }`}
                      >
                        <Building2 className="w-5 h-5 text-[#717171] mb-2" />
                        <p className="font-semibold text-sm text-[#1A1A1A]">Studio</p>
                        <p className="text-xs text-[#717171] mt-0.5">
                          {provider.profile?.suburb || 'Artist\'s studio'}
                        </p>
                      </button>
                    </div>
                  </div>
                )}

                {/* Address for mobile visits */}
                {bookingData.date && bookingData.time && bookingData.locationType === 'AT_HOME' && (
                  <div className="mb-5">
                    <Input
                      label="Your address"
                      value={bookingData.address}
                      onChange={e => setBookingData(p => ({ ...p, address: e.target.value }))}
                      placeholder="123 Example St, Melbourne VIC 3000"
                      icon={<MapPin className="w-4 h-4" />}
                    />
                    <p className="mt-1.5 text-xs text-[#717171]">
                      Shared with your artist only after booking is confirmed.
                    </p>
                  </div>
                )}

                {/* Notes */}
                {bookingData.date && bookingData.time && (
                  <div className="mb-8">
                    <Textarea
                      label="Anything to know? (optional)"
                      value={bookingData.notes}
                      onChange={e => setBookingData(p => ({ ...p, notes: e.target.value }))}
                      placeholder="Inspo photos, allergies, preferred style — anything helpful"
                    />
                  </div>
                )}

                {/* Nav */}
                <div className="flex items-center gap-3 border-t border-[#e8e1de] pt-6">
                  <button
                    onClick={() => setStep(1)}
                    className="px-6 py-3 border border-[#e8e1de] text-[#1A1A1A] font-semibold rounded-full hover:border-[#1A1A1A] transition-colors text-sm flex-shrink-0"
                  >
                    Back
                  </button>
                  <button
                    disabled={!bookingData.date || !bookingData.time}
                    onClick={() => setStep(3)}
                    className="flex-1 sm:flex-none bg-[#E96B56] hover:bg-[#d45a45] active:scale-[.98] disabled:opacity-40 disabled:pointer-events-none text-white font-semibold px-8 py-3 rounded-full transition-all text-sm flex items-center justify-center gap-2"
                  >
                    {bookingData.date && bookingData.time
                      ? `Review · ${formatCurrency(total)}`
                      : 'Select a date & time'}
                    {bookingData.date && bookingData.time && <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* ─── Step 3: Review & pay ─── */}
            {step === 3 && (
              <div className="max-w-lg">
                {!paymentPhase ? (
                  <>
                    <h1 className="font-headline text-2xl text-[#1A1A1A] mb-1">
                      Review your booking
                    </h1>
                    <p className="text-sm text-[#717171] mb-6">
                      Everything look right? You&apos;ll add payment on the next screen.
                    </p>

                    {/* Summary */}
                    <div className="bg-white rounded-2xl border border-[#e8e1de] overflow-hidden mb-4">
                      <div className="p-5 space-y-3">
                        <SummaryRow label="Service" value={selectedService.title} />
                        <SummaryRow label="With" value={providerName} />
                        <SummaryRow label="Date" value={formatDate(bookingData.date)} />
                        <SummaryRow label="Time" value={formatTime(bookingData.time)} />
                        <SummaryRow
                          label="Where"
                          value={bookingData.locationType === 'AT_HOME' ? 'Your place' : 'Studio'}
                        />
                        {selectedService.duration && (
                          <SummaryRow label="Duration" value={`${selectedService.duration} min`} />
                        )}
                      </div>
                      <div className="border-t border-[#f3ece9] p-5 space-y-2.5">
                        <SummaryRow
                          label={selectedService.title}
                          value={formatCurrency(selectedService.price)}
                        />
                        <SummaryRow
                          label={isMember ? 'Booking fee (waived — member)' : 'Booking fee'}
                          value={formatCurrency(platformFee)}
                          muted
                        />
                        <div className="flex justify-between font-semibold text-sm pt-2 border-t border-[#f3ece9]">
                          <span className="text-[#1A1A1A]">Total</span>
                          <span className="text-[#1A1A1A]">{formatCurrency(total)} AUD</span>
                        </div>
                      </div>
                    </div>

                    {/* Cancellation policy */}
                    <div className="bg-[#f9f2ef] rounded-2xl p-4 mb-6 flex items-start gap-3">
                      <RotateCcw className="w-4 h-4 text-[#E96B56] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-[#1A1A1A]">Free cancellation</p>
                        <p className="text-xs text-[#717171] mt-0.5 leading-relaxed">
                          Cancel for free up to 24 hours before your appointment. After that, a
                          50% cancellation fee applies.
                        </p>
                      </div>
                    </div>

                    {/* Nav */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setStep(2)}
                        className="px-6 py-3 border border-[#e8e1de] text-[#1A1A1A] font-semibold rounded-full hover:border-[#1A1A1A] transition-colors text-sm flex-shrink-0"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleBook}
                        disabled={loading}
                        className="flex-1 bg-[#E96B56] hover:bg-[#d45a45] active:scale-[.98] disabled:opacity-60 text-white font-semibold px-8 py-3.5 rounded-full transition-all text-sm flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Confirming…
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4" />
                            Confirm &amp; add payment
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-[#717171] text-center mt-3">
                      Your card won&apos;t be charged until {firstName} confirms.
                    </p>
                  </>
                ) : clientSecret && bookingId ? (
                  <>
                    <h1 className="font-headline text-2xl text-[#1A1A1A] mb-1">
                      Secure payment
                    </h1>
                    <p className="text-sm text-[#717171] mb-6">
                      Your card is <strong>held, not charged</strong> — you only pay when{' '}
                      {firstName} confirms.
                    </p>

                    {/* Amount reminder */}
                    <div className="flex items-center justify-between bg-white rounded-2xl border border-[#e8e1de] px-5 py-4 mb-2">
                      <div>
                        <p className="text-xs text-[#717171]">Amount held (not charged yet)</p>
                        <p className="font-semibold text-sm text-[#1A1A1A] mt-0.5">
                          {selectedService.title} · {formatDate(bookingData.date)}
                        </p>
                      </div>
                      <p className="font-headline text-2xl text-[#1A1A1A]">
                        {formatCurrency(total)}
                      </p>
                    </div>

                    {/* Inline trust row */}
                    <div className="flex items-center gap-4 mb-6 px-1 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-[#717171]">
                        <Lock className="w-3 h-3 text-[#E96B56]" /> SSL secured
                      </span>
                      <span className="flex items-center gap-1 text-xs text-[#717171]">
                        <BadgeCheck className="w-3 h-3 text-[#E96B56]" /> Sparq Guarantee
                      </span>
                      <span className="flex items-center gap-1 text-xs text-[#717171]">
                        <RotateCcw className="w-3 h-3 text-[#E96B56]" /> Free cancellation 24h
                      </span>
                    </div>

                    <StripePaymentForm
                      clientSecret={clientSecret}
                      bookingId={bookingId}
                      amount={total}
                      onSuccess={() => router.push('/dashboard/customer?booking=success')}
                      onBack={() => setPaymentPhase(false)}
                    />
                  </>
                ) : null}
              </div>
            )}
          </div>

          {/* ════════ Sidebar (desktop) ════════ */}
          <aside className="hidden lg:block w-[280px] flex-shrink-0">
            <div className="sticky top-24 space-y-4">

              {/* Artist + live summary card */}
              <div className="rounded-2xl border border-[#e8e1de] bg-white overflow-hidden">
                {coverPhoto && (
                  <div className="aspect-[16/7] relative">
                    <Image
                      src={coverPhoto}
                      alt={providerName}
                      fill
                      className="object-cover"
                      sizes="280px"
                    />
                  </div>
                )}
                <div className="px-4 py-3 border-b border-[#f3ece9]">
                  <p className="font-semibold text-sm text-[#1A1A1A]">{providerName}</p>
                  <p className="text-xs text-[#717171] mt-0.5">
                    {specialty}{location ? ` · ${location}` : ''}
                  </p>
                </div>

                {/* Live selection */}
                <div className="px-4 py-3 space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#717171]">Service</span>
                    <span className="font-medium text-[#1A1A1A] text-right ml-2 truncate max-w-[130px]">
                      {selectedService.title}
                    </span>
                  </div>
                  {bookingData.date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#717171]">Date</span>
                      <span className="font-medium text-[#1A1A1A]">{formatDate(bookingData.date)}</span>
                    </div>
                  )}
                  {bookingData.time && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#717171]">Time</span>
                      <span className="font-medium text-[#1A1A1A]">{formatTime(bookingData.time)}</span>
                    </div>
                  )}
                  {bookingData.locationType && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#717171]">Where</span>
                      <span className="font-medium text-[#1A1A1A]">
                        {bookingData.locationType === 'AT_HOME' ? 'Your place' : 'Studio'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Pricing — visible from step 2 */}
                {step >= 2 && (
                  <div className="border-t border-[#f3ece9] px-4 py-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#717171]">{selectedService.title}</span>
                      <span className="text-[#1A1A1A]">{formatCurrency(selectedService.price)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#717171]">Booking fee</span>
                      <span className="text-[#1A1A1A]">{formatCurrency(platformFee)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-sm pt-2 border-t border-[#f3ece9]">
                      <span className="text-[#1A1A1A]">Total</span>
                      <span className="text-[#1A1A1A]">{formatCurrency(total)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Trust signals */}
              <div className="rounded-2xl border border-[#e8e1de] bg-white p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <RotateCcw className="w-3.5 h-3.5 text-[#E96B56] flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-[#717171] leading-relaxed">
                    Free cancellation up to 24h before your appointment
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <Lock className="w-3.5 h-3.5 text-[#E96B56] flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-[#717171] leading-relaxed">
                    Card held securely — charged only when your artist confirms
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <BadgeCheck className="w-3.5 h-3.5 text-[#E96B56] flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-[#717171] leading-relaxed">
                    Verified artist — identity confirmed by Sparq
                  </p>
                </div>
              </div>

              <p className="text-center text-xs text-[#717171]">
                Questions?{' '}
                <Link
                  href="/help"
                  className="text-[#E96B56] font-semibold hover:text-[#d45a45] transition-colors"
                >
                  Visit our help centre
                </Link>
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
