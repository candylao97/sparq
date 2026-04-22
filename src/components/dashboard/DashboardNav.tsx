'use client'

import Link from 'next/link'
import { LayoutGrid, BookOpen, CalendarDays, Banknote, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Services',     href: '/dashboard/provider/services',     icon: LayoutGrid   },
  { label: 'Bookings',     href: '/dashboard/provider/bookings',     icon: BookOpen     },
  { label: 'Availability', href: '/dashboard/provider/availability', icon: CalendarDays },
  { label: 'Payments',     href: '/dashboard/provider/payments',     icon: Banknote     },
  { label: 'Growth',       href: '/dashboard/provider/growth',       icon: TrendingUp   },
]

export function DashboardNav() {
  return (
    <div className="pb-8">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#717171]">
        Quick access
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-shrink-0 items-center gap-2 rounded-xl border border-[#f0e8e4] bg-white px-4 py-2.5 text-sm font-medium text-[#717171] transition-all hover:border-[#E96B56]/30 hover:text-[#1A1A1A]"
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
