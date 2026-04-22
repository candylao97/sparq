'use client'

import { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'

interface AuditLogEntry {
  id: string
  actorId: string
  action: string
  targetType: string
  targetId: string | null
  reason: string | null
  createdAt: string
  actor: { name: string | null; email: string | null } | null
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [actionInput, setActionInput] = useState('')

  useEffect(() => {
    const params = new URLSearchParams()
    if (dateFrom) params.set('from', dateFrom)
    if (dateTo) params.set('to', dateTo)
    if (actionFilter) params.set('action', actionFilter)

    setLoading(true)
    fetch(`/api/admin/audit-log?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setEntries(d?.entries ?? d?.logs ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [dateFrom, dateTo, actionFilter])

  const clearFilters = () => {
    setDateFrom('')
    setDateTo('')
    setActionFilter('')
    setActionInput('')
  }

  const hasFilters = dateFrom || dateTo || actionFilter

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-20 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-headline text-3xl text-[#1A1A1A]">Audit Log</h1>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-sm text-[#717171] hover:text-[#1A1A1A] transition-colors"
            >
              <X className="h-4 w-4" /> Clear filters
            </button>
          )}
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#717171] uppercase tracking-wider">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="rounded-xl border border-[#e8e1de] bg-white px-3 py-2 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#E96B56] focus:border-transparent"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#717171] uppercase tracking-wider">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="rounded-xl border border-[#e8e1de] bg-white px-3 py-2 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#E96B56] focus:border-transparent"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#717171] uppercase tracking-wider">Action</label>
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                value={actionInput}
                onChange={e => setActionInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') setActionFilter(actionInput.trim()) }}
                placeholder="e.g. SUSPEND_USER"
                className="rounded-xl border border-[#e8e1de] bg-white px-3 py-2 pr-8 text-sm text-[#1A1A1A] placeholder-[#BEBEBE] focus:outline-none focus:ring-2 focus:ring-[#E96B56] focus:border-transparent w-52"
              />
              <button
                onClick={() => setActionFilter(actionInput.trim())}
                className="absolute right-2 text-[#717171] hover:text-[#1A1A1A] transition-colors"
                aria-label="Apply action filter"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#e8e1de] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e8e1de] bg-[#f9f2ef]">
                <th className="text-left px-4 py-3 font-semibold text-[#717171]">Time</th>
                <th className="text-left px-4 py-3 font-semibold text-[#717171]">Admin</th>
                <th className="text-left px-4 py-3 font-semibold text-[#717171]">Action</th>
                <th className="text-left px-4 py-3 font-semibold text-[#717171]">Target</th>
                <th className="text-left px-4 py-3 font-semibold text-[#717171]">Reason</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-[#717171]">
                    <div className="flex justify-center">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#E96B56] border-t-transparent" />
                    </div>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-[#717171]">No audit log entries found.</td>
                </tr>
              ) : (
                entries.map(log => (
                  <tr key={log.id} className="border-b border-[#f3ece9] hover:bg-[#fdfbf7]">
                    <td className="px-4 py-3 text-[#717171] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-[#1A1A1A]">{log.actor?.name ?? log.actorId}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-[#f3ece9] text-[#a63a29] px-2 py-0.5 rounded">{log.action}</span>
                    </td>
                    <td className="px-4 py-3 text-[#717171]">
                      {log.targetType}
                      {log.targetId ? ` · ${log.targetId.slice(0, 8)}…` : ''}
                    </td>
                    <td className="px-4 py-3 text-[#717171] text-xs max-w-xs truncate">{log.reason ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
