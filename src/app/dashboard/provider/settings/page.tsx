'use client'

/**
 * AUDIT-012 — Provider settings page: cancellation policy editor.
 *
 * API has accepted `cancellationPolicy` / `cancellationPolicyType` on
 * `PUT /api/profile` for a while, but there was no UI — artists couldn't
 * change their default MODERATE policy without an admin doing it for them.
 * This page is the UI layer on top of the existing API.
 *
 * Kept intentionally narrow. If we add more provider-wide preferences
 * (notifications, default service duration, etc.) they'd live on this
 * page next to the cancellation card.
 */

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Loader2, Check, AlertTriangle } from 'lucide-react'
import { describeCancellationPolicy, normaliseCancellationPolicyType, type CancellationPolicyType } from '@/lib/cancellation-policy'

const POLICY_OPTIONS: Array<{ value: CancellationPolicyType, name: string, oneLiner: string }> = [
  { value: 'FLEXIBLE', name: 'Flexible', oneLiner: 'Full refund up to 6 hours before.' },
  { value: 'MODERATE', name: 'Moderate', oneLiner: 'Full refund up to 24 hours before.' },
  { value: 'STRICT',   name: 'Strict',   oneLiner: 'Full refund only if cancelled 48+ hours before.' },
]

export default function ProviderSettingsPage() {
  const { data: session, status } = useSession()
  const [policyType, setPolicyType] = useState<CancellationPolicyType>('MODERATE')
  const [customText, setCustomText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const loadProfile = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch('/api/profile')
      if (!res.ok) throw new Error('Could not load your settings')
      const data = await res.json()
      const profile = data.providerProfile ?? data.provider ?? data
      setPolicyType(normaliseCancellationPolicyType(profile?.cancellationPolicyType))
      setCustomText(profile?.cancellationPolicy ?? '')
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') loadProfile()
  }, [status, loadProfile])

  const save = async () => {
    setSaving(true)
    setErr(null)
    setSaved(false)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerData: {
            cancellationPolicyType: policyType,
            // Empty string clears the custom override
            cancellationPolicy: customText.trim() || null,
          },
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Could not save your settings')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const preview = describeCancellationPolicy(policyType, customText)

  if (status === 'loading' || loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center text-sm text-[#717171]">
        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading your settings…
      </div>
    )
  }

  if (status !== 'authenticated' || !session) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center text-sm text-[#717171]">
        Please sign in to manage your settings.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1 className="font-headline text-3xl text-[#1A1A1A]">Settings</h1>
        <p className="mt-1 text-sm text-[#717171]">
          Policies that apply across all of your services.
        </p>
      </header>

      <section className="rounded-2xl border border-[#e8e1de] bg-white p-6">
        <h2 className="font-headline text-xl text-[#1A1A1A]">Cancellation policy</h2>
        <p className="mt-1 text-sm text-[#717171]">
          This controls how refunds are handled when a client cancels. It's shown on your public profile and at checkout.
        </p>

        <div role="radiogroup" aria-label="Cancellation policy type" className="mt-5 space-y-3">
          {POLICY_OPTIONS.map(opt => {
            const selected = policyType === opt.value
            return (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                  selected
                    ? 'border-[#E96B56] bg-[#FDFBF7]'
                    : 'border-[#e8e1de] hover:bg-[#FDFBF7]'
                }`}
              >
                <input
                  type="radio"
                  name="policyType"
                  value={opt.value}
                  checked={selected}
                  onChange={() => setPolicyType(opt.value)}
                  className="mt-1 h-4 w-4 accent-[#E96B56]"
                />
                <div>
                  <div className="font-medium text-[#1A1A1A]">{opt.name}</div>
                  <div className="text-sm text-[#717171]">{opt.oneLiner}</div>
                </div>
              </label>
            )
          })}
        </div>

        <div className="mt-6">
          <label htmlFor="custom-policy" className="mb-1 block text-sm font-medium text-[#1A1A1A]">
            Custom note (optional)
          </label>
          <textarea
            id="custom-policy"
            value={customText}
            onChange={e => setCustomText(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Anything clients should know, e.g. special rules for large-group bookings or travel fees."
            className="w-full resize-y rounded-lg border border-[#e8e1de] bg-white px-3 py-2 text-sm text-[#1A1A1A] focus:border-[#E96B56] focus:outline-none"
          />
          <p className="mt-1 text-xs text-[#717171]">
            Shown on your profile below the standard tiers. {customText.length}/2000
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-[#f9f2ef] p-4 text-sm">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[#717171]">Preview</div>
          <p className="text-[#1A1A1A]">{preview.headline}</p>
          <ul className="mt-3 space-y-1 text-xs text-[#717171]">
            {preview.tiers.map(t => (
              <li key={t.window}>• {t.window} — {t.refund}</li>
            ))}
          </ul>
          {preview.customText && (
            <div className="mt-3 border-t border-[#e8e1de] pt-3 text-xs italic text-[#1A1A1A]">
              {preview.customText}
            </div>
          )}
        </div>

        {err && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {err}
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#E96B56] px-4 py-2 text-sm font-medium text-white hover:bg-[#a63a29] disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1 text-sm text-green-700">
              <Check className="h-4 w-4" /> Saved
            </span>
          )}
        </div>
      </section>
    </div>
  )
}
