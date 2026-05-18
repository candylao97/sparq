import Link from 'next/link'
import { Menu } from 'lucide-react'
import { SparkMark } from './SparkMark'

export function HomeNav() {
  return (
    <nav className="border-b border-sparq-border bg-white" aria-label="Primary">
      <div className="mx-auto w-full max-w-[1440px] px-5 md:px-8 lg:px-12">
        <div className="flex items-center justify-between py-3.5 md:py-[18px]">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-[20px] font-extrabold tracking-[-0.02em] text-sparq-coral md:text-[22px]"
              aria-label="Sparq home"
            >
              <SparkMark size={20} />
              sparq
            </Link>
            <div className="hidden gap-1 lg:flex">
              <Link href="/how-it-works" className="rounded-[10px] px-3.5 py-2 text-sm font-medium text-sparq-ink hover:bg-sparq-surface-warm">
                How it works
              </Link>
              <Link href="/about" className="rounded-[10px] px-3.5 py-2 text-sm font-medium text-sparq-ink hover:bg-sparq-surface-warm">
                About
              </Link>
            </div>
          </div>
          <div className="hidden items-center gap-1.5 lg:flex">
            <Link href="/login" className="rounded-[10px] bg-sparq-ink px-4 py-2.5 text-sm font-semibold text-white">Log in</Link>
          </div>
          <div className="flex items-center gap-2 lg:hidden">
            <Link href="/login" className="rounded-[10px] bg-sparq-ink px-4 py-2.5 text-sm font-semibold text-white">Log in</Link>
            <Link href="/login" aria-label="Open menu" className="flex h-9 w-9 items-center justify-center rounded-[10px] text-sparq-ink">
              <Menu className="h-[18px] w-[18px]" />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
