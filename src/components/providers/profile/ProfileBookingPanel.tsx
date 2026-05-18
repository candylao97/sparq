import Link from 'next/link'
import { Star } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

type Service = { id: string; title: string; duration: number; price: number }

/** Booking card — visual shell. Date/time are a preview; "Request to book"
 *  deep-links into the existing /book/[id] flow (per scope decision). */
function BookingFields({ service, providerProfileId }: { service?: Service; providerProfileId: string }) {
  return (
    <>
      <Link
        href={`/book/${providerProfileId}${service ? `?serviceId=${service.id}` : ''}`}
        className="mb-2.5 flex items-center gap-2.5 rounded-[10px] border border-sparq-border px-3.5 py-2.5 hover:border-sparq-ink"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[10.5px] font-bold tracking-[0.05em]">SERVICE</span>
          <span className="mt-px block truncate text-[13px]">
            {service ? `${service.title} · ${service.duration} min` : 'Choose a service'}
          </span>
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[#717171]" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </Link>
      <Link
        href={`/book/${providerProfileId}${service ? `?serviceId=${service.id}` : ''}`}
        className="mb-3 flex items-center gap-2.5 rounded-[10px] border border-sparq-border px-3.5 py-2.5 hover:border-sparq-ink"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[10.5px] font-bold tracking-[0.05em]">DATE &amp; TIME</span>
          <span className="mt-px block truncate text-[13px] text-[#717171]">Pick on the next step</span>
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[#717171]" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
      </Link>
    </>
  )
}

export function ProfileBookingPanel({
  providerProfileId,
  service,
  averageRating,
  reviewCount,
}: {
  providerProfileId: string
  service?: Service
  averageRating: number
  reviewCount: number
}) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 self-start rounded-xl border border-sparq-border bg-white p-[22px] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="mb-4 flex items-baseline gap-1.5">
          <span className="text-[24px] font-bold tabular-nums">{service ? formatCurrency(service.price) : '—'}</span>
          {service && <span className="text-[13px] text-[#717171]">/ {service.title} · {service.duration} min</span>}
          {reviewCount > 0 && (
            <span className="ml-auto inline-flex items-center gap-1 text-[13px] font-medium tabular-nums">
              <Star className="h-[11px] w-[11px] fill-sparq-ink text-sparq-ink" aria-hidden="true" />
              {averageRating.toFixed(2)}
            </span>
          )}
        </div>

        <BookingFields service={service} providerProfileId={providerProfileId} />

        {service && (
          <div className="my-[18px] flex items-center justify-between border-t border-sparq-border py-3.5 font-bold">
            <span className="text-[14px]">Total</span>
            <span className="text-[18px] tabular-nums">{formatCurrency(service.price)} AUD</span>
          </div>
        )}

        <Link
          href={`/book/${providerProfileId}${service ? `?serviceId=${service.id}` : ''}`}
          className="block w-full rounded-[10px] bg-sparq-coral py-3.5 text-center text-[15px] font-bold text-white shadow-[0_6px_18px_rgba(233,107,86,0.28)] hover:bg-sparq-coral-dark"
        >
          Request to book
        </Link>
        <p className="mt-2.5 text-center text-[12px] leading-[1.55] text-[#717171]">
          <span className="font-semibold text-sparq-ink">You won&apos;t be charged yet.</span> The artist confirms within 24 hours.
        </p>

        <div className="mt-3.5 flex items-start gap-2.5 rounded-[10px] bg-sparq-cream px-3.5 py-3 text-[12.5px] leading-[1.55] text-sparq-body">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-px flex-shrink-0 text-sparq-coral-dark" aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
          </svg>
          <span><strong className="font-semibold text-sparq-ink">Free cancellation</strong> until 24 hours before your appointment. After that, a 50% refund applies.</span>
        </div>
      </div>
    </aside>
  )
}

/** Mobile sticky bottom CTA (replaces the sidebar < lg). */
export function ProfileMobileCta({
  providerProfileId,
  service,
}: {
  providerProfileId: string
  service?: Service
}) {
  return (
    <div className="sticky bottom-0 left-0 right-0 z-[6] flex items-center gap-3 border-t border-sparq-border bg-white px-5 py-3 lg:hidden">
      <div className="min-w-0 flex-1">
        <div className="text-[16px] font-bold tabular-nums">
          {service ? formatCurrency(service.price) : 'Get a quote'}{' '}
          {service && <small className="text-[12px] font-normal text-[#717171]">· {service.title}</small>}
        </div>
        <div className="text-[12px] text-[#717171] underline decoration-[#717171] underline-offset-2">Pick a date &amp; time</div>
      </div>
      <Link
        href={`/book/${providerProfileId}${service ? `?serviceId=${service.id}` : ''}`}
        className="flex-shrink-0 rounded-[10px] bg-sparq-coral px-5 py-3 text-[14px] font-bold text-white"
      >
        Request to book
      </Link>
    </div>
  )
}
