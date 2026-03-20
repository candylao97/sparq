'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Users, DollarSign, Flag, Shield, TrendingUp, AlertCircle, ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

type AdminStats = {
  users: number
  providers: number
  gmv: number
  totalBookings: number
  flaggedReviews: number
  pendingVerifications: number
}

export default function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then((d: AdminStats) => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const statCards = [
    { label: 'Total Users', value: stats?.users || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Artists', value: stats?.providers || 0, icon: Shield, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Platform GMV', value: formatCurrency(stats?.gmv || 0), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Bookings', value: stats?.totalBookings || 0, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Flagged Reviews', value: stats?.flaggedReviews || 0, icon: Flag, color: 'text-red-600', bg: 'bg-red-50', link: '/admin/reviews?flagged=true' },
    { label: 'Pending Verifications', value: stats?.pendingVerifications || 0, icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', link: '/admin/providers?status=pending' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500">Platform stats at a glance</p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {statCards.map(stat => (
          <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-5">
            {loading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-10 w-10 rounded-xl bg-gray-100" />
                <div className="h-6 w-16 rounded bg-gray-100" />
                <div className="h-4 w-24 rounded bg-gray-100" />
              </div>
            ) : (
              <>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className="mt-3 text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm text-gray-500">{stat.label}</span>
                  {stat.link && (
                    <Link href={stat.link} className="text-xs text-gray-400 hover:text-gray-600">
                      View <ArrowRight className="inline h-3 w-3" />
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
            <Shield className="h-5 w-5 text-gray-400" /> Verification Queue
          </h2>
          {(stats?.pendingVerifications ?? 0) > 0 ? (
            <div>
              <p className="mb-3 text-sm text-amber-600">
                {stats?.pendingVerifications} artists awaiting review
              </p>
              <Link
                href="/admin/providers?status=pending"
                className="inline-flex items-center gap-1 text-sm font-medium text-gray-900 hover:text-gray-600"
              >
                Review now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="py-4 text-center">
              <Shield className="mx-auto mb-2 h-8 w-8 text-gray-200" />
              <p className="text-sm text-gray-400">All verifications up to date</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
            <Flag className="h-5 w-5 text-red-400" /> Flagged Reviews
          </h2>
          {(stats?.flaggedReviews ?? 0) > 0 ? (
            <div>
              <p className="mb-3 text-sm text-red-600">
                {stats?.flaggedReviews} reviews need moderation
              </p>
              <Link
                href="/admin/reviews?flagged=true"
                className="inline-flex items-center gap-1 text-sm font-medium text-gray-900 hover:text-gray-600"
              >
                Moderate now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="py-4 text-center">
              <Flag className="mx-auto mb-2 h-8 w-8 text-gray-200" />
              <p className="text-sm text-gray-400">No flagged reviews</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
