'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo, useCallback } from 'react'
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
  Shield,
} from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { StripePaymentForm } from '@/components/booking/StripePaymentForm'
import { LogoFull } from '@/components/ui/Logo'
import {
  formatCurrency,
  formatDate,
  formatTime,
  calculatePlatformFee,
  getCategoryLabel,
} from '@/lib/utils'
import { parseBookingUrlState, buildBookingUrl } from '@/lib/booking-url-state'
import { to24Hour } from '@/lib/booking-time'
import { isValidBookingAddress } from '@/lib/address-validation'
import toast from 'react-hot-toast'

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

  // AUDIT-006: URL-param hydration.
  // Read once on mount (via useState initializers) so the page can be entered
  // from a link — or returned to after the /login redirect — with the wizard
  // state already populated. Parsing lives in a tested helper for clarity.
  const urlState = parseBookingUrlState(searchParams)
  const { date: urlDate, time: urlTime, locationType: urlLocType,
          tip: urlTip, guestCount: urlGuests, selectedAddons: urlAddons,
          voucherInput: urlVoucher, promoCode: urlPromo, step: urlStep } = urlState

  const [provider, setProvider] = useState<any>(null)
  const [selectedService, setSelectedService] = useState<any>(null)
  const [step, setStep] = useState<number>(urlStep)
  const [loading, setLoading] = useState(false)
  // P0-3/UX-H1: Initialize empty — slots are fetched from the API when a date is selected
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [paymentPhase, setPaymentPhase] = useState(false)
  const isInstantBook: boolean = Boolean(selectedService?.instantBook)
  const [tip, setTip] = useState<number>(urlTip)
  const [customTip, setCustomTip] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(() => (urlDate ? new Date(urlDate).getMonth() : new Date().getMonth()))
  const [calendarYear, setCalendarYear] = useState(() => (urlDate ? new Date(urlDate).getFullYear() : new Date().getFullYear()))
  // P0-D/UX-H1: Pre-fetched available dates for calendar greying
  const [availableDates, setAvailableDates] = useState<Set<string> | null>(null)
  const [loadingDates, setLoadingDates] = useState(false)
  // BL-2: capture browser geolocation for service-radius validation
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [guestCount, setGuestCount] = useState<number>(urlGuests)
  const [addons, setAddons] = useState<{ id: string; name: string; price: number; duration: number }[]>([])
  const [selectedAddons, setSelectedAddons] = useState<string[]>(urlAddons)
  // Voucher / gift card
  const [voucherInput, setVoucherInput]           = useState<string>(urlVoucher)
  const [voucherStatus, setVoucherStatus]         = useState<'idle' | 'checking' | 'applied' | 'error'>('idle')
  const [voucherError, setVoucherError]           = useState('')
  const [appliedVoucher, setAppliedVoucher]       = useState<{ code: string; amount: number } | null>(null)
  // NEW-18: Promo code
  const [promoCode, setPromoCode] = useState<string>(urlPromo)
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [promoError, setPromoError] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoApplied, setPromoApplied] = useState(false)
  // P0-3: Live fee rate fetched from DB-driven API; falls back to sync calculatePlatformFee
  const [liveFeeRate, setLiveFeeRate] = useState<number | null>(null)
  const [bookingData, setBookingData] = useState({
    date: urlDate,
    time: urlTime,
    locationType: urlLocType,
    // NOTE (AUDIT-006): address/notes are deliberately NOT hydrated from URL.
    // Address can be sensitive; notes can be too large to fit comfortably in a URL.
    // Users will need to re-enter these if they return via the login redirect.
    address: '',
    notes: '',
  })
  // UX-3: Track booking confirmation state (non-payment bookings)
  const [bookingConfirmed, setBookingConfirmed] = useState<{ instantBook: boolean } | null>(null)
  // Fix-2: T&C acceptance — required before submitting the booking
  const [termsAccepted, setTermsAccepted] = useState(false)

  // AUDIT-006: Fetch the provider regardless of auth — Steps 1–2 are public.
  // The auth gate moves to `handleBook` (Step 3 submit).
  useEffect(() => {
    fetch(`/api/providers/${params.providerId}`)
      .then(r => r.json())
      .then(d => {
        setProvider(d)
        // UX-L1: Book Again — if requested serviceId is deactivated or not found,
        // fall back to the first active service so the flow doesn't stall
        const service = serviceId
          ? (d.profile?.services?.find((s: any) => s.id === serviceId && s.isActive !== false)
              ?? d.profile?.services?.[0])
          : d.profile?.services?.[0]
        setSelectedService(service)

        // Auto-select location only when a single option is available;
        // leave empty to require explicit selection when both (or neither) are offered.
        // Skip auto-selection if a URL-hydrated locationType is already set.
        setBookingData(prev => {
          if (prev.locationType) return prev
          if (d.profile?.offerAtHome && !d.profile?.offerAtStudio) {
            return { ...prev, locationType: 'AT_HOME' }
          }
          if (!d.profile?.offerAtHome && d.profile?.offerAtStudio) {
            return { ...prev, locationType: 'STUDIO' }
          }
          return prev
        })
      })
  }, [params.providerId, serviceId])

  // AUDIT-006: If we were hydrated from the URL with a date already picked
  // (e.g. user returning from the login redirect), pre-fetch the slots for
  // that date so Step 2 shows the selected time instead of a blank picker.
  // We intentionally omit fetchAvailability from deps to run this only once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (urlDate) {
      fetchAvailability(urlDate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // AUDIT-006: Sync wizard state back to the URL so the login redirect
  // (and browser back/forward) can restore the user's progress.
  // We use router.replace with scroll:false to avoid polluting history
  // and to prevent page jumps.
  useEffect(() => {
    const target = buildBookingUrl(params.providerId, {
      serviceId,
      date: bookingData.date,
      time: bookingData.time,
      locationType: bookingData.locationType,
      tip,
      guestCount,
      selectedAddons,
      voucherInput,
      promoCode,
      step,
    })
    router.replace(target, { scroll: false })
  }, [
    router, params.providerId, serviceId,
    bookingData.date, bookingData.time, bookingData.locationType,
    tip, guestCount, selectedAddons, voucherInput, promoCode, step,
  ])

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
      // P0-3/UX-H1: On error, show no slots rather than showing all default slots.
      // Showing fake slots would allow customers to book times the provider hasn't confirmed.
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  // P0-D/UX-H1: Fetch available dates for a calendar month (for greying out unavailable days)
  const fetchAvailableDates = useCallback(async (year: number, month: number) => {
    const from = `${year}-${String(month + 1).padStart(2, '0')}-01`
    // Last day of month
    const lastDay = new Date(year, month + 1, 0).getDate()
    const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    setLoadingDates(true)
    try {
      const res = await fetch(`/api/providers/${params.providerId}/availability?from=${from}&to=${to}`)
      if (res.ok) {
        const data = await res.json()
        setAvailableDates(new Set(data.availableDates ?? []))
      }
    } catch {
      // On error, don't grey out any dates (fail open for UX)
      setAvailableDates(null)
    } finally {
      setLoadingDates(false)
    }
  }, [params.providerId])

  // Fetch available dates when month changes in the calendar
  useEffect(() => {
    if (step === 2) {
      fetchAvailableDates(calendarYear, calendarMonth)
    }
  }, [calendarYear, calendarMonth, step, fetchAvailableDates])

  // P0-3: Fetch live fee rate from DB-driven API when service is selected
  useEffect(() => {
    if (selectedService && selectedService.price > 0) {
      fetch(`/api/services/${selectedService.id}/fee-preview?price=${selectedService.price}`)
        .then(r => r.json())
        .then(data => { if (typeof data.feeRate === 'number') setLiveFeeRate(data.feeRate) })
        .catch(() => {}) // fall back to local calculation
    }
  }, [selectedService])

  // BL-2: Request geolocation when user selects AT_HOME, so we can validate service radius
  const handleLocationTypeChange = (type: 'AT_HOME' | 'STUDIO') => {
    setBookingData(p => ({ ...p, locationType: type }))
    if (type === 'AT_HOME' && !customerCoords && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setCustomerCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => { /* user denied — coords stay null; API will skip radius check */ },
        { timeout: 5000 }
      )
    }
  }

  const handleBook = async () => {
    if (bookingId && clientSecret) { setPaymentPhase(true); return }

    // AUDIT-006: Auth gate moved here from the top-level effect.
    // Steps 1–2 are browseable anonymously; only the final submit requires
    // authentication. We send the user to /login with a callbackUrl that
    // preserves the current URL (which — thanks to the sync effect above —
    // already encodes the wizard state the user filled out).
    if (status === 'loading') return
    if (status !== 'authenticated' || !session) {
      const callback =
        typeof window !== 'undefined'
          ? `${window.location.pathname}${window.location.search}`
          : `/book/${params.providerId}`
      router.push(`/login?callbackUrl=${encodeURIComponent(callback)}`)
      return
    }

    if (!selectedService || !bookingData.date || !bookingData.time) {
      toast.error('Please complete all required fields')
      return
    }
    // M22: Client-side max booking date validation (180 days)
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 180)
    const maxDateStrCheck = maxDate.toISOString().split('T')[0]
    if (bookingData.date > maxDateStrCheck) {
      toast.error('Bookings can only be made up to 180 days in advance.')
      return
    }
    // Batch B Item 5: mirror the server-side AU street-address check
    // client-side so bare suburb names like "Point Cook" are rejected at
    // the submit boundary, not after a round-trip.
    if (bookingData.locationType === 'AT_HOME' && !isValidBookingAddress(bookingData.address)) {
      toast.error('Please enter your full street address, e.g. "42 Collins St, Melbourne VIC 3000".')
      return
    }
    // Defend against 12-hour display strings ("3:30 PM") leaking into wizard
    // state via URL deep-links. The API enforces strict HH:MM and would 400.
    const canonicalTime = to24Hour(bookingData.time)
    if (!canonicalTime) {
      toast.error('Please select a valid time slot')
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
          time: canonicalTime,
          locationType: bookingData.locationType,
          address: bookingData.locationType === 'AT_HOME' ? bookingData.address : undefined,
          notes: bookingData.notes,
          tip: tip > 0 ? tip : undefined,
          guestCount: guestCount > 1 ? guestCount : undefined,
          giftVoucherCode: appliedVoucher?.code ?? undefined,
          promoCode: promoApplied ? promoCode : undefined,
          // M02: pass selected add-on IDs to booking API
          addonIds: selectedAddons.length > 0 ? selectedAddons : undefined,
          // BL-2: pass geolocation for service-radius check (optional — if browser denied, API skips check)
          ...(bookingData.locationType === 'AT_HOME' && customerCoords
            ? { customerLat: customerCoords.lat, customerLng: customerCoords.lng }
            : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setBookingId(data.booking.id)
      if (data.clientSecret) {
        setClientSecret(data.clientSecret)
        setPaymentPhase(true)
      } else {
        // UX-3: Show inline confirmation screen instead of instant redirect
        setBookingConfirmed({ instantBook: Boolean(selectedService?.instantBook) })
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Voucher validation ──
  const handleValidateVoucher = async () => {
    const code = voucherInput.trim().toUpperCase()
    if (!code) return
    setVoucherStatus('checking')
    setVoucherError('')
    try {
      const res = await fetch(`/api/gift-cards/validate?code=${encodeURIComponent(code)}`)
      const data = await res.json()
      if (res.status === 429) {
        setVoucherStatus('error')
        setVoucherError('Too many attempts. Please wait before trying again.')
        return
      }
      if (!res.ok || !data.valid) {
        setVoucherStatus('error')
        setVoucherError(data.error || 'Invalid voucher code')
        return
      }
      setAppliedVoucher({ code: data.code, amount: data.amount })
      setVoucherStatus('applied')
    } catch {
      setVoucherStatus('error')
      setVoucherError('Could not validate voucher — please try again.')
    }
  }

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null)
    setVoucherInput('')
    setVoucherStatus('idle')
    setVoucherError('')
  }

  const applyPromo = async () => {
    if (!promoCode.trim()) return
    setPromoLoading(true)
    setPromoError('')
    try {
      const res = await fetch('/api/promo-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode, orderAmount: selectedService?.price ?? 0 }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPromoError(data.error)
        setPromoDiscount(0)
        setPromoApplied(false)
      } else {
        setPromoDiscount(data.discount)
        setPromoApplied(true)
      }
    } catch {
      setPromoError('Could not validate promo code — please try again.')
    } finally {
      setPromoLoading(false)
    }
  }

  // ── Calendar ──
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  // UX10: Restrict bookings to within 180 days from today
  const maxBookingDate = new Date()
  maxBookingDate.setDate(maxBookingDate.getDate() + 180)
  const maxDateStr = maxBookingDate.toISOString().split('T')[0]
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
      days.push({ day: d, dateStr, isPast: dateStr < todayStr || dateStr > maxDateStr })
    }
    return days
  }, [calendarYear, calendarMonth, daysInMonth, todayStr, maxDateStr])

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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin w-7 h-7 border-[3px] border-[#E96B56] border-t-transparent rounded-full" />
      </div>
    )
  }

  // ── Derived values ──
  const voucherDiscount = appliedVoucher?.amount ?? 0
  const discountedServicePrice = Math.max(0, selectedService.price - voucherDiscount - promoDiscount)
  // P0-3: Use live fee rate from DB-driven API when available; fall back to sync calculatePlatformFee (hardcoded 15%)
  const platformFee = liveFeeRate !== null
    ? Math.round(discountedServicePrice * liveFeeRate * 100) / 100
    : calculatePlatformFee(discountedServicePrice, false)
  const subtotal = discountedServicePrice + platformFee
  const total = subtotal + tip
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
    { label: 'Review & confirm', num: 3 },
  ]

  return (
    <div className="min-h-screen bg-white">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#1A1A1A]/5">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-20 h-16 flex items-center justify-between">
          <Link href="/">
            <LogoFull size="sm" />
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

      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-20 py-10">
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
                      onClick={() => {
                        setSelectedService(service)
                        setSelectedAddons([])
                        setAddons([])
                        fetch(`/api/services/${service.id}/addons`)
                          .then(r => r.ok ? r.json() : null)
                          .then(d => { if (d?.addons) setAddons(d.addons) })
                          .catch(() => {})
                      }}
                      className={`w-full p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                        selectedService?.id === service.id
                          ? 'border-[#E96B56] bg-[#fff8f7]'
                          : 'border-[#e8e1de] bg-white hover:border-[#E96B56]/30 hover:bg-[#fff8f7]/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-[#1A1A1A]">{service.title}</p>
                            {service.instantBook && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#f3ece9] px-2 py-0.5 text-[10px] font-semibold text-[#E96B56]">
                                ⚡ Instant book
                              </span>
                            )}
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

                {/* Add-ons */}
                {selectedService && addons.length > 0 && (
                  <div className="mt-4 space-y-2 mb-8">
                    <p className="text-sm font-semibold text-[#1A1A1A]">Add-ons</p>
                    {addons.map(addon => (
                      <button
                        key={addon.id}
                        type="button"
                        onClick={() => setSelectedAddons(prev =>
                          prev.includes(addon.id) ? prev.filter(id => id !== addon.id) : [...prev, addon.id]
                        )}
                        className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                          selectedAddons.includes(addon.id)
                            ? 'border-[#E96B56] bg-[#fff8f7]'
                            : 'border-[#e8e1de] bg-white hover:border-[#E96B56]/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            selectedAddons.includes(addon.id) ? 'border-[#E96B56] bg-[#E96B56]' : 'border-[#e8e1de]'
                          }`}>
                            {selectedAddons.includes(addon.id) && (
                              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-[#1A1A1A]">{addon.name}</p>
                            {addon.duration > 0 && <p className="text-xs text-[#717171]">+{addon.duration} min</p>}
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-[#1A1A1A]">+{formatCurrency(addon.price)}</span>
                      </button>
                    ))}
                    {/* UX-08: Live total with add-ons */}
                    {(() => {
                      const selectedAddonObjects = addons.filter(a => selectedAddons.includes(a.id))
                      const addonTotal = selectedAddonObjects.reduce((sum, a) => sum + a.price, 0)
                      const liveTotal = (selectedService?.price ?? 0) + addonTotal
                      return (
                        <div className="flex items-baseline justify-between mt-4 pt-4 border-t border-[#e8e1de]">
                          <span className="text-sm text-[#717171]">Total</span>
                          <div className="text-right">
                            <span className="text-xl font-semibold text-[#1A1A1A]">{formatCurrency(liveTotal)}</span>
                            {addonTotal > 0 && (
                              <p className="text-xs text-[#717171]">
                                {formatCurrency(selectedService?.price ?? 0)} + {formatCurrency(addonTotal)} add-ons
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* Guest count — only when service supports groups */}
                {selectedService?.maxGuests != null && selectedService.maxGuests > 1 && (
                  <div className="mb-8 p-5 rounded-2xl border border-[#e8e1de] bg-white">
                    <p className="text-sm font-semibold text-[#1A1A1A] mb-1">Number of guests</p>
                    <p className="text-xs text-[#717171] mb-4">This service accommodates up to {selectedService.maxGuests} guests.</p>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setGuestCount(g => Math.max(1, g - 1))}
                        disabled={guestCount <= 1}
                        className="w-9 h-9 rounded-full border-2 border-[#e8e1de] flex items-center justify-center text-[#1A1A1A] font-bold text-lg hover:border-[#1A1A1A] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Decrease guests"
                      >−</button>
                      <span className="text-lg font-semibold text-[#1A1A1A] w-6 text-center">{guestCount}</span>
                      <button
                        type="button"
                        onClick={() => setGuestCount(g => Math.min(selectedService.maxGuests, g + 1))}
                        disabled={guestCount >= selectedService.maxGuests}
                        className="w-9 h-9 rounded-full border-2 border-[#e8e1de] flex items-center justify-center text-[#1A1A1A] font-bold text-lg hover:border-[#1A1A1A] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Increase guests"
                      >+</button>
                      <span className="text-sm text-[#717171]">
                        {guestCount === 1 ? 'just me' : `${guestCount} guests`}
                      </span>
                    </div>
                  </div>
                )}

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
                  When works for you?
                </h1>
                <p className="text-sm text-[#717171] mb-6">
                  Pick a date and time that works for you.
                </p>

                {/* Next available hint — UX-1 */}
                {availableDates !== null && !loadingDates && (() => {
                  const nextAvail = calendarDays.find(({ dateStr, isPast }) => !isPast && availableDates.has(dateStr))
                  if (nextAvail && nextAvail.dateStr !== todayStr && bookingData.date === '') {
                    return (
                      <p className="text-sm text-[#717171] mb-3">
                        Next available:{' '}
                        <span className="font-medium text-[#1A1A1A]">
                          {new Date(nextAvail.dateStr + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                      </p>
                    )
                  }
                  return null
                })()}

                {/* Calendar — UX-5: overflow-x-hidden for narrow viewports */}
                <div className="relative bg-white rounded-2xl border border-[#e8e1de] p-4 sm:p-6 mb-5 overflow-x-hidden">
                  <div className="flex items-center justify-between w-full mb-5">
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

                  {loadingDates ? (
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: 35 }).map((_, i) => (
                        <div key={i} className="w-9 h-9 rounded-full bg-[#f3ece9] animate-pulse" />
                      ))}
                    </div>
                  ) : null}

                  <div className={`grid grid-cols-7 gap-y-1 text-center${loadingDates ? ' hidden' : ''}`}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                      <div key={i} className="text-xs font-semibold text-[#BEBEBE] pb-2 text-center">
                        {d}
                      </div>
                    ))}
                    {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                    {calendarDays.map(({ day, dateStr, isPast }) => {
                      const isSelected = bookingData.date === dateStr
                      const isToday = dateStr === todayStr
                      // P0-D/UX-H1: Grey out dates with no availability
                      const isUnavailable = availableDates !== null && !availableDates.has(dateStr)
                      const isDisabled = isPast || isUnavailable
                      return (
                        <div key={dateStr} className="relative flex flex-col items-center">
                          <button
                            disabled={isDisabled}
                            onClick={() => {
                              if (isDisabled) return
                              handleDateClick(dateStr)
                            }}
                            className={`flex-1 min-w-0 w-9 h-9 text-sm rounded-full transition-all font-medium ${
                              isSelected
                                ? 'bg-[#E96B56] text-white shadow-sm'
                                : isDisabled
                                ? 'bg-[#f3ece9] text-[#BEBEBE] cursor-not-allowed opacity-60'
                                : 'text-[#1A1A1A] hover:border hover:border-[#E96B56] hover:bg-[#fff8f7]'
                            }`}
                          >
                            {day}
                          </button>
                          {/* Today indicator dot */}
                          {isToday && (
                            <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${
                              isSelected ? 'bg-white' : isDisabled ? 'bg-[#BEBEBE]' : 'bg-[#E96B56]'
                            }`} />
                          )}
                        </div>
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
                        <p className="text-sm text-[#717171] mb-3">No available times on this date</p>
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/waitlist', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  providerId: provider.profile.userId,
                                  date: bookingData.date,
                                  serviceId: selectedService?.id,
                                }),
                              })
                              if (res.ok) toast.success("We'll notify you when a slot opens up!")
                              else toast.error('Could not add to waitlist')
                            } catch { toast.error('Could not add to waitlist') }
                          }}
                          className="inline-flex items-center gap-2 bg-[#f9f2ef] border border-[#e8e1de] text-[#1A1A1A] text-sm font-semibold px-5 py-2.5 rounded-full hover:border-[#E96B56] transition-colors"
                        >
                          🔔 Notify me when available
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {availableSlots.map(slot => {
                          // Compute end time from service duration
                          const [h, m] = slot.split(':').map(Number)
                          const durationMin = selectedService?.duration ?? 60
                          const endMin = h * 60 + m + durationMin
                          const endH = Math.floor(endMin / 60)
                          const endM = endMin % 60
                          const endSlot = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
                          return (
                            <button
                              key={slot}
                              onClick={() => setBookingData(p => ({ ...p, time: slot }))}
                              className={`py-2.5 px-2 rounded-xl text-sm font-medium border transition-all text-center ${
                                bookingData.time === slot
                                  ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white'
                                  : 'border-[#e8e1de] bg-white text-[#1A1A1A] hover:border-[#E96B56] hover:text-[#E96B56]'
                              }`}
                            >
                              <span className="block">{formatTime(slot)}</span>
                              <span className={`block text-[10px] mt-0.5 ${
                                bookingData.time === slot ? 'text-white/70' : 'text-[#717171]'
                              }`}>
                                – {formatTime(endSlot)}
                              </span>
                            </button>
                          )
                        })}
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
                        onClick={() => handleLocationTypeChange('AT_HOME')}
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
                        onClick={() => handleLocationTypeChange('STUDIO')}
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
                    <p className="text-sm mt-1" style={{ color: '#717171' }}>
                      We use your location to confirm the artist travels to your area.
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

                {/* BL-R3: Cancellation policy — always derive from enum, never freetext */}
                {bookingData.date && bookingData.time && (
                  <div className="mb-5 rounded-xl bg-[#f9f2ef] border border-[#e8e1de] p-4">
                    <div className="flex items-start gap-2">
                      <span className="text-base">📋</span>
                      <div>
                        <p className="text-xs font-semibold text-[#1A1A1A] mb-1">Cancellation Policy</p>
                        <p className="text-xs text-[#717171] leading-relaxed">
                          {provider.profile?.cancellationPolicyType === 'STRICT'
                            ? 'Strict: Full refund if cancelled 48+ hours before. 50% fee within 24–48 hours. No refund within 24 hours.'
                            : provider.profile?.cancellationPolicyType === 'FLEXIBLE'
                            ? 'Flexible: Full refund if cancelled at least 6 hours before your appointment. No refund within 6 hours.'
                            : 'Moderate: Full refund if cancelled 24+ hours before. 50% fee for cancellations within 24 hours.'}
                        </p>
                      </div>
                    </div>
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
                    disabled={!bookingData.date || !bookingData.time || (offerBoth && !bookingData.locationType)}
                    onClick={() => setStep(3)}
                    className={`flex-1 sm:flex-none font-semibold px-8 py-3 rounded-full transition-all text-sm flex items-center justify-center gap-2 ${
                      bookingData.date && bookingData.time && (!offerBoth || bookingData.locationType)
                        ? 'bg-[#E96B56] hover:bg-[#d45a45] active:scale-[.98] text-white'
                        : 'bg-[#E96B56] opacity-40 pointer-events-none text-white'
                    }`}
                  >
                    {bookingData.date && bookingData.time && (!offerBoth || bookingData.locationType)
                      ? 'Review & confirm →'
                      : bookingData.date && bookingData.time && offerBoth && !bookingData.locationType
                      ? 'Choose a location →'
                      : bookingData.date
                      ? 'Now select a time →'
                      : 'Select a date & time'}
                    {bookingData.date && bookingData.time && (!offerBoth || bookingData.locationType) && <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* ─── Step 3: Review & pay ─── */}
            {step === 3 && (
              <div className="max-w-lg">
                {/* UX-3: Booking confirmed / request sent */}
                {bookingConfirmed ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl">
                      {bookingConfirmed.instantBook ? '✅' : '⏳'}
                    </div>
                    <h1 className="font-headline text-2xl text-[#1A1A1A] mb-2">
                      {bookingConfirmed.instantBook
                        ? 'Booking confirmed!'
                        : 'Booking request sent!'}
                    </h1>
                    <p className="text-sm text-[#717171] mb-8 leading-relaxed max-w-sm mx-auto">
                      {bookingConfirmed.instantBook
                        ? 'Your appointment is set. We look forward to seeing you!'
                        : `${firstName} usually responds within 2 hours. You'll get a notification when they accept.`}
                    </p>
                    <button
                      onClick={() => router.push('/dashboard/customer?booking=success')}
                      className="bg-[#E96B56] hover:bg-[#d45a45] text-white font-semibold px-8 py-3 rounded-full transition-all text-sm"
                    >
                      View my bookings
                    </button>
                  </div>
                ) : !paymentPhase ? (
                  <>
                    <h1 className="font-headline text-2xl text-[#1A1A1A] mb-1">
                      Review your booking
                    </h1>
                    <p className="text-sm text-[#717171] mb-6">
                      Everything look right? Confirm below to secure your booking.
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
                        {guestCount > 1 && (
                          <SummaryRow label="Guests" value={`${guestCount} guests`} />
                        )}
                        {selectedService.duration && (
                          <SummaryRow label="Duration" value={`${selectedService.duration} min`} />
                        )}
                      </div>
                      <div className="border-t border-[#f3ece9] p-5 space-y-2.5">
                        <SummaryRow
                          label={selectedService.title}
                          value={formatCurrency(selectedService.price)}
                        />
                        {promoDiscount > 0 && promoApplied && (
                          <SummaryRow
                            label={`Promo code (${promoCode})`}
                            value={`−${formatCurrency(promoDiscount)}`}
                            muted
                          />
                        )}
                        {voucherDiscount > 0 && (
                          <SummaryRow
                            label={`Gift voucher (${appliedVoucher!.code})`}
                            value={`−${formatCurrency(Math.min(voucherDiscount, selectedService.price))}`}
                            muted
                          />
                        )}
                        <SummaryRow
                          label="Booking fee"
                          value={formatCurrency(platformFee)}
                          muted
                        />
                        {tip > 0 && (
                          <SummaryRow
                            label="Tip"
                            value={formatCurrency(tip)}
                          />
                        )}
                        <div className="flex justify-between font-semibold text-sm pt-2 border-t border-[#f3ece9]">
                          <span className="text-[#1A1A1A]">Total</span>
                          <span className="text-[#1A1A1A]">{formatCurrency(total)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Tip selector */}
                    <div className="mb-6">
                      <p className="text-xs font-semibold text-[#717171] uppercase tracking-wider mb-3">
                        Add a tip (optional)
                      </p>
                      {/* Tip suggestion pills */}
                      <div className="flex gap-2 mb-2">
                        {[0, 10, 15, 20].map(pct => {
                          const suggested = pct === 0 ? 0 : Math.round(selectedService.price * (pct / 100) * 100) / 100
                          const isSelected = tip === suggested && customTip === ''
                          return (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => {
                                setTip(suggested)
                                setCustomTip('')
                              }}
                              className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                                isSelected
                                  ? 'bg-[#E96B56] text-white'
                                  : 'border border-[#e8e1de] bg-white text-[#1A1A1A] hover:border-[#E96B56]'
                              }`}
                            >
                              {pct === 0 ? 'No tip' : `${pct}%`}
                              {pct > 0 && (
                                <span className={`block text-[10px] ${isSelected ? 'opacity-80' : 'opacity-70'}`}>
                                  ${suggested.toFixed(2)}
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#717171] pointer-events-none">$</span>
                        <input
                          type="number"
                          min="0"
                          max={500}
                          step="1"
                          value={customTip}
                          onChange={e => {
                            const val = e.target.value
                            setCustomTip(val)
                            const parsed = parseFloat(val)
                            if (!isNaN(parsed) && parsed >= 0) {
                              setTip(Math.min(parsed, 500))
                            } else if (val === '') {
                              setTip(0)
                            }
                          }}
                          onFocus={() => {
                            // deselect quick-select buttons when typing custom
                          }}
                          placeholder="Custom amount"
                          className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-[#e8e1de] bg-white text-sm text-[#1A1A1A] placeholder-[#717171] focus:outline-none focus:ring-2 focus:ring-[#E96B56] focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    {/* Gift voucher */}
                    <div className="mb-6">
                      <p className="text-xs font-semibold text-[#717171] uppercase tracking-wider mb-3">
                        Gift voucher (optional)
                      </p>
                      {/* BL-01: stacking policy */}
                      {voucherStatus === 'applied' && appliedVoucher ? (
                        <div className="flex items-center justify-between bg-[#f0fdf4] border border-green-200 rounded-xl px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-green-600 text-sm">✓</span>
                            <div>
                              <p className="text-sm font-semibold text-[#1A1A1A]">{appliedVoucher.code}</p>
                              <p className="text-xs text-green-700">−{formatCurrency(Math.min(appliedVoucher.amount, selectedService.price))} applied</p>
                              {/* BL-M4: Inform user when voucher value exceeds service price */}
                              {appliedVoucher.amount > selectedService.price && (
                                <p className="text-xs text-amber-700 mt-0.5">
                                  Only {formatCurrency(selectedService.price)} used — remaining {formatCurrency(appliedVoucher.amount - selectedService.price)} cannot be applied to this booking.
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveVoucher}
                            className="text-xs text-[#717171] hover:text-[#1A1A1A] underline transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={voucherInput}
                            onChange={e => {
                              setVoucherInput(e.target.value.toUpperCase())
                              if (voucherStatus === 'error') { setVoucherStatus('idle'); setVoucherError('') }
                            }}
                            onKeyDown={e => { if (e.key === 'Enter') handleValidateVoucher() }}
                            placeholder="SPARQ-XXXXXXXX"
                            disabled={voucherStatus === 'checking'}
                            className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-mono text-[#1A1A1A] placeholder-[#717171] focus:outline-none focus:ring-2 transition-all disabled:opacity-60 ${
                              voucherStatus === 'error'
                                ? 'border-red-300 focus:ring-red-200'
                                : 'border-[#e8e1de] focus:ring-[#E96B56] focus:border-transparent'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={handleValidateVoucher}
                            disabled={!voucherInput.trim() || voucherStatus === 'checking'}
                            className="px-4 py-2.5 rounded-xl bg-[#1A1A1A] text-white text-sm font-semibold hover:bg-[#333] transition-colors disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap flex items-center gap-1.5"
                          >
                            {voucherStatus === 'checking' ? (
                              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : 'Apply'}
                          </button>
                        </div>
                      )}
                      {voucherStatus === 'error' && voucherError && (
                        <p className="mt-2 text-xs text-red-600">{voucherError}</p>
                      )}
                      <p className="text-xs text-[#717171] mt-1">
                        Voucher discount is applied after any promo code.
                      </p>
                    </div>

                    {/* NEW-18: Promo code */}
                    <div className="mb-6">
                      <p className="text-xs font-semibold text-[#717171] uppercase tracking-wider mb-3">
                        Promo code (optional)
                      </p>
                      {promoApplied ? (
                        <div className="flex items-center justify-between bg-[#f0fdf4] border border-green-200 rounded-xl px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-green-600 text-sm">✓</span>
                            <div>
                              <p className="text-sm font-semibold text-[#1A1A1A]">{promoCode}</p>
                              <p className="text-xs text-green-700">−{formatCurrency(promoDiscount)} discount applied</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setPromoApplied(false)
                              setPromoCode('')
                              setPromoDiscount(0)
                              setPromoError('')
                            }}
                            className="text-xs text-[#717171] hover:text-[#1A1A1A] underline transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={promoCode}
                            onChange={e => {
                              setPromoCode(e.target.value.toUpperCase())
                              if (promoError) setPromoError('')
                            }}
                            onKeyDown={e => { if (e.key === 'Enter') applyPromo() }}
                            placeholder="Enter promo code"
                            disabled={promoLoading}
                            className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-mono text-[#1A1A1A] placeholder-[#717171] focus:outline-none focus:ring-2 transition-all disabled:opacity-60 ${
                              promoError
                                ? 'border-red-300 focus:ring-red-200'
                                : 'border-[#e8e1de] focus:ring-[#E96B56] focus:border-transparent'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={applyPromo}
                            disabled={!promoCode.trim() || promoLoading}
                            className="px-4 py-2.5 rounded-xl bg-[#1A1A1A] text-white text-sm font-semibold hover:bg-[#333] transition-colors disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap flex items-center gap-1.5"
                          >
                            {promoLoading ? (
                              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : 'Apply'}
                          </button>
                        </div>
                      )}
                      {promoError && (
                        <p className="mt-2 text-xs text-red-600">{promoError}</p>
                      )}
                      <p className="text-xs text-[#717171] mt-1">
                        You can apply one promo code and one gift voucher per booking.
                      </p>
                    </div>

                    {/* ── UX-01: Live price breakdown ── */}
                    {(() => {
                      const selectedAddonObjects = addons.filter(a => selectedAddons.includes(a.id))
                      const bdService = selectedService?.price ?? 0
                      const bdAddons = selectedAddonObjects.reduce((s: number, a: { price: number }) => s + a.price, 0)
                      const bdPromo = promoApplied ? promoDiscount : 0
                      const bdVoucher = appliedVoucher?.amount ?? 0
                      const bdSubtotal = Math.max(0, bdService + bdAddons - bdPromo - bdVoucher)
                      const bdFee = Math.round(bdSubtotal * 0.05 * 100) / 100
                      const bdTip = tip > 0 ? tip : 0
                      const bdTotal = bdSubtotal + bdFee + bdTip
                      return (
                        <div className="bg-[#f9f2ef] rounded-xl p-5 space-y-2.5 text-sm mb-6">
                          <p className="font-semibold text-[#1A1A1A] mb-3">Price breakdown</p>

                          <div className="flex justify-between text-[#717171]">
                            <span>{selectedService?.title ?? 'Service'}</span>
                            <span>${bdService.toFixed(2)}</span>
                          </div>

                          {bdAddons > 0 && (
                            <div className="flex justify-between text-[#717171]">
                              <span>Add-ons</span>
                              <span>+${bdAddons.toFixed(2)}</span>
                            </div>
                          )}

                          {bdPromo > 0 && (
                            <div className="flex justify-between text-emerald-600 font-medium">
                              <span>Promo ({promoCode})</span>
                              <span>−${bdPromo.toFixed(2)}</span>
                            </div>
                          )}

                          {bdVoucher > 0 && (
                            <div className="flex justify-between text-emerald-600 font-medium">
                              <span>Gift voucher</span>
                              <span>−${Math.min(bdVoucher, bdService + bdAddons).toFixed(2)}</span>
                            </div>
                          )}

                          <div className="flex justify-between text-[#717171]">
                            <span>Booking fee (~5%)</span>
                            <span>${bdFee.toFixed(2)}</span>
                          </div>

                          {bdTip > 0 && (
                            <div className="flex justify-between text-[#717171]">
                              <span>Tip</span>
                              <span>${bdTip.toFixed(2)}</span>
                            </div>
                          )}

                          <div className="border-t border-[#e8e1de] pt-2.5 flex justify-between font-semibold text-[#1A1A1A]">
                            <span>Total</span>
                            <span>${bdTotal.toFixed(2)}</span>
                          </div>

                          {(bdPromo > 0 || bdVoucher > 0) && (
                            <p className="text-xs text-emerald-600 font-medium text-center">
                              You&apos;re saving ${(bdPromo + Math.min(bdVoucher, bdService + bdAddons)).toFixed(2)} on this booking
                            </p>
                          )}
                        </div>
                      )
                    })()}

                    {/* Cancellation policy disclosure */}
                    <div className="bg-[#f3ece9] rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4 text-[#E96B56]" />
                        <span className="text-sm font-semibold text-[#1A1A1A]">Cancellation Policy</span>
                        {(() => {
                          const policyType = provider?.profile?.cancellationPolicyType ?? 'MODERATE'
                          const badgeClass =
                            policyType === 'FLEXIBLE' ? 'bg-emerald-100 text-emerald-700' :
                            policyType === 'MODERATE' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          const label =
                            policyType === 'FLEXIBLE' ? 'Flexible' :
                            policyType === 'MODERATE' ? 'Moderate' : 'Strict'
                          return (
                            <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}>
                              {label}
                            </span>
                          )
                        })()}
                      </div>
                      <p className="text-xs text-[#717171] leading-relaxed">
                        {(() => {
                          const policyType = provider?.profile?.cancellationPolicyType ?? 'MODERATE'
                          const policyText = provider?.profile?.cancellationPolicy
                          if (policyType === 'FLEXIBLE') return 'Free cancellation up to 24 hours before your appointment. Cancel within 24 hours for a 50% refund.'
                          if (policyType === 'MODERATE') return 'Free cancellation up to 48 hours before your appointment. No refund for cancellations within 48 hours.'
                          return policyText || 'Non-refundable. Please contact the artist if you need to reschedule.'
                        })()}
                      </p>
                    </div>

                    {/* Instant book confirmation notice */}
                    {isInstantBook && (
                      <div className="mb-4 flex items-center gap-2 rounded-xl bg-[#f3ece9] px-4 py-3">
                        <span className="text-sm">⚡</span>
                        <p className="text-sm font-medium text-[#1A1A1A]">
                          Instant confirmation — your booking will be confirmed immediately after payment
                        </p>
                      </div>
                    )}

                    {/* Fix-2: T&C acceptance checkbox */}
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-[#f9f2ef] mb-4">
                      <input
                        type="checkbox"
                        id="terms-accept"
                        checked={termsAccepted}
                        onChange={e => setTermsAccepted(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-[#E96B56] cursor-pointer"
                      />
                      <label htmlFor="terms-accept" className="text-xs text-[#717171] leading-relaxed cursor-pointer">
                        I agree to Sparq&apos;s{' '}
                        <a href="/trust" target="_blank" className="text-[#E96B56] underline underline-offset-2">Terms of Service</a>
                        {' '}and{' '}
                        <a href="/trust" target="_blank" className="text-[#E96B56] underline underline-offset-2">Cancellation Policy</a>.
                        I understand this booking is subject to the artist&apos;s cancellation terms.
                      </label>
                    </div>

                    {/* Nav */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          // UX-L3: Clear stale bookingId/clientSecret so going back
                          // to change date/time creates a fresh booking intent
                          setBookingId(null)
                          setClientSecret(null)
                          setStep(2)
                        }}
                        className="px-6 py-3 border border-[#e8e1de] text-[#1A1A1A] font-semibold rounded-full hover:border-[#1A1A1A] transition-colors text-sm flex-shrink-0"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleBook}
                        disabled={loading || !termsAccepted}
                        className="flex-1 bg-[#E96B56] hover:bg-[#d45a45] active:scale-[.98] disabled:opacity-60 disabled:pointer-events-none text-white font-semibold px-8 py-3.5 rounded-full transition-all text-sm flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Processing…
                          </>
                        ) : (
                          <>
                            Confirm booking →
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

                    {/* UX-07: Savings summary on payment step */}
                    {(promoApplied || (appliedVoucher && appliedVoucher.amount > 0)) && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
                        <p className="text-sm font-semibold text-emerald-700 mb-2">You saved on this booking!</p>
                        {promoApplied && promoDiscount > 0 && (
                          <p className="text-xs text-emerald-600">
                            Promo code <strong>{promoCode}</strong> — saved {formatCurrency(promoDiscount)}
                          </p>
                        )}
                        {appliedVoucher && appliedVoucher.amount > 0 && (
                          <p className="text-xs text-emerald-600 mt-1">
                            Gift voucher — {formatCurrency(Math.min(appliedVoucher.amount, selectedService.price))} applied
                            {appliedVoucher.amount > selectedService.price && (
                              <span> · <strong>{formatCurrency(appliedVoucher.amount - selectedService.price)} remaining</strong> on your voucher</span>
                            )}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Inline trust row */}
                    <div className="flex items-center gap-4 mb-6 px-1 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-[#717171]">
                        <Lock className="w-3 h-3 text-[#E96B56]" /> SSL secured
                      </span>
                      <span className="flex items-center gap-1 text-xs text-[#717171]">
                        <BadgeCheck className="w-3 h-3 text-[#E96B56]" /> Sparq Guarantee
                      </span>
                      <span className="flex items-center gap-1 text-xs text-[#717171]">
                        <RotateCcw className="w-3 h-3 text-[#E96B56]" /> Free cancellation {
                          provider?.profile?.cancellationPolicyType === 'FLEXIBLE' ? '6h'
                          : provider?.profile?.cancellationPolicyType === 'STRICT' ? '48h'
                          : '24h'
                        }
                      </span>
                    </div>

                    <StripePaymentForm
                      clientSecret={clientSecret}
                      bookingId={bookingId}
                      amount={total}
                      onSuccess={() => router.push(`/bookings/${bookingId}/confirmed`)}
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
                    {/* Fix-5: Promo discount preview in sidebar */}
                    {promoDiscount > 0 && promoApplied && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#717171]">Promo discount</span>
                        <span className="font-semibold text-emerald-600">−${promoDiscount.toFixed(2)}</span>
                      </div>
                    )}
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
                    Free cancellation up to {
                      provider?.profile?.cancellationPolicyType === 'FLEXIBLE' ? '6 hours'
                      : provider?.profile?.cancellationPolicyType === 'STRICT' ? '48 hours'
                      : '24 hours'
                    } before your appointment
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
