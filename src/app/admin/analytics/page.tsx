'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { RefreshCw, AlertTriangle, Clock, CheckCircle, ShieldAlert, Users } from 'lucide-react'

type MonthlyRow = {
  month: string
  gmv: number
  bookings: number
  newProviders: number
  newCustomers: number
}

type CategoryRow = { category: string; bookings: number; gmv: number }
type SuburbRow = { suburb: string; bookings: number }

type Funnel = {
  newUsers: number
  newProviders: number
  firstBookings: number
  completedBookings: number
}

type Health = {
  avgResponseTimeHours: number
  avgCompletionRate: number
  openDisputes: number
  pendingKyc: number
}

type AnalyticsData = {
  monthlyRevenue: MonthlyRow[]
  categoryBreakdown: CategoryRow[]
  topSuburbs: SuburbRow[]
  funnel: Funnel
  health: Health
}

// Format a YYYY-MM string to a short 3-letter month label
function shortMonth(yyyyMM: string): string {
  const [year, month] = yyyyMM.split('-').map(Number)
  const d = new Date(year, month - 1, 1)
  return d.toLocaleString('en-AU', { month: 'short' })
}

// ── Skeleton block ────────────────────────────────────────────────────────────
function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded bg-[#f3ece9] ${className ?? ''}`}
      style={style}
    />
  )
}

// ── Chart tooltip ─────────────────────────────────────────────────────────────
function BarTooltip({ gmv, bookings }: { gmv: number; bookings: number }) {
  return (
    <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-[#e8e1de] bg-white px-3 py-2 text-xs shadow-lg">
      <div className="font-semibold text-[#1A1A1A]">{formatCurrency(gmv)}</div>
      <div className="text-[#717171]">{bookings} booking{bookings !== 1 ? 's' : ''}</div>
    </div>
  )
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)

  function load() {
    setLoading(true)
    setError(false)
    fetch('/api/admin/analytics')
      .then((r) => {
        if (!r.ok) throw new Error('Failed')
        return r.json() as Promise<AnalyticsData>
      })
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }

  useEffect(() => {
    load()
  }, [])

  // ── Error state ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertTriangle className="mb-3 h-8 w-8 text-[#E96B56]" />
        <p className="mb-4 text-[#1A1A1A] font-medium">Failed to load analytics</p>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-4 py-2 text-sm font-medium text-white hover:bg-[#E96B56] transition-colors"
        >
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
      </div>
    )
  }

  // ── Chart data prep ──────────────────────────────────────────────────────
  const maxGmv = data
    ? Math.max(...data.monthlyRevenue.map((r) => r.gmv), 1)
    : 1

  const maxCatBookings = data
    ? Math.max(...data.categoryBreakdown.map((c) => c.bookings), 1)
    : 1

  const maxSuburbBookings = data
    ? Math.max(...data.topSuburbs.map((s) => s.bookings), 1)
    : 1

  const CATEGORY_LABELS: Record<string, string> = {
    NAILS: 'Nails',
    LASHES: 'Lashes',
    MAKEUP: 'Makeup',
  }

  return (
    <div className="font-jakarta">
      {/* Page header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-headline text-2xl font-bold text-[#1A1A1A]">Analytics</h1>
          <p className="mt-1 text-sm text-[#717171]">Platform performance &amp; growth metrics</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-[#e8e1de] bg-white px-4 py-2 text-sm font-medium text-[#717171] hover:bg-[#f9f2ef] hover:text-[#1A1A1A] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Funnel strip ──────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-[#e8e1de] bg-white p-5">
              <Skeleton className="mb-3 h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-2 h-3 w-20" />
            </div>
          ))
        ) : (
          <>
            {[
              {
                label: 'New Users',
                value: data?.funnel.newUsers ?? 0,
                sub: 'Last 30 days',
                icon: Users,
                iconCls: 'text-[#E96B56]',
                bgCls: 'bg-[#f9f2ef]',
              },
              {
                label: 'New Artists',
                value: data?.funnel.newProviders ?? 0,
                sub: 'Last 30 days',
                icon: Users,
                iconCls: 'text-[#1A1A1A]',
                bgCls: 'bg-[#f3ece9]',
              },
              {
                label: 'First Bookings',
                value: data?.funnel.firstBookings ?? 0,
                sub: 'Customers with 1 booking',
                icon: CheckCircle,
                iconCls: 'text-[#E96B56]',
                bgCls: 'bg-[#f9f2ef]',
              },
              {
                label: 'Completed Bookings',
                value: data?.funnel.completedBookings ?? 0,
                sub: 'Last 30 days',
                icon: CheckCircle,
                iconCls: 'text-[#1A1A1A]',
                bgCls: 'bg-[#f3ece9]',
              },
            ].map(({ label, value, sub, icon: Icon, iconCls, bgCls }) => (
              <div key={label} className="rounded-2xl border border-[#e8e1de] bg-white p-5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bgCls}`}>
                  <Icon className={`h-5 w-5 ${iconCls}`} />
                </div>
                <div className="mt-3 text-2xl font-bold text-[#1A1A1A]">{value.toLocaleString()}</div>
                <div className="mt-1 text-sm font-medium text-[#1A1A1A]">{label}</div>
                <div className="text-xs text-[#717171]">{sub}</div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── Monthly revenue chart ─────────────────────────────────────────── */}
      <div className="mb-6 rounded-2xl border border-[#e8e1de] bg-white p-6">
        <h2 className="font-headline mb-5 text-base font-bold text-[#1A1A1A]">
          Monthly revenue &amp; bookings
        </h2>

        {loading ? (
          <div className="flex items-end gap-2 h-[160px]">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <Skeleton
                  className="w-full"
                  style={{ height: `${40 + Math.random() * 80}px` }}
                />
                <Skeleton className="h-3 w-6" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-end gap-1.5 overflow-x-auto pb-2">
            {(data?.monthlyRevenue ?? []).map((row, i) => {
              const barH = Math.max(4, Math.round((row.gmv / maxGmv) * 120))
              const isHovered = hoveredBar === i
              return (
                <div
                  key={row.month}
                  className="relative flex flex-1 min-w-[32px] flex-col items-center gap-1"
                  onMouseEnter={() => setHoveredBar(i)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  {isHovered && (
                    <BarTooltip gmv={row.gmv} bookings={row.bookings} />
                  )}
                  <div
                    className="w-full rounded-t-md bg-[#E96B56] transition-opacity"
                    style={{
                      height: `${barH}px`,
                      opacity: isHovered ? 1 : 0.75,
                    }}
                  />
                  <span className="text-[10px] text-[#717171]">{shortMonth(row.month)}</span>
                </div>
              )
            })}
          </div>
        )}

        {!loading && data && (
          <div className="mt-4 flex items-center gap-4 border-t border-[#e8e1de] pt-4">
            <div>
              <div className="text-xs text-[#717171]">Total GMV (12 mo)</div>
              <div className="text-sm font-bold text-[#1A1A1A]">
                {formatCurrency(
                  data.monthlyRevenue.reduce((s, r) => s + r.gmv, 0)
                )}
              </div>
            </div>
            <div className="h-8 w-px bg-[#e8e1de]" />
            <div>
              <div className="text-xs text-[#717171]">Total Bookings (12 mo)</div>
              <div className="text-sm font-bold text-[#1A1A1A]">
                {data.monthlyRevenue.reduce((s, r) => s + r.bookings, 0).toLocaleString()}
              </div>
            </div>
            <div className="h-8 w-px bg-[#e8e1de]" />
            <div>
              <div className="text-xs text-[#717171]">New Artists (12 mo)</div>
              <div className="text-sm font-bold text-[#1A1A1A]">
                {data.monthlyRevenue.reduce((s, r) => s + r.newProviders, 0).toLocaleString()}
              </div>
            </div>
            <div className="h-8 w-px bg-[#e8e1de]" />
            <div>
              <div className="text-xs text-[#717171]">New Clients (12 mo)</div>
              <div className="text-sm font-bold text-[#1A1A1A]">
                {data.monthlyRevenue.reduce((s, r) => s + r.newCustomers, 0).toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Two-column: Category + Suburbs ───────────────────────────────── */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category breakdown */}
        <div className="rounded-2xl border border-[#e8e1de] bg-white p-6">
          <h2 className="font-headline mb-5 text-base font-bold text-[#1A1A1A]">
            Bookings by category
          </h2>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          ) : (data?.categoryBreakdown ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-[#717171]">No completed bookings yet</p>
          ) : (
            <div className="space-y-3">
              {(data?.categoryBreakdown ?? []).map((row) => {
                const pct = Math.round((row.bookings / maxCatBookings) * 100)
                return (
                  <div key={row.category}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-[#1A1A1A]">
                        {CATEGORY_LABELS[row.category] ?? row.category}
                      </span>
                      <div className="flex items-center gap-3 text-xs text-[#717171]">
                        <span>{row.bookings.toLocaleString()} bookings</span>
                        <span className="font-medium text-[#1A1A1A]">
                          {formatCurrency(row.gmv)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#f3ece9]">
                      <div
                        className="h-full rounded-full bg-[#E96B56] transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top suburbs */}
        <div className="rounded-2xl border border-[#e8e1de] bg-white p-6">
          <h2 className="font-headline mb-5 text-base font-bold text-[#1A1A1A]">
            Top suburbs
          </h2>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-10" />
                </div>
              ))}
            </div>
          ) : (data?.topSuburbs ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-[#717171]">No suburb data yet</p>
          ) : (
            <div className="space-y-2">
              {(data?.topSuburbs ?? []).map((row, idx) => {
                const pct = Math.round((row.bookings / maxSuburbBookings) * 100)
                return (
                  <div key={row.suburb} className="flex items-center gap-3">
                    <span className="w-5 text-right text-xs font-bold text-[#717171]">
                      {idx + 1}
                    </span>
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-[#1A1A1A]">{row.suburb}</span>
                        <span className="text-xs text-[#717171]">
                          {row.bookings.toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#f3ece9]">
                        <div
                          className="h-full rounded-full bg-[#E96B56] opacity-60 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Health strip ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#e8e1de] bg-white p-6">
        <h2 className="font-headline mb-5 text-base font-bold text-[#1A1A1A]">
          Platform health
        </h2>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-[#e8e1de] p-4">
                <Skeleton className="mb-3 h-8 w-8 rounded-xl" />
                <Skeleton className="mb-1 h-6 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {/* Avg response time */}
            <div className="rounded-xl border border-[#e8e1de] p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f3ece9]">
                <Clock className="h-4 w-4 text-[#717171]" />
              </div>
              <div className="mt-3 text-xl font-bold text-[#1A1A1A]">
                {data?.health.avgResponseTimeHours ?? 0}h
              </div>
              <div className="mt-0.5 text-xs text-[#717171]">Avg Response Time</div>
            </div>

            {/* Completion rate */}
            <div className="rounded-xl border border-[#e8e1de] p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f3ece9]">
                <CheckCircle className="h-4 w-4 text-[#717171]" />
              </div>
              <div className="mt-3 text-xl font-bold text-[#1A1A1A]">
                {data?.health.avgCompletionRate ?? 0}%
              </div>
              <div className="mt-0.5 text-xs text-[#717171]">Avg Completion Rate</div>
            </div>

            {/* Open disputes */}
            {(() => {
              const count = data?.health.openDisputes ?? 0
              const isAlert = count > 5
              return (
                <div
                  className={`rounded-xl border p-4 ${
                    isAlert ? 'border-red-200 bg-red-50' : 'border-[#e8e1de]'
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      isAlert ? 'bg-red-100' : 'bg-[#f3ece9]'
                    }`}
                  >
                    <AlertTriangle
                      className={`h-4 w-4 ${isAlert ? 'text-red-500' : 'text-[#717171]'}`}
                    />
                  </div>
                  <div
                    className={`mt-3 text-xl font-bold ${
                      isAlert ? 'text-red-600' : 'text-[#1A1A1A]'
                    }`}
                  >
                    {count}
                  </div>
                  <div className="mt-0.5 text-xs text-[#717171]">Open Disputes</div>
                </div>
              )
            })()}

            {/* Pending KYC */}
            {(() => {
              const count = data?.health.pendingKyc ?? 0
              const isAlert = count > 0
              return (
                <div
                  className={`rounded-xl border p-4 ${
                    isAlert ? 'border-amber-200 bg-amber-50' : 'border-[#e8e1de]'
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      isAlert ? 'bg-amber-100' : 'bg-[#f3ece9]'
                    }`}
                  >
                    <ShieldAlert
                      className={`h-4 w-4 ${isAlert ? 'text-amber-500' : 'text-[#717171]'}`}
                    />
                  </div>
                  <div
                    className={`mt-3 text-xl font-bold ${
                      isAlert ? 'text-amber-600' : 'text-[#1A1A1A]'
                    }`}
                  >
                    {count}
                  </div>
                  <div className="mt-0.5 text-xs text-[#717171]">Pending KYC</div>
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
