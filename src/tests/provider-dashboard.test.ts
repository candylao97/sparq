import { describe, it, expect } from "vitest";
import { deriveProviderDashboard } from "@/lib/provider-dashboard";
import type { BookingWithDetails } from "@/types";

// Fixed reference date for all fixtures — never depends on the real "today".
const NOW = new Date("2026-06-09T00:00:00");

/**
 * Minimal booking fixture builder. We only populate the fields the pure helper
 * reads (status, bookingDate, startTime, createdAt, totalPrice, payment) plus an
 * id; the rest is cast through `unknown` so tests don't depend on the full
 * Prisma shape.
 */
function makeBooking(overrides: {
  id: string;
  status: string;
  bookingDate: string;
  startTime?: string;
  createdAt?: string;
  totalPrice?: number;
  paymentAmount?: number;
}): BookingWithDetails {
  return {
    id: overrides.id,
    status: overrides.status,
    bookingDate: new Date(overrides.bookingDate),
    startTime: overrides.startTime ?? "10:00",
    endTime: "11:00",
    createdAt: new Date(overrides.createdAt ?? overrides.bookingDate),
    totalPrice: overrides.totalPrice ?? 0,
    payment:
      overrides.paymentAmount !== undefined
        ? { amount: overrides.paymentAmount }
        : null,
  } as unknown as BookingWithDetails;
}

describe("deriveProviderDashboard", () => {
  it("handles no bookings (empty)", () => {
    const result = deriveProviderDashboard([], NOW);
    expect(result.pendingCount).toBe(0);
    expect(result.confirmedCount).toBe(0);
    expect(result.completedThisMonthCount).toBe(0);
    expect(result.totalEarnings).toBe(0);
    expect(result.pendingRequests).toEqual([]);
    expect(result.recentRequests).toEqual([]);
  });

  it("counts pending and confirmed correctly", () => {
    const bookings = [
      makeBooking({ id: "p1", status: "PENDING_PROVIDER_RESPONSE", bookingDate: "2026-06-20" }),
      makeBooking({ id: "p2", status: "PENDING_PROVIDER_RESPONSE", bookingDate: "2026-06-21" }),
      makeBooking({ id: "c1", status: "CONFIRMED", bookingDate: "2026-06-22" }),
      makeBooking({ id: "x1", status: "COMPLETED", bookingDate: "2026-06-01" }),
      makeBooking({ id: "x2", status: "DECLINED", bookingDate: "2026-06-02" }),
    ];
    const result = deriveProviderDashboard(bookings, NOW);
    expect(result.pendingCount).toBe(2);
    expect(result.confirmedCount).toBe(1);
  });

  it("counts completedThisMonth respecting the injected now (different month excluded)", () => {
    const bookings = [
      makeBooking({ id: "this1", status: "COMPLETED", bookingDate: "2026-06-03" }),
      makeBooking({ id: "this2", status: "COMPLETED", bookingDate: "2026-06-28" }),
      // Same month number, different year — must NOT count.
      makeBooking({ id: "lastYear", status: "COMPLETED", bookingDate: "2025-06-15" }),
      // Different month — must NOT count.
      makeBooking({ id: "lastMonth", status: "COMPLETED", bookingDate: "2026-05-31" }),
      // Pending in this month — wrong status, must NOT count.
      makeBooking({ id: "pendingThis", status: "PENDING_PROVIDER_RESPONSE", bookingDate: "2026-06-10" }),
    ];
    const result = deriveProviderDashboard(bookings, NOW);
    expect(result.completedThisMonthCount).toBe(2);
  });

  it("totalEarnings sums only COMPLETED and prefers payment.amount over totalPrice", () => {
    const bookings = [
      // COMPLETED with payment.amount -> uses 50
      makeBooking({ id: "e1", status: "COMPLETED", bookingDate: "2026-06-01", totalPrice: 99, paymentAmount: 50 }),
      // COMPLETED without payment -> falls back to totalPrice 30
      makeBooking({ id: "e2", status: "COMPLETED", bookingDate: "2026-05-01", totalPrice: 30 }),
      // CONFIRMED -> excluded even though it has a payment
      makeBooking({ id: "e3", status: "CONFIRMED", bookingDate: "2026-06-05", totalPrice: 200, paymentAmount: 200 }),
    ];
    const result = deriveProviderDashboard(bookings, NOW);
    expect(result.totalEarnings).toBe(80);
  });

  it("sorts pendingRequests soonest-appointment first (bookingDate then startTime)", () => {
    const bookings = [
      makeBooking({ id: "late", status: "PENDING_PROVIDER_RESPONSE", bookingDate: "2026-07-01", startTime: "09:00" }),
      makeBooking({ id: "soonPM", status: "PENDING_PROVIDER_RESPONSE", bookingDate: "2026-06-12", startTime: "15:00" }),
      makeBooking({ id: "soonAM", status: "PENDING_PROVIDER_RESPONSE", bookingDate: "2026-06-12", startTime: "09:00" }),
      // Non-pending should be excluded from pendingRequests.
      makeBooking({ id: "conf", status: "CONFIRMED", bookingDate: "2026-06-10" }),
    ];
    const result = deriveProviderDashboard(bookings, NOW);
    expect(result.pendingRequests.map((b) => b.id)).toEqual([
      "soonAM",
      "soonPM",
      "late",
    ]);
  });

  it("caps recentRequests at 8 ordered by createdAt desc", () => {
    const bookings = Array.from({ length: 10 }, (_, i) =>
      makeBooking({
        id: `r${i}`,
        status: "CONFIRMED",
        bookingDate: "2026-06-20",
        // r0 created earliest ... r9 created latest.
        createdAt: `2026-06-${String(i + 1).padStart(2, "0")}T00:00:00`,
      })
    );
    const result = deriveProviderDashboard(bookings, NOW);
    expect(result.recentRequests).toHaveLength(8);
    // Newest first: r9, r8, ... down to r2 (r1, r0 dropped).
    expect(result.recentRequests.map((b) => b.id)).toEqual([
      "r9",
      "r8",
      "r7",
      "r6",
      "r5",
      "r4",
      "r3",
      "r2",
    ]);
  });
});
