import { describe, it, expect } from "vitest";
import { orderProviderBookings } from "@/lib/provider-dashboard";
import type { BookingWithDetails } from "@/types";

/**
 * Minimal booking fixture builder. We only populate the fields the pure helper
 * reads (status, bookingDate, startTime, createdAt) plus an id; the rest is cast
 * through `unknown` so tests don't depend on the full Prisma shape. Fixed-date
 * fixtures only — never depends on the real "today".
 */
function makeBooking(overrides: {
  id: string;
  status: string;
  bookingDate: string;
  startTime?: string;
  createdAt?: string;
}): BookingWithDetails {
  return {
    id: overrides.id,
    status: overrides.status,
    bookingDate: new Date(overrides.bookingDate),
    startTime: overrides.startTime ?? "10:00",
    endTime: "11:00",
    createdAt: new Date(overrides.createdAt ?? overrides.bookingDate),
  } as unknown as BookingWithDetails;
}

describe("orderProviderBookings", () => {
  it("handles no bookings (empty)", () => {
    expect(orderProviderBookings([])).toEqual([]);
  });

  it("sorts pending soonest-appointment first with same-day startTime tiebreak", () => {
    const bookings = [
      makeBooking({ id: "late", status: "PENDING_PROVIDER_RESPONSE", bookingDate: "2026-07-01", startTime: "09:00" }),
      makeBooking({ id: "soonPM", status: "PENDING_PROVIDER_RESPONSE", bookingDate: "2026-06-12", startTime: "15:00" }),
      makeBooking({ id: "soonAM", status: "PENDING_PROVIDER_RESPONSE", bookingDate: "2026-06-12", startTime: "09:00" }),
    ];
    expect(orderProviderBookings(bookings).map((b) => b.id)).toEqual([
      "soonAM",
      "soonPM",
      "late",
    ]);
  });

  it("sorts non-pending by createdAt desc", () => {
    const bookings = [
      makeBooking({ id: "old", status: "CONFIRMED", bookingDate: "2026-06-20", createdAt: "2026-06-01T00:00:00" }),
      makeBooking({ id: "new", status: "COMPLETED", bookingDate: "2026-06-20", createdAt: "2026-06-05T00:00:00" }),
      makeBooking({ id: "mid", status: "DECLINED", bookingDate: "2026-06-20", createdAt: "2026-06-03T00:00:00" }),
    ];
    expect(orderProviderBookings(bookings).map((b) => b.id)).toEqual([
      "new",
      "mid",
      "old",
    ]);
  });

  it("always places pending ahead of non-pending", () => {
    const bookings = [
      // Non-pending with a very recent createdAt — must still come after pending.
      makeBooking({ id: "conf", status: "CONFIRMED", bookingDate: "2026-06-10", createdAt: "2026-12-31T00:00:00" }),
      makeBooking({ id: "pend", status: "PENDING_PROVIDER_RESPONSE", bookingDate: "2026-07-01", createdAt: "2026-01-01T00:00:00" }),
    ];
    expect(orderProviderBookings(bookings).map((b) => b.id)).toEqual([
      "pend",
      "conf",
    ]);
  });
});
