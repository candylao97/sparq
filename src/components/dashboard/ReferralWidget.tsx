'use client'
import { useState, useEffect } from 'react'
import { Users, Copy, Check } from 'lucide-react'

export function ReferralWidget() {
  const [link, setLink] = useState('')
  const [stats, setStats] = useState({ total: 0, completed: 0 })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/referrals')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setLink(d.referralLink); setStats({ total: d.total, completed: d.completed }) } })
      .catch(() => {})
  }, [])

  function handleCopy() {
    if (!link) return
    navigator.clipboard.writeText(link).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-2xl border border-[#e8e1de] bg-white p-5">
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-[#E96B56]" />
        <h3 className="font-semibold text-sm text-[#1A1A1A]">Refer an artist</h3>
      </div>
      <p className="text-xs text-[#717171] mb-3">Invite another artist to Sparq and earn rewards when they complete their first booking.</p>
      {link ? (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#f9f2ef]">
          <span className="flex-1 text-xs font-mono text-[#717171] truncate">{link}</span>
          <button onClick={handleCopy} className="flex-shrink-0 text-xs font-bold text-[#E96B56] hover:underline flex items-center gap-1">
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      ) : (
        <div className="h-8 animate-pulse rounded-xl bg-[#f9f2ef]" />
      )}
      {(stats.total > 0) && (
        <p className="mt-2 text-xs text-[#717171]">{stats.completed} of {stats.total} referrals completed</p>
      )}
    </div>
  )
}
