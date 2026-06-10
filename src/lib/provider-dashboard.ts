import type { BookingWithDetails } from "@/types";

function compareSoonest(a: BookingWithDetails, b: BookingWithDetails) {
  const d =
    new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime();
  return d !== 0 ? d : a.startTime.localeCompare(b.startTime);
}

function compareCreatedDesc(a: BookingWithDetails, b: BookingWithDetails) {
  return (
    new Date(String(b.createdAt)).getTime() -
    new Date(String(a.createdAt)).getTime()
  );
}

/**
 * Pure ordering of the provider's bookings for the dashboard list:
 * PENDING_PROVIDER_RESPONSE bookings first, soonest appointment first (by
 * bookingDate then startTime), followed by the remaining bookings ordered by
 * createdAt desc. No DB or session access, and never calls `new Date()` for
 * "now", so it can be unit-tested.
 */
export function orderProviderBookings(
  bookings: BookingWithDetails[]
): BookingWithDetails[] {
  const pending = bookings
    .filter((b) => b.status === "PENDING_PROVIDER_RESPONSE")
    .sort(compareSoonest);

  const rest = bookings
    .filter((b) => b.status !== "PENDING_PROVIDER_RESPONSE")
    .sort(compareCreatedDesc);

  return [...pending, ...rest];
}

export interface ProviderStats {
  /** Count of bookings awaiting the provider's response. */
  pendingCount: number;
  /** Count of confirmed bookings. */
  confirmedCount: number;
  /** Count of completed bookings. */
  completedCount: number;
}

/**
 * Pure derivation of the provider dashboard at-a-glance stat counts from a
 * bookings array. No DB or session access, and never calls `new Date()`, so it
 * can be unit-tested.
 */
export function deriveProviderStats(
  bookings: BookingWithDetails[]
): ProviderStats {
  let pendingCount = 0;
  let confirmedCount = 0;
  let completedCount = 0;

  for (const b of bookings) {
    if (b.status === "PENDING_PROVIDER_RESPONSE") pendingCount += 1;
    else if (b.status === "CONFIRMED") confirmedCount += 1;
    else if (b.status === "COMPLETED") completedCount += 1;
  }

  return { pendingCount, confirmedCount, completedCount };
}
