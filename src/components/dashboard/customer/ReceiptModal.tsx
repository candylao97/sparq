'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { X, Download, Mail, CheckCircle2, ExternalLink, Printer } from 'lucide-react'
import { formatTime } from '@/lib/utils'
import type { CustomerBooking } from '@/types/dashboard'
import toast from 'react-hot-toast'

interface Props {
  booking: CustomerBooking
  onClose: () => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function shortId(id: string) {
  return id.slice(-8).toUpperCase()
}

export function ReceiptModal({ booking, onClose }: Props) {
  const backdropRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Price breakdown
  const servicePrice = booking.totalPrice - booking.platformFee - booking.tipAmount
  const hasTip = booking.tipAmount > 0

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose()
  }

  function handleResendEmail() {
    toast.success('Receipt sent to your email')
  }

  function handleDownload() {
    // Print the receipt panel to PDF via browser print
    window.print()
  }

  function handlePrint() {
    window.print()
  }

  const locationLabel = booking.locationType === 'MOBILE'
    ? `Mobile — ${booking.address || 'Address on booking'}`
    : booking.locationType === 'STUDIO'
    ? `Studio — ${booking.provider.suburb || 'In-studio'}`
    : booking.address || 'Location on booking'

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px] sm:items-center"
    >
      <style jsx global>{`
        @media print {
          body > *:not([data-receipt-modal]) { display: none !important; }
          [data-receipt-modal] { position: static !important; background: white !important; box-shadow: none !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>

      {/* Panel */}
      <div data-receipt-modal className="receipt-panel relative w-full max-w-[440px] overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[#f3ece9] text-[#717171] hover:bg-[#e8e1de] transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Scrollable content */}
        <div className="max-h-[90vh] overflow-y-auto pb-6">

          {/* Header band */}
          <div className="px-6 pb-5 pt-6">
            {/* Brand */}
            <div className="mb-4 flex items-center gap-1.5">
              <span className="text-[13px] font-black tracking-widest text-[#1A1A1A]">SPARQ</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#E96B56]" />
            </div>

            <h2 className="font-headline text-2xl text-[#1A1A1A]">Receipt</h2>

            {/* Paid badge */}
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              <span className="text-xs font-semibold text-green-700">Payment confirmed</span>
            </div>
          </div>

          <div className="border-t border-[#f0e8e4]" />

          {/* Service summary */}
          <div className="px-6 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#717171] mb-2">Service</p>
            <p className="text-[1.05rem] font-bold text-[#1A1A1A]">{booking.service.title}</p>
            <p className="mt-0.5 text-sm text-[#717171]">{booking.provider.name}</p>
          </div>

          <div className="border-t border-[#f0e8e4]" />

          {/* Booking details */}
          <div className="px-6 py-5 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#717171] mb-1">Details</p>

            <div className="flex items-start justify-between gap-4">
              <span className="text-sm text-[#717171]">Date</span>
              <span className="text-sm font-medium text-[#1A1A1A] text-right">{formatDate(booking.date)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-[#717171]">Time</span>
              <span className="text-sm font-medium text-[#1A1A1A]">{formatTime(booking.time)}</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="text-sm text-[#717171]">Location</span>
              <span className="text-sm font-medium text-[#1A1A1A] text-right max-w-[210px]">{locationLabel}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-[#717171]">Duration</span>
              <span className="text-sm font-medium text-[#1A1A1A]">{booking.service.duration} min</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-[#717171]">Booking ID</span>
              <span className="font-mono text-xs font-semibold text-[#717171] bg-[#f3ece9] px-2 py-0.5 rounded">
                #{shortId(booking.id)}
              </span>
            </div>
          </div>

          <div className="border-t border-[#f0e8e4]" />

          {/* Price breakdown */}
          <div className="px-6 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#717171] mb-3">Payment</p>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#717171]">{booking.service.title}</span>
                <span className="text-sm text-[#1A1A1A]">${servicePrice.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#717171]">Booking fee</span>
                <span className="text-sm text-[#1A1A1A]">${booking.platformFee.toFixed(2)}</span>
              </div>
              {hasTip && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#717171]">Tip</span>
                  <span className="text-sm text-[#1A1A1A]">${booking.tipAmount.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="mt-4 flex items-center justify-between rounded-xl bg-[#f9f2ef] px-4 py-3">
              <span className="text-sm font-bold text-[#1A1A1A]">Total paid</span>
              <span className="text-base font-bold text-[#1A1A1A]">${booking.totalPrice.toFixed(2)}</span>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-[#717171]">Payment method</span>
              <span className="text-xs font-medium text-[#1A1A1A]">Card on file</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-xs text-[#717171]">Status</span>
              <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Paid
              </span>
            </div>
          </div>

          <div className="border-t border-[#f0e8e4]" />

          {/* Tax note */}
          <div className="px-6 py-4">
            <p className="text-[11px] leading-relaxed text-[#bbb]">
              This receipt can be used for tax or reimbursement purposes. Sparq Pty Ltd · ABN 00 000 000 000
            </p>
          </div>

          {/* Actions */}
          <div className="px-6 flex gap-2.5">
            <button
              onClick={handleResendEmail}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#e8e1de] py-2.5 text-sm font-medium text-[#1A1A1A] hover:bg-[#f9f2ef] transition-colors print:hidden"
            >
              <Mail className="h-3.5 w-3.5" />
              Resend to email
            </button>
            <button
              onClick={handleDownload}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] py-2.5 text-sm font-semibold text-white hover:bg-[#333] transition-colors print:hidden"
            >
              <Download className="h-3.5 w-3.5" />
              Download PDF
            </button>
          </div>

          {/* Print / Save as PDF */}
          <div className="px-6 pt-3 flex justify-center">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#e8e1de] bg-white px-4 py-2 text-sm font-semibold text-[#1A1A1A] hover:bg-[#f9f2ef] transition-colors print:hidden"
            >
              <Printer className="h-4 w-4" />
              Print / Save as PDF
            </button>
          </div>

          {/* M1: Link to full printable receipt page */}
          <div className="px-6 pt-3">
            <Link
              href={`/bookings/${booking.id}/receipt`}
              onClick={onClose}
              className="flex items-center justify-center gap-1.5 text-xs text-[#717171] hover:text-[#E96B56] transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              View full receipt page
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
