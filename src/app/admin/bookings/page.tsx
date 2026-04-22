'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, RefreshCw, DollarSign } from 'lucide-react'
import { formatCurrency, getBookingStatusLabel, getBookingStatusColor } from '@/lib/utils'

type Booking = {
  id: string
  date: string
  time: string
  status: string
  totalPrice: number
  platformFee: number
  paymentStatus: string | null
  refundStatus: string
  refundAmount: number | null
  createdAt: string
  customer: { name: string | null; email: string | null }
  provider: { name: string | null }
  service: { title: string }
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [refundModal, setRefundModal] = useState<Booking | null>(null)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [refundConfirmStep, setRefundConfirmStep] = useState(false)

  const fetchBookings = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter !== 'all') params.set('status', filter)
    if (search) params.set('search', search)
    fetch(`/api/admin/bookings?${params}`)
      .then(r => r.json())
      .then(d => { setBookings(d.bookings || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [filter, search])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  async function processRefund() {
    if (!refundModal) return
    setSaving(true)
    await fetch(`/api/admin/bookings/${refundModal.id}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refundAmount: parseFloat(refundAmount),
        refundReason,
      }),
    })
    setSaving(false)
    setRefundModal(null)
    setRefundAmount('')
    setRefundReason('')
    setRefundConfirmStep(false)
    fetchBookings()
  }

  const statusColor = (s: string) => {
    // Use shared helper if available, fallback to local map
    try {
      return getBookingStatusColor(s)
    } catch {
      const map: Record<string, string> = {
        PENDING: 'bg-yellow-50 text-yellow-700',
        CONFIRMED: 'bg-blue-50 text-blue-700',
        COMPLETED: 'bg-green-50 text-green-700',
        CANCELLED: 'bg-red-50 text-red-700',
        CANCELLED_BY_CUSTOMER: 'bg-red-50 text-red-700',
        CANCELLED_BY_PROVIDER: 'bg-orange-50 text-orange-700',
        DECLINED: 'bg-[#f9f2ef] text-[#717171]',
        REFUNDED: 'bg-purple-50 text-purple-700',
        EXPIRED: 'bg-[#f9f2ef] text-[#717171]',
        DISPUTED: 'bg-red-100 text-red-800',
      }
      return map[s] || 'bg-[#f9f2ef] text-[#717171]'
    }
  }

  const statusLabel = (s: string) => {
    try {
      return getBookingStatusLabel(s)
    } catch {
      return s.replace(/_/g, ' ')
    }
  }

  const refundColor = (s: string) => {
    const map: Record<string, string> = {
      NONE: '',
      REQUESTED: 'bg-yellow-50 text-yellow-700',
      APPROVED: 'bg-blue-50 text-blue-700',
      PROCESSED: 'bg-green-50 text-green-700',
      DENIED: 'bg-red-50 text-red-700',
    }
    return map[s] || ''
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Bookings</h1>
        <p className="text-sm text-[#717171]">Manage bookings and process refunds</p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#717171]" />
          <input
            type="text"
            placeholder="Search by customer, provider, or service..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[#e8e1de] bg-white py-2 pl-10 pr-4 text-sm focus:border-[#717171] focus:outline-none"
          />
        </div>
        {['all', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_PROVIDER', 'REFUNDED', 'EXPIRED', 'DISPUTED', 'refund'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              filter === f ? 'bg-[#1A1A1A] text-white' : 'bg-white text-[#717171] border border-[#e8e1de] hover:bg-[#f9f2ef]'
            }`}
          >
            {f === 'refund' ? 'Refund Requested' : f === 'all' ? 'All' : statusLabel(f)}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#e8e1de] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e8e1de] bg-[#f9f2ef]/50 text-left text-xs font-medium uppercase tracking-wider text-[#717171]">
              <th className="px-5 py-3">Booking</th>
              <th className="px-5 py-3">Customer</th>
              <th className="px-5 py-3">Provider</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Amount</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Payment</th>
              <th className="px-5 py-3">Refund</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f9f2ef]">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 w-16 animate-pulse rounded bg-[#f9f2ef]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-12 text-center text-[#717171]">
                  No bookings found
                </td>
              </tr>
            ) : (
              bookings.map(b => (
                <tr key={b.id} className="hover:bg-[#f9f2ef]/50">
                  <td className="px-5 py-4">
                    <div className="font-medium text-[#1A1A1A]">{b.service.title}</div>
                    <div className="text-xs text-[#717171]">{b.id.slice(0, 8)}...</div>
                  </td>
                  <td className="px-5 py-4 text-[#717171]">{b.customer.name || b.customer.email}</td>
                  <td className="px-5 py-4 text-[#717171]">{b.provider.name}</td>
                  <td className="px-5 py-4 text-[#717171]">
                    {new Date(b.date).toLocaleDateString()} {b.time}
                  </td>
                  <td className="px-5 py-4 font-medium text-[#1A1A1A]">{formatCurrency(b.totalPrice)}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(b.status)}`}>
                      {statusLabel(b.status)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {b.paymentStatus ? (
                      <span className="text-xs text-[#717171]">{b.paymentStatus}</span>
                    ) : (
                      <span className="text-xs text-[#D5CEC9]">-</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {b.refundStatus !== 'NONE' ? (
                      <div>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${refundColor(b.refundStatus)}`}>
                          {b.refundStatus}
                        </span>
                        {b.refundAmount && (
                          <div className="mt-1 text-xs text-[#717171]">{formatCurrency(b.refundAmount)}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-[#D5CEC9]">-</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {b.refundStatus === 'NONE' && b.status !== 'CANCELLED' && (
                      <button
                        onClick={() => {
                          setRefundModal(b)
                          setRefundAmount(b.totalPrice.toString())
                        }}
                        className="rounded-lg p-1.5 text-orange-600 hover:bg-orange-50"
                        title="Process refund"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Refund Modal */}
      {refundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            {!refundConfirmStep ? (
              <>
                <h3 className="mb-1 flex items-center gap-2 text-lg font-bold text-[#1A1A1A]">
                  <DollarSign className="h-5 w-5" /> Process Refund
                </h3>
                <p className="mb-4 text-sm text-[#717171]">
                  {refundModal.service.title} — {refundModal.customer.name}
                </p>

                <div className="mb-4">
                  <label className="mb-1 block text-sm font-medium text-[#1A1A1A]">
                    Refund Amount (Original: {formatCurrency(refundModal.totalPrice)})
                  </label>
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={e => setRefundAmount(e.target.value)}
                    max={refundModal.totalPrice}
                    step="0.01"
                    className="w-full rounded-lg border border-[#e8e1de] p-3 text-sm focus:border-[#717171] focus:outline-none"
                  />
                </div>

                <div className="mb-4">
                  <label className="mb-1 block text-sm font-medium text-[#1A1A1A]">Reason</label>
                  <textarea
                    value={refundReason}
                    onChange={e => setRefundReason(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-[#e8e1de] p-3 text-sm focus:border-[#717171] focus:outline-none"
                    placeholder="Enter refund reason..."
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => { setRefundModal(null); setRefundAmount(''); setRefundReason(''); setRefundConfirmStep(false) }}
                    className="rounded-lg border border-[#e8e1de] px-4 py-2 text-sm font-medium text-[#717171] hover:bg-[#f9f2ef]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setRefundConfirmStep(true)}
                    disabled={!refundAmount || !refundReason}
                    className="rounded-lg bg-[#1A1A1A] px-4 py-2 text-sm font-medium text-white hover:bg-[#1A1A1A] disabled:opacity-50"
                  >
                    Review refund →
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="mb-1 flex items-center gap-2 text-lg font-bold text-[#1A1A1A]">
                  <DollarSign className="h-5 w-5" /> Confirm Refund
                </h3>
                <p className="mb-4 text-sm text-[#717171]">
                  Please review before processing — this action cannot be undone.
                </p>

                <div className="mb-5 rounded-xl border border-[#e8e1de] bg-[#f9f2ef] p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#717171]">Customer</span>
                    <span className="font-medium text-[#1A1A1A]">{refundModal.customer.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#717171]">Service</span>
                    <span className="font-medium text-[#1A1A1A]">{refundModal.service.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#717171]">Refund amount</span>
                    <span className="font-bold text-orange-600">{formatCurrency(parseFloat(refundAmount))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#717171]">Reason</span>
                    <span className="text-[#1A1A1A] text-right max-w-[60%]">{refundReason}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setRefundConfirmStep(false)}
                    className="rounded-lg border border-[#e8e1de] px-4 py-2 text-sm font-medium text-[#717171] hover:bg-[#f9f2ef]"
                  >
                    ← Edit
                  </button>
                  <button
                    onClick={processRefund}
                    disabled={saving}
                    className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                  >
                    {saving ? 'Processing…' : 'Confirm & refund'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
