'use client'

import Link from 'next/link'
import { Sparkles, Eye } from 'lucide-react'

const CATEGORIES = [
  { key: 'NAILS', label: 'Nails', desc: 'Gel, acrylic & nail art', Icon: Sparkles },
  { key: 'LASHES', label: 'Lashes', desc: 'Classic, volume & hybrid sets', Icon: Eye },
]

interface Props {
  categoriesBooked: string[]
}

export function DiscoverSection({ categoriesBooked }: Props) {
  const toShow = CATEGORIES.filter(c => !categoriesBooked.includes(c.key))

  // If they've booked everything, just show a browse link
  if (toShow.length === 0) {
    return (
      <div className="mb-12 text-center">
        <Link href="/search" className="text-sm font-semibold text-[#E96B56] hover:underline">
          Explore all artists →
        </Link>
      </div>
    )
  }

  return (
    <div className="mb-12">
      <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-[#717171]">You might like</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {toShow.map(({ key, label, desc, Icon }) => (
          <Link key={key} href={`/search?category=${key}`}>
            <div className="rounded-2xl bg-[#f9f2ef] p-6 transition-colors hover:bg-[#f3ece9]">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                <Icon className="h-4 w-4 text-[#E96B56]" />
              </div>
              <p className="mb-0.5 text-base font-bold text-[#1A1A1A]">{label}</p>
              <p className="text-xs text-[#717171]">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
