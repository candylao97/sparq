'use client'

import { useState, useEffect } from 'react'
import { Plus, Tag, CheckCircle2, XCircle, Copy, Check } from 'lucide-react'
import toast from 'react-hot-toast'

interface Voucher {
  id: string
  code: string
  amount: number
  isRedeemed: boolean
  usedBy: string | null
  expiresAt: string
  createdAt: string
  issuedBy: string
}

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ amount: '', expiryDays: '365', customCode: '' })
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const fetchVouchers = () => {
    fetch('/api/admin/vouchers')
      .then(r => r.json())
      .then(d => { setVouchers(d.vouchers ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchVouchers() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await fetch('/api/admin/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(form.amount),
          expiryDays: parseInt(form.expiryDays),
          customCode: form.customCode || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Voucher ${data.voucher.code} created!`)
      setForm({ amount: '', expiryDays: '365', customCode: '' })
      setShowCreate(false)
      fetchVouchers()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create voucher')
    } finally {
      setCreating(false)
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const active = vouchers.filter(v => !v.isRedeemed && new Date(v.expiresAt) > new Date())
  const redeemed = vouchers.filter(v => v.isRedeemed)
  const expired = vouchers.filter(v => !v.isRedeemed && new Date(v.expiresAt) <= new Date())

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Gift Vouchers</h1>
          <p className="text-sm text-[#717171] mt-1">
            {active.length} active · {redeemed.length} redeemed · {expired.length} expired
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A1A1A] text-white text-sm font-semibold hover:bg-[#333] transition-colors"
        >
          <Plus className="h-4 w-4" /> Create Voucher
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 rounded-2xl border border-[#e8e1de] bg-white p-6">
          <h2 className="font-semibold text-[#1A1A1A] mb-4">New Gift Voucher</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#717171] mb-1">Amount (AUD) *</label>
              <input
                type="number"
                min="1"
                max="500"
                step="0.01"
                required
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="e.g. 50"
                className="w-full px-3 py-2 text-sm border border-[#e8e1de] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#E96B56]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#717171] mb-1">Expires in (days)</label>
              <input
                type="number"
                min="1"
                max="730"
                value={form.expiryDays}
                onChange={e => setForm(f => ({ ...f, expiryDays: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-[#e8e1de] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#E96B56]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#717171] mb-1">Custom code (optional)</label>
              <input
                type="text"
                maxLength={20}
                value={form.customCode}
                onChange={e => setForm(f => ({ ...f, customCode: e.target.value.toUpperCase() }))}
                placeholder="Auto-generated if blank"
                className="w-full px-3 py-2 text-sm border border-[#e8e1de] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#E96B56] font-mono"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 rounded-xl bg-[#E96B56] hover:bg-[#a63a29] text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create Voucher'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-5 py-2 rounded-xl border border-[#e8e1de] text-sm font-medium text-[#717171] hover:border-[#1A1A1A] transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="rounded-2xl border border-[#e8e1de] bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#717171] text-sm">Loading…</div>
        ) : vouchers.length === 0 ? (
          <div className="p-12 text-center">
            <Tag className="mx-auto mb-3 h-8 w-8 text-[#e8e1de]" />
            <p className="text-sm text-[#717171]">No vouchers created yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#f9f2ef] border-b border-[#e8e1de]">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-[#1A1A1A]">Code</th>
                <th className="text-left px-4 py-3 font-semibold text-[#1A1A1A]">Amount</th>
                <th className="text-left px-4 py-3 font-semibold text-[#1A1A1A]">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-[#1A1A1A]">Expires</th>
                <th className="text-left px-4 py-3 font-semibold text-[#1A1A1A]">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3ece9]">
              {vouchers.map(v => {
                const isExpired = !v.isRedeemed && new Date(v.expiresAt) <= new Date()
                return (
                  <tr key={v.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-[#1A1A1A] bg-[#f3ece9] px-2 py-1 rounded-lg">
                          {v.code}
                        </span>
                        <button
                          onClick={() => copyCode(v.code)}
                          className="text-[#717171] hover:text-[#1A1A1A] transition-colors"
                        >
                          {copied === v.code
                            ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                            : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#1A1A1A]">
                      ${v.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      {v.isRedeemed ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#f3ece9] text-[#717171]">
                          <CheckCircle2 className="h-3 w-3" /> Redeemed
                        </span>
                      ) : isExpired ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-500">
                          <XCircle className="h-3 w-3" /> Expired
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#717171] text-xs">
                      {new Date(v.expiresAt).toLocaleDateString('en-AU')}
                    </td>
                    <td className="px-4 py-3 text-[#717171] text-xs">
                      {new Date(v.createdAt).toLocaleDateString('en-AU')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
