'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import {
  Sparkles,
  Eye,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  Star,
  MapPin,
  Clock,
} from 'lucide-react'
import { getCommissionRate } from '@/lib/utils'

interface FormData {
  title: string
  category: 'NAILS' | 'LASHES'
  price: string
  duration: string
  maxGuests: string
  description: string
  locationTypes: 'AT_HOME' | 'STUDIO' | 'BOTH'
}

const DURATION_PRESETS = [30, 45, 60, 75, 90, 120]

function formatDuration(minutes: number): string {
  if (minutes === 120) return '2 hrs'
  return `${minutes} min`
}

function formatLocationLabel(loc: FormData['locationTypes']): string {
  if (loc === 'AT_HOME') return 'Travel to client'
  if (loc === 'STUDIO') return 'At studio'
  return 'Both options'
}

const STEP_LABELS = ['Basics', 'Pricing', 'Description', 'Location', 'Preview', 'Publish']

export default function CreateServicePage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({
    title: '',
    category: 'NAILS',
    price: '',
    duration: '60',
    maxGuests: '1',
    description: '',
    locationTypes: 'STUDIO',
  })

  const [isGroupService, setIsGroupService] = useState(false)
  const [customDuration, setCustomDuration] = useState('')
  const [useCustomDuration, setUseCustomDuration] = useState(false)
  const [tipsOpen, setTipsOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [instantBook, setInstantBook] = useState(false)

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FDFBF7]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E96B56] border-t-transparent" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/login')
    return null
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  function activeDuration(): number {
    if (useCustomDuration) return parseInt(customDuration, 10) || 0
    return parseInt(formData.duration, 10) || 0
  }

  // Earnings preview uses the flat commission rate. Actual commission at booking
  // time still resolves via getCommissionRateAsync against settings, which can be
  // overridden by admin.
  function earnings(): string {
    const p = parseFloat(formData.price)
    if (!p || p <= 0) return '0.00'
    const rate = getCommissionRate('NEWCOMER')
    return (p * (1 - rate)).toFixed(2)
  }

  function commissionPct(): number {
    return Math.round(getCommissionRate('NEWCOMER') * 100)
  }

  // ── validation ─────────────────────────────────────────────────────────────

  function validateStep(): boolean {
    if (step === 1) {
      if (formData.title.trim().length < 3) {
        toast.error('Service title must be at least 3 characters.')
        return false
      }
    }
    if (step === 2) {
      const p = parseFloat(formData.price)
      if (!p || p <= 0) {
        toast.error('Please enter a price greater than $0.')
        return false
      }
      const d = activeDuration()
      if (!d || d <= 0) {
        toast.error('Please select or enter a session duration.')
        return false
      }
    }
    return true
  }

  function handleContinue() {
    if (!validateStep()) return
    setStep((s) => Math.min(s + 1, 6))
  }

  function handleBack() {
    if (step === 1) {
      router.push('/dashboard/provider/services')
    } else {
      setStep((s) => Math.max(s - 1, 1))
    }
  }

  // ── AI generate ────────────────────────────────────────────────────────────

  async function handleAiGenerate() {
    if (!formData.title) {
      toast.error('Add a service title first so AI knows what to write.')
      return
    }
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/generate-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `${formData.title} - ${formData.category} service`,
        }),
      })
      if (!res.ok) throw new Error('AI request failed')
      const data = await res.json()
      if (data.description) {
        setField('description', data.description)
      }
    } catch {
      toast.error('AI generation failed. Please try again.')
    } finally {
      setAiLoading(false)
    }
  }

  // ── publish ────────────────────────────────────────────────────────────────

  async function handlePublish(isActive: boolean) {
    setPublishing(true)
    try {
      const durationValue = useCustomDuration
        ? parseInt(customDuration, 10)
        : parseInt(formData.duration, 10)

      const payload = {
        title: formData.title,
        category: formData.category,
        price: parseFloat(formData.price),
        duration: durationValue,
        maxGuests: isGroupService ? parseInt(formData.maxGuests, 10) : 1,
        description: formData.description,
        locationTypes: formData.locationTypes,
        isActive,
        instantBook,
      }

      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? 'Failed to publish')
      }

      // T&S-R3: Surface deduplication warning from API
      const resData = await res.json().catch(() => ({}))
      if ((resData as { warning?: string }).warning) {
        toast(String((resData as { warning?: string }).warning), { icon: '⚠️' })
      }

      if (isActive) {
        toast.success('Service published!')
      } else {
        toast.success('Service saved as draft.')
      }
      router.push('/dashboard/provider/services')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setPublishing(false)
    }
  }

  // ── progress bar ───────────────────────────────────────────────────────────

  function ProgressBar() {
    return (
      <div className="mb-8">
        <div className="flex gap-1.5">
          {STEP_LABELS.map((_, i) => {
            const idx = i + 1
            const isCompleted = idx < step
            const isCurrent = idx === step
            return (
              <div
                key={idx}
                className={[
                  'h-1.5 flex-1 rounded-full transition-all duration-300',
                  isCompleted
                    ? 'bg-[#E96B56]'
                    : isCurrent
                    ? 'bg-[#E96B56] opacity-60'
                    : 'bg-[#f0e8e4]',
                ].join(' ')}
              />
            )
          })}
        </div>
        <p className="mt-2 text-sm text-[#717171] font-jakarta">
          <span className="font-semibold text-[#1A1A1A]">{STEP_LABELS[step - 1]}</span>
          {' '}— Step {step} of 6
        </p>
      </div>
    )
  }

  // ── step 1 ─────────────────────────────────────────────────────────────────

  function Step1() {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-headline text-3xl font-bold text-[#1A1A1A] sm:text-4xl">
            What service are you offering?
          </h1>
          <p className="mt-2 font-jakarta text-[#717171]">
            Give your service a clear, descriptive name.
          </p>
        </div>

        <div>
          <label className="block font-jakarta text-sm font-semibold text-[#1A1A1A] mb-2">
            Service title
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setField('title', e.target.value)}
            placeholder="e.g. Classic Gel Manicure"
            className="w-full h-14 rounded-xl border border-[#e8e1de] bg-white px-4 font-jakarta text-base text-[#1A1A1A] placeholder-[#717171] outline-none focus:border-[#E96B56] focus:ring-2 focus:ring-[#E96B56]/10 transition-all"
          />
        </div>

        <div>
          <label className="block font-jakarta text-sm font-semibold text-[#1A1A1A] mb-3">
            Category
          </label>
          <div className="grid grid-cols-2 gap-4">
            {/* NAILS */}
            <button
              type="button"
              onClick={() => setField('category', 'NAILS')}
              className={[
                'flex flex-col items-center justify-center gap-3 rounded-2xl py-8 transition-all',
                formData.category === 'NAILS'
                  ? 'border-2 border-[#E96B56] bg-[#fdf6f4]'
                  : 'border border-[#e8e1de] bg-white hover:border-[#E96B56]',
              ].join(' ')}
            >
              <Sparkles
                size={32}
                className={formData.category === 'NAILS' ? 'text-[#E96B56]' : 'text-[#717171]'}
              />
              <span className="font-jakarta text-sm font-semibold text-[#1A1A1A]">
                Nails & Manicures
              </span>
            </button>

            {/* LASHES */}
            <button
              type="button"
              onClick={() => setField('category', 'LASHES')}
              className={[
                'flex flex-col items-center justify-center gap-3 rounded-2xl py-8 transition-all',
                formData.category === 'LASHES'
                  ? 'border-2 border-[#E96B56] bg-[#fdf6f4]'
                  : 'border border-[#e8e1de] bg-white hover:border-[#E96B56]',
              ].join(' ')}
            >
              <Eye
                size={32}
                className={formData.category === 'LASHES' ? 'text-[#E96B56]' : 'text-[#717171]'}
              />
              <span className="font-jakarta text-sm font-semibold text-[#1A1A1A]">
                Lashes & Brow
              </span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── step 2 ─────────────────────────────────────────────────────────────────

  function Step2() {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="font-headline text-3xl font-bold text-[#1A1A1A] sm:text-4xl">
            How much do you charge?
          </h2>
          <p className="mt-2 font-jakarta text-[#717171]">
            Set your rate — you can always update it later.
          </p>
        </div>

        {/* Price */}
        <div className="flex flex-col items-center">
          <div className="flex items-end gap-2 border-b-2 border-[#1A1A1A] pb-2 px-4">
            <span className="font-jakarta text-3xl font-bold text-[#1A1A1A]">$</span>
            <input
              type="number"
              min="0"
              value={formData.price}
              onChange={(e) => setField('price', e.target.value)}
              placeholder="0"
              className="w-36 bg-transparent font-jakarta text-5xl font-bold text-center text-[#1A1A1A] placeholder-[#e8e1de] outline-none"
            />
            <span className="font-jakarta text-xl font-medium text-[#717171] mb-1">AUD</span>
          </div>
          <span className="mt-3 font-jakarta text-sm text-[#717171]">per session</span>
        </div>

        {/* Duration */}
        <div>
          <label className="block font-jakarta text-sm font-semibold text-[#1A1A1A] mb-3">
            Session duration
          </label>
          <div className="flex flex-wrap gap-2">
            {DURATION_PRESETS.map((mins) => {
              const selected = !useCustomDuration && formData.duration === String(mins)
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
                min="1"
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value)}
                placeholder="e.g. 105"
                className="w-28 h-11 rounded-xl border border-[#e8e1de] px-3 font-jakarta text-sm text-[#1A1A1A] outline-none focus:border-[#E96B56] transition-all"
              />
              <span className="font-jakarta text-sm text-[#717171]">minutes</span>
            </div>
          )}
        </div>

        {/* Group service */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-jakarta text-sm font-semibold text-[#1A1A1A]">
                This is a group service
              </p>
              <p className="font-jakarta text-xs text-[#717171]">
                Multiple clients per appointment
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsGroupService((v) => !v)}
              className={[
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                isGroupService ? 'bg-[#E96B56]' : 'bg-[#e8e1de]',
              ].join(' ')}
            >
              <span
                className={[
                  'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                  isGroupService ? 'translate-x-6' : 'translate-x-1',
                ].join(' ')}
              />
            </button>
          </div>

          {isGroupService && (
            <div className="mt-4 flex items-center gap-4">
              <span className="font-jakarta text-sm text-[#717171]">Max guests</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setField(
                      'maxGuests',
                      String(Math.max(2, parseInt(formData.maxGuests, 10) - 1))
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e8e1de] bg-white text-[#1A1A1A] hover:bg-[#f9f2ef] transition-all"
                >
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center font-jakarta text-base font-semibold text-[#1A1A1A]">
                  {formData.maxGuests}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setField(
                      'maxGuests',
                      String(Math.min(20, parseInt(formData.maxGuests, 10) + 1))
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

        {/* Earnings preview */}
        <div className="rounded-2xl border border-[#f0e8e4] bg-[#fdf6f4] p-4">
          <p className="font-jakarta text-sm text-[#717171]">
            You earn approximately
          </p>
          <p className="font-headline text-2xl font-bold text-[#E96B56]">
            ${earnings()} per session
          </p>
          <p className="mt-1 font-jakarta text-xs text-[#717171]">
            After the {commissionPct()}% platform fee — you keep {100 - commissionPct()}%
          </p>
        </div>
      </div>
    )
  }

  // ── step 3 ─────────────────────────────────────────────────────────────────

  function Step3() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-headline text-3xl font-bold text-[#1A1A1A] sm:text-4xl">
            Describe your service
          </h2>
          <p className="mt-2 font-jakarta text-[#717171]">
            Tell clients what to expect. Great descriptions book more appointments.
          </p>
        </div>

        {/* Textarea */}
        <div className="relative">
          <textarea
            rows={6}
            value={formData.description}
            onChange={(e) => {
              const val = e.target.value.slice(0, 500)
              setField('description', val)
            }}
            placeholder="e.g. A relaxing gel manicure including nail prep, base coat, 2 colour coats, and top coat. Perfect for a long-lasting, chip-resistant finish..."
            className="w-full resize-none rounded-xl border border-[#e8e1de] bg-white px-4 py-3 font-jakarta text-sm text-[#1A1A1A] placeholder-[#717171] outline-none focus:border-[#E96B56] focus:ring-2 focus:ring-[#E96B56]/10 transition-all"
          />
          <div className="mt-1 flex items-center justify-between">
            <button
              type="button"
              onClick={handleAiGenerate}
              disabled={aiLoading}
              className="flex items-center gap-1.5 font-jakarta text-sm font-medium text-[#E96B56] underline underline-offset-2 hover:text-[#d45a45] disabled:opacity-50 transition-colors"
            >
              {aiLoading ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border border-[#E96B56] border-t-transparent" />
                  Writing…
                </span>
              ) : (
                <>
                  <Sparkles size={14} />
                  Write with AI
                </>
              )}
            </button>
            <span className="font-jakarta text-xs text-[#717171]">
              {formData.description.length} / 500
            </span>
          </div>
        </div>

        {/* Tips accordion */}
        <div className="rounded-xl border border-[#f0e8e4] bg-[#f9f2ef] overflow-hidden">
          <button
            type="button"
            onClick={() => setTipsOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 font-jakarta text-sm font-semibold text-[#1A1A1A]"
          >
            <span>💡 Tips for a great description</span>
            {tipsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {tipsOpen && (
            <ul className="border-t border-[#f0e8e4] px-4 py-3 space-y-2">
              <li className="font-jakarta text-sm text-[#717171] flex gap-2">
                <span className="text-[#E96B56] font-bold">1.</span>
                Mention what&apos;s included — products used, steps covered, and any extras.
              </li>
              <li className="font-jakarta text-sm text-[#717171] flex gap-2">
                <span className="text-[#E96B56] font-bold">2.</span>
                Describe the experience — is it relaxing, quick, transformative?
              </li>
              <li className="font-jakarta text-sm text-[#717171] flex gap-2">
                <span className="text-[#E96B56] font-bold">3.</span>
                End with a result — what will clients leave with or feel?
              </li>
            </ul>
          )}
        </div>
      </div>
    )
  }

  // ── step 4 ─────────────────────────────────────────────────────────────────

  const LOCATION_OPTIONS: {
    value: FormData['locationTypes']
    emoji: string
    title: string
    subtitle: string
    note: string
  }[] = [
    {
      value: 'AT_HOME',
      emoji: '🏠',
      title: 'I travel to the client',
      subtitle: 'You go to them',
      note: 'Add travel surcharges in your rates',
    },
    {
      value: 'STUDIO',
      emoji: '🏢',
      title: 'Clients come to me',
      subtitle: 'At your studio or workspace',
      note: 'Fixed location bookings',
    },
    {
      value: 'BOTH',
      emoji: '↔️',
      title: 'Both options',
      subtitle: 'Maximum flexibility, more bookings',
      note: '',
    },
  ]

  function Step4() {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="font-headline text-3xl font-bold text-[#1A1A1A] sm:text-4xl">
            Where do you offer this service?
          </h2>
          <p className="mt-2 font-jakarta text-[#717171]">
            Choose the location type that fits your setup.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {LOCATION_OPTIONS.map((opt) => {
            const selected = formData.locationTypes === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setField('locationTypes', opt.value)}
                className={[
                  'flex flex-col items-center justify-center gap-3 rounded-2xl py-8 px-4 text-center transition-all',
                  selected
                    ? 'border-2 border-[#E96B56] bg-[#fdf6f4]'
                    : 'border border-[#e8e1de] bg-white hover:border-[#E96B56]',
                ].join(' ')}
              >
                <span className="text-4xl">{opt.emoji}</span>
                <div>
                  <p className="font-jakarta text-sm font-bold text-[#1A1A1A]">{opt.title}</p>
                  <p className="mt-0.5 font-jakarta text-xs text-[#717171]">{opt.subtitle}</p>
                </div>
                {opt.note && (
                  <p className="font-jakarta text-xs text-[#717171] leading-snug">{opt.note}</p>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── step 5 ─────────────────────────────────────────────────────────────────

  function Step5() {
    const dur = activeDuration()
    const price = parseFloat(formData.price) || 0

    const checklist: { label: string; ok: boolean }[] = [
      { label: 'Service title', ok: formData.title.trim().length >= 3 },
      { label: 'Category', ok: !!formData.category },
      { label: 'Price', ok: price > 0 },
      { label: 'Duration', ok: dur > 0 },
      { label: 'Description', ok: formData.description.trim().length > 0 },
      { label: 'Location type', ok: !!formData.locationTypes },
    ]

    return (
      <div className="space-y-8">
        <div>
          <h2 className="font-headline text-3xl font-bold text-[#1A1A1A] sm:text-4xl">
            Here&apos;s how your service looks
          </h2>
          <p className="mt-2 font-jakarta text-[#717171]">
            This is what clients will see in search results.
          </p>
        </div>

        {/* Preview card */}
        <div className="rounded-2xl border border-[#f0e8e4] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] overflow-hidden max-w-sm">
          {/* Image placeholder */}
          <div className="relative h-48 bg-gradient-to-br from-[#f9f2ef] to-[#fce9e6] flex items-center justify-center">
            {formData.category === 'NAILS' ? (
              <Sparkles size={40} className="text-[#E96B56] opacity-50" />
            ) : (
              <Eye size={40} className="text-[#E96B56] opacity-50" />
            )}
            {/* Price badge */}
            <div className="absolute top-3 right-3 rounded-xl bg-white px-3 py-1 shadow-sm">
              <span className="font-jakarta text-sm font-bold text-[#1A1A1A]">
                ${price > 0 ? price.toFixed(0) : '--'}
              </span>
            </div>
          </div>

          {/* Card body */}
          <div className="p-4 space-y-2">
            <p className="font-jakarta text-xs text-[#717171]">
              {session?.user?.name ?? 'Your name'}
            </p>
            <p className="font-jakarta text-base font-bold text-[#1A1A1A] leading-snug">
              {formData.title || 'Your service title'}
            </p>

            <div className="flex items-center gap-1">
              <Star size={12} className="fill-[#717171] text-[#717171]" />
              <span className="font-jakarta text-xs text-[#717171]">New</span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <span className="flex items-center gap-1 rounded-full bg-[#f9f2ef] px-2.5 py-1 font-jakarta text-xs text-[#717171]">
                <MapPin size={10} />
                {formatLocationLabel(formData.locationTypes)}
              </span>
              {dur > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-[#f9f2ef] px-2.5 py-1 font-jakarta text-xs text-[#717171]">
                  <Clock size={10} />
                  {formatDuration(dur)}
                </span>
              )}
            </div>

            <button
              disabled
              className="mt-2 w-full rounded-xl bg-[#E96B56] py-2 font-jakarta text-sm font-semibold text-white opacity-40 cursor-not-allowed"
            >
              Book now
            </button>
          </div>
        </div>

        {/* Checklist */}
        <div className="rounded-2xl border border-[#f0e8e4] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)]">
          <p className="font-jakarta text-sm font-bold text-[#1A1A1A] mb-3">
            Your listing is ready
          </p>
          <ul className="space-y-2">
            {checklist.map((item) => (
              <li key={item.label} className="flex items-center gap-2">
                <span
                  className={[
                    'flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold',
                    item.ok
                      ? 'bg-[#E96B56] text-white'
                      : 'bg-[#f0e8e4] text-[#717171]',
                  ].join(' ')}
                >
                  {item.ok ? '✓' : '·'}
                </span>
                <span
                  className={[
                    'font-jakarta text-sm',
                    item.ok ? 'text-[#1A1A1A]' : 'text-[#717171]',
                  ].join(' ')}
                >
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  // ── step 6 ─────────────────────────────────────────────────────────────────

  function Step6() {
    const dur = activeDuration()

    const rows: { label: string; value: string }[] = [
      { label: 'Service', value: formData.title },
      { label: 'Category', value: formData.category === 'NAILS' ? 'Nails & Manicures' : 'Lashes & Brow' },
      { label: 'Price', value: `$${parseFloat(formData.price || '0').toFixed(2)} AUD` },
      { label: 'Duration', value: dur > 0 ? formatDuration(dur) : '—' },
      { label: 'Location', value: formatLocationLabel(formData.locationTypes) },
      {
        label: 'Group service',
        value: isGroupService ? `Yes (${formData.maxGuests} guests)` : 'No',
      },
    ]

    return (
      <div className="space-y-8">
        <div>
          <h2 className="font-headline text-3xl font-bold text-[#1A1A1A] sm:text-4xl">
            Ready to go live?
          </h2>
          <p className="mt-2 font-jakarta text-[#717171]">
            Review your service details before publishing.
          </p>
        </div>

        {/* Summary card */}
        <div className="rounded-2xl border border-[#f0e8e4] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#f0e8e4]">
            <p className="font-jakarta text-sm font-bold text-[#1A1A1A]">Service summary</p>
          </div>
          <div className="divide-y divide-[#f0e8e4]">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between px-6 py-3">
                <span className="font-jakarta text-sm text-[#717171]">{row.label}</span>
                <span className="font-jakarta text-sm font-semibold text-[#1A1A1A]">
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Instant Book toggle */}
        <div className="flex items-center justify-between py-3 border-t border-[#e8e1de]">
          <div>
            <p className="text-sm font-medium text-[#1A1A1A] font-jakarta">Instant Book</p>
            <p className="text-xs text-[#717171] font-jakarta">Clients can book without waiting for your approval</p>
          </div>
          <button
            type="button"
            onClick={() => setInstantBook(!instantBook)}
            aria-label="Toggle Instant Book"
            className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${instantBook ? 'bg-[#E96B56]' : 'bg-[#e8e1de]'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${instantBook ? 'translate-x-5' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* Publish buttons */}
        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <button
            type="button"
            disabled={publishing}
            onClick={() => handlePublish(true)}
            className="flex-1 rounded-xl bg-[#E96B56] px-6 py-3 font-jakarta text-sm font-semibold text-white hover:bg-[#d45a45] disabled:opacity-50 transition-colors"
          >
            {publishing ? 'Publishing…' : 'Publish Service'}
          </button>
          <button
            type="button"
            disabled={publishing}
            onClick={() => handlePublish(false)}
            className="flex-1 rounded-xl border border-[#e8e1de] bg-white px-6 py-3 font-jakarta text-sm font-semibold text-[#1A1A1A] hover:bg-[#f9f2ef] disabled:opacity-50 transition-colors"
          >
            Save as draft
          </button>
        </div>
      </div>
    )
  }

  // ── render ─────────────────────────────────────────────────────────────────

  const stepComponents: Record<number, JSX.Element> = {
    1: <Step1 />,
    2: <Step2 />,
    3: <Step3 />,
    4: <Step4 />,
    5: <Step5 />,
    6: <Step6 />,
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#FDFBF7_100%)]">
      <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-8 lg:px-12 xl:px-20">

        {/* Top bar */}
        <div className="mb-8 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/dashboard/provider/services')}
            className="flex items-center gap-1.5 font-jakarta text-sm text-[#717171] hover:text-[#1A1A1A] transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Services
          </button>
          <p className="font-jakarta text-sm text-[#717171]">
            <span className="font-semibold text-[#1A1A1A]">{STEP_LABELS[step - 1]}</span>
            {' · '}Step {step} of 6
          </p>
        </div>

        {/* Main card */}
        <div className="mx-auto max-w-2xl rounded-2xl border border-[#f0e8e4] bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)]">
          <ProgressBar />

          {stepComponents[step]}

          {/* Navigation */}
          <div className="mt-10 flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              className="rounded-xl border border-[#e8e1de] bg-white px-6 py-3 font-jakarta text-sm font-semibold text-[#1A1A1A] hover:bg-[#f9f2ef] transition-colors"
            >
              Back
            </button>

            {step < 6 && (
              <button
                type="button"
                onClick={handleContinue}
                className="rounded-xl bg-[#E96B56] px-6 py-3 font-jakarta text-sm font-semibold text-white hover:bg-[#d45a45] transition-colors"
              >
                Continue
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
