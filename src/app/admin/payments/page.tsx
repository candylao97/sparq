'use client'

import { useState, useEffect, useCallback } from 'react'
import { DollarSign, AlertTriangle, Clock, CheckCircle, XCircle, Search, RotateCcw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

type Payout = {
  id: string
  amount: number
  platformFee: number
  status: string
  stripeTransferId: string | null
  scheduledAt: string
  processedAt: string | null
  failedAt: string | null
  failureReason: string | null
  createdAt: string
  booking: {
    totalPrice: number
    service: { title: string }
    customer: { name: string | null; email: string | null }
    provider: { name: string | null; email: string | null }
  }
}

const STATUS_BADGE: Record<string, string> = {
  SCHEDULED: 'bg-blue-50 text-blue-700',
  PROCESSING: 'bg-yellow-50 text-yellow-700',
  COMPLETED: 'bg-green-50 text-green-700',
  FAILED: 'bg-red-50 text-red-700',
  CANCELLED: 'bg-[#f9f2ef] text-[#717171]',
}

export default function AdminPayments() {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [failedCount, setFailedCount] = useState(0)
  const [pendingTotal, setPendingTotal] = useState(0)
  const [retrying, setRetrying] = useState<string | null>(null)

  const handleRetry = async (payoutId: string) => {
    setRetrying(payoutId)
    try {
      const res = await fetch(`/api/admin/payouts/${payoutId}/retry`, { method: 'POST' })
      if (res.ok) {
        fetchPayouts()
      }
    } catch {
      // fail silently
    } finally {
      setRetrying(null)
    }
  }

  const fetchPayouts = useCallback(() => {
    setLoading(true)
    const p = new URLSearchParams()
    if (filter) p.set('status', filter)
    fetch(`/api/admin/payments?${p}`)
      .then(r => r.json())
      .then(d => {
        let list: Payout[] = d.payouts || []
        if (search) {
          list = list.filter(p =>
            p.booking.provider.name?.toLowerCase().includes(search.toLowerCase()) ||
            p.booking.customer.name?.toLowerCase().includes(search.toLowerCase()) ||
            p.booking.service.title.toLowerCase().includes(search.toLowerCase())
          )
        }
        setPayouts(list)
        setFailedCount(d.failedCount || 0)
        setPendingTotal(d.pendingTotal || 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [filter, search])

  useEffect(() => { fetchPayouts() }, [fetchPayouts])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Payments &amp; payouts</h1>
        <p className="text-sm text-[#717171]">Monitor payout status and detect anomalies</p>
      </div>

      {/* KPI strip */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#e8e1de] bg-white p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#1A1A1A]">{formatCurrency(pendingTotal)}</div>
            <div className="text-xs text-[#717171]">Pending Payouts</div>
          </div>
        </div>
        <div className={`rounded-2xl border bg-white p-4 flex items-center gap-3 ${failedCount > 0 ? 'border-red-200' : 'border-[#e8e1de]'}`}>
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${failedCount > 0 ? 'bg-red-50' : 'bg-[#f9f2ef]'}`}>
            <AlertTriangle className={`h-4 w-4 ${failedCount > 0 ? 'text-red-600' : 'text-[#717171]'}`} />
          </div>
          <div>
            <div className={`text-xl font-bold ${failedCount > 0 ? 'text-red-600' : 'text-[#1A1A1A]'}`}>{failedCount}</div>
            <div className="text-xs text-[#717171]">Failed Payouts</div>
          </div>
        </div>
        <div className="rounded-2xl border border-[#e8e1de] bg-white p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-green-50 flex items-center justify-center">
            <DollarSign className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#1A1A1A]">{payouts.length}</div>
            <div className="text-xs text-[#717171]">Total Records</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#717171]" />
          <input
            type="text"
            placeholder="Search by artist, client, or service..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[#e8e1de] bg-white py-2 pl-10 pr-4 text-sm focus:border-[#717171] focus:outline-none"
          />
        </div>
        {[
          { value: '', label: 'All' },
          { value: 'SCHEDULED', label: 'Scheduled' },
          { value: 'PROCESSING', label: 'Processing' },
          { value: 'COMPLETED', label: 'Completed' },
          { value: 'FAILED', label: 'Failed' },
          { value: 'CANCELLED', label: 'Cancelled' },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.value ? 'bg-[#1A1A1A] text-white' : 'bg-white text-[#717171] border border-[#e8e1de] hover:bg-[#f9f2ef]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#e8e1de] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e8e1de] bg-[#f9f2ef]/50 text-left text-xs font-medium uppercase tracking-wider text-[#717171]">
              <th className="px-5 py-3">Service</th>
              <th className="px-5 py-3">Artist</th>
              <th className="px-5 py-3">Amount</th>
              <th className="px-5 py-3">Platform Fee</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Scheduled</th>
              <th className="px-5 py-3">Stripe ID</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f9f2ef]">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 w-16 animate-pulse rounded bg-[#f9f2ef]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : payouts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-[#717171]">
                  No payouts found
                </td>
              </tr>
            ) : (
              payouts.map(p => (
                <tr key={p.id} className={`hover:bg-[#f9f2ef]/50 ${p.status === 'FAILED' ? 'bg-red-50/20' : ''}`}>
                  <td className="px-5 py-4">
                    <div className="font-medium text-[#1A1A1A]">{p.booking.service.title}</div>
                    <div className="text-xs text-[#717171]">{p.booking.customer.name}</div>
                  </td>
                  <td className="px-5 py-4 text-[#1A1A1A]">{p.booking.provider.name}</td>
                  <td className="px-5 py-4 font-semibold text-[#1A1A1A]">{formatCurrency(p.amount)}</td>
                  <td className="px-5 py-4 text-[#717171]">{formatCurrency(p.platformFee)}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[p.status]}`}>
                      {p.status === 'COMPLETED' && <CheckCircle className="h-3 w-3" />}
                      {p.status === 'FAILED' && <XCircle className="h-3 w-3" />}
                      {p.status === 'SCHEDULED' && <Clock className="h-3 w-3" />}
                      {p.status}
                    </span>
                    {p.failureReason && (
                      <div className="mt-1 text-[10px] text-red-500">{p.failureReason}</div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs text-[#717171]">
                    {new Date(p.scheduledAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4">
                    {p.stripeTransferId ? (
                      <span className="font-mono text-xs text-[#717171]">{p.stripeTransferId.slice(0, 12)}…</span>
                    ) : (
                      <span className="text-xs text-[#D5CEC9]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {p.status === 'FAILED' && (
                      <button
                        onClick={() => handleRetry(p.id)}
                        disabled={retrying === p.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#f3ece9] px-3 py-1 text-xs font-semibold text-[#a63a29] hover:bg-[#e8e1de] transition-colors disabled:opacity-50"
                      >
                        {retrying === p.id
                          ? <span className="w-3 h-3 border border-[#a63a29] border-t-transparent rounded-full animate-spin" />
                          : <RotateCcw className="h-3 w-3" />
                        }
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
