'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Sparkles, Eye, Tag, Camera, Wand2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { AiText } from './AiText'
import type { LucideIcon } from 'lucide-react'

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  NAILS: Sparkles,
  LASHES: Eye,
}

interface Props {
  services: Array<{
    id: string
    title: string
    category: string
    price: number
    duration: number
    locationTypes: string
  }>
  portfolio: Array<{ id: string; url: string; caption: string | null }>
  portfolioCount: number
  portfolioGapNote: string | null | undefined
  aiLoading: boolean
}

export function ServicesPortfolio({ services, portfolio, portfolioCount, portfolioGapNote, aiLoading }: Props) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Services */}
      <div className="rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(26,31,54,0.07)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#1A1A1A]">Your Services</h2>
          <Link href="/dashboard/provider/services" className="text-xs font-semibold text-[#E96B56] hover:underline">
            Edit services →
          </Link>
        </div>

        {services.length > 0 ? (
          <div className="space-y-2">
            {services.map(service => {
              const Icon = CATEGORY_ICONS[service.category] || Tag
              return (
                <div key={service.id} className="flex items-center gap-3 rounded-xl bg-[#f9f2ef] p-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                    <Icon className="h-4 w-4 text-[#E96B56]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-compact font-semibold text-[#1A1A1A]">{service.title}</p>
                    <p className="text-label text-[#717171]">
                      from {formatCurrency(service.price)} · {service.duration} mins
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-6 text-center">
            <Wand2 className="mx-auto mb-2 h-7 w-7 text-[#e8e1de]" />
            <p className="text-body-compact font-medium text-[#717171]">No services yet</p>
            <p className="mt-1 text-label text-[#717171]">Add your first service and start receiving bookings</p>
          </div>
        )}

        <Link
          href="/dashboard/provider/services"
          className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#e8e1de] p-3 text-xs font-semibold text-[#717171] transition-colors hover:border-[#E96B56] hover:text-[#E96B56]"
        >
          <Wand2 className="h-3.5 w-3.5" /> Add Service with AI
        </Link>
      </div>

      {/* Portfolio */}
      <div className="rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(26,31,54,0.07)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#1A1A1A]">Portfolio</h2>
          <Link href="/dashboard/provider/portfolio" className="text-xs font-semibold text-[#E96B56] hover:underline">
            Update →
          </Link>
        </div>

        {portfolio.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {portfolio.map(photo => (
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
            {/* Fill empty slots up to 4 */}
            {Array.from({ length: Math.max(0, 4 - portfolio.length) }).map((_, i) => (
              <Link
                key={`empty-${i}`}
                href="/dashboard/provider/portfolio"
                className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-[#e8e1de] bg-[#f9f2ef] transition-colors hover:border-[#E96B56]"
              >
                <Camera className="h-6 w-6 text-[#717171]" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map(i => (
              <Link
                key={i}
                href="/dashboard/provider/portfolio"
                className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-[#e8e1de] bg-[#f9f2ef] transition-colors hover:border-[#E96B56]"
              >
                <Camera className="h-6 w-6 text-[#717171]" />
              </Link>
            ))}
          </div>
        )}

        {/* AI portfolio gap note */}
        <AiText
          text={portfolioGapNote}
          loading={aiLoading}
          className="mt-3 text-xs text-[#717171]"
          skeletonWidth="w-full"
        />

        <p className="mt-2 text-label text-[#717171]">{portfolioCount} photo{portfolioCount !== 1 ? 's' : ''} total</p>
      </div>
    </div>
  )
}
