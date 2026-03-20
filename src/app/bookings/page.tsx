'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { CalendarDays, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { BookingStatusPill } from '@/components/providers/BookingStatusPill'

type BookingData = {
  id: string
  date: string
  time: string
  totalPrice: number
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'DECLINED'
  service: {
    title: string
    duration: number
    category: string
  }
  customer: {
    name: string | null
    image: string | null
  }
  provider: {
    name: string | null
    image: string | null
  }
  review: {
    id: string
    rating: number
  } | null
}

export default function BookingsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [bookings, setBookings] = useState<BookingData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  const fetchBookings = useCallback(async () => {
    try {
      const res = await fetch('/api/bookings?role=customer')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setBookings(data.bookings || [])
    } catch {
      toast.error('Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchBookings()
    }
  }, [status, fetchBookings])

  const upcomingBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.status === 'PENDING' || b.status === 'CONFIRMED')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [bookings]
  )

  const pastBookings = useMemo(
    () =>
      bookings
        .filter(
          (b) => b.status === 'COMPLETED' || b.status === 'CANCELLED' || b.status === 'DECLINED'
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [bookings]
  )

  const displayedBookings = activeTab === 'upcoming' ? upcomingBookings : pastBookings

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#FDFBF7_100%)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E96B56] border-t-transparent" />
      </div>
    )
  }

  if (status === 'unauthenticated') return null

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#FDFBF7_100%)]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <CalendarDays className="h-7 w-7 text-[#E96B56]" />
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Bookings</h1>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-6 border-b border-[#e8e1de]">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`relative pb-3 text-sm font-semibold transition-colors ${
              activeTab === 'upcoming' ? 'text-[#1A1A1A]' : 'text-[#717171] hover:text-[#717171]'
            }`}
          >
            Upcoming
            {upcomingBookings.length > 0 && (
              <span className="ml-2 rounded-full bg-[#f3ece9] px-2 py-0.5 text-xs font-medium text-[#717171]">
                {upcomingBookings.length}
              </span>
            )}
            {activeTab === 'upcoming' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#E96B56]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`relative pb-3 text-sm font-semibold transition-colors ${
              activeTab === 'past' ? 'text-[#1A1A1A]' : 'text-[#717171] hover:text-[#717171]'
            }`}
          >
            Past
            {pastBookings.length > 0 && (
              <span className="ml-2 rounded-full bg-[#f3ece9] px-2 py-0.5 text-xs font-medium text-[#717171]">
                {pastBookings.length}
              </span>
            )}
            {activeTab === 'past' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#E96B56]" />
            )}
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E96B56] border-t-transparent" />
          </div>
        )}

        {/* Empty state */}
        {!loading && displayedBookings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#f3ece9]">
              <CalendarDays className="h-10 w-10 text-[#717171]" />
            </div>
            <h2 className="mb-2 text-lg font-semibold text-[#1A1A1A]">
              {activeTab === 'upcoming' ? 'Nothing booked yet' : 'No past appointments'}
            </h2>
            <p className="mb-6 text-sm text-[#717171]">
              {activeTab === 'upcoming'
                ? 'When you book an artist, your upcoming appointments will show up here.'
                : 'Your completed and cancelled appointments will appear here.'}
            </p>
            {activeTab === 'upcoming' && (
              <Link
                href="/search"
                className="inline-flex items-center gap-2 rounded-full bg-[#E96B56] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#a63a29]"
              >
                Find an artist
              </Link>
            )}
          </div>
        )}

        {/* Booking cards */}
        {!loading && displayedBookings.length > 0 && (
          <div className="space-y-4">
            {displayedBookings.map((booking) => {
              return (
                <Link
                  key={booking.id}
                  href={`/messages?bookingId=${booking.id}`}
                  className="block rounded-2xl border border-[#e8e1de] bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    {/* Provider avatar */}
                    <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-[#f3ece9]">
                      {booking.provider.image ? (
                        <Image
                          src={booking.provider.image}
                          alt={booking.provider.name || 'Provider'}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                          <span className="text-lg font-bold text-[#717171]">
                            {booking.provider.name?.charAt(0) ?? 'T'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#1A1A1A]">
                            {booking.provider.name || 'Unknown artist'}
                          </p>
                          <p className="truncate text-sm text-[#717171]">
                            {booking.service.title}
                          </p>
                        </div>

                        {/* Price */}
                        <p className="flex-shrink-0 text-sm font-semibold text-[#1A1A1A]">
                          {formatCurrency(booking.totalPrice)}
                        </p>
                      </div>

                      {/* Date, time, status row */}
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5 text-sm text-[#717171]">
                          <CalendarDays className="h-3.5 w-3.5" />
                          <span>{formatDate(booking.date)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-[#717171]">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{formatTime(booking.time)}</span>
                        </div>
                        <BookingStatusPill status={booking.status} />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
