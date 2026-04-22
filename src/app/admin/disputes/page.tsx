'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AlertTriangle, Search, ChevronDown, ChevronUp, MessageSquare, DollarSign, CheckCircle, XCircle, Clock } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

type Dispute = {
  id: string
  bookingId: string
  customerId: string
  reason: string
  evidence: string | null
  status: string
  resolution: string | null
  resolvedBy: string | null
  resolvedAt: string | null
  createdAt: string
  booking: {
    totalPrice: number
    date: string
    refundStatus: string | null
    refundAmount: number | null
    service: { title: string; price: number }
    customer: { id: string; name: string | null; email: string | null; image: string | null }
    provider: { id: string; name: string | null; email: string | null; image: string | null }
  }
}

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-red-50 text-red-700',
  UNDER_REVIEW: 'bg-yellow-50 text-yellow-700',
  RESOLVED_REFUND: 'bg-green-50 text-green-700',
  RESOLVED_NO_REFUND: 'bg-[#f3ece9] text-[#717171]',
  CLOSED: 'bg-[#f3ece9] text-[#717171]',
}

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Open',
  UNDER_REVIEW: 'Under Review',
  RESOLVED_REFUND: 'Refunded',
  RESOLVED_NO_REFUND: 'No Refund',
  CLOSED: 'Closed',
}

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [resolveModal, setResolveModal] = useState<{ dispute: Dispute; action: string } | null>(null)
  const [resolution, setResolution] = useState('')
  const [refundAmount, setRefundAmount] = useState<number>(0)
  const [saving, setSaving] = useState(false)
  const [reversalStatus, setReversalStatus] = useState<'success' | 'failed' | 'skipped' | null>(null)
  const [refundReason, setRefundReason] = useState('')

  const fetchDisputes = useCallback((filterStatus: string, searchTerm: string) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus && filterStatus !== 'ALL') params.set('status', filterStatus)
    if (searchTerm) params.set('search', searchTerm)
    const query = params.toString() ? `?${params.toString()}` : ''
    fetch(`/api/admin/disputes${query}`)
      .then(r => r.json())
      .then(d => {
        setDisputes(d.disputes || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Re-fetch immediately on filter change
  useEffect(() => { fetchDisputes(filter, search) }, [filter, fetchDisputes]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce search input: wait 300ms after user stops typing before fetching
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => { fetchDisputes(filter, search) }, 300)
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current) }
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleResolve() {
    if (!resolveModal) return
    setSaving(true)
    setReversalStatus(null)
    try {
      const res = await fetch('/api/admin/disputes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disputeId: resolveModal.dispute.id,
          status: resolveModal.action,
          resolution,
          ...(resolveModal.action === 'RESOLVED_REFUND' ? { refundAmount: parseFloat(String(refundAmount)) } : {}),
          ...(resolveModal.action === 'RESOLVED_REFUND' && refundReason ? { refundReason } : {}),
        }),
      })
      const data = await res.json()
      if (data.reversalStatus) {
        setReversalStatus(data.reversalStatus as 'success' | 'failed' | 'skipped')
        // Keep modal open briefly to show reversal status, then auto-close
        setTimeout(() => {
          setResolveModal(null)
          setResolution('')
          setRefundAmount(0)
          setRefundReason('')
          setReversalStatus(null)
          fetchDisputes(filter, search)
        }, 2500)
      } else {
        setResolveModal(null)
        setResolution('')
        setRefundAmount(0)
        setRefundReason('')
        fetchDisputes(filter, search)
      }
    } finally {
      setSaving(false)
    }
  }

  const openCount = disputes.filter(d => d.status === 'OPEN').length
  const reviewCount = disputes.filter(d => d.status === 'UNDER_REVIEW').length

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Dispute Resolution</h1>
        <p className="text-sm text-[#717171]">Manage customer disputes and arbitration outcomes</p>
      </div>

      {/* KPI strip */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { label: 'Open', value: openCount, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Under Review', value: reviewCount, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Total', value: disputes.length, color: 'text-[#717171]', bg: 'bg-[#f9f2ef]' },
        ].map(k => (
          <div key={k.label} className="rounded-2xl border border-[#f0ebe7] bg-white p-4 flex items-center gap-3">
            <div className={`h-9 w-9 rounded-xl ${k.bg} flex items-center justify-center`}>
              <AlertTriangle className={`h-4 w-4 ${k.color}`} />
            </div>
            <div>
              <div className="text-xl font-bold text-[#1A1A1A]">{k.value}</div>
              <div className="text-xs text-[#717171]">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#717171]" />
          <input
            type="text"
            placeholder="Search by customer, artist, or service..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[#e8e1de] bg-white py-2 pl-10 pr-4 text-sm focus:border-[#1A1A1A] focus:outline-none"
          />
        </div>
        {['ALL', 'OPEN', 'UNDER_REVIEW', 'RESOLVED_REFUND', 'RESOLVED_NO_REFUND', 'CLOSED'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f ? 'bg-[#1A1A1A] text-white' : 'bg-white text-[#717171] border border-[#e8e1de] hover:bg-[#f9f2ef]'
            }`}
          >
            {f === 'ALL' ? 'All' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {/* Dispute list */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-[#f0ebe7] bg-white h-20" />
          ))
        ) : disputes.length === 0 ? (
          <div className="rounded-2xl border border-[#f0ebe7] bg-white p-12 text-center text-[#717171]">
            No disputes found
          </div>
        ) : (
          disputes.map(d => {
            const isExpanded = expanded === d.id
            const isOpen = ['OPEN', 'UNDER_REVIEW'].includes(d.status)
            return (
              <div key={d.id} className="rounded-2xl border border-[#f0ebe7] bg-white overflow-hidden">
                {/* Header row */}
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-[#f9f2ef]/50"
                  onClick={() => setExpanded(isExpanded ? null : d.id)}
                >
                  <AlertTriangle className={`h-4 w-4 flex-shrink-0 ${isOpen ? 'text-red-400' : 'text-[#bbb]'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-[#1A1A1A] text-sm">{d.booking.service.title}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[d.status]}`}>
                        {STATUS_LABEL[d.status]}
                      </span>
                      {/* UX-M7: SLA age indicator — flag disputes older than 48h */}
                      {(() => {
                        const ageH = Math.floor((Date.now() - new Date(d.createdAt).getTime()) / 3_600_000)
                        const ageLabel = ageH < 24 ? `${ageH}h old` : `${Math.floor(ageH / 24)}d old`
                        const urgent = ageH >= 48
                        if (!['OPEN', 'UNDER_REVIEW'].includes(d.status)) return null
                        return (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium flex items-center gap-1 ${
                            urgent ? 'bg-red-100 text-red-700' : 'bg-[#f3ece9] text-[#717171]'
                          }`}>
                            <Clock className={`h-2.5 w-2.5 ${urgent ? 'text-red-500' : 'text-[#aaa]'}`} />
                            {ageLabel}
                          </span>
                        )
                      })()}
                    </div>
                    <div className="text-xs text-[#717171]">
                      {d.booking.customer.name} vs {d.booking.provider.name} · {new Date(d.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-[#1A1A1A] flex-shrink-0">
                    {formatCurrency(d.booking.totalPrice)}
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-[#717171]" /> : <ChevronDown className="h-4 w-4 text-[#717171]" />}
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-[#f0ebe7] px-5 py-4 bg-[#f9f2ef]/30">
                    <div className="grid grid-cols-2 gap-6 mb-4">
                      <div>
                        <div className="text-xs font-semibold text-[#717171] uppercase tracking-wide mb-2">Dispute Reason</div>
                        <p className="text-sm text-[#1A1A1A]">{d.reason}</p>
                      </div>
                      {d.evidence && (
                        <div>
                          <div className="text-xs font-semibold text-[#717171] uppercase tracking-wide mb-2">Evidence</div>
                          <p className="text-sm text-[#1A1A1A]">{d.evidence}</p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="rounded-xl border border-[#f0ebe7] bg-white p-4">
                        <div className="text-xs font-semibold text-[#717171] mb-1">Customer</div>
                        <div className="text-sm font-medium text-[#1A1A1A]">{d.booking.customer.name}</div>
                        <div className="text-xs text-[#717171]">{d.booking.customer.email}</div>
                      </div>
                      <div className="rounded-xl border border-[#f0ebe7] bg-white p-4">
                        <div className="text-xs font-semibold text-[#717171] mb-1">Artist</div>
                        <div className="text-sm font-medium text-[#1A1A1A]">{d.booking.provider.name}</div>
                        <div className="text-xs text-[#717171]">{d.booking.provider.email}</div>
                      </div>
                    </div>

                    {d.resolution && (
                      <div className="mb-4 rounded-xl border border-[#f0ebe7] bg-white p-4">
                        <div className="text-xs font-semibold text-[#717171] mb-1">Resolution Notes</div>
                        <p className="text-sm text-[#1A1A1A]">{d.resolution}</p>
                      </div>
                    )}

                    {isOpen && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setResolveModal({ dispute: d, action: 'UNDER_REVIEW' }); setRefundAmount(0) }}
                          className="flex items-center gap-1.5 rounded-lg border border-[#e8e1de] bg-white px-3 py-2 text-xs font-medium text-[#1A1A1A] hover:bg-[#f9f2ef]"
                        >
                          <Clock className="h-3.5 w-3.5" /> Mark Under Review
                        </button>
                        <button
                          onClick={() => { setResolveModal({ dispute: d, action: 'RESOLVED_REFUND' }); setRefundAmount(d.booking.totalPrice) }}
                          className="flex items-center gap-1.5 rounded-lg bg-green-600 hover:bg-green-700 px-3 py-2 text-xs font-medium text-white"
                        >
                          <DollarSign className="h-3.5 w-3.5" /> Refund Customer
                        </button>
                        <button
                          onClick={() => { setResolveModal({ dispute: d, action: 'RESOLVED_NO_REFUND' }); setRefundAmount(0) }}
                          className="flex items-center gap-1.5 rounded-lg bg-[#717171] hover:bg-[#1A1A1A] px-3 py-2 text-xs font-medium text-white"
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> Release to Artist
                        </button>
                        <button
                          onClick={() => { setResolveModal({ dispute: d, action: 'CLOSED' }); setRefundAmount(0) }}
                          className="flex items-center gap-1.5 rounded-lg border border-[#e8e1de] bg-white px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Close
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Resolve modal */}
      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-lg font-bold text-[#1A1A1A] flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {resolveModal.action === 'RESOLVED_REFUND' ? 'Refund Customer' :
               resolveModal.action === 'RESOLVED_NO_REFUND' ? 'Release to Artist' :
               resolveModal.action === 'UNDER_REVIEW' ? 'Mark Under Review' : 'Close Dispute'}
            </h3>
            <p className="mb-4 text-sm text-[#717171]">
              {resolveModal.dispute.booking.service.title} — {formatCurrency(resolveModal.dispute.booking.totalPrice)}
            </p>

            {/* UX-10: Prior refund warning */}
            {resolveModal.dispute.booking.refundStatus === 'REFUNDED' && (() => {
              const maxAdditionalRefund = resolveModal.dispute.booking.totalPrice - (resolveModal.dispute.booking.refundAmount ?? 0)
              return (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-700">Prior refund detected</p>
                    <p className="text-xs text-amber-600">
                      This booking already has a refund on record. Enter the additional amount only (max: {formatCurrency(Math.max(0, maxAdditionalRefund))}).
                    </p>
                  </div>
                </div>
              )
            })()}

            {resolveModal.action === 'RESOLVED_REFUND' && (
              <>
                <div className="mb-4">
                  <label className="mb-1 block text-sm font-medium text-[#717171]">Refund amount (AUD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={resolveModal.dispute.booking.totalPrice}
                    value={refundAmount}
                    onChange={e => setRefundAmount(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-[#e8e1de] px-3 py-2 text-sm focus:border-[#1A1A1A] focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-[#717171]">
                    Max: {formatCurrency(resolveModal.dispute.booking.totalPrice)}
                  </p>
                </div>

                <div className="mb-4">
                  <label className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-widest mb-1.5 block">Reason for refund *</label>
                  <textarea
                    value={refundReason}
                    onChange={e => setRefundReason(e.target.value)}
                    placeholder="e.g., Service not delivered as described"
                    className="w-full border border-[#e8e1de] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1A1A1A] resize-none h-20"
                    required
                  />
                </div>

                {refundAmount > 0 && (
                  <div className="bg-[#f9f2ef] rounded-xl px-4 py-3 text-sm space-y-1 mb-4">
                    <p className="font-semibold text-[#1A1A1A]">Refund impact</p>
                    <p className="text-[#717171]">Customer receives: <span className="text-[#1A1A1A] font-medium">${refundAmount.toFixed(2)}</span></p>
                    <p className="text-[#717171]">Provider payout adjustment: <span className="text-red-500 font-medium">-${refundAmount.toFixed(2)}</span></p>
                  </div>
                )}
              </>
            )}

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-[#717171]">Internal Resolution Notes</label>
              <textarea
                value={resolution}
                onChange={e => setResolution(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-[#e8e1de] p-3 text-sm focus:border-[#1A1A1A] focus:outline-none"
                placeholder="Add internal notes about this decision..."
              />
            </div>

            {/* Reversal status indicator */}
            {reversalStatus && (
              <div className="mb-4">
                {reversalStatus === 'success' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
                    <CheckCircle className="h-3.5 w-3.5" /> Transfer reversed ✓
                  </span>
                )}
                {reversalStatus === 'failed' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" /> Reversal failed — check Stripe
                  </span>
                )}
                {reversalStatus === 'skipped' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f3ece9] px-3 py-1.5 text-xs font-semibold text-[#717171]">
                    No transfer to reverse
                  </span>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setResolveModal(null); setResolution(''); setRefundAmount(0); setRefundReason(''); setReversalStatus(null) }}
                disabled={saving}
                className="rounded-lg border border-[#e8e1de] px-4 py-2 text-sm font-medium text-[#717171] hover:bg-[#f9f2ef] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={saving || !!reversalStatus}
                className="rounded-lg bg-[#1A1A1A] px-4 py-2 text-sm font-medium text-white hover:bg-[#333] disabled:opacity-50"
              >
                {saving ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
