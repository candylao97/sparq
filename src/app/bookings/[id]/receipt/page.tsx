'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ArrowLeft, Download, Printer, BadgeCheck } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface ReceiptBooking {
  id: string
  date: string
  time: string
  totalPrice: number
  platformFee: number
  tipAmount: number
  status: string
  paymentStatus: string
  locationType: string
  address: string | null
  giftVoucherCode: string | null
  createdAt: string
  service: {
    id: string
    title: string
    price: number
    duration: number
    category: string
  }
  provider: {
    id: string
    name: string | null
    image: string | null
    providerProfile?: { suburb: string | null; city: string | null; isVerified: boolean } | null
  }
  customer: {
    id: string
    name: string | null
    email: string | null
  }
}

function formatReceiptDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`
}

export default function BookingReceiptPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { status } = useSession()
  const [booking, setBooking] = useState<ReceiptBooking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const receiptRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status !== 'authenticated') return

    fetch(`/api/bookings/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.booking) setBooking(d.booking)
        else setError('Booking not found')
      })
      .catch(() => setError('Failed to load receipt'))
      .finally(() => setLoading(false))
  }, [id, status, router])

  const handlePrint = () => window.print()

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
        <div className="animate-spin w-8 h-8 border-[3px] border-[#E96B56] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7] gap-4">
        <p className="text-[#1A1A1A] font-semibold">{error || 'Booking not found'}</p>
        <Link href="/bookings" className="text-[#E96B56] text-sm hover:underline">Back to bookings</Link>
      </div>
    )
  }

  const serviceAmount = booking.service.price
  const voucherDiscount = booking.totalPrice < (serviceAmount + booking.platformFee + (booking.tipAmount ?? 0))
    ? (serviceAmount + booking.platformFee + (booking.tipAmount ?? 0)) - booking.totalPrice
    : 0
  const tipAmount = booking.tipAmount ?? 0

  return (
    <div className="min-h-screen bg-[#FDFBF7] py-10 px-4 print:bg-white print:py-0">
      <div className="max-w-xl mx-auto">

        {/* Nav — hidden on print */}
        <div className="flex items-center justify-between mb-8 print:hidden">
          <Link
            href="/bookings"
            className="flex items-center gap-1.5 text-sm text-[#717171] hover:text-[#1A1A1A] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to bookings
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-sm font-medium text-[#717171] hover:text-[#1A1A1A] transition-colors px-3 py-1.5 rounded-full border border-[#e8e1de] hover:border-[#1A1A1A]"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
          </div>
        </div>

        {/* Receipt card */}
        <div ref={receiptRef} className="bg-white rounded-3xl shadow-sm border border-[#e8e1de] overflow-hidden print:shadow-none print:border-0">

          {/* Header */}
          <div className="bg-[#1A1A1A] px-8 py-8 text-white">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/50 mb-1">Receipt</p>
                <p className="font-headline text-2xl font-bold">Booking #{booking.id.slice(-8).toUpperCase()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-white/50 uppercase tracking-widest">Issued</p>
                <p className="text-sm font-semibold mt-0.5">{formatReceiptDate(booking.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                ['COMPLETED', 'CONFIRMED'].includes(booking.status)
                  ? 'bg-white/15 text-white'
                  : 'bg-white/10 text-white/70'
              }`}>
                {booking.status.replace(/_/g, ' ')}
              </span>
              <span className="text-white/40 text-[10px]">·</span>
              <span className="text-white/60 text-[10px] font-medium">
                {booking.paymentStatus === 'CAPTURED' ? 'Payment confirmed' : booking.paymentStatus?.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          <div className="px-8 py-8 space-y-7">

            {/* Parties */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#717171] mb-2">Billed to</p>
                <p className="font-semibold text-[#1A1A1A] text-sm">{booking.customer.name ?? 'Customer'}</p>
                {booking.customer.email && (
                  <p className="text-xs text-[#717171] mt-0.5">{booking.customer.email}</p>
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#717171] mb-2">Service by</p>
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-[#1A1A1A] text-sm">{booking.provider.name ?? 'Artist'}</p>
                  {booking.provider.providerProfile?.isVerified && (
                    <BadgeCheck className="h-3.5 w-3.5 text-[#E96B56] flex-shrink-0" />
                  )}
                </div>
                {booking.provider.providerProfile?.suburb && (
                  <p className="text-xs text-[#717171] mt-0.5">
                    {[booking.provider.providerProfile.suburb, booking.provider.providerProfile.city].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>

            <div className="h-px bg-[#f3ece9]" />

            {/* Appointment details */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#717171] mb-3">Appointment</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#717171]">Service</span>
                  <span className="font-medium text-[#1A1A1A]">{booking.service.title}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#717171]">Date</span>
                  <span className="font-medium text-[#1A1A1A]">{formatReceiptDate(booking.date)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#717171]">Time</span>
                  <span className="font-medium text-[#1A1A1A]">{formatTime(booking.time)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#717171]">Duration</span>
                  <span className="font-medium text-[#1A1A1A]">{booking.service.duration} min</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#717171]">Location</span>
                  <span className="font-medium text-[#1A1A1A]">{booking.locationType === 'AT_HOME' ? 'Your place' : 'Studio'}</span>
                </div>
              </div>
            </div>

            <div className="h-px bg-[#f3ece9]" />

            {/* Price breakdown */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#717171] mb-3">Price breakdown</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#717171]">{booking.service.title}</span>
                  <span className="text-[#1A1A1A]">{formatCurrency(serviceAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#717171]">Booking fee</span>
                  <span className="text-[#1A1A1A]">{formatCurrency(booking.platformFee)}</span>
                </div>
                {tipAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#717171]">Tip</span>
                    <span className="text-[#1A1A1A]">{formatCurrency(tipAmount)}</span>
                  </div>
                )}
                {voucherDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#717171]">
                      Gift voucher{booking.giftVoucherCode ? ` (${booking.giftVoucherCode})` : ''}
                    </span>
                    <span className="text-green-600">−{formatCurrency(voucherDiscount)}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-[#f3ece9]">
                <span className="font-bold text-[#1A1A1A]">Total paid</span>
                <span className="font-bold text-xl text-[#1A1A1A]">{formatCurrency(booking.totalPrice)}</span>
              </div>
            </div>

            {/* Footer note */}
            <div className="bg-[#f9f2ef] rounded-xl p-4 text-xs text-[#717171] leading-relaxed">
              This receipt confirms your booking on the Sparq platform. For cancellation or dispute queries, visit your{' '}
              <Link href="/bookings" className="text-[#E96B56] hover:underline">bookings page</Link>
              {' '}or contact{' '}
              <a href="mailto:support@sparq.com.au" className="text-[#E96B56] hover:underline">support@sparq.com.au</a>.
            </div>

          </div>
        </div>

        {/* Download / print actions */}
        <div className="flex flex-col items-center mt-6 print:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-[#1A1A1A] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#2d2d2d] transition-colors"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
            <Link
              href="/bookings"
              className="text-sm font-medium text-[#717171] hover:text-[#1A1A1A] transition-colors"
            >
              Back to bookings
            </Link>
          </div>
          <p className="text-xs text-[#717171] mt-2">Opens print dialog — choose &quot;Save as PDF&quot; to download</p>
        </div>
      </div>
    </div>
  )
}
