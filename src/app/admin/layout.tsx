'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard, Users, Star, CalendarCheck,
  Settings, BarChart3, StickyNote, ShieldAlert, ChevronRight,
  UserCog, AlertTriangle, Briefcase, CreditCard, ShieldCheck, Tag, ClipboardList, Timer, BarChart2, Scale,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/kyc', label: 'KYC / Identity', icon: ShieldCheck },
  { href: '/admin/providers', label: 'Artists', icon: Users },
  { href: '/admin/users', label: 'Users', icon: UserCog },
  { href: '/admin/bookings', label: 'Bookings', icon: CalendarCheck },
  { href: '/admin/disputes', label: 'Disputes', icon: AlertTriangle },
  { href: '/admin/chargebacks', label: 'Chargebacks', icon: Scale },
  { href: '/admin/services', label: 'Services', icon: Briefcase },
  { href: '/admin/featured', label: 'Featured Artists', icon: Star },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/vouchers', label: 'Gift Vouchers', icon: Tag },
  { href: '/admin/leakage', label: 'Leakage Flags', icon: ShieldAlert },
  { href: '/admin/fraud-signals', label: 'Fraud Signals', icon: ShieldAlert },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/audit-log', label: 'Audit Log', icon: ClipboardList },
  { href: '/admin/notes', label: 'Notes', icon: StickyNote },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/admin/cron', label: 'Cron Jobs', icon: Timer },
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#e8e1de] border-t-[#1A1A1A]" />
      </div>
    )
  }

  if ((session?.user as { role?: string })?.role !== 'ADMIN') return null

  return (
    <div className="flex min-h-screen bg-[#FDFBF7]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-[#e8e1de] bg-white">
        <div className="flex h-16 items-center gap-2 border-b border-[#e8e1de] px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A1A1A] text-xs font-bold text-white">
            S
          </div>
          <div>
            <div className="text-sm font-bold text-[#1A1A1A]">Sparq Admin</div>
            <div className="text-[10px] text-[#717171]">Platform Management</div>
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
                    ? 'bg-[#1A1A1A] font-medium text-white'
                    : 'text-[#717171] hover:bg-[#f3ece9] hover:text-[#1A1A1A]'
                }`}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
                {isActive && <ChevronRight className="ml-auto h-3 w-3" />}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-[#e8e1de] px-4 py-3">
          <div className="text-xs text-[#717171]">Signed in as</div>
          <div className="truncate text-sm font-medium text-[#1A1A1A]">
            {session?.user?.email}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-60 flex-1 min-w-0">
        <div className="max-w-[1600px] px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
