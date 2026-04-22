'use client'

import Link from 'next/link'
import { Banknote, Camera, ShieldCheck, MessageSquare, LayoutGrid, CheckCircle2, ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Action {
  key: string
  priority: 'urgent' | 'high' | 'medium'
  icon: LucideIcon
  label: string
  title: string
  description: string
  impact: string
  cta: string
  href: string
}

export interface NextBestActionsProps {
  stripeAccountId: string | null | undefined
  unrespondedCount: number
  portfolioCount: number
  avgResponseTimeHours: number
  services: Array<{ isActive: boolean }>
  isVerified: boolean
}

const STYLES = {
  urgent: {
    card: 'border-red-200 bg-gradient-to-br from-red-50/60 to-white',
    label: 'bg-red-100 text-red-700',
    impact: 'text-red-600 bg-red-50',
    cta: 'bg-red-500 hover:bg-red-600 text-white shadow-sm',
    iconWrap: 'bg-red-50 shadow-sm',
  },
  high: {
    card: 'border-amber-200 bg-gradient-to-br from-amber-50/60 to-white',
    label: 'bg-amber-100 text-amber-700',
    impact: 'text-[#E96B56] bg-[#fff5f3]',
    cta: 'bg-[#E96B56] hover:bg-[#a63a29] text-white shadow-sm',
    iconWrap: 'bg-amber-50 shadow-sm',
  },
  medium: {
    card: 'border-[#e8e1de] bg-gradient-to-br from-[#f9f2ef]/50 to-white',
    label: 'bg-blue-50 text-blue-600',
    impact: 'text-[#717171] bg-[#f9f2ef]',
    cta: 'bg-[#1A1A1A] hover:bg-[#333] text-white shadow-sm',
    iconWrap: 'bg-[#f3ece9] shadow-sm',
  },
}

function buildActions({
  stripeAccountId,
  unrespondedCount,
  portfolioCount,
  avgResponseTimeHours: _avgResponseTimeHours,
  services,
  isVerified,
}: NextBestActionsProps): Action[] {
  const actions: Action[] = []

  if (!stripeAccountId) {
    actions.push({
      key: 'stripe',
      priority: 'urgent',
      icon: Banknote,
      label: 'Not set up',
      title: "You can't receive payments yet",
      description: 'Connect your bank account so every booking pays directly to you.',
      impact: 'Unlock earnings',
      cta: 'Connect bank',
      href: '/dashboard/provider/payouts',
    })
  }

  if (unrespondedCount > 0) {
    actions.push({
      key: 'reviews',
      priority: 'high',
      icon: MessageSquare,
      label: `${unrespondedCount} unanswered`,
      title: `Reply to ${unrespondedCount} review${unrespondedCount > 1 ? 's' : ''}`,
      description: 'Clients are 2× more likely to book when they see active replies from you.',
      impact: '2× conversion',
      cta: 'Reply now',
      href: '#reviews',
    })
  }

  if (!isVerified) {
    actions.push({
      key: 'verify',
      priority: 'high',
      icon: ShieldCheck,
      label: 'Unverified',
      title: 'Get your Verified badge',
      description: 'Verified artists earn 40% more on average and rank higher in search.',
      impact: '+40% earnings',
      cta: 'Get verified',
      href: '/dashboard/provider/verification',
    })
  }

  if (portfolioCount < 4) {
    const need = 4 - portfolioCount
    actions.push({
      key: 'portfolio',
      priority: 'high',
      icon: Camera,
      label: 'Low photos',
      title: `Add ${need} more photo${need !== 1 ? 's' : ''} to your portfolio`,
      description: 'Profiles with 4+ photos get 3× more enquiries from clients.',
      impact: '3× profile views',
      cta: 'Add photos',
      href: '/dashboard/provider/portfolio',
    })
  }

  const inactiveCount = services.filter(s => !s.isActive).length
  if (inactiveCount > 0) {
    actions.push({
      key: 'services',
      priority: 'medium',
      icon: LayoutGrid,
      label: `${inactiveCount} inactive`,
      title: `${inactiveCount} service${inactiveCount > 1 ? 's are' : ' is'} hidden from clients`,
      description: 'Inactive services are invisible in search results — you could be missing bookings.',
      impact: 'More visibility',
      cta: 'Activate now',
      href: '/dashboard/provider/services',
    })
  }

  // Show max 3, highest priority first
  return actions.slice(0, 3)
}

export function NextBestActions(props: NextBestActionsProps) {
  const actions = buildActions(props)

  if (actions.length === 0) {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50/60 to-white px-5 py-4">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100">
          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-[#1A1A1A]">You&apos;re fully set up ✦</p>
          <p className="text-xs text-[#717171]">
            Profile optimised, payments connected, portfolio looking great — now focus on delivering.
          </p>
        </div>
      </div>
    )
  }

  const cols =
    actions.length === 1 ? 'grid-cols-1' :
    actions.length === 2 ? 'grid-cols-1 sm:grid-cols-2' :
    'grid-cols-1 sm:grid-cols-3'

  return (
    <div className="mb-6">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#717171]">
        {actions.length} action{actions.length > 1 ? 's' : ''} to increase bookings
      </p>
      <div className={`grid gap-3 ${cols}`}>
        {actions.map(action => {
          const s = STYLES[action.priority]
          const Icon = action.icon
          return (
            <div
              key={action.key}
              className={`flex flex-col rounded-2xl border p-4 ${s.card}`}
            >
              {/* Top row */}
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${s.iconWrap}`}>
                  <Icon className="h-4 w-4 text-[#1A1A1A]" />
                </div>
                <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-micro font-bold ${s.label}`}>
                  {action.label}
                </span>
              </div>

              {/* Content */}
              <p className="mb-1 text-sm font-bold leading-snug text-[#1A1A1A]">{action.title}</p>
              <p className="mb-3 flex-1 text-xs leading-relaxed text-[#717171]">{action.description}</p>

              {/* Bottom row */}
              <div className="mt-auto flex items-center justify-between gap-2">
                <span className={`rounded-lg px-2 py-1 text-micro font-bold ${s.impact}`}>
                  {action.impact}
                </span>
                <Link
                  href={action.href}
                  className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${s.cta}`}
                >
                  {action.cta}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
