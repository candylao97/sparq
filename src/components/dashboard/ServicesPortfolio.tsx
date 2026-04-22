'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Sparkles, Eye, Tag, Camera, Plus, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { AiText } from './AiText'
import type { LucideIcon } from 'lucide-react'

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  NAILS: Sparkles,
  LASHES: Eye,
}

const LOCATION_LABELS: Record<string, string> = {
  AT_HOME: 'Mobile',
  STUDIO: 'Studio',
  BOTH: 'Mobile & Studio',
}

// Estimated bookings per month for an active service (conservative avg)
const EST_BOOKINGS_PER_MONTH = 4

interface Service {
  id: string
  title: string
  category: string
  price: number
  duration: number
  locationTypes: string
  isActive: boolean
}

interface Props {
  services: Service[]
  portfolio: Array<{ id: string; url: string; caption: string | null }>
  portfolioCount: number
  portfolioGapNote: string | null | undefined
  aiLoading: boolean
}

export function ServicesPortfolio({ services, portfolio, portfolioCount, portfolioGapNote, aiLoading }: Props) {
  const activeServices = services.filter(s => s.isActive)
  const inactiveServices = services.filter(s => !s.isActive)

  // Sort: active first, then by price descending (highest earners first)
  const sortedServices = [
    ...activeServices.sort((a, b) => b.price - a.price),
    ...inactiveServices.sort((a, b) => b.price - a.price),
  ]

  // Total potential monthly revenue from all active services
  const monthlyPotential = activeServices.reduce((sum, s) => sum + s.price * EST_BOOKINGS_PER_MONTH, 0)

  // Top earner = highest priced active service
  const topEarnerId = activeServices.length > 0
    ? activeServices.reduce((top, s) => s.price > top.price ? s : top, activeServices[0]).id
    : null

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">

      {/* ── Services ── */}
      <div className="flex flex-col rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(26,31,54,0.07)]">
        {/* Header */}
        <div className="mb-1 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">Your Services</h2>
            <p className="text-label text-[#717171]">
              {activeServices.length} of {services.length} live
            </p>
          </div>
          <Link
            href="/dashboard/provider/services"
            className="text-xs font-semibold text-[#E96B56] transition-colors hover:text-[#a63a29]"
          >
            Manage →
          </Link>
        </div>

        {/* Potential revenue chip */}
        {monthlyPotential > 0 && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-[#f9f2ef] px-3 py-2.5">
            <TrendingUp className="h-3.5 w-3.5 flex-shrink-0 text-[#E96B56]" />
            <span className="text-xs text-[#717171]">
              At {EST_BOOKINGS_PER_MONTH} bookings each, active services could earn{' '}
              <span className="font-bold text-[#1A1A1A]">{formatCurrency(monthlyPotential)}</span> this month
            </span>
          </div>
        )}

        {services.length > 0 ? (
          <div className="flex-1 space-y-2">
            {sortedServices.map(service => {
              const Icon = CATEGORY_ICONS[service.category] || Tag
              const locationLabel = LOCATION_LABELS[service.locationTypes] || service.locationTypes
              const isTop = service.id === topEarnerId
              const monthlyEst = service.price * EST_BOOKINGS_PER_MONTH

              return (
                <div
                  key={service.id}
                  className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${
                    service.isActive ? 'bg-[#f9f2ef]' : 'bg-[#f9f2ef]/40 opacity-60'
                  }`}
                >
                  {/* Icon */}
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                    <Icon className="h-4 w-4 text-[#E96B56]" />
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-body-compact font-semibold text-[#1A1A1A]">
                        {service.title}
                      </p>
                      {isTop && service.isActive && (
                        <span className="flex-shrink-0 rounded-full bg-[#E96B56]/10 px-1.5 py-0.5 text-micro font-bold text-[#E96B56]">
                          Top earner
                        </span>
                      )}
                    </div>
                    <p className="text-label text-[#717171]">
                      {formatCurrency(service.price)} · {service.duration} mins · {locationLabel}
                    </p>
                    {service.isActive && (
                      <p className="text-micro text-[#717171]">
                        ~{formatCurrency(monthlyEst)} potential/month
                      </p>
                    )}
                  </div>

                  {/* Status badge */}
                  <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-micro font-semibold ${
                    service.isActive
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-[#e8e1de] text-[#717171]'
                  }`}>
                    {service.isActive ? 'Live' : 'Off'}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f9f2ef]">
              <Tag className="h-6 w-6 text-[#e8e1de]" />
            </div>
            <p className="text-body-compact font-semibold text-[#717171]">No services yet</p>
            <p className="mt-1 text-label text-[#717171]">
              Add your first service and start getting bookings
            </p>
          </div>
        )}

        {/* Warning if inactive services exist */}
        {inactiveServices.length > 0 && activeServices.length > 0 && (
          <p className="mt-2 text-xs text-amber-600">
            ⚠ {inactiveServices.length} inactive service{inactiveServices.length > 1 ? 's are' : ' is'} hidden from clients
          </p>
        )}

        <Link
          href="/dashboard/provider/services/create"
          className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#e8e1de] p-3 text-xs font-semibold text-[#717171] transition-colors hover:border-[#E96B56] hover:text-[#E96B56]"
        >
          <Plus className="h-3.5 w-3.5" /> Add a service
        </Link>
      </div>

      {/* ── Portfolio ── */}
      <div className="flex flex-col rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(26,31,54,0.07)]">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">Portfolio</h2>
            <p className="text-label text-[#717171]">
              {portfolioCount} photo{portfolioCount !== 1 ? 's' : ''} ·{' '}
              <span className={portfolioCount >= 6 ? 'text-emerald-600' : 'text-amber-600'}>
                {portfolioCount >= 6 ? 'Great' : portfolioCount >= 4 ? 'Good' : portfolioCount >= 1 ? 'Needs more' : 'Add photos'}
              </span>
            </p>
          </div>
          <Link
            href="/dashboard/provider/portfolio"
            className="text-xs font-semibold text-[#E96B56] transition-colors hover:text-[#a63a29]"
          >
            Manage →
          </Link>
        </div>

        {/* Photo grid */}
        <div className="grid flex-1 grid-cols-2 gap-2">
          {portfolio.slice(0, 4).map(photo => (
            <div key={photo.id} className="relative aspect-square overflow-hidden rounded-xl bg-[#f3ece9]">
              <Image
                src={photo.url}
                alt={photo.caption || 'Portfolio'}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            </div>
          ))}
          {/* Empty slots up to 4 */}
          {Array.from({ length: Math.max(0, 4 - portfolio.length) }).map((_, i) => (
            <Link
              key={`empty-${i}`}
              href="/dashboard/provider/portfolio"
              className="group flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[#e8e1de] bg-[#f9f2ef] transition-all hover:border-[#E96B56] hover:bg-[#fff5f3]"
            >
              <Camera className="h-5 w-5 text-[#e8e1de] transition-colors group-hover:text-[#E96B56]" />
              <span className="text-micro font-semibold text-[#e8e1de] transition-colors group-hover:text-[#E96B56]">
                Add photo
              </span>
            </Link>
          ))}
        </div>

        {/* Portfolio benchmark tip */}
        {portfolioCount < 6 && (
          <div className="mt-3 rounded-xl bg-amber-50/60 px-3 py-2.5">
            <p className="text-xs text-amber-700">
              <span className="font-semibold">💡 Tip:</span>{' '}
              {portfolioCount < 2
                ? 'Artists with no photos rarely get booked. Add your best work now.'
                : portfolioCount < 4
                ? 'Profiles with 4+ photos get 3× more enquiries. Add a few more shots.'
                : 'Artists with 6+ photos rank higher in search. 2 more to go!'}
            </p>
          </div>
        )}

        {/* AI gap note */}
        {(portfolioGapNote || aiLoading) && (
          <AiText
            text={portfolioGapNote}
            loading={aiLoading}
            className="mt-2 text-xs text-[#717171]"
            skeletonWidth="w-full"
          />
        )}
      </div>
    </div>
  )
}
