'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Repeat } from 'lucide-react'

interface Props {
  providerId: string
  providerFirstName: string
}

export function RepeatBookingBanner({ providerId, providerFirstName }: Props) {
  const { data: session } = useSession()
  const [pastCount, setPastCount] = useState(0)

  useEffect(() => {
    if (!session?.user) return
    fetch(`/api/bookings?providerId=${providerId}&status=COMPLETED&limit=1`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.count) setPastCount(d.count)
      })
      .catch(() => {})
  }, [session, providerId])

  if (!pastCount) return null

  return (
    <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3">
      <Repeat className="h-4 w-4 flex-shrink-0 text-[#E96B56]" />
      <p className="flex-1 text-sm text-[#1A1A1A]">
        You&apos;ve booked with {providerFirstName} before
      </p>
      <Link
        href={`/book/${providerId}`}
        className="whitespace-nowrap rounded-lg bg-[#E96B56] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#a63a29]"
      >
        Book again
      </Link>
    </div>
  )
}
