import { startOfDay } from "date-fns";
import type { getCustomerBookings } from "@/server/services/booking.service";

export type CustomerBooking = Awaited<
  ReturnType<typeof getCustomerBookings>
>[number];

export const UPCOMING_STATUSES = [
  "PENDING_PROVIDER_RESPONSE",
  "CONFIRMED",
] as const;

export interface CustomerDashboardSummary {
  /** The soonest upcoming booking, or null when there are none. */
  nextBooking: CustomerBooking | null;
  /** Other upcoming bookings, sorted soonest-first, excluding `nextBooking`. */
  moreUpcoming: CustomerBooking[];
  /** The most recently created completed booking, or null. */
  lastCompleted: CustomerBooking | null;
  /**
   * The most recently created completed booking that has not yet been
   * reviewed, or null when every completed booking already has a review.
   */
  reviewable: CustomerBooking | null;
  /** Count of upcoming bookings (status upcoming and date >= today). */
  upcomingCount: number;
  /** Count of completed bookings. */
  completedCount: number;
}

function isUpcoming(b: CustomerBooking, today: Date) {
  return (
    (UPCOMING_STATUSES as readonly string[]).includes(b.status) &&
    startOfDay(new Date(b.bookingDate)) >= today
  );
}

function compareUpcoming(a: CustomerBooking, b: CustomerBooking) {
  const d =
    new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime();
  return d !== 0 ? d : a.startTime.localeCompare(b.startTime);
}

/**
 * Pure derivation of the customer dashboard summary from a bookings array and a
 * reference "today" date. No DB or session access, so it can be unit-tested.
 */
export function deriveCustomerDashboard(
  bookings: CustomerBooking[],
  today: Date
): CustomerDashboardSummary {
  const startToday = startOfDay(today);

  const upcoming = bookings
    .filter((b) => isUpcoming(b, startToday))
    .sort(compareUpcoming);

  const nextBooking = upcoming[0] ?? null;
  const moreUpcoming = upcoming.slice(1);

  const lastCompleted =
    bookings.find((b) => b.status === "COMPLETED") ?? null;

  const reviewable =
    bookings.find((b) => b.status === "COMPLETED" && !b.review) ?? null;

  const completedCount = bookings.filter(
    (b) => b.status === "COMPLETED"
  ).length;

  return {
    nextBooking,
    moreUpcoming,
    lastCompleted,
    reviewable,
    upcomingCount: upcoming.length,
    completedCount,
  };
}

/** Derive a display first name from a (possibly null) full name. */
export function deriveFirstName(name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0];
}
