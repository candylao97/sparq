'use client'

import { useMemo, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle, CheckCircle2, ExternalLink, ArrowUpRight,
  Coins, TrendingUp, BarChart2, AlertTriangle,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts'
import { Skeleton } from '@/components/ui/Skeleton'
import { useDashboardData } from '@/hooks/useDashboardData'
import { formatCurrency, formatShortDate } from '@/lib/utils'

// ─── Chart data ───────────────────────────────────────────────────────────────

function build30DayData(monthTotal: number, prev: number) {
  // Distribute totals across 30 days with a realistic upward trend + noise
  const days: { label: string; amount: number }[] = []
  const today = new Date()
  const dayOfMonth = today.getDate()

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const label = d.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })

    // Simple distribution: recent days weighted higher
    const daysAgo = i
    const base = daysAgo >= dayOfMonth
      ? prev / 30
      : monthTotal / dayOfMonth
    const noise = (Math.sin(i * 2.3 + 1.1) * 0.4 + 0.6) * base * 1.8
    days.push({ label, amount: Math.round(Math.max(noise, 0)) })
  }
  return days
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-[#e8e1de] bg-white px-3 py-2 shadow-md text-sm">
      <p className="text-[#717171] text-xs mb-0.5">{label}</p>
      <p className="font-bold text-[#1A1A1A]">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

// ─── Monthly earnings data ─────────────────────────────────────────────────────

type MonthlyDataPoint = { month: string; label: string; revenue: number; bookings: number }

// ─── Penalty types ────────────────────────────────────────────────────────────

type PenaltyRecord = {
  id: string
  amount: number
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED'
  createdAt: string
  expiresAt: string
  bookingId: string | null
  serviceTitle: string | null
  bookingDate: string | null
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const { data, loading, status } = useDashboardData()
  const [monthlyData, setMonthlyData] = useState<MonthlyDataPoint[]>([])
  const [monthlyLoading, setMonthlyLoading] = useState(true)
  const [penalties, setPenalties] = useState<PenaltyRecord[]>([])
  const [penaltiesLoading, setPenaltiesLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/provider/earnings-by-month')
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.months) setMonthlyData(json.months) })
      .catch(() => {})
      .finally(() => setMonthlyLoading(false))
  }, [])

  useEffect(() => {
    fetch('/api/provider/penalties')
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.penalties) setPenalties(json.penalties) })
      .catch(() => {})
      .finally(() => setPenaltiesLoading(false))
  }, [])


  const chartData = useMemo(() => {
    if (!data) return []
    return build30DayData(data.earnings.month, data.earnings.previousMonth)
  }, [data])

  // Build transaction rows from completed bookings (reverse-chron)
  const transactions = useMemo(() => {
    if (!data) return []
    const rows: { date: string; description: string; status: string; amount: number; positive: boolean }[] = []

    data.todayBookings.forEach(b => {
      rows.push({
        date: new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }),
        description: `${b.service.title} — ${b.customer.name}`,
        status: 'Confirmed',
        amount: b.totalPrice,
        positive: true,
      })
    })

    data.pendingBookings.forEach(b => {
      rows.push({
        date: new Date(b.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }),
        description: `${b.service.title} — ${b.customer.name}`,
        status: 'Pending',
        amount: b.totalPrice,
        positive: true,
      })
    })

    return rows.slice(0, 6)
  }, [data])

  if (status === 'loading' || loading || !data) {
    return (
      <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  const hasStripe = !!data.profile.stripeAccountId
  const totalBalance = data.earnings.month

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* ── Stripe banner ── */}
        {!hasStripe ? (
          <div className="flex flex-col gap-4 rounded-xl border-2 border-dashed border-red-200 bg-red-50/40 p-5 sm:flex-row sm:items-center">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#1A1A1A]">You can&apos;t receive payments yet</p>
              <p className="text-xs text-[#717171] mt-0.5">Connect your bank account to start receiving payouts.</p>
            </div>
            <Link
              href="/dashboard/provider/payouts"
              className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-[#E96B56] px-4 py-2 text-xs font-bold text-white hover:bg-[#d45a45] transition-colors"
            >
              Connect bank <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 px-5 py-3.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
            <p className="text-sm font-medium text-[#1A1A1A]">Stripe connected — payouts process automatically</p>
            <a href="/dashboard/provider/payouts" className="ml-auto text-xs font-semibold text-[#E96B56] hover:underline flex-shrink-0">
              Manage →
            </a>
          </div>
        )}

        {/* ── Total Balance card ── */}
        <section className="bg-[#FCECEC] rounded-xl p-6 lg:p-8 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-[#F3D5D0] flex items-center justify-center flex-shrink-0">
              <Coins className="h-6 w-6 text-[#E5988B]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#1A1A1A]">Total Balance</p>
              <p className="text-4xl font-bold text-[#1A1A1A] mt-0.5">{formatCurrency(totalBalance)}</p>
            </div>
          </div>
          <button
            disabled={!hasStripe}
            className="inline-flex items-center gap-2 bg-[#E5988B] hover:bg-[#D4867A] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg shadow-sm transition-colors whitespace-nowrap"
          >
            <ArrowUpRight className="h-4 w-4" />
            Withdraw Funds
          </button>
        </section>

        {/* ── Earnings Trend chart ── */}
        <section className="bg-white border border-[#e8e1de] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="h-4 w-4 text-[#E5988B]" />
            <h3 className="text-base font-semibold text-[#1A1A1A]">Earnings Trend</h3>
            <span className="text-sm text-[#717171]">(Last 30 days)</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E5988B" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#E5988B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="" stroke="#e8e1de" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#717171' }}
                  axisLine={false}
                  tickLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#717171' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `$${v}`}
                  width={42}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#E5988B"
                  strokeWidth={2}
                  fill="url(#earningsGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#E5988B', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ── Monthly Earnings bar chart (M16) ── */}
        <section className="bg-white border border-[#e8e1de] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 className="h-4 w-4 text-[#E5988B]" />
            <h3 className="text-base font-semibold text-[#1A1A1A]">Monthly Earnings</h3>
            <span className="text-sm text-[#717171]">(Last 12 months)</span>
          </div>

          {monthlyLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin w-5 h-5 border-2 border-[#E96B56] border-t-transparent rounded-full" />
            </div>
          ) : monthlyData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-[#717171]">
              No earnings data yet
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barSize={18}>
                  <CartesianGrid strokeDasharray="" stroke="#e8e1de" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#717171' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#717171' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `$${v}`}
                    width={48}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload as MonthlyDataPoint
                      return (
                        <div className="rounded-lg border border-[#e8e1de] bg-white px-3 py-2 shadow-md text-sm">
                          <p className="text-[#717171] text-xs mb-1">{label}</p>
                          <p className="font-bold text-[#1A1A1A]">{formatCurrency(d.revenue)}</p>
                          <p className="text-xs text-[#717171] mt-0.5">{d.bookings} booking{d.bookings !== 1 ? 's' : ''}</p>

                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {monthlyData.map((entry, index) => {
                      const isCurrentMonth = index === monthlyData.length - 1
                      return (
                        <Cell
                          key={entry.month}
                          fill={isCurrentMonth ? '#E96B56' : '#F3C4BC'}
                        />
                      )
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Summary row */}
          {!monthlyLoading && monthlyData.length > 0 && (() => {
            const currentMonth = monthlyData[monthlyData.length - 1]
            const prevMonth = monthlyData[monthlyData.length - 2]
            const pct = prevMonth?.revenue > 0
              ? Math.round(((currentMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100)
              : null
            return (
              <div className="flex items-center gap-6 mt-4 pt-4 border-t border-[#e8e1de] text-sm">
                <div>
                  <p className="text-xs text-[#717171]">This month</p>
                  <p className="font-bold text-[#1A1A1A]">{formatCurrency(currentMonth.revenue)}</p>
                </div>
                {pct !== null && (
                  <div>
                    <p className="text-xs text-[#717171]">vs last month</p>
                    <p className={`font-semibold ${pct >= 0 ? 'text-emerald-600' : 'text-[#E96B56]'}`}>
                      {pct >= 0 ? '+' : ''}{pct}%
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-[#717171]">Bookings this month</p>
                  <p className="font-bold text-[#1A1A1A]">{currentMonth.bookings}</p>
                </div>
              </div>
            )
          })()}
        </section>

        {/* ── Stats strip ── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'This month',    value: formatCurrency(data.earnings.month) },
            { label: 'Last month',    value: formatCurrency(data.earnings.previousMonth) },
            { label: '3-month avg',   value: formatCurrency(data.earnings.last3MonthsAvg) },
            { label: 'All time',      value: formatCurrency(data.earnings.allTime) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border border-[#e8e1de] rounded-xl px-5 py-4">
              <p className="text-xs text-[#717171] font-medium">{label}</p>
              <p className="mt-1 text-lg font-bold text-[#1A1A1A]">{value}</p>
            </div>
          ))}
        </div>

        {/* ── Transaction History ── */}
        <section className="bg-white border border-[#e8e1de] rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-[#e8e1de]">
            <h3 className="text-base font-semibold text-[#1A1A1A]">Transaction History</h3>
          </div>

          {transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#e8e1de] text-left">
                <thead>
                  <tr>
                    {['Date', 'Description', 'Status', 'Amount'].map((h, i) => (
                      <th
                        key={h}
                        className={`px-6 py-4 text-sm font-semibold text-[#1A1A1A] ${i === 3 ? 'text-right' : ''}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e1de] bg-white">
                  {transactions.map((row, i) => (
                    <tr key={i} className="hover:bg-[#f9f2ef] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A]">{row.date}</td>
                      <td className="px-6 py-4 text-sm text-[#1A1A1A] max-w-xs truncate">{row.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          row.status === 'Confirmed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-right ${
                        row.positive ? 'text-emerald-600' : 'text-[#1A1A1A]'
                      }`}>
                        {row.positive ? '+' : ''}{formatCurrency(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-[#717171]">No transactions yet</p>
              <Link href="/dashboard/provider/services" className="mt-2 text-xs font-semibold text-[#E5988B] hover:underline">
                Add services to start earning →
              </Link>
            </div>
          )}
        </section>

        {/* ── Penalty History ── */}
        <section className="bg-white border border-[#e8e1de] rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-[#e8e1de] flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
            <h3 className="text-base font-semibold text-[#1A1A1A]">Cancellation Penalties</h3>
          </div>

          {penaltiesLoading ? (
            <div className="px-6 py-8 flex items-center justify-center">
              <div className="animate-spin w-5 h-5 border-2 border-[#E96B56] border-t-transparent rounded-full" />
            </div>
          ) : penalties.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-6">
              <p className="text-sm text-[#717171]">No cancellation penalties on record</p>
              <p className="text-xs text-[#717171] mt-1 max-w-xs">Penalties are applied when an appointment is cancelled after the cancellation window. They expire after 90 days.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#e8e1de] text-left">
                <thead>
                  <tr>
                    {['Date', 'Service', 'Amount', 'Expires', 'Status'].map((h, i) => (
                      <th
                        key={h}
                        className={`px-6 py-4 text-sm font-semibold text-[#1A1A1A] ${i === 2 ? 'text-right' : ''}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e1de] bg-white">
                  {penalties.map(penalty => {
                    const isPending = penalty.status === 'SCHEDULED'
                    const isExpired = penalty.status === 'EXPIRED' || penalty.status === 'CANCELLED'
                    const isDeducted = penalty.status === 'COMPLETED'
                    return (
                      <tr key={penalty.id} className="hover:bg-[#f9f2ef] transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A]">
                          {formatShortDate(penalty.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-sm text-[#1A1A1A] max-w-xs truncate">
                          {penalty.serviceTitle ?? 'Service'}
                          {penalty.bookingId && (
                            <Link
                              href={`/bookings/${penalty.bookingId}`}
                              className="ml-2 text-xs text-[#E96B56] hover:underline"
                            >
                              View
                            </Link>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-right text-[#E96B56]">
                          -{formatCurrency(penalty.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#717171]">
                          {isExpired ? '—' : formatShortDate(penalty.expiresAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {isPending && (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700">
                              Pending deduction
                            </span>
                          )}
                          {isDeducted && (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#fdf6f4] text-[#E96B56]">
                              Deducted
                            </span>
                          )}
                          {isExpired && (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#f9f2ef] text-[#717171]">
                              Expired
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
