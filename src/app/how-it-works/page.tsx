import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight, Star, BadgeCheck, TrendingUp, Zap,
  Shield, RefreshCw, Search, CalendarCheck, Sparkles,
} from 'lucide-react'

export const metadata = {
  title: 'How It Works | Sparq',
  description: 'Book trusted beauty artists near you — or turn your skills into income on Sparq.',
}

const STEPS = [
  {
    number: '01',
    icon: Search,
    title: 'Discover',
    description: 'Browse artists by location, specialty, and price. View real portfolios and genuine reviews.',
  },
  {
    number: '02',
    icon: CalendarCheck,
    title: 'Choose',
    description: 'Compare artists, pick your preferred time, and select at-home visit or in-studio.',
  },
  {
    number: '03',
    icon: Sparkles,
    title: 'Book',
    description: 'Pay securely through the app. Receive an instant confirmation and reminder.',
  },
]

const TRUST = [
  { icon: BadgeCheck, label: 'Verified artists',   sub: 'Every artist is ID-checked and reviewed' },
  { icon: Star,       label: '4.9 avg rating',     sub: 'Across 18,000+ completed bookings' },
  { icon: Shield,     label: 'Secure payments',    sub: 'Stripe-powered. Your money is protected' },
  { icon: RefreshCw,  label: 'Free cancellation',  sub: 'Cancel up to 24 hours before your visit' },
]

const INSPIRATION = [
  {
    src: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&h=750&fit=crop&q=85',
    alt: 'Gel nail art',
  },
  {
    src: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=750&fit=crop&q=85',
    alt: 'Lash extensions',
  },
  {
    src: 'https://images.unsplash.com/photo-1583241475880-083f84372725?w=600&h=750&fit=crop&q=85',
    alt: 'Nail art design',
  },
  {
    src: 'https://images.unsplash.com/photo-1487412947147-5cebf100d293?w=600&h=750&fit=crop&q=85',
    alt: 'Beauty result',
  },
]

export default function HowItWorksPage() {
  return (
    <div className="bg-[#FDFBF7]">

      {/* ── Hero — compressed ── */}
      <section className="pt-20 pb-6 md:pt-24 md:pb-8 text-center px-6">
        <div className="mx-auto max-w-lg">
          <div className="inline-flex items-center gap-2 bg-white border border-[#e8e1de] rounded-full px-4 py-2 mb-5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#1a9e6f] animate-pulse flex-shrink-0" />
            <span className="text-sm text-[#555]">
              <span className="font-semibold text-[#1A1A1A]">43 artists</span> available in Sydney today
            </span>
          </div>
          <h1 className="font-headline text-4xl md:text-[3rem] text-[#1A1A1A] leading-[1.08] mb-3">
            Book a service or<br />start earning
          </h1>
          <p className="text-base text-[#555]">Choose your path below.</p>
        </div>
      </section>

      {/* ── Split cards ── */}
      <section className="px-6 pb-12 max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">

          {/* Customer card */}
          <Link
            href="/search"
            className="group relative rounded-[1.875rem] overflow-hidden block min-h-[500px] md:min-h-[560px] bg-[#f3ece9] cursor-pointer
                       transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_32px_72px_rgba(0,0,0,0.2)]"
          >
            <Image
              src="https://images.unsplash.com/photo-1604654894610-df63bc536371?w=900&h=1100&fit=crop&q=85"
              alt="Beautiful nail art result"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover group-hover:scale-[1.05] transition-transform duration-700"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/0" />

            <div className="absolute top-5 left-5 right-5 flex items-center justify-between">
              <span className="bg-white/15 backdrop-blur-md border border-white/25 text-white text-xs font-semibold px-3.5 py-1.5 rounded-full">
                For clients
              </span>
              <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md">
                <Star className="w-3 h-3 fill-[#E96B56] text-[#E96B56]" />
                <span className="text-xs font-bold text-[#1A1A1A]">4.9</span>
                <span className="text-[#555] text-xs">· 18k+ bookings</span>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-7 md:p-8">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1 text-white text-xs font-semibold">
                  From $45
                </span>
                <span className="flex items-center gap-1.5 bg-[#1a9e6f]/80 backdrop-blur-sm rounded-full px-3 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse flex-shrink-0" />
                  <span className="text-white text-xs font-semibold">Available today</span>
                </span>
              </div>
              <h2 className="font-headline text-[2rem] md:text-[2.375rem] text-white leading-[1.05] mb-2">
                Book a beauty service
              </h2>
              <p className="text-white/70 text-sm leading-relaxed mb-6">
                Real portfolios. Genuine reviews. Book in minutes.
              </p>
              <div>
                <span className="flex md:inline-flex items-center justify-center md:justify-start gap-2 bg-white text-[#1A1A1A] font-semibold text-[15px] px-7 py-3.5 rounded-full
                                 group-hover:bg-[#E96B56] group-hover:text-white transition-all duration-300 shadow-md">
                  Browse artists near you <ArrowRight className="w-4 h-4" />
                </span>
                <p className="text-white/40 text-xs mt-3">No account needed to browse</p>
              </div>
            </div>
          </Link>

          {/* Artist card */}
          <Link
            href="/register/provider"
            className="group relative rounded-[1.875rem] overflow-hidden block min-h-[500px] md:min-h-[560px] bg-[#1a1007] cursor-pointer
                       transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_32px_72px_rgba(0,0,0,0.2)]"
          >
            <Image
              src="https://images.unsplash.com/photo-1487412947147-5cebf100d293?w=900&h=1100&fit=crop&q=85"
              alt="Beauty artist at work"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover object-top group-hover:scale-[1.05] transition-transform duration-700"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f0500]/95 via-black/45 to-black/0" />

            <div className="absolute top-5 left-5 right-5 flex items-center justify-between">
              <span className="bg-[#E96B56] text-white text-xs font-semibold px-3.5 py-1.5 rounded-full">
                For artists
              </span>
              <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md">
                <TrendingUp className="w-3 h-3 text-[#1a9e6f]" />
                <span className="text-xs font-bold text-[#1A1A1A]">Avg. $850/wk</span>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-7 md:p-8">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1">
                  <BadgeCheck className="w-3.5 h-3.5 text-white/70 flex-shrink-0" />
                  <span className="text-white text-xs font-semibold">2,400+ already earning</span>
                </span>
                <span className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1">
                  <Zap className="w-3 h-3 text-[#E96B56] flex-shrink-0" />
                  <span className="text-white text-xs font-semibold">First booking in 48 hrs</span>
                </span>
              </div>
              <h2 className="font-headline text-[2rem] md:text-[2.375rem] text-white leading-[1.05] mb-2">
                Turn your skills into income
              </h2>
              <p className="text-white/70 text-sm leading-relaxed mb-6">
                Set your prices. Work your hours. Clients come to you.
              </p>
              <div>
                <span className="flex md:inline-flex items-center justify-center md:justify-start gap-2 bg-[#E96B56] text-white font-semibold text-[15px] px-7 py-3.5 rounded-full
                                 group-hover:bg-white group-hover:text-[#1A1A1A] transition-all duration-300 shadow-md">
                  Get started free <ArrowRight className="w-4 h-4" />
                </span>
                <p className="text-white/40 text-xs mt-3">Free to join · No monthly fees · No lock-in</p>
              </div>
            </div>
          </Link>

        </div>

        {/* Activity strip */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-2 text-xs text-[#8A8A8A]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1a9e6f] animate-pulse flex-shrink-0" />
            Emma just booked a nail set in Melbourne
          </div>
          <span className="hidden sm:block w-px h-3 bg-[#e8e1de]" />
          <div className="flex items-center gap-2 text-xs text-[#8A8A8A]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E96B56] animate-pulse flex-shrink-0" />
            Lily joined as an artist today
          </div>
          <span className="hidden sm:block w-px h-3 bg-[#e8e1de]" />
          <span className="text-xs text-[#8A8A8A]">
            <span className="font-semibold text-[#1A1A1A]">4.9 ★</span> average across 18,000+ bookings
          </span>
        </div>
      </section>

      {/* ── Section 1: Book in 3 steps ── */}
      <section className="bg-[#f9f2ef] py-16">
        <div className="px-6 max-w-[1200px] mx-auto">
          <div className="text-center mb-10">
            <p className="section-label mb-3">For clients</p>
            <h2 className="font-headline text-3xl md:text-[2.5rem] text-[#1A1A1A] leading-[1.1]">
              Book in 3 simple steps
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STEPS.map((step) => {
              const Icon = step.icon
              return (
                <div key={step.number} className="bg-white rounded-2xl p-7 flex flex-col">
                  <div className="flex items-start justify-between mb-5">
                    <span className="font-headline text-5xl text-[#f3ece9] leading-none select-none">
                      {step.number}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-[#f9ede9] flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-[#E96B56]" />
                    </div>
                  </div>
                  <h3 className="font-headline text-xl text-[#1A1A1A] mb-2">{step.title}</h3>
                  <p className="text-sm text-[#555] leading-relaxed">{step.description}</p>
                </div>
              )
            })}
          </div>
          <div className="text-center mt-8">
            <Link
              href="/search"
              className="inline-flex items-center gap-2 rounded-full bg-[#E96B56] hover:bg-[#a63a29] px-7 py-3.5 text-sm font-semibold text-white transition-colors duration-300 shadow-[0_4px_14px_rgba(233,107,86,0.25)]"
            >
              Find an artist <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section 2: Trust signals ── */}
      <section className="bg-white py-14">
        <div className="px-6 max-w-[1200px] mx-auto">
          <div className="text-center mb-10">
            <p className="section-label mb-3">Why Sparq</p>
            <h2 className="font-headline text-3xl md:text-[2.5rem] text-[#1A1A1A] leading-[1.1]">
              Built on trust
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TRUST.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.label}
                  className="flex flex-col items-center text-center p-6 rounded-2xl bg-[#FDFBF7] border border-[#f3ece9]"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#f9ede9] flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-[#E96B56]" />
                  </div>
                  <h4 className="font-semibold text-sm text-[#1A1A1A] mb-1">{item.label}</h4>
                  <p className="text-xs text-[#8A8A8A] leading-relaxed">{item.sub}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Section 3: Visual inspiration ── */}
      <section className="py-14 px-6 max-w-[1200px] mx-auto">
        <div className="flex items-end justify-between mb-7">
          <div>
            <p className="section-label mb-3">The work</p>
            <h2 className="font-headline text-3xl md:text-[2.5rem] text-[#1A1A1A] leading-[1.1]">
              See what&apos;s possible
            </h2>
          </div>
          <Link
            href="/search"
            className="hidden md:inline-flex items-center gap-1.5 text-sm font-semibold text-[#E96B56] hover:text-[#a63a29] transition-colors"
          >
            Browse all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {INSPIRATION.map((img, i) => (
            <Link
              key={i}
              href="/search"
              className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#f3ece9] block"
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover group-hover:scale-[1.05] transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-300" />
            </Link>
          ))}
        </div>

        <div className="mt-5 text-center md:hidden">
          <Link href="/search" className="text-sm font-semibold text-[#E96B56]">
            Browse all →
          </Link>
        </div>
      </section>

      {/* ── Section 4: Final dual CTA ── */}
      <section className="bg-[#1A1A1A] py-20 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[280px] bg-[#E96B56]/8 rounded-full blur-3xl pointer-events-none" />
        <div className="px-6 max-w-[1200px] mx-auto relative text-center">
          <p className="section-label text-[#E96B56]/70 mb-4">Ready?</p>
          <h2 className="font-headline text-3xl md:text-[2.75rem] text-white leading-[1.1] mb-10">
            Your next move starts here.
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/search"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white text-[#1A1A1A] hover:bg-[#E96B56] hover:text-white px-8 py-4 text-[15px] font-semibold transition-all duration-300"
            >
              Book a service <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/register/provider"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#E96B56] text-white hover:bg-white hover:text-[#1A1A1A] px-8 py-4 text-[15px] font-semibold transition-all duration-300"
            >
              Start earning <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <p className="text-white/30 text-xs mt-6">
            Free to browse · Free to join · No credit card required
          </p>
        </div>
      </section>

    </div>
  )
}
