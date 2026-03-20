import {
  User,
  ProviderProfile,
  Service,
  Booking,
  Review,
  PortfolioPhoto,
  Message,
  ServiceCategory,
  ServiceLocation,
  BookingStatus,
  ProviderTier,
  SubscriptionPlan,
  PaymentStatus,
} from '@prisma/client'

export type ProviderWithProfile = User & {
  providerProfile: ProviderProfile & {
    services: Service[]
    portfolio: PortfolioPhoto[]
    _count?: {
      bookingsAsProvider?: number
    }
  }
}

export type BookingWithDetails = Booking & {
  service: Service
  customer: User
  provider: User
  review: Review | null
  messages: Message[]
  paymentStatus: string
}

export type ReviewWithCustomer = Review & {
  customer: User
}

export type ProviderCardData = {
  id: string
  name: string
  image: string | null
  suburb: string | null
  city: string
  tier: ProviderTier
  subscriptionPlan: SubscriptionPlan
  offerAtHome: boolean
  offerAtStudio: boolean
  isVerified: boolean
  services: {
    id: string
    title: string
    category: ServiceCategory
    price: number
    duration: number
    locationTypes: ServiceLocation
  }[]
  portfolio: PortfolioPhoto[]
  averageRating: number
  reviewCount: number
}

export type SearchFilters = {
  query?: string
  category?: ServiceCategory
  location?: string
  latitude?: number
  longitude?: number
  radius?: number
  minPrice?: number
  maxPrice?: number
  serviceLocation?: ServiceLocation
  minRating?: number
  date?: string
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'score'
}

export type BookingFormData = {
  serviceId: string
  date: string
  time: string
  locationType: ServiceLocation
  address?: string
  guestCount?: number
  notes?: string
  giftVoucherCode?: string
}

export type DashboardStats = {
  totalEarnings: number
  todayEarnings: number
  weekEarnings: number
  monthEarnings: number
  totalBookings: number
  pendingBookings: number
  completedBookings: number
  averageRating: number
}

export type ContactLeakageFlag = {
  id: string
  messageId: string | null
  reviewId: string | null
  bookingId: string | null
  userId: string
  flagType: string
  snippet: string
  resolved: boolean
  resolvedBy: string | null
  resolvedAt: Date | null
  createdAt: Date
}

export { ServiceCategory, ServiceLocation, BookingStatus, ProviderTier, SubscriptionPlan, PaymentStatus }
