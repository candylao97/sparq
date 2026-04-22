'use client'

import Link from 'next/link'
import type { FavouriteTalent, CustomerBooking } from '@/types/dashboard'

interface Item {
  id: string
  name: string
  service: string
}

interface Props {
  favouriteTalents: FavouriteTalent[]
  pastBookings: CustomerBooking[]
}

export function ContinueSection({ favouriteTalents, pastBookings }: Props) {
  // Build deduplicated list: favourites first, fill to 4 from recent bookings
  const seen = new Set<string>()
  const items: Item[] = []

  for (const t of favouriteTalents) {
    if (items.length >= 4) break
    if (!seen.has(t.id)) {
      seen.add(t.id)
      items.push({ id: t.id, name: t.name, service: t.topService })
    }
  }

  for (const b of pastBookings) {
    if (items.length >= 4) break
    if (!seen.has(b.provider.id)) {
      seen.add(b.provider.id)
      items.push({ id: b.provider.id, name: b.provider.name, service: b.service.title })
    }
  }

  if (items.length === 0) return null

  return (
    <div className="mb-12">
      <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-[#717171]">Continue</p>
      <div className="divide-y divide-[#f3ece9]">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-600 text-sm font-bold text-white">
                {item.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1A1A1A]">{item.name}</p>
                <p className="text-xs text-[#717171]">{item.service}</p>
              </div>
            </div>
            <Link href={`/book/${item.id}`}>
              <button className="rounded-xl border border-[#e8e1de] bg-white px-4 py-2 text-xs font-semibold text-[#1A1A1A] transition-colors hover:border-[#E96B56] hover:text-[#E96B56]">
                Book
              </button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
