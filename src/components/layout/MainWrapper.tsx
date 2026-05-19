'use client'

import { usePathname } from 'next/navigation'

const AUTH_ROUTES      = ['/login', '/register', '/onboarding', '/forgot-password']
const FULLSCREEN_ROUTES = ['/book', '/nearby']
// Pages that render their own page-local nav (global Navbar is suppressed
// on these routes) — they must NOT get the global 80px top offset, or an
// empty strip appears above the page-local header.
const HERO_PAGES       = ['/', '/search', '/how-it-works', '/about']

function isNoNavRoute(pathname: string) {
  return (
    AUTH_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/')) ||
    FULLSCREEN_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))
  )
}

function isHeroPage(pathname: string) {
  return HERO_PAGES.some(r => pathname === r)
}

export function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (isNoNavRoute(pathname)) {
    return <main className="min-h-screen">{children}</main>
  }

  if (isHeroPage(pathname)) {
    // Navbar floats transparently over the full-screen hero
    return <main className="min-h-screen">{children}</main>
  }

  return <main className="pt-[80px] min-h-screen">{children}</main>
}
