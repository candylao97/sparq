import Link from 'next/link'
import { LogoFull } from '@/components/ui/Logo'

export function Footer() {
  return (
    <footer className="bg-[#FDFBF7] border-t border-[#1A1A1A]/5">

      {/* Main footer */}
      <div className="max-w-[1600px] mx-auto px-6 pt-14 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-8">

          {/* ── Brand ── */}
          <div className="col-span-2 md:col-span-1">
            <div className="mb-3">
              <LogoFull size="sm" />
            </div>
            <p className="text-sm text-[#555] leading-relaxed max-w-[200px]">
              Australia&apos;s home for nail &amp; lash artists.
            </p>
          </div>

          {/* ── Book ── */}
          <div>
            <h4 className="section-label mb-5">Book</h4>
            <ul className="space-y-3.5">
              <li>
                <Link href="/search?category=NAILS" className="text-sm text-[#555] hover:text-[#1A1A1A] transition-colors duration-200">
                  Nail artists
                </Link>
              </li>
              <li>
                <Link href="/search?category=LASHES" className="text-sm text-[#555] hover:text-[#1A1A1A] transition-colors duration-200">
                  Lash artists
                </Link>
              </li>
            </ul>
          </div>

          {/* ── For artists ── */}
          <div>
            <h4 className="section-label mb-5">For artists</h4>
            <ul className="space-y-3.5">
              <li>
                <Link href="/register/provider" className="text-sm text-[#555] hover:text-[#1A1A1A] transition-colors duration-200">
                  Become an artist
                </Link>
              </li>
              <li>
                <Link href="/how-it-works/earn" className="text-sm text-[#555] hover:text-[#1A1A1A] transition-colors duration-200">
                  Start earning
                </Link>
              </li>
            </ul>
          </div>

          {/* ── Help ── */}
          <div>
            <h4 className="section-label mb-5">Help</h4>
            <ul className="space-y-3.5">
              <li>
                <Link href="/contact" className="text-sm text-[#555] hover:text-[#1A1A1A] transition-colors duration-200">
                  FAQ &amp; contact
                </Link>
              </li>
              <li>
                <Link href="/trust" className="text-sm text-[#555] hover:text-[#1A1A1A] transition-colors duration-200">
                  Trust &amp; safety
                </Link>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="border-t border-[#1A1A1A]/5">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-[#8A8A8A]">
          <p>© {new Date().getFullYear()} Sparq Pty Ltd. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/trust" className="hover:text-[#1A1A1A] transition-colors duration-200">Privacy</Link>
            <Link href="/trust" className="hover:text-[#1A1A1A] transition-colors duration-200">Terms</Link>
          </div>
        </div>
      </div>

    </footer>
  )
}
