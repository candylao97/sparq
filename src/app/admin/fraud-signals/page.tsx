'use client'

import { useState, useEffect, useCallback } from 'react'
import { ShieldAlert, RefreshCw, AlertTriangle, User } from 'lucide-react'

type FlaggedUser = {
  id: string
  name: string | null
  email: string | null
  role: string
  createdAt: string
  signals: string[]
  riskScore: number
}

const RISK_BADGE: Record<number, string> = {
  1: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  2: 'bg-orange-50 text-orange-700 border border-orange-200',
  3: 'bg-red-50 text-red-700 border border-red-200',
}

export default function AdminFraudSignals() {
  const [users, setUsers] = useState<FlaggedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSignals = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/fraud-signals')
      if (!res.ok) throw new Error('Failed to load fraud signals')
      const data = await res.json()
      setUsers(data.flaggedUsers ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSignals() }, [fetchSignals])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-red-500" />
          <div>
            <h1 className="text-xl font-bold text-[#1A1A1A]">Fraud signals</h1>
            <p className="text-sm text-[#717171]">Users flagged by risk heuristics in the last 7 days</p>
          </div>
        </div>
        <button
          onClick={fetchSignals}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-[#e8e1de] text-[#717171] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-[#E96B56] border-t-transparent rounded-full" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && users.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ShieldAlert className="w-12 h-12 text-[#e8e1de] mb-4" />
          <p className="text-base font-semibold text-[#1A1A1A]">No flagged users</p>
          <p className="text-sm text-[#717171] mt-1">No users have triggered risk signals in the last 7 days.</p>
        </div>
      )}

      {/* Table */}
      {!loading && users.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#e8e1de] overflow-hidden">
          {/* Summary bar */}
          <div className="px-6 py-4 border-b border-[#f3ece9] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-[#1A1A1A]">
              {users.length} user{users.length !== 1 ? 's' : ''} flagged
            </span>
            <span className="text-sm text-[#717171]">— sorted by risk score (highest first)</span>
          </div>

          {/* User rows */}
          <div className="divide-y divide-[#f3ece9]">
            {users.map(user => (
              <div key={user.id} className="px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: user info */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[#f3ece9] flex items-center justify-center">
                      <User className="w-5 h-5 text-[#717171]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-[#1A1A1A]">
                          {user.name ?? 'Unknown'}
                        </span>
                        <span className="text-xs text-[#717171] bg-[#f3ece9] px-2 py-0.5 rounded-full">
                          {user.role}
                        </span>
                      </div>
                      <p className="text-sm text-[#717171] mt-0.5">{user.email}</p>
                      <p className="text-xs text-[#aaa] mt-0.5">
                        Member since {new Date(user.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  {/* Right: risk score + signals */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${RISK_BADGE[Math.min(user.riskScore, 3)] ?? RISK_BADGE[3]}`}>
                      Risk {user.riskScore}
                    </span>
                    <div className="flex flex-col items-end gap-1">
                      {user.signals.map((sig, i) => (
                        <span
                          key={i}
                          className="text-xs bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded-full"
                        >
                          {sig}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action row */}
                <div className="mt-3 flex items-center gap-3">
                  <a
                    href={`/admin/users?id=${user.id}`}
                    className="text-xs font-medium text-[#E96B56] hover:text-[#a63a29] transition-colors"
                  >
                    View profile →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
