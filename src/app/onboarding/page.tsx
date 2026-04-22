'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Sparkles, ArrowRight } from 'lucide-react'

const OPTIONS = [
  {
    href:        '/search',
    icon:        Search,
    iconBg:      'bg-[#fdf3f1]',
    iconColor:   'text-[#E96B56]',
    title:       'Book a service',
    description: 'Browse verified artists, read real reviews, and book in minutes.',
  },
  {
    href:        '/register/provider',
    icon:        Sparkles,
    iconBg:      'bg-[#f5f0ff]',
    iconColor:   'text-[#8b5cf6]',
    title:       'Start earning',
    description: 'Share your work, set your rates, and get booked on your terms.',
  },
]

export default function OnboardingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Redirect unauthenticated visitors to login
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
    }
  }, [status, router])

  // Show nothing while session resolves
  if (status === 'loading' || status === 'unauthenticated') return null

  const firstName = session?.user?.name?.split(' ')[0] ?? null

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-5">
      <div className="w-full max-w-[400px] py-12">

        {/* ── Heading ── */}
        <div className="mb-8">
          {firstName && (
            <p className="text-sm font-medium text-[#E96B56] mb-2">
              Hi, {firstName}
            </p>
          )}
          <h1 className="text-[1.625rem] font-semibold text-[#1A1A1A] leading-[1.2] tracking-[-0.02em] mb-1.5">
            What would you like to do?
          </h1>
          <p className="text-sm text-[#8A8A8A]">
            You can always switch between both — this just gets you started.
          </p>
        </div>

        {/* ── Options ── */}
        <div className="space-y-3">
          {OPTIONS.map(({ href, icon: Icon, iconBg, iconColor, title, description }) => (
            <button
              key={href}
              type="button"
              onClick={() => router.push(href)}
              className="group w-full flex items-center gap-4 rounded-2xl border border-[#e8e1de] bg-white px-5 py-4 text-left transition-all duration-200 hover:border-[#1A1A1A]/20 hover:shadow-[0_2px_16px_rgba(0,0,0,0.06)] active:scale-[0.99]"
            >
              <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1A1A1A] mb-0.5">{title}</p>
                <p className="text-xs text-[#8A8A8A] leading-relaxed">{description}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#D5CEC9] group-hover:text-[#1A1A1A] transition-colors flex-shrink-0" />
            </button>
          ))}
        </div>

        {/* ── Skip ── */}
        <div className="mt-8 text-center">
          <Link
            href="/dashboard/customer"
            className="text-sm text-[#ADADAD] hover:text-[#717171] transition-colors"
          >
            Skip for now
          </Link>
        </div>

      </div>
    </div>
  )
}
