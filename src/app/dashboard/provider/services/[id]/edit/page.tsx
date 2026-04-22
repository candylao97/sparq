'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { ArrowLeft, Minus, Plus } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

type ServiceCategory =
  | 'NAILS'
  | 'LASHES'
  | 'HAIR'
  | 'MAKEUP'
  | 'BROWS'
  | 'WAXING'
  | 'MASSAGE'
  | 'FACIALS'
  | 'OTHER'

type LocationType = 'AT_HOME' | 'STUDIO' | 'BOTH'

interface FormState {
  title: string
  category: ServiceCategory
  price: string
  duration: string
  locationTypes: LocationType
  description: string
  maxGuests: string
  instantBook: boolean
  isActive: boolean
}

interface ServiceData {
  id: string
  title: string
  category: ServiceCategory
  price: number
  duration: number
  locationTypes: LocationType
  description: string | null
  maxGuests: number | null
  instantBook: boolean
  isActive: boolean
}

// ── Constants ────────────────────────────────────────────────────────────────

const DURATION_PRESETS = [30, 45, 60, 75, 90, 120]

const CATEGORIES: { value: ServiceCategory; label: string; emoji: string }[] = [
  { value: 'NAILS',   label: 'Nails',    emoji: '💅' },
  { value: 'LASHES',  label: 'Lashes',   emoji: '👁️' },
  { value: 'HAIR',    label: 'Hair',     emoji: '💇' },
  { value: 'MAKEUP',  label: 'Makeup',   emoji: '💄' },
  { value: 'BROWS',   label: 'Brows',    emoji: '✨' },
  { value: 'WAXING',  label: 'Waxing',   emoji: '🌿' },
  { value: 'MASSAGE', label: 'Massage',  emoji: '🤲' },
  { value: 'FACIALS', label: 'Facials',  emoji: '🧖' },
  { value: 'OTHER',   label: 'Other',    emoji: '🌟' },
]

const LOCATION_OPTIONS: { value: LocationType; emoji: string; title: string; subtitle: string }[] = [
  { value: 'AT_HOME', emoji: '🏠', title: 'I travel to the client', subtitle: 'You go to them' },
  { value: 'STUDIO',  emoji: '🏢', title: 'Clients come to me',     subtitle: 'At your studio or workspace' },
  { value: 'BOTH',    emoji: '↔️', title: 'Both options',           subtitle: 'Maximum flexibility' },
]

function formatDuration(minutes: number): string {
  if (minutes === 120) return '2 hrs'
  return `${minutes} min`
}

// ── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-8 lg:px-12 xl:px-20">
        <div className="mb-8 h-5 w-32 animate-pulse rounded-lg bg-[#f0e8e4]" />
        <div className="mx-auto max-w-2xl space-y-6 rounded-2xl border border-[#e8e1de] bg-white p-8">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-[#f0e8e4]" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 w-full animate-pulse rounded-xl bg-[#f9f2ef]" />
            ))}
          </div>
          <div className="h-32 w-full animate-pulse rounded-xl bg-[#f9f2ef]" />
          <div className="h-12 w-full animate-pulse rounded-xl bg-[#f0e8e4]" />
        </div>
      </div>
    </div>
  )
}

// ── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({
  enabled,
  onToggle,
  label,
  subtitle,
}: {
  enabled: boolean
  onToggle: () => void
  label: string
  subtitle?: string
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="font-jakarta text-sm font-semibold text-[#1A1A1A]">{label}</p>
        {subtitle && (
          <p className="font-jakarta text-xs text-[#717171]">{subtitle}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-label={label}
        className={[
          'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors',
          enabled ? 'bg-[#E96B56]' : 'bg-[#e8e1de]',
        ].join(' ')}
      >
        <span
          className={[
            'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
            enabled ? 'translate-x-6' : 'translate-x-1',
          ].join(' ')}
        />
      </button>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function EditServicePage() {
  const router = useRouter()
  const params = useParams()
  const serviceId = params.id as string
  const { status } = useSession()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [isGroupService, setIsGroupService] = useState(false)
  const [useCustomDuration, setUseCustomDuration] = useState(false)
  const [customDuration, setCustomDuration] = useState('')

  const [form, setForm] = useState<FormState>({
    title: '',
    category: 'NAILS',
    price: '',
    duration: '60',
    locationTypes: 'STUDIO',
    description: '',
    maxGuests: '1',
    instantBook: false,
    isActive: true,
  })

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  // Load existing service data
  useEffect(() => {
    if (status !== 'authenticated') return

    setLoading(true)
    fetch(`/api/services/${serviceId}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error((err as { error?: string }).error ?? 'Failed to load service')
        }
        return res.json()
      })
      .then(({ service }: { service: ServiceData }) => {
        const guests = service.maxGuests ?? 1
        const isGroup = guests > 1

        // Check if duration is a preset
        const durationStr = String(service.duration)
        const isPreset = DURATION_PRESETS.includes(service.duration)

        setIsGroupService(isGroup)
        setUseCustomDuration(!isPreset)
        if (!isPreset) setCustomDuration(durationStr)

        setForm({
          title: service.title,
          category: service.category,
          price: String(service.price),
          duration: isPreset ? durationStr : '60',
          locationTypes: service.locationTypes,
          description: service.description ?? '',
          maxGuests: String(guests),
          instantBook: service.instantBook,
          isActive: service.isActive,
        })
        setLoading(false)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Could not load service.')
        setLoading(false)
      })
  }, [serviceId, status])

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  if (status === 'loading' || loading) return <LoadingSkeleton />

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4">
        <div className="mx-auto max-w-md text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fdf6f4]">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="font-headline text-xl font-bold text-[#1A1A1A]">
            Service not found
          </h2>
          <p className="font-jakarta text-sm text-[#717171]">{error}</p>
          <button
            type="button"
            onClick={() => router.push('/dashboard/provider/services')}
            className="inline-flex items-center gap-2 rounded-xl bg-[#E96B56] px-6 py-3 font-jakarta text-sm font-semibold text-white hover:bg-[#d45a45] transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Services
          </button>
        </div>
      </div>
    )
  }

  function activeDuration(): number {
    if (useCustomDuration) return parseInt(customDuration, 10) || 0
    return parseInt(form.duration, 10) || 0
  }

  function validate(): boolean {
    if (form.title.trim().length < 3) {
      toast.error('Service title must be at least 3 characters.')
      return false
    }
    const p = parseFloat(form.price)
    if (!p || p < 5) {
      toast.error('Price must be at least $5.')
      return false
    }
    if (p > 2000) {
      toast.error('Price cannot exceed $2,000.')
      return false
    }
    const d = activeDuration()
    if (!d || d <= 0) {
      toast.error('Please select or enter a duration.')
      return false
    }
    return true
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)

    try {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        price: parseFloat(form.price),
        duration: activeDuration(),
        locationTypes: form.locationTypes,
        description: form.description.trim() || null,
        maxGuests: isGroupService ? parseInt(form.maxGuests, 10) : 1,
        instantBook: form.instantBook,
        isActive: form.isActive,
      }

      const res = await fetch(`/api/services/${serviceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? 'Failed to save')
      }

      toast.success('Service updated.')
      router.push('/dashboard/provider/services')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-8 lg:px-12 xl:px-20">

        {/* Top bar */}
        <button
          type="button"
          onClick={() => router.push('/dashboard/provider/services')}
          className="mb-8 flex items-center gap-1.5 font-jakarta text-sm text-[#717171] hover:text-[#1A1A1A] transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Services
        </button>

        {/* Main card */}
        <div className="mx-auto max-w-2xl rounded-2xl border border-[#e8e1de] bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)]">

          {/* Heading */}
          <div className="mb-8">
            <h1 className="font-headline text-3xl font-bold text-[#1A1A1A] sm:text-4xl">
              Edit service
            </h1>
            <p className="mt-2 font-jakarta text-[#717171]">
              Update your service details. Changes are visible to clients immediately.
            </p>
          </div>

          <div className="space-y-8">

            {/* ── Title ── */}
            <div>
              <label
                htmlFor="service-title"
                className="block font-jakarta text-sm font-semibold text-[#1A1A1A] mb-2"
              >
                Service title
              </label>
              <input
                id="service-title"
                type="text"
                maxLength={100}
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                placeholder="e.g. Classic Gel Manicure"
                className="w-full h-14 rounded-xl border border-[#e8e1de] bg-white px-4 font-jakarta text-base text-[#1A1A1A] placeholder-[#717171] outline-none focus:border-[#E96B56] focus:ring-2 focus:ring-[#E96B56]/10 transition-all"
              />
              <p className="mt-1 text-right font-jakarta text-xs text-[#717171]">
                {form.title.length} / 100
              </p>
            </div>

            {/* ── Category ── */}
            <div>
              <label
                htmlFor="service-category"
                className="block font-jakarta text-sm font-semibold text-[#1A1A1A] mb-2"
              >
                Category
              </label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {CATEGORIES.map((cat) => {
                  const selected = form.category === cat.value
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setField('category', cat.value)}
                      className={[
                        'flex flex-col items-center gap-1.5 rounded-xl py-3 px-2 transition-all',
                        selected
                          ? 'border-2 border-[#E96B56] bg-[#fdf6f4]'
                          : 'border border-[#e8e1de] bg-white hover:border-[#E96B56]',
                      ].join(' ')}
                    >
                      <span className="text-xl">{cat.emoji}</span>
                      <span className="font-jakarta text-xs font-semibold text-[#1A1A1A]">
                        {cat.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="border-t border-[#f0e8e4]" />

            {/* ── Price ── */}
            <div>
              <label
                htmlFor="service-price"
                className="block font-jakarta text-sm font-semibold text-[#1A1A1A] mb-2"
              >
                Price (AUD)
              </label>
              <div className="flex items-center gap-2">
                <span className="font-jakarta text-lg font-semibold text-[#717171]">$</span>
                <input
                  id="service-price"
                  type="number"
                  min={5}
                  max={2000}
                  step={5}
                  value={form.price}
                  onChange={(e) => setField('price', e.target.value)}
                  placeholder="0"
                  className="w-36 h-14 rounded-xl border border-[#e8e1de] bg-white px-4 font-jakarta text-base text-[#1A1A1A] outline-none focus:border-[#E96B56] focus:ring-2 focus:ring-[#E96B56]/10 transition-all"
                />
                <span className="font-jakarta text-sm text-[#717171]">per session</span>
              </div>
            </div>

            {/* ── Duration ── */}
            <div>
              <label className="block font-jakarta text-sm font-semibold text-[#1A1A1A] mb-3">
                Duration
              </label>
              <div className="flex flex-wrap gap-2">
                {DURATION_PRESETS.map((mins) => {
                  const selected = !useCustomDuration && form.duration === String(mins)
                  return (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => {
                        setUseCustomDuration(false)
                        setField('duration', String(mins))
                      }}
                      className={[
                        'rounded-xl px-4 py-2 font-jakarta text-sm font-semibold transition-all',
                        selected
                          ? 'bg-[#E96B56] text-white'
                          : 'border border-[#e8e1de] bg-white text-[#1A1A1A] hover:border-[#E96B56]',
                      ].join(' ')}
                    >
                      {formatDuration(mins)}
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={() => setUseCustomDuration(true)}
                  className={[
                    'rounded-xl px-4 py-2 font-jakarta text-sm font-semibold transition-all',
                    useCustomDuration
                      ? 'bg-[#E96B56] text-white'
                      : 'border border-[#e8e1de] bg-white text-[#1A1A1A] hover:border-[#E96B56]',
                  ].join(' ')}
                >
                  Custom
                </button>
              </div>

              {useCustomDuration && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={480}
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                    placeholder="e.g. 105"
                    className="w-28 h-11 rounded-xl border border-[#e8e1de] bg-white px-3 font-jakarta text-sm text-[#1A1A1A] outline-none focus:border-[#E96B56] transition-all"
                  />
                  <span className="font-jakarta text-sm text-[#717171]">minutes</span>
                </div>
              )}
            </div>

            {/* ── Location ── */}
            <div>
              <label className="block font-jakarta text-sm font-semibold text-[#1A1A1A] mb-3">
                Location type
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {LOCATION_OPTIONS.map((opt) => {
                  const selected = form.locationTypes === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setField('locationTypes', opt.value)}
                      className={[
                        'flex flex-col items-center gap-2 rounded-2xl py-6 px-4 text-center transition-all',
                        selected
                          ? 'border-2 border-[#E96B56] bg-[#fdf6f4]'
                          : 'border border-[#e8e1de] bg-white hover:border-[#E96B56]',
                      ].join(' ')}
                    >
                      <span className="text-3xl">{opt.emoji}</span>
                      <div>
                        <p className="font-jakarta text-sm font-bold text-[#1A1A1A]">{opt.title}</p>
                        <p className="mt-0.5 font-jakarta text-xs text-[#717171]">{opt.subtitle}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="border-t border-[#f0e8e4]" />

            {/* ── Description ── */}
            <div>
              <label
                htmlFor="service-description"
                className="block font-jakarta text-sm font-semibold text-[#1A1A1A] mb-2"
              >
                Description
              </label>
              <textarea
                id="service-description"
                rows={5}
                maxLength={800}
                value={form.description}
                onChange={(e) => setField('description', e.target.value.slice(0, 800))}
                placeholder="Describe what clients can expect — products used, steps covered, and the results they'll love."
                className="w-full resize-none rounded-xl border border-[#e8e1de] bg-white px-4 py-3 font-jakarta text-sm text-[#1A1A1A] placeholder-[#717171] outline-none focus:border-[#E96B56] focus:ring-2 focus:ring-[#E96B56]/10 transition-all"
              />
              <p className="mt-1 text-right font-jakarta text-xs text-[#717171]">
                {form.description.length} / 800
              </p>
            </div>

            {/* ── Divider ── */}
            <div className="border-t border-[#f0e8e4]" />

            {/* ── Group service ── */}
            <div>
              <Toggle
                enabled={isGroupService}
                onToggle={() => setIsGroupService((v) => !v)}
                label="Group service"
                subtitle="Multiple clients per appointment"
              />

              {isGroupService && (
                <div className="mt-3 flex items-center gap-4 pl-1">
                  <span className="font-jakarta text-sm text-[#717171]">Max guests</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setField(
                          'maxGuests',
                          String(Math.max(2, parseInt(form.maxGuests, 10) - 1))
                        )
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e8e1de] bg-white text-[#1A1A1A] hover:bg-[#f9f2ef] transition-all"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center font-jakarta text-base font-semibold text-[#1A1A1A]">
                      {form.maxGuests}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setField(
                          'maxGuests',
                          String(Math.min(8, parseInt(form.maxGuests, 10) + 1))
                        )
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e8e1de] bg-white text-[#1A1A1A] hover:bg-[#f9f2ef] transition-all"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Instant book ── */}
            <div className="border-t border-[#f0e8e4] pt-4">
              <Toggle
                enabled={form.instantBook}
                onToggle={() => setField('instantBook', !form.instantBook)}
                label="Use instant booking for this service"
                subtitle="Clients can book without waiting for your approval"
              />
            </div>

            {/* ── Active status ── */}
            <div className="border-t border-[#f0e8e4] pt-1">
              <Toggle
                enabled={form.isActive}
                onToggle={() => setField('isActive', !form.isActive)}
                label={form.isActive ? 'Service is active' : 'Service is inactive'}
                subtitle={
                  form.isActive
                    ? 'Visible to clients and open for booking'
                    : 'Hidden from search — clients cannot book this service'
                }
              />
            </div>

            {/* ── Save button ── */}
            <div className="pt-2 flex flex-col gap-3 sm:flex-row-reverse">
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="flex-1 rounded-xl bg-[#E96B56] px-6 py-3 font-jakarta text-sm font-semibold text-white hover:bg-[#d45a45] disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => router.push('/dashboard/provider/services')}
                className="flex-1 rounded-xl border border-[#e8e1de] bg-white px-6 py-3 font-jakarta text-sm font-semibold text-[#1A1A1A] hover:bg-[#f9f2ef] disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
