import Link from 'next/link'
import { BookOpen } from 'lucide-react'

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mx-auto max-w-xl">

        {/* Icon */}
        <div className="w-16 h-16 bg-[#fdf3f1] rounded-2xl flex items-center justify-center mx-auto mb-7">
          <BookOpen className="w-7 h-7 text-[#E96B56]" />
        </div>

        {/* Eyebrow */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#E96B56] mb-4">
          Blog
        </p>

        {/* Heading */}
        <h1 className="font-headline text-[2.5rem] md:text-[3.25rem] text-[#1A1A1A] leading-[1.1] mb-5">
          Stories from the community
        </h1>

        {/* Subtitle */}
        <p className="text-base md:text-lg text-[#717171] leading-relaxed mb-10">
          Beauty tips, artist spotlights, and booking guides — coming soon.
        </p>

        {/* CTA */}
        <Link
          href="/search"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#E96B56] to-[#C95444] px-8 py-3.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          Browse artists →
        </Link>

        {/* Subtle note */}
        <p className="text-xs text-[#717171] mt-8">
          Want early access to stories?{' '}
          <a
            href="mailto:hello@sparq.com.au"
            className="font-semibold text-[#1A1A1A] underline underline-offset-2 hover:text-[#E96B56] transition-colors"
          >
            Get in touch
          </a>
        </p>

      </div>
    </main>
  )
}
