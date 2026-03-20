'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Wand2, Sparkles, Eye, Clock, DollarSign, MapPin, Users,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency, getLocationLabel } from '@/lib/utils'
import toast from 'react-hot-toast'

interface ServiceItem {
  id: string
  title: string
  category: string
  description: string | null
  price: number
  duration: number
  locationTypes: string
  maxGuests: number | null
  isActive: boolean
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  NAILS: Sparkles,
  LASHES: Eye,
}

const CATEGORY_OPTIONS = [
  { value: 'NAILS', label: 'Nails' },
  { value: 'LASHES', label: 'Lashes' },
]

const LOCATION_OPTIONS = [
  { value: 'BOTH', label: 'Home & studio' },
  { value: 'AT_HOME', label: 'Comes to you' },
  { value: 'STUDIO', label: 'At a studio' },
]

const SUGGESTIONS = [
  'I do gel manicures at my studio for $80, takes 90 minutes',
  'I teach beginner guitar lessons at students\' homes, $70 for an hour',
  'Group yoga sessions for up to 6 people, $30 per person, 60 mins at my studio',
  'Conversational Spanish coaching online or at home, $55 for 45 minutes',
]

export default function ServicesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [services, setServices] = useState<ServiceItem[]>([])
  const [loadingServices, setLoadingServices] = useState(true)

  const [formData, setFormData] = useState({
    title: '',
    category: 'NAILS',
    description: '',
    price: '',
    duration: '',
    locationTypes: 'BOTH',
    maxGuests: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && session?.user?.role === 'CUSTOMER') router.push('/dashboard/customer')
  }, [status, session, router])

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch('/api/services')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch')
      setServices(data.services || [])
    } catch (err) {
      console.error('fetchServices error:', err)
    } finally {
      setLoadingServices(false)
    }
  }, [])

  useEffect(() => {
    if (session) fetchServices()
  }, [session, fetchServices])

  const updateField = (field: keyof typeof formData, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }))

  const handleGenerate = async () => {
    if (!prompt.trim()) { toast.error('Describe your service first'); return }
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/generate-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: prompt }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFormData({
        title: data.title || '',
        category: data.category || 'NAILS',
        description: data.description || '',
        price: String(data.price || ''),
        duration: String(data.duration || ''),
        locationTypes: data.locationTypes || 'BOTH',
        maxGuests: data.maxGuests ? String(data.maxGuests) : '',
      })
      toast.success('Service details generated!')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Generation failed'
      toast.error(message)
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!formData.title || !formData.price || !formData.duration) {
      toast.error('Title, price, and duration are required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          category: formData.category,
          description: formData.description,
          price: Number(formData.price),
          duration: Number(formData.duration),
          locationTypes: formData.locationTypes,
          maxGuests: formData.maxGuests ? Number(formData.maxGuests) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Service created! ✓')
      setFormData({ title: '', category: 'NAILS', description: '', price: '', duration: '', locationTypes: 'BOTH', maxGuests: '' })
      setPrompt('')
      await fetchServices()
      // Scroll to services section so user can see the new service
      setTimeout(() => {
        document.getElementById('services-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create service'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#FDFBF7_100%)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E96B56] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#FDFBF7_100%)]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/provider"
            className="mb-4 inline-flex items-center gap-1 text-body-compact text-[#717171] transition-colors hover:text-[#1A1A1A]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-[#1A1A1A]">Create a Service</h1>
          <p className="mt-1 text-body-compact text-[#717171]">
            Describe what you offer and let AI build your listing, or fill in the details manually.
          </p>
        </div>

        {/* Two-panel layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Left Panel — AI Prompt */}
          <div className="rounded-2xl bg-white p-6 shadow-[0_1px_4px_rgba(26,31,54,0.07)]">
            <div className="mb-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-[#1A1A1A]">
                <Wand2 className="h-5 w-5 text-[#E96B56]" />
                Describe your service
              </h2>
              <p className="mt-1 text-xs text-[#717171]">
                Write in plain English. AI will fill the form for you.
              </p>
            </div>

            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="e.g. I offer gel manicures at my studio in Bondi for $80, takes about 90 minutes"
              rows={5}
              className="mb-3 w-full resize-none rounded-xl border border-[#e8e1de] bg-white px-4 py-3 text-sm text-[#1A1A1A] placeholder-[#717171] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#E96B56]"
            />

            <Button
              variant="primary"
              onClick={handleGenerate}
              loading={generating}
              fullWidth
            >
              <Wand2 className="mr-1.5 h-4 w-4" />
              Generate with AI
            </Button>

            {/* Suggestion chips */}
            <div className="mt-4">
              <p className="mb-2 text-label font-medium uppercase tracking-wider text-[#717171]">Try an example</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => setPrompt(s)}
                    className="rounded-lg border border-[#e8e1de] bg-[#f9f2ef] px-3 py-1.5 text-label text-[#717171] transition-colors hover:border-[#E96B56] hover:text-[#E96B56]"
                  >
                    {s.length > 50 ? s.slice(0, 50) + '...' : s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel — Editable Form */}
          <div className="rounded-2xl bg-white p-6 shadow-[0_1px_4px_rgba(26,31,54,0.07)]">
            <h2 className="mb-4 text-lg font-bold text-[#1A1A1A]">Service Details</h2>

            <div className="space-y-4">
              <Input
                label="Title"
                placeholder="e.g. Gel Manicure"
                value={formData.title}
                onChange={e => updateField('title', e.target.value)}
              />

              <Select
                label="Category"
                options={CATEGORY_OPTIONS}
                value={formData.category}
                onChange={e => updateField('category', e.target.value)}
              />

              <Textarea
                label="Description"
                placeholder="What makes your service special?"
                value={formData.description}
                onChange={e => updateField('description', e.target.value)}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Price (AUD)"
                  type="number"
                  min="1"
                  placeholder="80"
                  value={formData.price}
                  onChange={e => updateField('price', e.target.value)}
                />
                <Input
                  label="Duration (mins)"
                  type="number"
                  min="15"
                  step="15"
                  placeholder="60"
                  value={formData.duration}
                  onChange={e => updateField('duration', e.target.value)}
                />
              </div>

              <Select
                label="Location"
                options={LOCATION_OPTIONS}
                value={formData.locationTypes}
                onChange={e => updateField('locationTypes', e.target.value)}
              />

              <Input
                label="Max Guests (optional)"
                type="number"
                min="1"
                placeholder="Leave empty for 1-on-1 sessions"
                value={formData.maxGuests}
                onChange={e => updateField('maxGuests', e.target.value)}
              />

              <Button
                variant="primary"
                onClick={handleSave}
                loading={saving}
                fullWidth
              >
                Create Service
              </Button>
            </div>
          </div>
        </div>

        {/* Existing Services */}
        <div id="services-list" className="mt-8 rounded-2xl bg-white p-6 shadow-[0_1px_4px_rgba(26,31,54,0.07)]">
          <h2 className="mb-4 text-lg font-bold text-[#1A1A1A]">Your Services</h2>

          {loadingServices ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : services.length > 0 ? (
            <div className="space-y-3">
              {services.map((service) => {
                const Icon = CATEGORY_ICONS[service.category] || Sparkles
                return (
                  <div
                    key={service.id}
                    className="flex items-center gap-4 rounded-xl bg-[#f9f2ef] p-4"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                      <Icon className="h-5 w-5 text-[#E96B56]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#1A1A1A]">{service.title}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#717171]">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {formatCurrency(service.price)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {service.duration} mins
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {getLocationLabel(service.locationTypes)}
                        </span>
                        {service.maxGuests && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Up to {service.maxGuests}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-label font-semibold ${
                      service.isActive
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-[#f3ece9] text-[#717171]'
                    }`}>
                      {service.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Wand2 className="mx-auto mb-2 h-8 w-8 text-[#e8e1de]" />
              <p className="text-body-compact text-[#717171]">No services yet. Create your first one above!</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
