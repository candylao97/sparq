'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Skeleton } from '@/components/ui/Skeleton'
import { useCustomerDashboardData } from '@/hooks/useCustomerDashboardData'
import toast from 'react-hot-toast'
import { CustomerDashboardHeader } from '@/components/dashboard/customer/CustomerDashboardHeader'
import { UpcomingBookings } from '@/components/dashboard/customer/UpcomingBookings'
import { BookingHistory } from '@/components/dashboard/customer/BookingHistory'
import { YourReviews } from '@/components/dashboard/customer/YourReviews'
import { SpendingSnapshot } from '@/components/dashboard/customer/SpendingSnapshot'
import { FavouriteTalents } from '@/components/dashboard/customer/FavouriteTalents'
import { DiscoveryRecommendations } from '@/components/dashboard/customer/DiscoveryRecommendations'
import { ActivityNotifications } from '@/components/dashboard/customer/ActivityNotifications'

export default function CustomerDashboardPage() {
  const { data, aiInsights, loading, aiLoading, session, status, refreshData } = useCustomerDashboardData()
  const searchParams = useSearchParams()

  // Handle Stripe payment success redirect
  useEffect(() => {
    const bookingSuccess = searchParams.get('booking')
    const redirectStatus = searchParams.get('redirect_status')

    if (bookingSuccess === 'success' || redirectStatus === 'succeeded') {
      toast.success('Booking submitted! Your artist will review and confirm — usually within a few hours. We\'ll notify you by email.')
      window.history.replaceState({}, '', '/dashboard/customer')
    } else if (redirectStatus === 'failed') {
      toast.error('We couldn\'t process your payment. Please try again.')
      window.history.replaceState({}, '', '/dashboard/customer')
    }
  }, [searchParams])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#FDFBF7_100%)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E96B56] border-t-transparent" />
      </div>
    )
  }

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#FDFBF7_100%)]">
        <div className="mx-auto max-w-6xl space-y-4 px-4 py-8 sm:px-6 lg:px-10">
          <Skeleton className="h-10 w-48 rounded-full" />
          <Skeleton className="h-12 w-72 rounded-xl" />
          <Skeleton className="h-40 rounded-2xl" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    )
  }

  const firstName = session?.user?.name?.split(' ')[0] || 'there'
  const userRole = session?.user?.role || ''
  const categoriesBooked = Array.from(new Set(data.pastBookings.map(b => b.service.category)))

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#FDFBF7_100%)]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">

        {/* Zone 1 — Header + AI Briefing */}
        <CustomerDashboardHeader
          firstName={firstName}
          userRole={userRole}
          membership={data.profile.membership}
          briefing={aiInsights?.briefing}
          aiLoading={aiLoading}
          upcomingCount={data.upcomingBookings.length}
          unreviewedCount={data.stats.unreviewed}
        />

        {/* Zone 2 — Upcoming Bookings */}
        <UpcomingBookings
          bookings={data.upcomingBookings}
          nextBookingSummary={aiInsights?.nextBookingSummary}
          aiLoading={aiLoading}
          onRefresh={refreshData}
        />

        {/* Zone 5 — Spending Snapshot (before history for visual flow) */}
        <SpendingSnapshot
          spending={data.spending}
          stats={data.stats}
          membership={data.profile.membership}
          spendingNarrative={aiInsights?.spendingNarrative}
          aiLoading={aiLoading}
        />

        {/* Zone 3 — Booking History */}
        <BookingHistory
          pastBookings={data.pastBookings}
          unreviewedBookings={data.unreviewedBookings}
          bookingNarrative={aiInsights?.bookingNarrative}
          aiLoading={aiLoading}
        />

        {/* Zone 4 — Your Reviews */}
        <YourReviews
          reviews={data.reviewsLeft}
          unreviewedCount={data.stats.unreviewed}
          reviewPrompt={aiInsights?.reviewPrompt}
          aiLoading={aiLoading}
        />

        {/* Zone 6 — Favourite Talents */}
        <FavouriteTalents
          talents={data.favouriteTalents}
          talentRecommendation={aiInsights?.talentRecommendation}
          aiLoading={aiLoading}
        />

        {/* Zone 7 — Discovery Recommendations */}
        <DiscoveryRecommendations
          categoriesBooked={categoriesBooked}
          discoveryRecommendation={aiInsights?.discoveryRecommendation}
          aiLoading={aiLoading}
        />

        {/* Zone 8 — Activity & Notifications */}
        <ActivityNotifications
          notifications={data.notifications}
          unreadMessageCount={data.unreadMessageCount}
          engagementNudge={aiInsights?.engagementNudge}
          aiLoading={aiLoading}
        />

      </div>
    </div>
  )
}
