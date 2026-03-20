'use client'

import { useState, useEffect, useCallback } from 'react'
import { ShieldAlert, CheckCircle2 } from 'lucide-react'

type LeakageFlag = {
  id: string
  flagType: string
  snippet: string
  resolved: boolean
  resolvedAt: string | null
  createdAt: string
  messageId: string | null
  bookingId: string | null
  user: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  }
}

export default function LeakageFlagsPage() {
  const [flags, setFlags] = useState<LeakageFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [showResolved, setShowResolved] = useState(false)
  const [resolving, setResolving] = useState<string | null>(null)

  const fetchFlags = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/leakage-flags?resolved=${showResolved}`)
      .then(r => r.json())
      .then(d => {
        setFlags(d.flags || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [showResolved])

  useEffect(() => {
    fetchFlags()
  }, [fetchFlags])

  async function resolveFlag(flagId: string) {
    setResolving(flagId)
    try {
      await fetch('/api/admin/leakage-flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flagId }),
      })
      fetchFlags()
    } catch {
      // silently fail
    }
    setResolving(null)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <ShieldAlert className="h-6 w-6" />
          Leakage Flags
        </h1>
        <p className="text-sm text-gray-500">
          Contact information leakage attempts detected in messages and reviews
        </p>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => setShowResolved(false)}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
            !showResolved
              ? 'bg-gray-900 text-white'
              : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Unresolved
        </button>
        <button
          onClick={() => setShowResolved(true)}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
            showResolved
              ? 'bg-gray-900 text-white'
              : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Resolved
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Flag Type</th>
              <th className="px-5 py-3">Content</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : flags.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                  No {showResolved ? 'resolved' : 'unresolved'} flags found
                </td>
              </tr>
            ) : (
              flags.map(flag => (
                <tr key={flag.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-4 text-gray-600">
                    {new Date(flag.createdAt).toLocaleDateString()}{' '}
                    <span className="text-xs text-gray-400">
                      {new Date(flag.createdAt).toLocaleTimeString()}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-medium text-gray-900">
                      {flag.user.name || 'Unknown'}
                    </div>
                    <div className="text-xs text-gray-400">{flag.user.email}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                      {flag.flagType}
                    </span>
                  </td>
                  <td className="max-w-xs truncate px-5 py-4 text-gray-600">
                    {flag.snippet}
                  </td>
                  <td className="px-5 py-4">
                    {flag.resolved ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        <CheckCircle2 className="h-3 w-3" /> Resolved
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                        Unresolved
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {!flag.resolved && (
                      <button
                        onClick={() => resolveFlag(flag.id)}
                        disabled={resolving === flag.id}
                        className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                      >
                        {resolving === flag.id ? 'Resolving...' : 'Resolve'}
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
