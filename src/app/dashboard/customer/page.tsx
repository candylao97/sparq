'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { useCustomerDashboardData } from '@/hooks/useCustomerDashboardData'
import toast from 'react-hot-toast'
import { DashboardHero } from '@/components/dashboard/customer/DashboardHero'
import { ArtistSections } from '@/components/dashboard/customer/ArtistSections'
import { CustomerReferralWidget } from '@/components/dashboard/CustomerReferralWidget'

const DISPUTE_STEPS = ['OPEN', 'UNDER_REVIEW', 'RESOLVED'] as const
const stepLabels: Record<string, string> = { OPEN: 'Submitted', UNDER_REVIEW: 'Under Review', RESOLVED: 'Resolved' }

function CustomerDashboardPageInner() {
  const { data, loading, session, status, refreshData } = useCustomerDashboardData()
  const searchParams = useSearchParams()
  // UX05: Active disputes for this customer
  const [activeDisputes, setActiveDisputes] = useState<any[]>([])
  const [disputesError, setDisputesError] = useState<string | null>(null)
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null)
  // UX-01: Recently cancelled bookings
  const [cancelledRecently, setCancelledRecently] = useState<any[]>([])

  const loadDisputes = () => {
    setDisputesError(null)
    fetch('/api/disputes?role=customer')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.disputes) setActiveDisputes(d.disputes) })
      .catch((err) => {
        console.error('Failed to load disputes:', err)
        setDisputesError("Couldn't load disputes")
      })
  }

  useEffect(() => {
    loadDisputes()
  }, [])

  // UX-01: Fetch cancelled bookings from last 7 days
  useEffect(() => {
    fetch('/api/bookings?status=CANCELLED_BY_PROVIDER&limit=10')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.bookings) return
        const cutoff = Date.now() - 7 * 24 * 3600 * 1000
        const recent = d.bookings.filter((b: any) =>
          b.status === 'CANCELLED_BY_PROVIDER' &&
          new Date(b.updatedAt ?? b.createdAt).getTime() > cutoff
        )
        setCancelledRecently(recent)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const bookingSuccess = searchParams.get('booking')
    const redirectStatus = searchParams.get('redirect_status')

    if (bookingSuccess === 'success' || redirectStatus === 'succeeded') {
      toast.success('Booking confirmed! Your artist will be in touch soon.')
      window.history.replaceState({}, '', '/dashboard/customer')
    } else if (redirectStatus === 'failed') {
      toast.error('Payment failed. Please try again.')
      window.history.replaceState({}, '', '/dashboard/customer')
    }
  }, [searchParams])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E96B56] border-t-transparent" />
      </div>
    )
  }

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-white">
        <div className="px-4 py-10 sm:px-8 lg:px-12 xl:px-20 max-w-[1600px] mx-auto">
          <Skeleton className="mb-2 h-10 w-52 rounded-xl" />
          <Skeleton className="mb-10 h-28 rounded-2xl" />
          <Skeleton className="mb-4 h-5 w-40 rounded" />
          <div className="flex gap-4 overflow-hidden">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-60 w-[220px] flex-shrink-0 rounded-2xl" />)}
          </div>
        </div>
      </div>
    )
  }


  const firstName = session?.user?.name?.split(' ')[0] || 'there'
  const userRole = session?.user?.role || ''
  const lastBooking = data.pastBookings[0] ?? null
  const daysSinceLastBooking = lastBooking
    ? Math.floor((Date.now() - new Date(lastBooking.date).getTime()) / 86400000)
    : null

  const lastProviderRating = lastBooking
    ? (data.favouriteTalents.find(t => t.id === lastBooking.provider.id)?.averageRating
       ?? lastBooking.review?.rating
       ?? null)
    : null

  const lastProviderVisitCount = lastBooking
    ? data.pastBookings.filter(b => b.provider.id === lastBooking.provider.id).length
    : 1

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 py-10 sm:px-8 lg:px-12 xl:px-20 max-w-[1600px] mx-auto">

        <DashboardHero
          firstName={firstName}
          userRole={userRole}
          upcomingBookings={data.upcomingBookings}
          lastBooking={lastBooking}
          daysSinceLastBooking={daysSinceLastBooking}
          lastProviderRating={lastProviderRating}
          lastProviderVisitCount={lastProviderVisitCount}
          onRefresh={refreshData}
        />

        {/* Premium upsell banner — only for FREE members */}
        {data.profile.membership !== 'PREMIUM' && (
          <div className="mb-6 rounded-2xl bg-gradient-to-r from-[#1A1A1A] to-[#333] p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#E96B56] mb-0.5">Sparq Premium</p>
              <p className="font-semibold text-sm text-white">No booking fees, ever.</p>
              <p className="text-xs text-white/60 mt-0.5">Save on every booking — $9.99/month</p>
            </div>
            <a
              href="/dashboard/customer/premium"
              className="flex-shrink-0 inline-flex items-center gap-1 rounded-full bg-[#E96B56] px-4 py-2 text-xs font-bold text-white hover:bg-[#a63a29] transition-colors whitespace-nowrap"
            >
              Upgrade →
            </a>
          </div>
        )}

        {/* FIX-5: Imminent appointment urgency banner */}
        {data.imminentBookings?.length > 0 && (
          <div className="rounded-2xl p-4 mb-6" style={{ background: '#fff8f0', border: '1px solid #E96B56' }}>
            <p className="font-jakarta font-semibold text-sm" style={{ color: '#E96B56' }}>
              ⏰ Appointment coming up soon
            </p>
            <p className="font-jakarta text-sm mt-1" style={{ color: '#1A1A1A' }}>
              {data.imminentBookings[0].service?.title} · {data.imminentBookings[0].time}
            </p>
          </div>
        )}

        {/* UX-01: Cancelled booking banner */}
        {cancelledRecently.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-[#1A1A1A] text-sm">
                  {cancelledRecently.length === 1 ? 'A booking was cancelled' : `${cancelledRecently.length} bookings were cancelled`}
                </p>
                {cancelledRecently.map((b: any) => (
                  <p key={b.id} className="text-xs text-[#717171] mt-1">
                    {b.service?.title ?? 'Appointment'} on {new Date(b.date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {b.refundStatus === 'REFUNDED' ? ' — Refund issued' : ''}
                  </p>
                ))}
                <Link href="/search" className="text-xs font-semibold text-[#E96B56] hover:text-[#a63a29] mt-2 inline-block">
                  Find a new artist →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* UX05: Active disputes */}
        {disputesError && (
          <div className="mb-6 rounded-xl border border-[#e8e1de] bg-white p-4 flex items-center justify-between gap-3">
            <p className="text-sm text-[#717171]">{disputesError}</p>
            <button
              onClick={loadDisputes}
              className="text-xs font-semibold text-[#E96B56] hover:text-[#a63a29] transition-colors whitespace-nowrap"
            >
              Retry
            </button>
          </div>
        )}
        {!disputesError && activeDisputes.length > 0 && (
          <section className="mb-8">
            <h2 className="font-headline text-xl text-[#1A1A1A] mb-4">Open Disputes</h2>
            <div className="space-y-3">
              {activeDisputes.map((dispute: any) => (
                <div key={dispute.id} className="rounded-2xl border border-[#e8e1de] bg-white p-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <p className="font-semibold text-sm text-[#1A1A1A]">{dispute.booking?.service?.title ?? 'Booking'}</p>
                      <p className="text-xs text-[#717171] mt-0.5">
                        Opened {new Date(dispute.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                      </p>
                      {dispute.resolution && (
                        <p className="text-xs text-[#717171] mt-1">{dispute.resolution}</p>
                      )}
                    </div>
                    <span className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      dispute.status === 'OPEN' ? 'bg-amber-50 text-amber-700' :
                      dispute.status === 'UNDER_REVIEW' ? 'bg-blue-50 text-blue-700' :
                      dispute.status === 'RESOLVED_REFUND' ? 'bg-emerald-50 text-emerald-700' :
                      'bg-[#f3ece9] text-[#717171]'
                    }`}>
                      {dispute.status === 'OPEN' ? 'Submitted' :
                       dispute.status === 'UNDER_REVIEW' ? 'In review' :
                       dispute.status === 'RESOLVED_REFUND' ? 'Refund issued' :
                       dispute.status === 'RESOLVED_NO_REFUND' ? 'Resolved' : dispute.status}
                    </span>
                  </div>
                  {/* UX-09: Withdraw button for open disputes */}
                  {dispute.status === 'OPEN' && (
                    <button
                      disabled={withdrawingId === dispute.id}
                      onClick={async () => {
                        if (!confirm('Are you sure you want to withdraw this dispute?')) return
                        setWithdrawingId(dispute.id)
                        try {
                          const res = await fetch(`/api/disputes?id=${dispute.id}`, { method: 'DELETE' })
                          if (res.ok) {
                            setActiveDisputes(prev => prev.filter((d: any) => d.id !== dispute.id))
                          } else {
                            toast.error('Failed to withdraw dispute. Please try again.')
                          }
                        } catch {
                          toast.error('Failed to withdraw dispute. Please try again.')
                        } finally {
                          setWithdrawingId(null)
                        }
                      }}
                      className="text-xs text-[#717171] hover:text-red-500 transition-colors underline mb-3 block disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {withdrawingId === dispute.id ? 'Withdrawing…' : 'Withdraw dispute'}
                    </button>
                  )}
                  {/* Progress timeline */}
                  <div className="mt-2">
                    <div className="flex items-center">
                      {DISPUTE_STEPS.map((step, i) => {
                        const resolvedStatuses = ['RESOLVED_REFUND', 'RESOLVED_NO_REFUND', 'CLOSED']
                        const currentIndex =
                          dispute.status === 'OPEN' ? 0 :
                          dispute.status === 'UNDER_REVIEW' ? 1 :
                          resolvedStatuses.includes(dispute.status) ? 2 : 0
                        const isCompleted = i <= currentIndex
                        const isCurrent = i === currentIndex
                        return (
                          <div key={step} className="flex items-center flex-1 last:flex-none">
                            <div className={`w-3 h-3 rounded-full flex-shrink-0 transition-colors ${isCompleted ? 'bg-[#E96B56]' : 'bg-[#e8e1de]'} ${isCurrent ? 'ring-2 ring-[#E96B56] ring-offset-1' : ''}`} />
                            {i < DISPUTE_STEPS.length - 1 && (
                              <div className={`h-px flex-1 transition-colors ${i < currentIndex ? 'bg-[#E96B56]' : 'bg-[#e8e1de]'}`} />
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex justify-between mt-1">
                      {DISPUTE_STEPS.map(step => (
                        <span key={step} className="text-[10px] text-[#717171]">{stepLabels[step]}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* MH-7: Book Again — top providers the customer has booked before */}
        {(() => {
          const completedBookings = data.pastBookings.filter((b: any) => b.status === 'COMPLETED')
          const repeatProviders = Object.values(
            completedBookings.reduce((acc: Record<string, any>, b: any) => {
              const key = b.provider.id
              if (!acc[key]) {
                acc[key] = { ...b.provider, count: 0, serviceId: b.service.id, serviceTitle: b.service.title }
              }
              acc[key].count++
              return acc
            }, {} as Record<string, any>)
          ).sort((a: any, b: any) => b.count - a.count).slice(0, 3) as any[]

          if (repeatProviders.length === 0) return null

          return (
            <section className="mb-10">
              <h2 className="font-headline text-xl text-[#1A1A1A] mb-4">Book again</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {repeatProviders.map((p: any) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-[#e8e1de] bg-white p-4 hover:border-[#E96B56]/40 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-[#f3ece9] flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-base font-semibold text-[#E96B56]">{p.name?.charAt(0) ?? 'A'}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-[#1A1A1A] truncate">{p.name}</p>
                      <p className="text-xs text-[#717171] truncate">{p.serviceTitle}</p>
                    </div>
                    <Link
                      href={`/book/${p.id}?service=${p.serviceId}`}
                      className="flex-shrink-0 text-xs font-semibold text-[#E96B56] hover:text-[#a63a29] transition-colors whitespace-nowrap"
                    >
                      Book again →
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )
        })()}

        <ArtistSections
          favouriteTalents={data.favouriteTalents}
          pastBookings={data.pastBookings}
        />

        <div className="mt-8 max-w-sm">
          <CustomerReferralWidget />
        </div>

      </div>
    </div>
  )
}

export default function CustomerDashboardPage() {
  return (
    <Suspense fallback={null}>
      <CustomerDashboardPageInner />
    </Suspense>
  )
}
