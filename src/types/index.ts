import type {
  User,
  ProviderProfile,
  Service,
  Booking,
  Payment,
  Review,
  PortfolioImage,
  AvailabilityRule,
  BlockedDate,
  Payout,
} from "@prisma/client";

export type { User, ProviderProfile, Service, Booking, Payment, Review };

export type ProviderWithProfile = User & {
  providerProfile: ProviderProfile & {
    services: Service[];
    portfolioImages: PortfolioImage[];
    suburbs: { suburb: string }[];
    availabilityRules: AvailabilityRule[];
    blockedDates: BlockedDate[];
    reviews: (Review & { customer: Pick<User, "id" | "name" | "image"> })[];
  };
};

export type BookingWithDetails = Booking & {
  service: Service;
  provider: User & { providerProfile: ProviderProfile };
  customer: Pick<User, "id" | "name" | "email" | "image">;
  payment: Payment | null;
  review: Review | null;
};

export type ProviderCard = {
  id: string;
  name: string;
  businessName: string | null;
  image: string | null;
  bio: string | null;
  serviceTypes: string[];
  suburbs: string[];
  serviceMode: string;
  priceFrom: number | null;
  avgRating: number | null;
  reviewCount: number;
  isApproved: boolean;
};

export type ProviderSearchFilters = {
  keyword?: string;
  category?: string;
  suburb?: string;
  serviceMode?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  page?: number;
  limit?: number;
};

export type PayoutWithBooking = Payout & {
  booking: Booking & {
    service: Service;
    customer: Pick<User, "id" | "name">;
  };
};

export type DashboardMetrics = {
  totalBookings: number;
  totalRevenue: number;
  totalProviders: number;
  totalCustomers: number;
  pendingApprovals: number;
  activeBookings: number;
  completedBookings: number;
  averageRating: number;
};

export type LeakageIndicators = {
  highExpiryRateProviders: { providerId: string; name: string; expiryRate: number }[];
  unusualCancellationPatterns: { providerId: string; name: string; cancellationRate: number }[];
  poorResponseRate: { providerId: string; name: string; responseRate: number }[];
};
