import type { BookingWithDetails } from "@/types";

export interface ProviderDashboardSummary {
  /** Count of bookings awaiting the provider's response. */
  pendingCount: number;
  /** Count of confirmed bookings. */
  confirmedCount: number;
  /** Count of bookings completed in the same month/year as `now`. */
  completedThisMonthCount: number;
  /** Sum of (payment.amount ?? totalPrice) over COMPLETED bookings. */
  totalEarnings: number;
  /**
   * Pending requests needing the provider's response, sorted soonest-appointment
   * first (by bookingDate then startTime) so the most urgent is on top.
   */
  pendingRequests: BookingWithDetails[];
  /** Top 8 bookings by createdAt desc, as shown in the recent requests list. */
  recentRequests: BookingWithDetails[];
}

function compareSoonest(a: BookingWithDetails, b: BookingWithDetails) {
  const d =
    new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime();
  return d !== 0 ? d : a.startTime.localeCompare(b.startTime);
}

/**
 * Pure derivation of the provider dashboard overview from a bookings array and
 * an injected `now` reference date. No DB or session access, so it can be
 * unit-tested. Never calls `new Date()` for "now" — the caller injects it.
 */
export function deriveProviderDashboard(
  bookings: BookingWithDetails[],
  now: Date
): ProviderDashboardSummary {
  const pendingRequests = bookings
    .filter((b) => b.status === "PENDING_PROVIDER_RESPONSE")
    .sort(compareSoonest);

  const pendingCount = pendingRequests.length;

  const confirmedCount = bookings.filter(
    (b) => b.status === "CONFIRMED"
  ).length;

  const completedThisMonthCount = bookings.filter((b) => {
    if (b.status !== "COMPLETED") return false;
    const d = new Date(b.bookingDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const totalEarnings = bookings
    .filter((b) => b.status === "COMPLETED")
    .reduce((sum, b) => sum + (b.payment?.amount ?? b.totalPrice ?? 0), 0);

  const recentRequests = [...bookings]
    .sort(
      (a, b) =>
        new Date(String(b.createdAt)).getTime() -
        new Date(String(a.createdAt)).getTime()
    )
    .slice(0, 8);

  return {
    pendingCount,
    confirmedCount,
    completedThisMonthCount,
    totalEarnings,
    pendingRequests,
    recentRequests,
  };
}
