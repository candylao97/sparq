'use client'

import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, TrendingDown, Users, DollarSign, AlertTriangle, Download } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

type ReportsData = {
  revenueByMonth: { month: string; revenue: number }[]
  bookingsByStatus: { status: string; count: number }[]
  topProviders: { name: string; earnings: number; bookings: number }[]
  newUsersByMonth: { month: string; count: number }[]
  dropOff: { total: number; completed: number; cancelled: number; declined: number; rate: number }
}

export default function AdminReports() {
  const [data, setData] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/reports')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Reports</h1>
          <p className="text-sm text-[#717171]">Platform analytics and insights</p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-[#e8e1de] bg-white p-6">
              <div className="h-5 w-32 rounded bg-[#f9f2ef]" />
              <div className="mt-4 h-40 rounded bg-[#f9f2ef]" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!data) return <div className="text-center text-[#717171]">Failed to load reports</div>

  const maxRevenue = Math.max(...data.revenueByMonth.map(r => r.revenue), 1)
  const maxUsers = Math.max(...data.newUsersByMonth.map(u => u.count), 1)
  const totalBookingCount = data.bookingsByStatus.reduce((a, b) => a + b.count, 0)

  function handleExport(type: 'bookings' | 'providers' | 'users') {
    window.location.href = `/api/admin/export?type=${type}`
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Reports</h1>
          <p className="text-sm text-[#717171]">Platform analytics and insights</p>
        </div>
        {/* M17: CSV export buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['bookings', 'providers', 'users'] as const).map(type => (
            <button
              key={type}
              onClick={() => handleExport(type)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e8e1de] bg-white px-3.5 py-2 text-xs font-semibold text-[#717171] hover:border-[#E96B56] hover:text-[#E96B56] transition-colors shadow-sm capitalize"
            >
              <Download className="h-3.5 w-3.5" />
              Export {type}
            </button>
          ))}
        </div>
      </div>

      {/* Drop-off Alert */}
      {data.dropOff.rate > 30 && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <div>
            <p className="text-sm font-medium text-orange-800">
              High drop-off detected: {data.dropOff.rate.toFixed(0)}% of bookings are not completing
            </p>
            <p className="text-xs text-orange-600">
              {data.dropOff.cancelled} cancelled, {data.dropOff.declined} declined out of {data.dropOff.total} total bookings
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue by Month */}
        <div className="rounded-2xl border border-[#e8e1de] bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[#717171]" />
            <h2 className="font-bold text-[#1A1A1A]">Revenue by month</h2>
          </div>
          <div className="space-y-3">
            {data.revenueByMonth.map(r => (
              <div key={r.month} className="flex items-center gap-3">
                <div className="w-12 text-xs text-[#717171]">{r.month}</div>
                <div className="flex-1">
                  <div
                    className="h-6 rounded-lg bg-[#1A1A1A]"
                    style={{ width: `${(r.revenue / maxRevenue) * 100}%`, minWidth: r.revenue > 0 ? '4px' : '0' }}
                  />
                </div>
                <div className="w-20 text-right text-xs font-medium text-[#1A1A1A]">
                  {formatCurrency(r.revenue)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bookings by Status */}
        <div className="rounded-2xl border border-[#e8e1de] bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#717171]" />
            <h2 className="font-bold text-[#1A1A1A]">Bookings by status</h2>
          </div>
          <div className="space-y-4">
            {data.bookingsByStatus.map(b => {
              const pct = totalBookingCount > 0 ? (b.count / totalBookingCount) * 100 : 0
              const colors: Record<string, string> = {
                COMPLETED: 'bg-green-500',
                CONFIRMED: 'bg-blue-500',
                PENDING: 'bg-yellow-500',
                CANCELLED: 'bg-red-500',
                DECLINED: 'bg-[#D5CEC9]',
              }
              return (
                <div key={b.status}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-[#1A1A1A]">{b.status}</span>
                    <span className="text-[#717171]">{b.count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#f9f2ef]">
                    <div
                      className={`h-full rounded-full ${colors[b.status] || 'bg-[#D5CEC9]'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* New Users by Month */}
        <div className="rounded-2xl border border-[#e8e1de] bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-[#717171]" />
            <h2 className="font-bold text-[#1A1A1A]">New users by month</h2>
          </div>
          <div className="space-y-3">
            {data.newUsersByMonth.map(u => (
              <div key={u.month} className="flex items-center gap-3">
                <div className="w-12 text-xs text-[#717171]">{u.month}</div>
                <div className="flex-1">
                  <div
                    className="h-6 rounded-lg bg-blue-500"
                    style={{ width: `${(u.count / maxUsers) * 100}%`, minWidth: u.count > 0 ? '4px' : '0' }}
                  />
                </div>
                <div className="w-8 text-right text-xs font-medium text-[#1A1A1A]">{u.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Providers */}
        <div className="rounded-2xl border border-[#e8e1de] bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#717171]" />
            <h2 className="font-bold text-[#1A1A1A]">Top providers by earnings</h2>
          </div>
          {data.topProviders.length === 0 ? (
            <p className="text-sm text-[#717171]">No provider data yet</p>
          ) : (
            <div className="space-y-3">
              {data.topProviders.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    i === 0 ? 'bg-yellow-100 text-yellow-800' :
                    i === 1 ? 'bg-[#f9f2ef] text-[#717171]' :
                    i === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-[#f9f2ef] text-[#717171]'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-[#1A1A1A]">{p.name}</div>
                    <div className="text-xs text-[#717171]">{p.bookings} bookings</div>
                  </div>
                  <div className="text-sm font-bold text-[#1A1A1A]">{formatCurrency(p.earnings)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Drop-off Stats */}
        <div className="rounded-2xl border border-[#e8e1de] bg-white p-6 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-[#717171]" />
            <h2 className="font-bold text-[#1A1A1A]">Booking drop-off analysis</h2>
          </div>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div>
              <div className="text-3xl font-bold text-[#1A1A1A]">{data.dropOff.total}</div>
              <div className="text-xs text-[#717171]">Total Bookings</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">{data.dropOff.completed}</div>
              <div className="text-xs text-[#717171]">Completed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-red-600">{data.dropOff.cancelled}</div>
              <div className="text-xs text-[#717171]">Cancelled</div>
            </div>
            <div>
              <div className={`text-3xl font-bold ${data.dropOff.rate > 30 ? 'text-red-600' : 'text-[#1A1A1A]'}`}>
                {data.dropOff.rate.toFixed(1)}%
              </div>
              <div className="text-xs text-[#717171]">Drop-off Rate</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
