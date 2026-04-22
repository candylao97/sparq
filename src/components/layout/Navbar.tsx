'use client'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import {
  Menu, LogOut, Settings, X,
  MessageSquare, UserCircle, Sparkles,
  User, ChevronDown, LayoutDashboard,
  BookOpen, Briefcase, CalendarDays, DollarSign, CreditCard, Bell,
  Loader2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Avatar } from '@/components/ui/Avatar'
import { LogoFull } from '@/components/ui/Logo'

// ─── Notification types ───────────────────────────────────────────────────────

interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  link?: string | null
  read: boolean
  createdAt: string
}

function notifDotColor(type: string): string {
  switch (type) {
    case 'NEW_BOOKING':
    case 'BOOKING_ACCEPTED':
    case 'BOOKING_COMPLETED':
    case 'RESCHEDULE_REQUESTED':
      return '#E96B56'
    case 'NEW_MESSAGE':
      return '#6B9DE9'
    case 'NEW_REVIEW':
    case 'REVIEW_REMINDER':
    case 'REVIEW_REPLY':
      return '#E9A86B'
    case 'PAYMENT_RECEIVED':
    case 'PAYOUT_SENT':
    case 'REFUND_PROCESSED':
      return '#6BE9A8'
    default:
      return '#D5CEC9'
  }
}

// ─────────────────────────────────────────────────────────────────────────────

const AUTH_ROUTES = ['/login', '/register', '/onboarding', '/forgot-password']
const FULLSCREEN_ROUTES = ['/book']
const HERO_OVERLAY_ROUTES: string[] = []

// ─── Provider studio nav ──────────────────────────────────────────────────────

interface NavItem { label: string; href: string; icon: LucideIcon }

// MVP: only what an artist needs to get bookings, manage services, get paid
const STUDIO_NAV: NavItem[] = [
  { label: 'Dashboard',   href: '/dashboard/provider',             icon: LayoutDashboard },
  { label: 'Bookings',    href: '/dashboard/provider/bookings',    icon: BookOpen        },
  { label: 'Messages',    href: '/dashboard/provider/messages',    icon: MessageSquare   },
  { label: 'Services',    href: '/dashboard/provider/services',    icon: Briefcase       },
  { label: 'Availability',href: '/dashboard/provider/availability',icon: CalendarDays    },
  { label: 'Earnings',    href: '/dashboard/provider/payments',    icon: DollarSign      },
  { label: 'Billing & Plan', href: '/dashboard/provider/billing', icon: CreditCard      },
]

// ─── Navbar ───────────────────────────────────────────────────────────────────

export function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  // Notification dropdown state
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [notifLoading, setNotifLoading] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  // Poll for unread message count every 60 seconds
  useEffect(() => {
    if (!session?.user) return
    const fetchUnread = () => {
      fetch('/api/messages/conversations')
        .then(r => r.ok ? r.json() : null)
        .then((d: { conversations?: { unreadCount?: number }[] } | null) => {
          if (!d?.conversations) return
          const total = d.conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0)
          setUnreadMessages(total)
        })
        .catch((err) => {
          console.error('[Navbar] Failed to fetch unread message count:', err)
        })
    }
    fetchUnread()
    const poll = setInterval(fetchUnread, 60_000)
    return () => clearInterval(poll)
  }, [session?.user])

  // UX-11: Fetch notification count on mount
  useEffect(() => {
    if (!session?.user) return
    fetch('/api/notifications?limit=20')
      .then(r => r.ok ? r.json() : null)
      .then((d: { notifications?: NotificationItem[] } | null) => {
        if (!d) return
        const count = d.notifications?.filter(n => !n.read).length ?? 0
        setUnreadNotifications(count)
      })
      .catch((err) => {
        console.error('[Navbar] Failed to fetch notification count:', err)
      })
  }, [session?.user])

  // Fetch notifications for dropdown
  const fetchNotifications = useCallback(() => {
    setNotifLoading(true)
    fetch('/api/notifications?limit=8')
      .then(r => r.ok ? r.json() : null)
      .then((d: { notifications?: NotificationItem[] } | null) => {
        if (!d) return
        setNotifications(d.notifications ?? [])
        const count = d.notifications?.filter(n => !n.read).length ?? 0
        setUnreadNotifications(count)
      })
      .catch((err) => {
        console.error('[Navbar] Failed to fetch notifications:', err)
      })
      .finally(() => setNotifLoading(false))
  }, [])

  // Open dropdown → fetch fresh
  useEffect(() => {
    if (notifOpen) fetchNotifications()
  }, [notifOpen, fetchNotifications])

  // Close notification dropdown on outside click
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    if (notifOpen) document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [notifOpen])

  const handleMarkAllRead = () => {
    fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAllRead: true }) })
      .then(r => r.ok ? r.json() : null)
      .then(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadNotifications(0)
      })
      .catch(err => console.error('[Navbar] Failed to mark all read:', err))
  }

  const handleMarkOneRead = (notifId: string, link?: string | null) => {
    fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: notifId }) })
      .then(r => r.ok ? r.json() : null)
      .then(() => {
        setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n))
        setUnreadNotifications(prev => Math.max(0, prev - 1))
      })
      .catch(err => console.error('[Navbar] Failed to mark notification read:', err))
    if (link) window.location.href = link
    setNotifOpen(false)
  }

  const isHeroOverlay  = HERO_OVERLAY_ROUTES.some(r => pathname === r)
  const isTransparent  = isHeroOverlay && !scrolled

  useEffect(() => {
    const onScroll = () => {
      const s = window.scrollY > 8
      setScrolled(prev => prev === s ? prev : s)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setProfileOpen(false); setMobileNavOpen(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Close dropdown on route change
  useEffect(() => { setProfileOpen(false) }, [pathname])

  if (AUTH_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))) return null
  if (FULLSCREEN_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))) return null

  const isProvider = session?.user?.role === 'PROVIDER' || session?.user?.role === 'BOTH'
  const isCustomer = session?.user?.role === 'CUSTOMER' || session?.user?.role === 'BOTH'
  const isStudioActive = (href: string) =>
    href === '/dashboard/provider'
      ? pathname === href
      : pathname === href || pathname.startsWith(href + '/')

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-40 transition-all duration-500 border-b ${
        isTransparent
          ? 'bg-transparent border-transparent'
          : scrolled
          ? 'bg-white/90 backdrop-blur-xl border-[#1A1A1A]/5 shadow-sm'
          : 'bg-white border-[#1A1A1A]/5'
      }`}
    >
      <div className="mx-auto max-w-[1600px] px-6">
        <div className="flex h-20 items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex flex-shrink-0 items-center">
            <LogoFull size="sm" />
          </Link>

          {/* Center links — desktop */}
          <div className="hidden items-center gap-8 md:flex">
            <Link
              href="/search"
              className="text-[15px] font-medium text-[#1A1A1A] hover:text-[#E96B56] transition-colors duration-300"
            >
              Explore
            </Link>
            <Link
              href="/how-it-works"
              className="text-[15px] font-medium text-[#717171] hover:text-[#E96B56] transition-colors duration-300"
            >
              How it works
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {session ? (
              <>
                {/* Mobile hamburger */}
                <button
                  type="button"
                  onClick={() => setProfileOpen(o => !o)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#717171] transition-colors hover:bg-[#1A1A1A]/5 md:hidden"
                  aria-label={profileOpen ? 'Close menu' : 'Open menu'}
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                >
                  {profileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </button>

                {/* Notification bell — desktop */}
                <div ref={notifRef} className="relative hidden md:block">
                  <button
                    type="button"
                    onClick={() => setNotifOpen(o => !o)}
                    className="relative w-9 h-9 rounded-full flex items-center justify-center text-[#717171] hover:bg-[#f3ece9] transition-colors"
                    aria-label="Notifications"
                    aria-expanded={notifOpen}
                    aria-haspopup="true"
                  >
                    <Bell className="h-4 w-4" />
                    {unreadNotifications > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-[#E96B56] text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center leading-none">
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 z-50 rounded-2xl border border-[#e8e1de] bg-white shadow-xl overflow-hidden">

                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8e1de]">
                        <h3 className="text-sm font-semibold text-[#1A1A1A]">Notifications</h3>
                        {unreadNotifications > 0 && (
                          <button
                            type="button"
                            onClick={handleMarkAllRead}
                            className="text-xs font-medium text-[#E96B56] hover:text-[#a63a29] transition-colors"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      {/* List */}
                      <div className="max-h-[400px] overflow-y-auto">
                        {notifLoading ? (
                          /* Skeleton rows */
                          <div className="divide-y divide-[#e8e1de]">
                            {[1, 2, 3].map(i => (
                              <div key={i} className="flex items-start gap-3 px-4 py-3 animate-pulse">
                                <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#e8e1de]" />
                                <div className="flex-1 space-y-1.5">
                                  <div className="h-3 w-3/4 rounded bg-[#e8e1de]" />
                                  <div className="h-2.5 w-1/2 rounded bg-[#e8e1de]" />
                                </div>
                                <div className="h-2.5 w-10 rounded bg-[#e8e1de]" />
                              </div>
                            ))}
                          </div>
                        ) : notifications.length === 0 ? (
                          /* Empty state */
                          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                            <Bell className="h-7 w-7 text-[#D5CEC9]" />
                            <p className="text-sm text-[#717171]">You&apos;re all caught up</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-[#e8e1de]">
                            {notifications.map(notif => (
                              <button
                                key={notif.id}
                                type="button"
                                onClick={() => handleMarkOneRead(notif.id, notif.link)}
                                className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[#f3ece9] ${
                                  notif.read ? 'bg-white' : 'bg-[#f9f2ef]'
                                }`}
                              >
                                {/* Colored dot */}
                                <span
                                  className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full"
                                  style={{ backgroundColor: notifDotColor(notif.type) }}
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-[#1A1A1A]">{notif.title}</p>
                                  <p className="truncate text-xs text-[#717171]">{notif.message}</p>
                                </div>
                                <span className="flex-shrink-0 text-[10px] text-[#717171] pt-0.5">
                                  {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="border-t border-[#e8e1de] px-4 py-2.5">
                        <Link
                          href={isProvider ? '/dashboard/provider' : '/dashboard/customer'}
                          onClick={() => setNotifOpen(false)}
                          className="block text-center text-xs font-medium text-[#717171] hover:text-[#1A1A1A] transition-colors"
                        >
                          View all notifications
                        </Link>
                      </div>

                    </div>
                  )}
                </div>

                {/* Avatar → profile dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setProfileOpen(o => !o)}
                    className="hidden md:flex items-center gap-1 transition-all duration-300 hover:opacity-90 outline-none focus:outline-none"
                    aria-label={profileOpen ? 'Close menu' : 'Open menu'}
                    aria-expanded={profileOpen}
                    aria-haspopup="menu"
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden">
                      {session.user?.image ? (
                        <Avatar src={session.user?.image} name={session.user?.name} size="sm" />
                      ) : (
                        <User className="h-5 w-5 text-[#717171]" />
                      )}
                    </div>
                    <ChevronDown className={`h-3 w-3 text-[#717171] transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {profileOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                      <div className="animate-fade-in absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border border-[#1A1A1A]/5 bg-white shadow-elevated">
                        <div className="py-2">

                          {/* ── User identity ── */}
                          <div className="px-4 py-3 border-b border-[#1A1A1A]/5">
                            <p className="text-sm font-semibold text-[#1A1A1A] truncate">
                              {session.user?.name || 'My account'}
                            </p>
                            <p className="text-xs text-[#717171] mt-0.5">
                              {isProvider && isCustomer ? 'Artist & Client'
                                : isProvider ? 'Artist'
                                : 'Client'}
                            </p>
                          </div>

                          {/* ── Studio nav (providers only) ── */}
                          {isProvider && (
                            <>
                              <div className="px-4 pt-3 pb-1">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-[#E96B56]">
                                  Artist Studio
                                </p>
                              </div>
                              {STUDIO_NAV.map((item) => {
                                const Icon = item.icon
                                const active = isStudioActive(item.href)
                                return (
                                  <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setProfileOpen(false)}
                                    className={`flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                      active
                                        ? 'bg-[#F8E8E6] text-[#1A1A1A]'
                                        : 'text-[#717171] hover:bg-[#f9f2ef] hover:text-[#1A1A1A]'
                                    }`}
                                  >
                                    <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[#E96B56]' : 'text-[#717171]'}`} />
                                    {item.label}
                                    {item.href === '/dashboard/provider/messages' && unreadMessages > 0 && (
                                      <span className="ml-auto flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#E96B56] px-1 text-[10px] font-bold text-white">
                                        {unreadMessages > 99 ? '99+' : unreadMessages}
                                      </span>
                                    )}
                                  </Link>
                                )
                              })}
                              <div className="border-t border-[#1A1A1A]/5 my-1.5" />
                            </>
                          )}

                          {/* ── Non-provider: dashboard shortcut ── */}
                          {!isProvider && (
                            <>
                              <Link
                                href="/dashboard/customer"
                                onClick={() => setProfileOpen(false)}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#1A1A1A] font-medium hover:bg-[#f9f2ef] transition-colors"
                              >
                                <LayoutDashboard className="w-4 h-4 text-[#E96B56]" /> Dashboard
                              </Link>
                              <Link
                                href="/dashboard/provider/messages"
                                onClick={() => setProfileOpen(false)}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-[#f9f2ef] transition-colors"
                              >
                                <MessageSquare className="w-4 h-4 text-[#1A1A1A]" />
                                Messages
                                {unreadMessages > 0 && (
                                  <span className="ml-auto flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#E96B56] px-1 text-[10px] font-bold text-white">
                                    {unreadMessages > 99 ? '99+' : unreadMessages}
                                  </span>
                                )}
                              </Link>
                              <div className="border-t border-[#1A1A1A]/5 my-1" />
                            </>
                          )}

                          {/* ── Account ── */}
                          <Link
                            href="/profile"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-[#f9f2ef] transition-colors"
                          >
                            <UserCircle className="w-4 h-4 text-[#717171]" /> Profile
                          </Link>
                          <Link
                            href="/account-settings"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-[#f9f2ef] transition-colors"
                          >
                            <Settings className="w-4 h-4 text-[#717171]" /> Settings
                          </Link>

                          {/* ── Become an artist promo — only for pure clients ── */}
                          {!isProvider && (
                            <>
                              <div className="border-t border-[#1A1A1A]/5 my-1" />
                              <Link
                                href="/register?role=PROVIDER"
                                onClick={() => setProfileOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 hover:bg-[#f9f2ef] transition-colors"
                              >
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-[#1A1A1A]">Share your Sparq</p>
                                  <p className="text-xs text-[#717171]">List your services and grow your client base.</p>
                                </div>
                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#f9f2ef]">
                                  <Sparkles className="h-4 w-4 text-[#E96B56]" />
                                </div>
                              </Link>
                            </>
                          )}

                          {/* ── Log out ── */}
                          <div className="border-t border-[#1A1A1A]/5 my-1" />
                          <button
                            onClick={() => { signOut({ callbackUrl: '/' }); setProfileOpen(false) }}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-[#f9f2ef] transition-colors"
                          >
                            <LogOut className="w-4 h-4 text-[#1A1A1A]" /> Log out
                          </button>

                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Sign in — desktop */}
                <Link
                  href="/login"
                  className="hidden md:inline-flex items-center gap-2 text-sm font-medium text-[#1A1A1A] hover:text-[#E96B56] transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/start-earning"
                  className="hidden md:block bg-[#E96B56] text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-[#a63a29] transition-colors"
                >
                  Start earning
                </Link>

                {/* Mobile hamburger */}
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(o => !o)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#717171] transition-colors hover:bg-[#1A1A1A]/5 md:hidden"
                  aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
                  aria-expanded={mobileNavOpen}
                  aria-haspopup="menu"
                >
                  {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        {mobileNavOpen && (
          <div className="animate-fade-in border-t border-[#1A1A1A]/5 py-4 md:hidden">
            <div className="grid gap-1">
              <Link
                href="/search"
                onClick={() => setMobileNavOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#1A1A1A]/5"
              >
                Explore
              </Link>
              <Link
                href="/how-it-works"
                onClick={() => setMobileNavOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-medium text-[#717171] transition-colors hover:bg-[#1A1A1A]/5"
              >
                How it works
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
