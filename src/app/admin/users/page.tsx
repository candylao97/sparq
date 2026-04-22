'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Users, Ban, ShieldAlert, CheckCircle2, Eye } from 'lucide-react'

type AdminUser = {
  id: string
  name: string | null
  email: string | null
  role: string
  image: string | null
  createdAt: string
  providerProfile: {
    accountStatus: string
    tier: string
    isVerified: boolean
    suspendReason: string | null
  } | null
  _count: {
    bookingsAsCustomer: number
    bookingsAsProvider: number
  }
}

const ROLE_BADGE: Record<string, string> = {
  CUSTOMER: 'bg-blue-50 text-blue-700',
  PROVIDER: 'bg-purple-50 text-purple-700',
  BOTH: 'bg-indigo-50 text-indigo-700',
  ADMIN: 'bg-[#1A1A1A] text-white',
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-green-50 text-green-700',
  SUSPENDED: 'bg-red-50 text-red-700',
  UNDER_REVIEW: 'bg-yellow-50 text-yellow-700',
  BANNED: 'bg-[#f9f2ef] text-[#717171]',
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [actionModal, setActionModal] = useState<{ user: AdminUser; action: string } | null>(null)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchUsers = useCallback(() => {
    setLoading(true)
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    if (role) p.set('role', role)
    fetch(`/api/admin/users?${p}`)
      .then(r => r.json())
      .then(d => { setUsers(d.users || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [search, role])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function handleAction() {
    if (!actionModal) return
    setSaving(true)
    await fetch(`/api/admin/users/${actionModal.user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: actionModal.action, reason }),
    })
    setSaving(false)
    setActionModal(null)
    setReason('')
    fetchUsers()
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">User Management</h1>
        <p className="text-sm text-[#717171]">Search, view, and moderate platform users</p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#717171]" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[#e8e1de] bg-white py-2 pl-10 pr-4 text-sm focus:border-[#717171] focus:outline-none"
          />
        </div>
        {['', 'CUSTOMER', 'PROVIDER', 'BOTH', 'ADMIN'].map(r => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              role === r ? 'bg-[#1A1A1A] text-white' : 'bg-white text-[#717171] border border-[#e8e1de] hover:bg-[#f9f2ef]'
            }`}
          >
            {r === '' ? 'All Roles' : r}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#e8e1de] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e8e1de] bg-[#f9f2ef]/50 text-left text-xs font-medium uppercase tracking-wider text-[#717171]">
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Bookings</th>
              <th className="px-5 py-3">Joined</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f9f2ef]">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 w-20 animate-pulse rounded bg-[#f9f2ef]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center">
                  <Users className="mx-auto mb-2 h-8 w-8 text-[#D5CEC9]" />
                  <p className="text-[#717171]">No users found</p>
                </td>
              </tr>
            ) : (
              users.map(u => {
                const status = u.providerProfile?.accountStatus || 'ACTIVE'
                return (
                  <tr key={u.id} className="hover:bg-[#f9f2ef]/50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f9f2ef] text-xs font-bold text-[#717171] flex-shrink-0">
                          {(u.name || u.email || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-[#1A1A1A]">{u.name || '—'}</div>
                          <div className="text-xs text-[#717171]">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGE[u.role] || 'bg-[#f9f2ef] text-[#717171]'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {u.providerProfile ? (
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[status] || 'bg-[#f9f2ef]'}`}>
                          {status}
                        </span>
                      ) : (
                        <span className="text-xs text-[#717171]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-[#717171]">
                      <span title="as customer">{u._count.bookingsAsCustomer}c</span>
                      {(u.role === 'PROVIDER' || u.role === 'BOTH') && (
                        <span title="as provider"> / {u._count.bookingsAsProvider}p</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-[#717171]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        {u.providerProfile && status === 'ACTIVE' && (
                          <button
                            onClick={() => setActionModal({ user: u, action: 'suspend' })}
                            className="rounded-lg p-1.5 text-orange-500 hover:bg-orange-50"
                            title="Suspend"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                        {u.providerProfile && status === 'SUSPENDED' && (
                          <button
                            onClick={() => setActionModal({ user: u, action: 'unsuspend' })}
                            className="rounded-lg p-1.5 text-green-600 hover:bg-green-50"
                            title="Unsuspend"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                        {u.providerProfile && status !== 'BANNED' && (
                          <button
                            onClick={() => setActionModal({ user: u, action: 'ban' })}
                            className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                            title="Ban"
                          >
                            <ShieldAlert className="h-4 w-4" />
                          </button>
                        )}
                        {u.providerProfile && (
                          <a
                            href={`/providers/${u.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg p-1.5 text-[#717171] hover:bg-[#f9f2ef] hover:text-[#717171]"
                            title="View profile"
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-lg font-bold capitalize text-[#1A1A1A]">
              {actionModal.action} User
            </h3>
            <p className="mb-4 text-sm text-[#717171]">
              {actionModal.user.name} ({actionModal.user.email})
            </p>

            {['suspend', 'ban'].includes(actionModal.action) && (
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-[#1A1A1A]">Reason (required)</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-[#e8e1de] p-3 text-sm focus:border-[#717171] focus:outline-none"
                  placeholder="Enter reason..."
                />
              </div>
            )}

            {actionModal.action === 'ban' && (
              <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3">
                <p className="text-xs text-red-600 font-medium">This will permanently ban the user. This action should be reserved for serious violations.</p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setActionModal(null); setReason('') }}
                className="rounded-lg border border-[#e8e1de] px-4 py-2 text-sm font-medium text-[#717171] hover:bg-[#f9f2ef]"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={saving || (['suspend', 'ban'].includes(actionModal.action) && !reason)}
                className="rounded-lg bg-[#1A1A1A] px-4 py-2 text-sm font-medium text-white hover:bg-[#1A1A1A] disabled:opacity-50"
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
