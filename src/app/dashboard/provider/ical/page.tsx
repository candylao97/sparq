'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Copy, Check, RefreshCw, Calendar, AlertTriangle } from 'lucide-react'

type IcalProfile = {
  id: string
  icalToken: string | null
  icalTokenExpiresAt: string | null
}

export default function ProviderIcalPage() {
  const { data: session } = useSession()
  const [profile, setProfile] = useState<IcalProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [confirmRegen, setConfirmRegen] = useState(false)

  const icalUrl =
    profile?.icalToken && typeof window !== 'undefined'
      ? `${window.location.origin}/api/providers/${session?.user?.id}/ical?token=${profile.icalToken}`
      : null

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard/provider/profile')
      if (res.ok) {
        const data = await res.json()
        setProfile({
          id: data.profile?.id ?? data.id ?? '',
          icalToken: data.profile?.icalToken ?? data.icalToken ?? null,
          icalTokenExpiresAt: data.profile?.icalTokenExpiresAt ?? data.icalTokenExpiresAt ?? null,
        })
      } else {
        // Fallback: try the providers/{id} endpoint
        if (session?.user?.id) {
          const r2 = await fetch(`/api/providers/${session.user.id}`)
          if (r2.ok) {
            const d2 = await r2.json()
            setProfile({
              id: d2.provider?.id ?? d2.id ?? '',
              icalToken: d2.provider?.icalToken ?? d2.icalToken ?? null,
              icalTokenExpiresAt: d2.provider?.icalTokenExpiresAt ?? d2.icalTokenExpiresAt ?? null,
            })
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (session?.user?.id) fetchProfile()
  }, [session?.user?.id, fetchProfile])

  async function handleCopy() {
    if (!icalUrl) return
    try {
      await navigator.clipboard.writeText(icalUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select input text
    }
  }

  async function handleRegenerate() {
    if (!session?.user?.id) return
    setRegenerating(true)
    setConfirmRegen(false)
    try {
      const res = await fetch(`/api/providers/${session.user.id}/ical/regenerate`, {
        method: 'POST',
      })
      if (res.ok) {
        await fetchProfile()
      }
    } catch {
      // ignore
    } finally {
      setRegenerating(false)
    }
  }

  const expiresAt = profile?.icalTokenExpiresAt
    ? new Date(profile.icalTokenExpiresAt)
    : null
  const isExpired = expiresAt ? expiresAt < new Date() : false
  const expiresLabel = expiresAt
    ? isExpired
      ? 'Expired'
      : `Expires ${expiresAt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : null

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-[#f3ece9] flex items-center justify-center">
            <Calendar className="h-4 w-4 text-[#E96B56]" />
          </div>
          <h1 className="font-headline text-2xl text-[#1A1A1A]">Calendar sync</h1>
        </div>
        <p className="text-sm text-[#717171]">
          Subscribe to your booking calendar in any calendar app.
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[#f0ebe7] bg-white p-8 flex justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[#E96B56] border-t-transparent" />
        </div>
      ) : (
        <div className="rounded-2xl border border-[#f0ebe7] bg-white overflow-hidden">
          <div className="p-6">
            <h2 className="text-base font-semibold text-[#1A1A1A] mb-1">Your iCal feed URL</h2>
            <p className="text-sm text-[#717171] mb-4">
              Paste this link into Google Calendar, Apple Calendar, Outlook, or any app that supports iCal subscriptions. Your confirmed bookings will stay in sync.
            </p>

            {icalUrl ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    readOnly
                    value={icalUrl}
                    className="flex-1 rounded-xl border border-[#e8e1de] bg-[#f9f2ef] px-3 py-2.5 text-xs text-[#1A1A1A] font-mono focus:outline-none cursor-text select-all"
                    onFocus={e => e.target.select()}
                  />
                  <button
                    onClick={handleCopy}
                    className={`flex-shrink-0 flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                      copied
                        ? 'bg-green-500 text-white'
                        : 'bg-[#1A1A1A] hover:bg-[#333] text-white'
                    }`}
                  >
                    {copied ? (
                      <><Check className="h-3.5 w-3.5" /> Copied</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5" /> Copy</>
                    )}
                  </button>
                </div>

                {expiresLabel && (
                  <p className={`text-xs mb-4 ${isExpired ? 'text-red-500 font-medium' : 'text-[#717171]'}`}>
                    {isExpired && '⚠ '}Token {expiresLabel.toLowerCase()}
                  </p>
                )}
              </>
            ) : (
              <div className="rounded-xl bg-[#f9f2ef] border border-[#f0ebe7] px-4 py-3 mb-4 text-sm text-[#717171]">
                No iCal token generated yet. Use the button below to create one.
              </div>
            )}

            {/* Regenerate section */}
            {!confirmRegen ? (
              <button
                onClick={() => setConfirmRegen(true)}
                disabled={regenerating}
                className="flex items-center gap-2 text-sm text-[#717171] hover:text-[#1A1A1A] transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? 'animate-spin' : ''}`} />
                {icalUrl ? 'Regenerate token' : 'Generate token'}
              </button>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mt-2">
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    This will invalidate your current iCal link. Any apps subscribed to it will stop updating until you re-add the new URL.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 transition-colors"
                  >
                    {regenerating ? (
                      <><RefreshCw className="h-3 w-3 animate-spin" /> Regenerating…</>
                    ) : (
                      'Yes, regenerate'
                    )}
                  </button>
                  <button
                    onClick={() => setConfirmRegen(false)}
                    className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-[#f0ebe7] bg-[#f9f2ef]/50 px-6 py-4">
            <p className="text-xs text-[#717171] leading-relaxed">
              <strong className="text-[#1A1A1A]">How to subscribe:</strong> In Google Calendar, go to &quot;Other calendars&quot; → &quot;From URL&quot; and paste the link above. In Apple Calendar, go to File → New Calendar Subscription.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
