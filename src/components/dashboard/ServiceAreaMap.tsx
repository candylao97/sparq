'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Home, Building2, Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

const MapView = dynamic(() => import('./ServiceAreaMapView'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[340px] items-center justify-center rounded-xl border border-[#e8e1de] bg-[#f9f2ef]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#E96B56] border-t-transparent" />
        <span className="text-xs text-[#717171]">Loading map…</span>
      </div>
    </div>
  ),
})

interface ServiceAreaData {
  serviceRadius: number
  latitude: number | null
  longitude: number | null
  studioAddress: string | null
  suburb: string | null
  city: string
  offerAtHome: boolean
  offerAtStudio: boolean
}

interface Props {
  data: ServiceAreaData
  providerName: string
  onUpdate: () => void
}

// Quick-select radius presets
const RADIUS_PRESETS = [5, 10, 15, 25, 40]

export function ServiceAreaMap({ data, providerName, onUpdate }: Props) {
  const [radius, setRadius] = useState(data.serviceRadius || 10)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const handleRadiusChange = useCallback((newRadius: number) => {
    setRadius(newRadius)
    setDirty(true)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/dashboard/provider/service-area', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceRadius: radius }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Service radius updated!')
      setDirty(false)
      onUpdate()
    } catch {
      toast.error('Could not update service area')
    } finally {
      setSaving(false)
    }
  }

  const hasLocation = data.latitude != null && data.longitude != null

  // Build location string like "Richmond, Melbourne"
  const locationText = [data.suburb, data.city].filter(Boolean).join(', ')

  return (
    <div className="mb-6 overflow-hidden rounded-2xl bg-white shadow-[0_1px_4px_rgba(26,31,54,0.07)]">
      {/* Location header — matching reference "Melbourne, Victoria, 3000" style */}
      <div className="px-5 pb-3 pt-5">
        <p className="text-[15px] font-medium text-[#1A1A1A]">{locationText || 'Service Area'}</p>
      </div>

      {/* Map */}
      <div className="px-4">
        {hasLocation ? (
          <MapView
            latitude={data.latitude!}
            longitude={data.longitude!}
            radius={radius}
            studioAddress={data.studioAddress}
            providerName={providerName}
          />
        ) : (
          <div className="flex h-[240px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[#e8e1de] bg-[#f9f2ef]/50">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f3ece9]">
              <MapPin className="h-7 w-7 text-[#717171]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-[#717171]">No location set</p>
              <p className="mt-0.5 text-xs text-[#717171]">Add your address in profile settings to see the map</p>
            </div>
          </div>
        )}
      </div>

      {/* Service type badges + radius controls */}
      <div className="px-5 pb-5 pt-4">
        {/* Badges row */}
        <div className="flex items-center gap-2">
          {data.offerAtHome && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              <Home className="h-3 w-3" /> Comes to you
            </span>
          )}
          {data.offerAtStudio && (
            <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
              <Building2 className="h-3 w-3" /> At a studio
            </span>
          )}
          {data.studioAddress && data.offerAtStudio && (
            <span className="ml-1 text-xs text-[#717171]">{data.studioAddress}</span>
          )}
        </div>

        {/* Radius slider — only for mobile/at-home services */}
        {data.offerAtHome && (
          <div className="mt-4">
            {/* Slider header */}
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-medium text-[#1A1A1A]">Travel radius</label>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-[#E96B56]">{radius}</span>
                <span className="text-xs font-medium text-[#717171]">km</span>
              </div>
            </div>

            {/* Custom styled slider */}
            <input
              type="range"
              min={1}
              max={50}
              value={radius}
              onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
              className="service-radius-slider h-2 w-full cursor-pointer appearance-none rounded-full"
              style={{
                background: `linear-gradient(to right, #E96B56 0%, #E96B56 ${((radius - 1) / 49) * 100}%, #E5E7EB ${((radius - 1) / 49) * 100}%, #E5E7EB 100%)`,
              }}
            />

            {/* Range labels */}
            <div className="mt-1.5 flex justify-between text-[10px] font-medium text-[#717171]">
              <span>1 km</span>
              <span>25 km</span>
              <span>50 km</span>
            </div>

            {/* Quick-select presets */}
            <div className="mt-3 flex gap-2">
              {RADIUS_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleRadiusChange(preset)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                    radius === preset
                      ? 'bg-[#E96B56] text-white shadow-sm'
                      : 'bg-[#f3ece9] text-[#717171] hover:bg-[#e8e1de]'
                  }`}
                >
                  {preset} km
                </button>
              ))}
            </div>

            {/* Smart radius intelligence tip */}
            <div className={`mt-3 rounded-xl border px-3 py-2.5 text-xs ${
              radius < 8
                ? 'border-amber-100 bg-amber-50/60 text-amber-700'
                : radius > 30
                ? 'border-blue-100 bg-blue-50/40 text-blue-700'
                : 'border-emerald-100 bg-emerald-50/40 text-emerald-700'
            }`}>
              {radius < 8 ? (
                <>
                  <span className="font-semibold">💡 Tip:</span> A 10–20 km radius typically doubles your potential client pool.
                  Expanding slightly could significantly increase your bookings.
                </>
              ) : radius > 30 ? (
                <>
                  <span className="font-semibold">💡 Tip:</span> A focused 15–25 km radius often leads to better booking quality
                  and shorter travel times — saving you time between appointments.
                </>
              ) : (
                <>
                  <span className="font-semibold">✓ Good radius:</span> {radius} km is a strong sweet spot. You&apos;re accessible
                  to a large client pool without excessive travel time.
                </>
              )}
            </div>

            {/* Save button */}
            {dirty && (
              <div className="mt-4 flex justify-end">
                <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
                  <Save className="mr-1.5 h-3.5 w-3.5" /> Save changes
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
