import Link from 'next/link'
import {
  Search,
  SlidersHorizontal,
  CalendarCheck,
  BadgeCheck,
  CreditCard,
  RotateCcw,
  Star,
  ArrowRight,
  ChevronLeft,
  CheckCircle2,
} from 'lucide-react'

export const metadata = {
  title: 'How to Book | Sparq',
  description: 'Book a nail or lash artist near you in 3 simple steps.',
}

const STEPS = [
  {
    number: '01',
    icon: Search,
    title: 'Find artists near you',
    description:
      'Browse verified artists by category, location, and price range. Every profile shows a real portfolio — no stock photos.',
    trust: 'Identity-verified profiles only',
  },
  {
    number: '02',
    icon: SlidersHorizontal,
    title: 'Compare and choose',
    description:
      'Read genuine reviews from real clients, check live availability, and compare pricing. No hidden fees — ever.',
    trust: 'Prices shown upfront',
  },
  {
    number: '03',
    icon: CalendarCheck,
    title: 'Book in under 2 minutes',
    description:
      'Pick your date, time, and preferred location — at home or in-studio. Pay securely and get an instant confirmation.',
    trust: 'Free cancellation up to 24 hours',
  },
]

const TRUST = [
  { icon: BadgeCheck, text: 'Every artist is identity-verified' },
  { icon: CreditCard, text: 'Payment held securely — released after your appointment' },
  { icon: RotateCcw, text: 'Free cancellation up to 24 hours before' },
  { icon: Star, text: 'Only genuine clients can leave reviews' },
]

export default function HowToBookPage() {
  return (
    <div className="bg-white min-h-screen">

      {/* ── Back ── */}
      <div className="pt-24 pb-0 px-4 sm:px-8 lg:px-12 xl:px-20 max-w-[1600px] mx-auto">
        <Link
          href="/how-it-works"
          className="inline-flex items-center gap-1.5 text-sm text-[#717171] hover:text-[#1A1A1A] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> How it works
        </Link>
      </div>

      {/* ── Hero ── */}
      <section className="pt-8 pb-16 md:pb-20 text-center px-4 sm:px-8 lg:px-12 xl:px-20">
        <div className="mx-auto max-w-[1600px]">
          <p className="section-label mb-4">For clients</p>
          <h1 className="font-headline text-4xl md:text-[3rem] text-[#1A1A1A] leading-[1.1] mb-5">
            Your appointment,<br />
            <span className="italic text-[#E96B56]">in 3 simple steps.</span>
          </h1>
          <p className="text-base text-[#717171] leading-relaxed">
            No DMs. No waiting. Just browse, compare, and book.
          </p>
        </div>
      </section>

      {/* ── Steps ── */}
      <section className="bg-[#f9f2ef] py-16 md:py-20">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-8 lg:px-12 xl:px-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {STEPS.map((step) => {
              const Icon = step.icon
              return (
                <div key={step.number} className="bg-white rounded-2xl border border-[#e8e1de] p-7 flex flex-col">
                  <div className="flex items-start justify-between mb-6">
                    <span className="font-headline text-5xl text-[#f3ece9] leading-none select-none">
                      {step.number}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-[#f9f2ef] flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[#E96B56]" />
                    </div>
                  </div>
                  <h3 className="font-headline text-xl text-[#1A1A1A] mb-3">{step.title}</h3>
                  <p className="text-sm text-[#717171] leading-relaxed flex-1">{step.description}</p>
                  <div className="flex items-center gap-2 pt-5 mt-5 border-t border-[#f3ece9]">
                    <CheckCircle2 className="w-4 h-4 text-[#E96B56] flex-shrink-0" />
                    <span className="text-xs text-[#8A8A8A] font-medium">{step.trust}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Trust ── */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-8 lg:px-12 xl:px-20">
          <div className="text-center mb-10">
            <p className="section-label mb-3">Your protection</p>
            <h2 className="font-headline text-3xl md:text-4xl text-[#1A1A1A] leading-[1.1]">
              Built-in trust, every booking
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TRUST.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.text}
                  className="flex items-center gap-4 rounded-2xl bg-white border border-[#e8e1de] p-5"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#f9f2ef] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-[#E96B56]" />
                  </div>
                  <p className="font-semibold text-[#1A1A1A] text-sm">{item.text}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="pb-20 md:pb-24 px-4 sm:px-8 lg:px-12 xl:px-20">
        <div className="mx-auto max-w-[1600px]">
          <div className="bg-[#1A1A1A] rounded-[1.875rem] px-8 py-14 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#E96B56]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <p className="section-label text-[#E96B56]/70 mb-4">Ready?</p>
              <h2 className="font-headline text-3xl md:text-4xl text-white leading-[1.1] mb-8">
                Find your artist today
              </h2>
              <Link
                href="/search"
                className="inline-flex items-center gap-2 rounded-full bg-[#E96B56] hover:bg-[#a63a29] px-8 py-4 text-base font-semibold text-white transition-colors duration-300 shadow-[0_4px_16px_rgba(233,107,86,0.3)]"
              >
                Browse artists near you <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
