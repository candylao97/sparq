'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogoFull } from '@/components/ui/Logo'

const AUTH_ROUTES = ['/login', '/register', '/onboarding', '/forgot-password']
const FULLSCREEN_ROUTES = ['/book']

export function Footer() {
  const pathname = usePathname()
  if (AUTH_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))) return null
  if (FULLSCREEN_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))) return null
  return (
    <footer className="bg-white border-t border-[#1A1A1A]/6">

      {/* ── Main grid ── */}
      <div className="max-w-[1600px] mx-auto px-6 pt-12 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-6 lg:gap-10">

          {/* ── Col 1: Brand ── */}
          <div className="col-span-2 md:col-span-1 flex flex-col gap-3">
            <LogoFull size="sm" />
            <p className="text-[0.9rem] text-[#717171] leading-snug max-w-[210px] tracking-[-0.01em]">
              Book beauty your way —<br className="hidden sm:block" /> at home or in‑studio.
            </p>
          </div>

          {/* ── Col 2: Book ── */}
          <div>
            <h4 className="section-label mb-4">Book</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/search?category=NAILS"
                  className="text-sm font-medium text-[#717171] hover:text-[#1A1A1A] hover:underline underline-offset-4 transition-colors duration-200"
                >
                  Nail artists
                </Link>
              </li>
              <li>
                <Link
                  href="/search?category=LASHES"
                  className="text-sm font-medium text-[#717171] hover:text-[#1A1A1A] hover:underline underline-offset-4 transition-colors duration-200"
                >
                  Lash artists
                </Link>
              </li>
            </ul>
          </div>

          {/* ── Col 3: For artists ── */}
          <div>
            <h4 className="section-label mb-4">For artists</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/register/provider"
                  className="text-sm font-medium text-[#717171] hover:text-[#1A1A1A] hover:underline underline-offset-4 transition-colors duration-200"
                >
                  Become an artist
                </Link>
              </li>
            </ul>
          </div>

          {/* ── Col 4: Support ── */}
          <div>
            <h4 className="section-label mb-4">Support</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/contact"
                  className="text-sm font-medium text-[#717171] hover:text-[#1A1A1A] hover:underline underline-offset-4 transition-colors duration-200"
                >
                  Help centre
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm font-medium text-[#717171] hover:text-[#1A1A1A] hover:underline underline-offset-4 transition-colors duration-200"
                >
                  Contact support
                </Link>
              </li>
              <li>
                <Link
                  href="/trust"
                  className="text-sm font-medium text-[#717171] hover:text-[#1A1A1A] hover:underline underline-offset-4 transition-colors duration-200"
                >
                  Trust &amp; safety
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-sm font-medium text-[#717171] hover:text-[#1A1A1A] hover:underline underline-offset-4 transition-colors duration-200"
                >
                  About us
                </Link>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="border-t border-[#1A1A1A]/5">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-[#8A8A8A]">
          <p>© 2026 Sparq Pty Ltd. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link
              href="/privacy"
              className="hover:text-[#1A1A1A] hover:underline underline-offset-4 transition-colors duration-200"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="hover:text-[#1A1A1A] hover:underline underline-offset-4 transition-colors duration-200"
            >
              Terms
            </Link>
          </div>
        </div>
      </div>

    </footer>
  )
}
