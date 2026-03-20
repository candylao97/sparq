'use client'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import {
  Menu, LogOut, Settings, X,
  Heart, CalendarDays, MessageSquare, UserCircle, HelpCircle, Gift, Sparkles,
  User,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { LogoFull } from '@/components/ui/Logo'

export function Navbar() {
  const { data: session } = useSession()
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      const shouldScroll = window.scrollY > 6
      setScrolled(prev => prev === shouldScroll ? prev : shouldScroll)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileOpen(false)
        setMobileNavOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const isProvider = session?.user?.role === 'PROVIDER' || session?.user?.role === 'BOTH'
  const isCustomer = session?.user?.role === 'CUSTOMER' || session?.user?.role === 'BOTH'

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-40 transition-all duration-500 ease-out-expo border-b ${
        scrolled
          ? 'bg-[#FDFBF7]/80 backdrop-blur-xl border-[#1A1A1A]/5 shadow-nav-scrolled'
          : 'bg-[#FDFBF7] border-[#1A1A1A]/5'
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
              className="text-[15px] font-medium text-[#555] hover:text-[#E96B56] transition-colors duration-300"
            >
              How it works
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {session ? (
              <>
                {/* Avatar → profile dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setProfileOpen(open => !open)}
                    className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden transition-all duration-300 hover:opacity-90 outline-none focus:outline-none"
                    aria-label={profileOpen ? 'Close menu' : 'Open menu'}
                    aria-expanded={profileOpen}
                    aria-haspopup="menu"
                  >
                    {session.user?.image ? (
                      <Avatar src={session.user?.image} name={session.user?.name} size="sm" />
                    ) : (
                      <User className="h-5 w-5 text-[#717171]" />
                    )}
                  </button>

                  {profileOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                      <div className="animate-fade-in absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-2xl border border-[#1A1A1A]/5 bg-white shadow-elevated">
                        <div className="py-2">
                          <Link href={isProvider ? '/dashboard/provider' : '/dashboard/customer'} onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#1A1A1A] font-medium hover:bg-[#FDFBF7] transition-colors">
                            <UserCircle className="w-4 h-4 text-[#E96B56]" /> Dashboard
                          </Link>
                          <Link href="/wishlists" onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-[#FDFBF7] transition-colors">
                            <Heart className="w-4 h-4 text-[#1A1A1A]" /> Wishlists
                          </Link>
                          {isCustomer && (
                            <Link href="/bookings" onClick={() => setProfileOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-[#FDFBF7] transition-colors">
                              <CalendarDays className="w-4 h-4 text-[#1A1A1A]" /> Bookings
                            </Link>
                          )}
                          <Link href="/messages" onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-[#FDFBF7] transition-colors">
                            <MessageSquare className="w-4 h-4 text-[#1A1A1A]" /> Messages
                          </Link>
                          <Link href="/profile" onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-[#FDFBF7] transition-colors">
                            <UserCircle className="w-4 h-4 text-[#1A1A1A]" /> Profile
                          </Link>

                          <div className="border-t border-[#1A1A1A]/5 my-1" />
                          <Link href="/account-settings" onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-[#FDFBF7] transition-colors">
                            <Settings className="w-4 h-4 text-[#1A1A1A]" /> Account settings
                          </Link>
                          <Link href="/contact" onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-[#FDFBF7] transition-colors">
                            <HelpCircle className="w-4 h-4 text-[#1A1A1A]" /> Help &amp; FAQ
                          </Link>

                          {!isProvider && (
                            <>
                              <div className="border-t border-[#1A1A1A]/5 my-1" />
                              <Link href="/register/provider" onClick={() => setProfileOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 hover:bg-[#FDFBF7] transition-colors">
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-[#1A1A1A]">Share your Sparq</p>
                                  <p className="text-xs text-[#717171]">List your services and grow your client base.</p>
                                </div>
                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#FDFBF7]">
                                  <Sparkles className="h-4 w-4 text-[#E96B56]" />
                                </div>
                              </Link>
                            </>
                          )}

                          <div className="border-t border-[#1A1A1A]/5 my-1" />
                          <Link href="/gift-cards" onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-[#FDFBF7] transition-colors">
                            <Gift className="w-4 h-4 text-[#1A1A1A]" /> Gift cards
                          </Link>

                          <div className="border-t border-[#1A1A1A]/5 my-1" />
                          <button
                            onClick={() => { signOut({ callbackUrl: '/' }); setProfileOpen(false) }}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-[#FDFBF7] transition-colors"
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
                {/* Sign in button — desktop */}
                <Link
                  href="/login"
                  className="hidden md:inline-flex items-center gap-2 text-sm font-medium text-[#1A1A1A] hover:text-[#E96B56] transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="hidden md:block bg-[#E96B56] text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-[#a63a29] transition-colors"
                >
                  Sign up
                </Link>

                {/* Mobile hamburger */}
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(open => !open)}
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
              {/* Login/register links removed from mobile nav */}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
