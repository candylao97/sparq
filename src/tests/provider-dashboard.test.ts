import { describe, it, expect } from "vitest";
import {
  deriveProviderStats,
  orderProviderBookings,
} from "@/lib/provider-dashboard";
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

describe("deriveProviderStats", () => {
  it("returns zero counts for no bookings (empty)", () => {
    expect(deriveProviderStats([])).toEqual({
      pendingCount: 0,
      confirmedCount: 0,
      completedCount: 0,
    });
  });

  it("counts pending, confirmed and completed across mixed statuses", () => {
    const bookings = [
      makeBooking({ id: "p1", status: "PENDING_PROVIDER_RESPONSE", bookingDate: "2026-07-01" }),
      makeBooking({ id: "p2", status: "PENDING_PROVIDER_RESPONSE", bookingDate: "2026-07-02" }),
      makeBooking({ id: "c1", status: "CONFIRMED", bookingDate: "2026-07-03" }),
      makeBooking({ id: "done1", status: "COMPLETED", bookingDate: "2026-06-01" }),
      makeBooking({ id: "done2", status: "COMPLETED", bookingDate: "2026-06-02" }),
      makeBooking({ id: "done3", status: "COMPLETED", bookingDate: "2026-06-03" }),
      // Statuses that must not be counted in any bucket.
      makeBooking({ id: "dec", status: "DECLINED", bookingDate: "2026-06-04" }),
      makeBooking({ id: "exp", status: "EXPIRED", bookingDate: "2026-06-05" }),
    ];
    expect(deriveProviderStats(bookings)).toEqual({
      pendingCount: 2,
      confirmedCount: 1,
      completedCount: 3,
    });
  });

  it("preserves a per-bucket zero independently of the other buckets", () => {
    // Confirmed present, but no pending and no completed: pending/completed
    // must each stay 0 (the dashboard renders 0 explicitly per stat card).
    const bookings = [
      makeBooking({ id: "c1", status: "CONFIRMED", bookingDate: "2026-07-03" }),
      makeBooking({ id: "c2", status: "CONFIRMED", bookingDate: "2026-07-04" }),
    ];
    expect(deriveProviderStats(bookings)).toEqual({
      pendingCount: 0,
      confirmedCount: 2,
      completedCount: 0,
    });
  });

  it("ignores non-counted statuses entirely (all buckets zero)", () => {
    const bookings = [
      makeBooking({ id: "dec", status: "DECLINED", bookingDate: "2026-06-04" }),
      makeBooking({ id: "exp", status: "EXPIRED", bookingDate: "2026-06-05" }),
      makeBooking({ id: "ref", status: "REFUNDED", bookingDate: "2026-06-06" }),
      makeBooking({ id: "canc", status: "CANCELLED_BY_CUSTOMER", bookingDate: "2026-06-07" }),
    ];
    expect(deriveProviderStats(bookings)).toEqual({
      pendingCount: 0,
      confirmedCount: 0,
      completedCount: 0,
    });
  });
});
