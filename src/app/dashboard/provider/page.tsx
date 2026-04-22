'use client'

import { Skeleton } from '@/components/ui/Skeleton'
import { useDashboardData } from '@/hooks/useDashboardData'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { ActionRequired } from '@/components/dashboard/ActionRequired'
import { EarningsSnapshot } from '@/components/dashboard/EarningsSnapshot'
import { NextPayoutCard } from '@/components/dashboard/NextPayoutCard'
import { TodaySchedule } from '@/components/dashboard/TodaySchedule'
import { RecentReviews } from '@/components/dashboard/RecentReviews'
import { ServicesPortfolio } from '@/components/dashboard/ServicesPortfolio'
import { GrowthInsights } from '@/components/dashboard/GrowthInsights'
import { ServiceAreaMap } from '@/components/dashboard/ServiceAreaMap'

export default function ProviderDashboardPage() {
  const { data, aiInsights, loading, aiLoading, session, status, handleBookingAction, refreshData } = useDashboardData()

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
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    )
  }

  const firstName = session?.user?.name?.split(' ')[0] || 'there'
  const userRole = session?.user?.role || ''

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#FDFBF7_100%)]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">

        {/* Zone 1 — Header + AI Briefing */}
        <DashboardHeader
          profile={data.profile}
          firstName={firstName}
          userRole={userRole}
          briefing={aiInsights?.briefing}
          aiLoading={aiLoading}
          pendingCount={data.pendingBookings.length}
          todayCount={data.todayBookings.length}
        />

        {/* Zone 2 — Action Required (Smart Booking Triage) */}
        <ActionRequired
          bookings={data.pendingBookings}
          onAction={handleBookingAction}
          onRefresh={refreshData}
        />

        {/* Zone 3 — Earnings Snapshot + AI Narrative */}
        <EarningsSnapshot
          earnings={data.earnings}
          stats={data.stats}
          narrative={aiInsights?.earningsNarrative}
          goalSuggestion={aiInsights?.goalSuggestion}
          aiLoading={aiLoading}
          stripeAccountId={data.profile.stripeAccountId}
        />

        {/* Zone 4 — Next Payout (AUDIT-011) */}
        <NextPayoutCard nextPayout={data.nextPayout} />

        {/* Zone 5 — Today's Schedule */}
        <TodaySchedule bookings={data.todayBookings} />

        {/* Zone 6 — Recent Reviews + AI Summary + Reply */}
        <RecentReviews
          reviews={data.recentReviews}
          unresponded={data.unrespondedReviews}
          aiSummary={data.aiReviewSummary}
          onRefresh={refreshData}
        />

        {/* Zone 7 — Services & Portfolio */}
        <ServicesPortfolio
          services={data.profile.services}
          portfolio={data.profile.portfolio}
          portfolioCount={data.stats.portfolioPhotoCount}
          portfolioGapNote={aiInsights?.portfolioGapNote}
          aiLoading={aiLoading}
        />

        {/* Zone 7.5 — Service Area Map */}
        <ServiceAreaMap
          data={{
            serviceRadius: data.profile.serviceRadius,
            latitude: data.profile.latitude,
            longitude: data.profile.longitude,
            studioAddress: data.profile.studioAddress,
            suburb: data.profile.suburb,
            city: data.profile.city,
            offerAtHome: data.profile.offerAtHome,
            offerAtStudio: data.profile.offerAtStudio,
          }}
          providerName={session?.user?.name || 'Provider'}
          onUpdate={refreshData}
        />

        {/* Zone 8 — Growth Insights */}
        <GrowthInsights
          stats={data.stats}
          portfolioCount={data.stats.portfolioPhotoCount}
          unrespondedCount={data.unrespondedReviews.length}
          weeklyInsight={aiInsights?.weeklyInsight}
          benchmarkNote={aiInsights?.benchmarkNote}
          aiLoading={aiLoading}
        />

      </div>
    </div>
  )
}
