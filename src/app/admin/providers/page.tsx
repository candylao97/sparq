'use client'

import { useState, useEffect, useCallback } from 'react'
import { Shield, ShieldCheck, ShieldX, Ban, Search, CheckCircle2, XCircle, Eye } from 'lucide-react'

type Provider = {
  id: string
  userId: string
  bio: string | null
  suburb: string | null
  city: string
  tier: string
  isVerified: boolean
  accountStatus: string
  suspendReason: string | null
  createdAt: string
  user: { id: string; name: string | null; email: string | null; image: string | null }
  verification: { status: string; adminNotes: string | null } | null
  _count: { services: number }
}

export default function AdminProviders() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [actionModal, setActionModal] = useState<{ provider: Provider; action: string } | null>(null)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchProviders = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter !== 'all') params.set('status', filter)
    if (search) params.set('search', search)
    fetch(`/api/admin/providers?${params}`)
      .then(r => r.json())
      .then(d => { setProviders(d.providers || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [filter, search])

  useEffect(() => { fetchProviders() }, [fetchProviders])

  async function handleAction() {
    if (!actionModal) return
    setSaving(true)
    const { provider, action } = actionModal
    const body: Record<string, unknown> = {}

    if (action === 'approve') {
      body.isVerified = true
      body.verificationStatus = 'APPROVED'
      body.accountStatus = 'ACTIVE'
    } else if (action === 'reject') {
      body.isVerified = false
      body.verificationStatus = 'REJECTED'
      body.adminNotes = reason
    } else if (action === 'suspend') {
      body.accountStatus = 'SUSPENDED'
      body.suspendReason = reason
    } else if (action === 'unsuspend') {
      body.accountStatus = 'ACTIVE'
      body.suspendReason = null
    } else if (action === 'ban') {
      body.accountStatus = 'BANNED'
      body.suspendReason = reason
    }

    await fetch(`/api/admin/providers/${provider.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    setActionModal(null)
    setReason('')
    fetchProviders()
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      ACTIVE: 'bg-green-50 text-green-700',
      SUSPENDED: 'bg-red-50 text-red-700',
      UNDER_REVIEW: 'bg-yellow-50 text-yellow-700',
      BANNED: 'bg-gray-100 text-gray-700',
    }
    return map[status] || 'bg-gray-100 text-gray-600'
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Providers</h1>
        <p className="text-sm text-gray-500">Manage provider verification, status, and profiles</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-gray-400 focus:outline-none"
          />
        </div>
        {['all', 'pending', 'verified', 'unverified', 'suspended'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize transition-colors ${
              filter === f ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-5 py-3">Provider</th>
              <th className="px-5 py-3">Location</th>
              <th className="px-5 py-3">Verified</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Services</th>
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
            ) : providers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                  No providers found
                </td>
              </tr>
            ) : (
              providers.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                        {(p.user.name || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{p.user.name || 'Unnamed'}</div>
                        <div className="text-xs text-gray-400">{p.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-600">{p.suburb || p.city}</td>
                  <td className="px-5 py-4">
                    {p.isVerified ? (
                      <ShieldCheck className="h-5 w-5 text-green-500" />
                    ) : p.verification?.status === 'PENDING' ? (
                      <Shield className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <ShieldX className="h-5 w-5 text-gray-300" />
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(p.accountStatus)}`}>
                      {p.accountStatus}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-600">{p._count.services}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      {!p.isVerified && p.verification?.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => setActionModal({ provider: p, action: 'approve' })}
                            className="rounded-lg p-1.5 text-green-600 hover:bg-green-50"
                            title="Approve"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setActionModal({ provider: p, action: 'reject' })}
                            className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {p.accountStatus === 'ACTIVE' ? (
                        <button
                          onClick={() => setActionModal({ provider: p, action: 'suspend' })}
                          className="rounded-lg p-1.5 text-orange-600 hover:bg-orange-50"
                          title="Suspend"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      ) : p.accountStatus === 'SUSPENDED' ? (
                        <button
                          onClick={() => setActionModal({ provider: p, action: 'unsuspend' })}
                          className="rounded-lg p-1.5 text-green-600 hover:bg-green-50"
                          title="Unsuspend"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      ) : null}
                      <a
                        href={`/providers/${p.userId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="View profile"
                      >
                        <Eye className="h-4 w-4" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-lg font-bold capitalize text-gray-900">
              {actionModal.action} Provider
            </h3>
            <p className="mb-4 text-sm text-gray-500">
              {actionModal.provider.user.name} ({actionModal.provider.user.email})
            </p>

            {['reject', 'suspend', 'ban'].includes(actionModal.action) && (
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">Reason</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:border-gray-400 focus:outline-none"
                  placeholder="Enter reason..."
                />
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setActionModal(null); setReason('') }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={saving || (['reject', 'suspend', 'ban'].includes(actionModal.action) && !reason)}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? 'Processing...' : `Confirm ${actionModal.action}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
