'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard, Users, Star, CalendarCheck, Grid3X3, MapPin,
  Settings, BarChart3, StickyNote, ShieldAlert, ChevronRight,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/providers', label: 'Providers', icon: Users },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },
  { href: '/admin/bookings', label: 'Bookings', icon: CalendarCheck },
  { href: '/admin/categories', label: 'Categories', icon: Grid3X3 },
  { href: '/admin/suburbs', label: 'Suburbs', icon: MapPin },
  { href: '/admin/leakage', label: 'Leakage Flags', icon: ShieldAlert },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/notes', label: 'Notes', icon: StickyNote },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && (session?.user as { role?: string })?.role !== 'ADMIN') router.push('/')
  }, [status, session, router])

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
      </div>
    )
  }

  if ((session?.user as { role?: string })?.role !== 'ADMIN') return null

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-gray-200 bg-white">
        <div className="flex h-16 items-center gap-2 border-b border-gray-100 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-xs font-bold text-white">
            S
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900">Sparq Admin</div>
            <div className="text-[10px] text-gray-400">Platform Management</div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-gray-900 font-medium text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
                {isActive && <ChevronRight className="ml-auto h-3 w-3" />}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-gray-100 px-4 py-3">
          <div className="text-xs text-gray-400">Signed in as</div>
          <div className="truncate text-sm font-medium text-gray-700">
            {session?.user?.email}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-60 flex-1">
        <div className="mx-auto max-w-7xl px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
