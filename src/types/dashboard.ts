export interface DashboardProfile {
  id: string
  isVerified: boolean
  bio: string | null
  tagline: string | null
  suburb: string | null
  city: string
  serviceRadius: number
  latitude: number | null
  longitude: number | null
  studioAddress: string | null
  offerAtHome: boolean
  offerAtStudio: boolean
  responseTimeHours: number
  completionRate: number
  scoreFactors: {
    reviewScore: number
    completionScore: number
    responseScore: number
    consistencyScore: number
    verificationScore: number
  } | null
  services: Array<{
    id: string
    title: string
    category: string
    price: number
    duration: number
    locationTypes: string
    isActive: boolean
  }>
  portfolio: Array<{
    id: string
    url: string
    caption: string | null
  }>
  verification: {
    status: string
    stripeVerificationSessionId: string | null
  } | null
  stripeAccountId: string | null
}

export interface PendingBooking {
  id: string
  date: string
  time: string
  totalPrice: number
  acceptDeadline: string | null
  notes: string | null
  status: string
  locationType: string
  address: string | null
  service: { title: string; duration: number; category: string }
  customer: { id: string; name: string; image: string | null }
  repeatFanCount: number
  minutesUntilExpiry: number | null
}

export interface TodayBooking {
  id: string
  date: string
  time: string
  totalPrice: number
  locationType: string
  address: string | null
  notes: string | null
  status: string
  service: { title: string; duration: number; category: string }
  customer: { id: string; name: string; image: string | null }
  repeatFanCount: number
}

export interface DashboardReview {
  id: string
  rating: number
  text: string | null
  providerResponse: string | null
  createdAt: string
  customer: { name: string; image: string | null }
  booking?: { service: { title: string } }
}

export interface DashboardEarnings {
  today: number
  week: number
  month: number
  allTime: number
  previousMonth: number
  last3MonthsAvg: number
}

export interface DashboardStats {
  totalBookings: number
  pendingBookings: number
  completedBookings: number
  completedThisMonth: number
  averageRating: number
  totalReviews: number
  portfolioPhotoCount: number
  avgResponseTimeHours: number
}

// AUDIT-011: Soonest queued payout + totals. Null when no positive
// SCHEDULED/PROCESSING payouts exist. See src/lib/next-payout.ts for the
// pure computation.
export interface DashboardNextPayout {
  next: {
    id: string
    amount: number
    scheduledAt: string
    isOverdue: boolean
    status: string
  }
  totalScheduled: number
  queuedCount: number
}

// AUDIT-011 (bundle): tip analytics for the provider payments surface.
// totalTips is lifetime across COMPLETED bookings; tipRate is the percent of
// completed bookings that received any tip; avgTip is the mean across tipped
// bookings only (undefined-denominator-proof via the API-side guard).
export interface DashboardTipStats {
  totalTips: number
  tipRate: number
  avgTip: number
}

export interface DashboardData {
  profile: DashboardProfile
  earnings: DashboardEarnings
  pendingBookings: PendingBooking[]
  todayBookings: TodayBooking[]
  recentReviews: DashboardReview[]
  unrespondedReviews: DashboardReview[]
  aiReviewSummary: string | null
  stats: DashboardStats
  nextPayout: DashboardNextPayout | null
  tipStats: DashboardTipStats
}

export interface AiInsights {
  briefing: string | null
  earningsNarrative: string | null
  goalSuggestion: string | null
  scoreTips: Record<string, string> | null
  weeklyInsight: string | null
  benchmarkNote: string | null
  portfolioGapNote: string | null
}

// ─── Customer Dashboard Types ───────────────────────────────

export interface CustomerBooking {
  id: string
  date: string
  time: string
  totalPrice: number
  platformFee: number
  tipAmount: number
  status: string
  locationType: string
  address: string | null
  notes: string | null
  service: { id: string; title: string; duration: number; category: string }
  provider: { id: string; name: string; image: string | null; suburb: string | null }
  review: { id: string; rating: number; text: string | null; providerResponse: string | null } | null
  unreadMessageCount: number
}

export interface FavouriteTalent {
  id: string
  name: string
  image: string | null
  suburb: string | null
  bookingCount: number
  lastBookingDate: string
  topService: string
  averageRating: number
  minPrice: number
  offerAtHome: boolean
  offerAtStudio: boolean
}

export interface CustomerSpending {
  allTime: number
  thisMonth: number
  previousMonth: number
  thisQuarter: number
  previousQuarter: number
  averagePerBooking: number
  totalTips: number
  platformFeesSaved: number
}

export interface CustomerDashboardStats {
  totalBookings: number
  completedBookings: number
  completedThisMonth: number
  upcomingBookings: number
  pendingBookings: number
  uniqueTalentsBooked: number
  reviewsLeft: number
  unreviewed: number
  memberSince: string
}

export interface CustomerNotification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  createdAt: string
}

export interface CustomerDashboardData {
  profile: {
    name: string
    email: string
    image: string | null
    savedProviders: string[]
    memberSince: string
  }
  upcomingBookings: CustomerBooking[]
  imminentBookings: CustomerBooking[]
  pastBookings: CustomerBooking[]
  unreviewedBookings: CustomerBooking[]
  reviewsLeft: Array<{
    id: string
    rating: number
    text: string | null
    providerResponse: string | null
    createdAt: string
    provider: { name: string; image: string | null }
    service: { title: string }
  }>
  favouriteTalents: FavouriteTalent[]
  spending: CustomerSpending
  stats: CustomerDashboardStats
  notifications: CustomerNotification[]
  unreadMessageCount: number
}

export interface CustomerAiInsights {
  briefing: string | null
  nextBookingSummary: string | null
  bookingNarrative: string | null
  reviewPrompt: string | null
  spendingNarrative: string | null
  talentRecommendation: string | null
  discoveryRecommendation: string | null
  engagementNudge: string | null
}
