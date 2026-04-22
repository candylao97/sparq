'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Users, DollarSign, Flag, Shield, TrendingUp, AlertCircle, ArrowRight, CalendarCheck, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

type AdminStats = {
  users: number
  providers: number
  gmv: number
  totalBookings: number
  flaggedReviews: number
  pendingVerifications: number
  openDisputes: number
  todayBookings: number
  failedPayouts: number
}

type StatMeta = {
  key: keyof AdminStats
  label: string
  icon: React.ElementType
  iconCls: string
  bgCls: string
  link?: string
  isCurrency?: boolean
}

const STAT_META: StatMeta[] = [
  { key: 'users',               label: 'Total Users',           icon: Users,         iconCls: 'text-[#E96B56]',  bgCls: 'bg-[#f9f2ef]' },
  { key: 'providers',           label: 'Artists',               icon: Shield,         iconCls: 'text-[#1A1A1A]',  bgCls: 'bg-[#f3ece9]' },
  { key: 'gmv',                 label: 'Platform GMV',          icon: DollarSign,     iconCls: 'text-[#E96B56]',  bgCls: 'bg-[#f9f2ef]', isCurrency: true },
  { key: 'totalBookings',       label: 'Total Bookings',        icon: TrendingUp,     iconCls: 'text-[#1A1A1A]',  bgCls: 'bg-[#f3ece9]' },
  { key: 'flaggedReviews',      label: 'Flagged Reviews',       icon: Flag,           iconCls: 'text-[#E96B56]',  bgCls: 'bg-[#f9f2ef]', link: '/admin/reviews?flagged=true' },
  { key: 'pendingVerifications',label: 'Pending Verifications', icon: AlertCircle,    iconCls: 'text-[#E96B56]',  bgCls: 'bg-[#f9f2ef]', link: '/admin/providers?status=pending' },
  { key: 'todayBookings',       label: "Today's Bookings",      icon: CalendarCheck,  iconCls: 'text-[#1A1A1A]',  bgCls: 'bg-[#f3ece9]' },
  { key: 'openDisputes',        label: 'Open Disputes',         icon: AlertTriangle,  iconCls: 'text-[#E96B56]',  bgCls: 'bg-[#f9f2ef]', link: '/admin/disputes' },
  { key: 'failedPayouts',       label: 'Failed Payouts',        icon: DollarSign,     iconCls: 'text-[#E96B56]',  bgCls: 'bg-[#f9f2ef]', link: '/admin/payments?status=FAILED' },
]

export default function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then((d: AdminStats) => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Overview</h1>
        <p className="text-sm text-[#717171]">Platform stats at a glance</p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {STAT_META.map(({ key, label, icon: Icon, iconCls, bgCls, link, isCurrency }) => {
          const raw = stats?.[key as keyof AdminStats] ?? 0
          const value = isCurrency ? formatCurrency(raw as number) : raw

          return (
            <div key={key} className="rounded-2xl border border-[#e8e1de] bg-white p-5">
              {loading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-10 w-10 rounded-xl bg-[#f3ece9]" />
                  <div className="h-6 w-16 rounded bg-[#f3ece9]" />
                  <div className="h-4 w-24 rounded bg-[#f3ece9]" />
                </div>
              ) : (
                <>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bgCls}`}>
                    <Icon className={`h-5 w-5 ${iconCls}`} />
                  </div>
                  <div className="mt-3 text-2xl font-bold text-[#1A1A1A]">{value}</div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-sm text-[#717171]">{label}</span>
                    {link && (
                      <Link href={link} className="text-xs text-[#717171] hover:text-[#1A1A1A]">
                        View <ArrowRight className="inline h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-[#e8e1de] bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-[#1A1A1A]">
            <Shield className="h-5 w-5 text-[#717171]" /> Verification Queue
          </h2>
          {(stats?.pendingVerifications ?? 0) > 0 ? (
            <div>
              <p className="mb-3 text-sm text-amber-600">
                {stats?.pendingVerifications} artists awaiting review
              </p>
              <Link
                href="/admin/providers?status=pending"
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#1A1A1A] hover:text-[#E96B56] transition-colors"
              >
                Review now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="py-4 text-center">
              <Shield className="mx-auto mb-2 h-8 w-8 text-[#e8e1de]" />
              <p className="text-sm text-[#717171]">All verifications up to date</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#e8e1de] bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-[#1A1A1A]">
            <Flag className="h-5 w-5 text-[#E96B56]" /> Flagged Reviews
          </h2>
          {(stats?.flaggedReviews ?? 0) > 0 ? (
            <div>
              <p className="mb-3 text-sm text-red-600">
                {stats?.flaggedReviews} reviews need moderation
              </p>
              <Link
                href="/admin/reviews?flagged=true"
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#1A1A1A] hover:text-[#E96B56] transition-colors"
              >
                Moderate now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="py-4 text-center">
              <Flag className="mx-auto mb-2 h-8 w-8 text-[#e8e1de]" />
              <p className="text-sm text-[#717171]">No flagged reviews</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
