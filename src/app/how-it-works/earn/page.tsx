import Link from 'next/link'
import {
  UserCircle,
  DollarSign,
  CalendarCheck,
  Star,
  ArrowRight,
  ChevronLeft,
  CheckCircle2,
  Clock,
  TrendingUp,
  Sparkles,
} from 'lucide-react'

export const metadata = {
  title: 'Start Earning | Sparq',
  description: 'Join 2,400+ artists earning on Sparq. Set your prices, choose your hours, keep the majority.',
}

const STEPS = [
  {
    number: '01',
    icon: UserCircle,
    title: 'Create your profile',
    description:
      'Add your portfolio photos, list your services, and set your prices. Takes about 5 minutes.',
    note: 'Free to list — no setup fees',
  },
  {
    number: '02',
    icon: CalendarCheck,
    title: 'Set your terms',
    description:
      'Choose your working hours, service area, and whether you work at home visits, in-studio, or both.',
    note: 'You stay in full control',
  },
  {
    number: '03',
    icon: Star,
    title: 'Start getting booked',
    description:
      'Sparq handles discovery, reminders, and secure payments. You focus on the work — we handle the rest.',
    note: 'Bookings go straight to your calendar',
  },
  {
    number: '04',
    icon: DollarSign,
    title: 'Get paid',
    description:
      'Payment is released after each completed appointment, directly to your account. No chasing clients.',
    note: 'Fast, reliable payouts',
  },
]

const PERKS = [
  { icon: Clock, label: 'Work when you want', sub: 'Set your own schedule' },
  { icon: TrendingUp, label: 'Earn what you\'re worth', sub: 'You set your prices' },
  { icon: Sparkles, label: 'Build loyal clientele', sub: 'Turn first-timers into regulars' },
]

export default function HowToEarnPage() {
  return (
    <div className="bg-[#FDFBF7] min-h-screen">

      {/* ── Back ── */}
      <div className="pt-24 pb-0 px-6 max-w-5xl mx-auto">
        <Link
          href="/how-it-works"
          className="inline-flex items-center gap-1.5 text-sm text-[#555] hover:text-[#1A1A1A] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> How it works
        </Link>
      </div>

      {/* ── Hero ── */}
      <section className="pt-8 pb-16 md:pb-20 text-center px-6">
        <div className="mx-auto max-w-xl">
          <p className="section-label mb-4">For artists</p>
          <h1 className="font-headline text-4xl md:text-[3rem] text-[#1A1A1A] leading-[1.1] mb-5">
            Your skill.<br />
            <span className="italic text-[#E96B56]">Your income.</span>
          </h1>
          <p className="text-base text-[#555] leading-relaxed mb-8 max-w-sm mx-auto">
            Join 2,400+ artists already earning on Sparq. Free to join. No monthly fees.
          </p>
          <Link
            href="/register/provider"
            className="inline-flex items-center gap-2 rounded-full bg-[#E96B56] hover:bg-[#a63a29] px-8 py-4 text-base font-semibold text-white transition-colors duration-300 shadow-[0_4px_14px_rgba(233,107,86,0.25)]"
          >
            Create your free profile <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="text-[#8A8A8A] text-xs mt-3">No credit card required</p>
        </div>
      </section>

      {/* ── Perks strip ── */}
      <div className="border-y border-[#e8e1de] bg-white py-6 px-6">
        <div className="mx-auto max-w-3xl grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-0 sm:divide-x sm:divide-[#e8e1de]">
          {PERKS.map((perk) => {
            const Icon = perk.icon
            return (
              <div key={perk.label} className="flex items-center gap-3 sm:justify-center sm:px-8">
                <div className="w-9 h-9 rounded-xl bg-[#f9ede9] flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-[#E96B56]" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-[#1A1A1A]">{perk.label}</p>
                  <p className="text-xs text-[#8A8A8A]">{perk.sub}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Steps ── */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-10">
            <p className="section-label mb-3">Getting started</p>
            <h2 className="font-headline text-3xl md:text-4xl text-[#1A1A1A] leading-[1.1]">
              Up and running in 4 steps
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                  <p className="text-sm text-[#555] leading-relaxed flex-1">{step.description}</p>
                  <div className="flex items-center gap-2 pt-5 mt-5 border-t border-[#f3ece9]">
                    <CheckCircle2 className="w-4 h-4 text-[#E96B56] flex-shrink-0" />
                    <span className="text-xs text-[#8A8A8A] font-medium">{step.note}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Dark CTA ── */}
      <section className="bg-[#1A1A1A] py-20 md:py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#E96B56]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="mx-auto max-w-5xl px-6 relative text-center">
          <p className="section-label text-[#E96B56]/70 mb-4">The deal</p>
          <h2 className="font-headline text-3xl md:text-4xl text-white leading-[1.1] mb-10">
            No catch. Just earnings.
          </h2>

          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 mb-12">
            {['Free to list', 'No monthly fees', 'You keep the majority', 'Pause anytime'].map((item) => (
              <div key={item} className="flex items-center gap-2 text-white/75 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4 text-[#E96B56] flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>

          <Link
            href="/register/provider"
            className="inline-flex items-center gap-2 rounded-full bg-[#E96B56] hover:bg-[#a63a29] px-8 py-4 text-base font-semibold text-white transition-colors duration-300"
          >
            Create your free profile <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="text-white/30 text-xs mt-4">Free to join · No credit card required</p>
        </div>
      </section>

    </div>
  )
}
