/**
 * AUDIT-009 — Cancellation policy card for the public provider profile.
 *
 * Until now the cancellation terms only appeared inside the booking flow.
 * Customers browsing profiles couldn't tell a STRICT artist from a
 * FLEXIBLE one until they got all the way to checkout — a bad UX and,
 * for rebooking disputes, arguably unfair.
 */

import { CalendarX, Clock } from 'lucide-react'
import { describeCancellationPolicy } from '@/lib/cancellation-policy'

interface CancellationPolicyCardProps {
  policyType: string | null | undefined
  customText?: string | null
  artistFirstName?: string
}

export function CancellationPolicyCard({
  policyType,
  customText,
  artistFirstName,
}: CancellationPolicyCardProps) {
  const summary = describeCancellationPolicy(policyType, customText)

  return (
    <section className="py-8 border-b border-[#1A1A1A]/5" aria-labelledby="cancellation-policy-heading">
      <div className="flex items-center gap-2 mb-4">
        <CalendarX className="w-5 h-5 text-[#717171]" />
        <h2 id="cancellation-policy-heading" className="font-headline text-xl text-[#1A1A1A]">
          Cancellation policy
        </h2>
        <span className="ml-2 inline-flex items-center rounded-full bg-[#f3ece9] px-2.5 py-0.5 text-xs font-medium text-[#1A1A1A]">
          {summary.label}
        </span>
      </div>

      <p className="text-sm text-[#1A1A1A] leading-relaxed">
        {summary.headline}
      </p>

      <ul className="mt-4 space-y-2">
        {summary.tiers.map(tier => (
          <li key={tier.window} className="flex items-start gap-3 text-sm">
            <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#717171]" />
            <div>
              <span className="text-[#1A1A1A]">{tier.window}</span>
              <span className="text-[#717171]"> — {tier.refund}</span>
            </div>
          </li>
        ))}
      </ul>

      {summary.customText && (
        <div className="mt-4 rounded-xl bg-[#f9f2ef] p-4 text-sm text-[#1A1A1A] leading-relaxed">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-[#717171]">
            From {artistFirstName ?? 'the artist'}
          </div>
          <p className="whitespace-pre-line">{summary.customText}</p>
        </div>
      )}

      <p className="mt-4 text-xs text-[#717171]">
        The policy is confirmed at checkout. Refunds are processed automatically based on when you cancel.
      </p>
    </section>
  )
}
