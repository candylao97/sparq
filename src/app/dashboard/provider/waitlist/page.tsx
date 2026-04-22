'use client'
import { useEffect, useState } from 'react'
import { Users, Bell, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface WaitlistEntry {
  id: string
  user: { name: string; image: string | null }
  serviceId: string | null
  createdAt: string
  notified: boolean
}

export default function WaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [notifying, setNotifying] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/waitlist?role=provider')
      .then(r => r.json())
      .then(d => setEntries(d.entries ?? []))
      .finally(() => setLoading(false))
  }, [])

  async function handleNotify(entryId: string) {
    setNotifying(entryId)
    await fetch(`/api/waitlist/${entryId}/notify`, { method: 'POST' })
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, notified: true } : e))
    setNotifying(null)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Users className="h-6 w-6 text-[#E96B56]" />
        <h1 className="font-headline text-2xl text-[#1A1A1A]">Waitlist</h1>
        <span className="ml-auto bg-[#f3ece9] text-[#E96B56] text-sm font-semibold px-3 py-1 rounded-full">
          {entries.filter(e => !e.notified).length} waiting
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-[#f3ece9] rounded-xl animate-pulse" />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-[#717171]">
          <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No one on your waitlist yet</p>
          <p className="text-sm mt-1">Clients join when you&apos;re fully booked</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <div key={entry.id} className="flex items-center gap-4 bg-white border border-[#e8e1de] rounded-xl p-4">
              <div className="w-10 h-10 rounded-full bg-[#f3ece9] flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-[#E96B56]">
                  {entry.user.name?.charAt(0) ?? '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#1A1A1A] text-sm">{entry.user.name}</p>
                <p className="text-xs text-[#717171]">
                  {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                </p>
              </div>
              {entry.notified ? (
                <span className="text-xs text-[#717171] flex items-center gap-1">
                  <Bell className="h-3.5 w-3.5" /> Notified
                </span>
              ) : (
                <button
                  onClick={() => handleNotify(entry.id)}
                  disabled={notifying === entry.id}
                  className="text-xs font-semibold text-white bg-[#E96B56] hover:bg-[#a63a29] px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
                >
                  {notifying === entry.id ? 'Sending\u2026' : 'Notify'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
