'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { Check, Clock, ArrowRight, RotateCcw } from 'lucide-react'
import { SchedulingModal } from './SchedulingModal'
import { formatCurrency } from '@/lib/utils'

interface Service {
  id: string
  title: string
  category: string
  price: number
  duration: number
  description?: string
  instantBook?: boolean
}

interface PortfolioPhoto { id: string; url: string }

interface Props {
  services: Service[]
  profileId: string
  portfolio: PortfolioPhoto[]
}

// Badge logic: most expensive = "Most popular", second = "Recommended" (when ≥3 services)
function getBadge(service: Service, index: number, all: Service[]): { text: string; style: string } | null {
  if (all.length === 1) return null
  const sorted = [...all].sort((a, b) => b.price - a.price)
  if (service.id === sorted[0].id) return { text: 'Most popular', style: 'bg-[#E96B56] text-white' }
  if (all.length >= 3 && index === 1)  return { text: 'Recommended', style: 'bg-[#f3ece9] text-[#E96B56]' }
  return null
}

export function ServiceSelector({ services, profileId, portfolio }: Props) {
  // Default-select the most expensive (most popular) service
  const defaultSelected = [...services].sort((a, b) => b.price - a.price)[0]?.id ?? services[0]?.id ?? ''
  const [selectedId, setSelectedId] = useState(defaultSelected)
  const [modalOpen, setModalOpen]   = useState(false)

  const selected = services.find(s => s.id === selectedId) ?? services[0]

  return (
    <>
      <div className="space-y-2.5">
        {services.map((service, i) => {
          const badge     = getBadge(service, i, services)
          const isSelected = service.id === selectedId

          return (
            <button
              key={service.id}
              onClick={() => setSelectedId(service.id)}
              className={`group w-full text-left flex items-center gap-4 p-4 md:p-5 rounded-2xl border
                          transition-all duration-200 ${
                isSelected
                  ? 'border-[#1A1A1A] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08)]'
                  : 'border-[#e8e1de] bg-white hover:border-[#1A1A1A]/40 hover:shadow-sm'
              }`}
            >
              {/* Radio dot */}
              <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center
                               transition-all duration-200 ${
                isSelected
                  ? 'border-[#1A1A1A] bg-[#1A1A1A]'
                  : 'border-[#e8e1de] group-hover:border-[#1A1A1A]/50'
              }`}>
                {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="font-semibold text-sm text-[#1A1A1A] leading-snug">
                    {service.title}
                  </span>
                  {badge && (
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0 ${badge.style}`}>
                      {badge.text}
                    </span>
                  )}
                  {service.instantBook && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-50 text-green-700 flex-shrink-0">
                      ⚡ Instant Book
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {service.duration && (
                    <span className="flex items-center gap-1 text-xs text-[#717171]">
                      <Clock className="w-3 h-3" />
                      {service.duration} min
                    </span>
                  )}
                  {service.description && (
                    <span className="text-xs text-[#717171] line-clamp-1 hidden sm:block">
                      {service.description}
                    </span>
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="flex-shrink-0 text-right">
                <span className="block text-[10px] font-medium text-[#717171] uppercase tracking-wide leading-none mb-0.5">From</span>
                <span className="text-base font-bold text-[#1A1A1A]">
                  {formatCurrency(service.price)}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Booking prompt — appears below the selector, contextual to selection */}
      {selected && (
        <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-[#f9f2ef] p-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#1A1A1A] truncate">{selected.title}</p>
            <p className="flex items-center gap-1 text-xs text-[#717171] mt-0.5">
              <Clock className="w-3 h-3" />
              {selected.duration} min · {formatCurrency(selected.price)}
            </p>
            <p className="flex items-center gap-1 text-[10px] text-[#717171] mt-1.5">
              <RotateCcw className="w-3 h-3 text-[#E96B56]" />
              Free cancellation up to 24h before
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-[#1A1A1A] text-white text-xs font-semibold
                       px-4 py-2.5 rounded-full hover:bg-[#E96B56] transition-colors duration-200
                       whitespace-nowrap flex-shrink-0"
          >
            Book this <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      <SchedulingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        profileId={profileId}
        services={services}
        portfolio={portfolio}
      />
    </>
  )
}
