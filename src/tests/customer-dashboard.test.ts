import { describe, it, expect } from "vitest";
import {
  deriveCustomerDashboard,
  deriveFirstName,
  type CustomerBooking,
} from "@/lib/customer-dashboard";

// Fixed reference date for all fixtures — never depends on the real "today".
const TODAY = new Date("2026-06-09T00:00:00");

/**
 * Minimal booking fixture builder. We only populate the fields the pure helper
 * reads (status, bookingDate, startTime, createdAt) plus an id; the rest is
 * cast through `unknown` so tests don't depend on the full Prisma shape.
 */
function makeBooking(overrides: {
  id: string;
  status: string;
  bookingDate: string;
  startTime?: string;
  createdAt?: string;
}): CustomerBooking {
  return {
    id: overrides.id,
    status: overrides.status,
    bookingDate: new Date(overrides.bookingDate),
    startTime: overrides.startTime ?? "10:00",
    endTime: "11:00",
    createdAt: new Date(overrides.createdAt ?? overrides.bookingDate),
  } as unknown as CustomerBooking;
}

describe("deriveCustomerDashboard", () => {
  it("handles no bookings (empty)", () => {
    const result = deriveCustomerDashboard([], TODAY);
    expect(result.nextBooking).toBeNull();
    expect(result.moreUpcoming).toEqual([]);
    expect(result.lastCompleted).toBeNull();
    expect(result.upcomingCount).toBe(0);
    expect(result.completedCount).toBe(0);
  });

  it("handles only completed bookings (no upcoming, completed count correct)", () => {
    const bookings = [
      makeBooking({ id: "c1", status: "COMPLETED", bookingDate: "2026-05-01" }),
      makeBooking({ id: "c2", status: "COMPLETED", bookingDate: "2026-04-01" }),
    ];
    const result = deriveCustomerDashboard(bookings, TODAY);
    expect(result.nextBooking).toBeNull();
    expect(result.moreUpcoming).toEqual([]);
    expect(result.upcomingCount).toBe(0);
    expect(result.completedCount).toBe(2);
    // lastCompleted is the first COMPLETED in input order (bookings arrive
    // createdAt desc from the service).
    expect(result.lastCompleted?.id).toBe("c1");
  });

  it("excludes past-dated upcoming-status bookings from the upcoming set", () => {
    const bookings = [
      makeBooking({
        id: "past",
        status: "CONFIRMED",
        bookingDate: "2026-06-01",
      }),
    ];
    const result = deriveCustomerDashboard(bookings, TODAY);
    expect(result.nextBooking).toBeNull();
    expect(result.upcomingCount).toBe(0);
  });

  it("counts a booking dated today as upcoming", () => {
    const bookings = [
      makeBooking({
        id: "today",
        status: "CONFIRMED",
        bookingDate: "2026-06-09",
      }),
    ];
    const result = deriveCustomerDashboard(bookings, TODAY);
    expect(result.nextBooking?.id).toBe("today");
    expect(result.upcomingCount).toBe(1);
  });

  it("handles one upcoming booking (focal set, more upcoming empty)", () => {
    const bookings = [
      makeBooking({ id: "u1", status: "CONFIRMED", bookingDate: "2026-06-20" }),
      makeBooking({ id: "c1", status: "COMPLETED", bookingDate: "2026-05-01" }),
    ];
    const result = deriveCustomerDashboard(bookings, TODAY);
    expect(result.nextBooking?.id).toBe("u1");
    expect(result.moreUpcoming).toEqual([]);
    expect(result.upcomingCount).toBe(1);
    expect(result.completedCount).toBe(1);
  });

  it("handles multiple upcoming bookings (focal is soonest, others sorted, focal excluded)", () => {
    const bookings = [
      makeBooking({ id: "late", status: "CONFIRMED", bookingDate: "2026-07-15" }),
      makeBooking({
        id: "soon",
        status: "PENDING_PROVIDER_RESPONSE",
        bookingDate: "2026-06-12",
      }),
      makeBooking({ id: "mid", status: "CONFIRMED", bookingDate: "2026-06-25" }),
    ];
    const result = deriveCustomerDashboard(bookings, TODAY);
    expect(result.nextBooking?.id).toBe("soon");
    expect(result.moreUpcoming.map((b) => b.id)).toEqual(["mid", "late"]);
    expect(result.upcomingCount).toBe(3);
  });

  it("breaks same-day ties by startTime", () => {
    const bookings = [
      makeBooking({
        id: "afternoon",
        status: "CONFIRMED",
        bookingDate: "2026-06-12",
        startTime: "15:00",
      }),
      makeBooking({
        id: "morning",
        status: "CONFIRMED",
        bookingDate: "2026-06-12",
        startTime: "09:00",
      }),
    ];
    const result = deriveCustomerDashboard(bookings, TODAY);
    expect(result.nextBooking?.id).toBe("morning");
    expect(result.moreUpcoming.map((b) => b.id)).toEqual(["afternoon"]);
  });

  it("computes upcoming and completed counts independently of each other", () => {
    const bookings = [
      makeBooking({ id: "u1", status: "CONFIRMED", bookingDate: "2026-06-20" }),
      makeBooking({
        id: "u2",
        status: "PENDING_PROVIDER_RESPONSE",
        bookingDate: "2026-06-30",
      }),
      makeBooking({ id: "c1", status: "COMPLETED", bookingDate: "2026-05-01" }),
      makeBooking({ id: "c2", status: "COMPLETED", bookingDate: "2026-04-01" }),
      makeBooking({
        id: "cancelled",
        status: "CANCELLED_BY_CUSTOMER",
        bookingDate: "2026-06-22",
      }),
    ];
    const result = deriveCustomerDashboard(bookings, TODAY);
    expect(result.upcomingCount).toBe(2);
    expect(result.completedCount).toBe(2);
  });
});

describe("deriveFirstName", () => {
  it("returns the first token of a full name", () => {
    expect(deriveFirstName("Candy Lao")).toBe("Candy");
  });

  it("handles a single-word name", () => {
    expect(deriveFirstName("Candy")).toBe("Candy");
  });

  it("trims surrounding and collapses internal whitespace", () => {
    expect(deriveFirstName("  Candy   Lao ")).toBe("Candy");
  });

  it("returns null for empty, whitespace, null, or undefined", () => {
    expect(deriveFirstName("")).toBeNull();
    expect(deriveFirstName("   ")).toBeNull();
    expect(deriveFirstName(null)).toBeNull();
    expect(deriveFirstName(undefined)).toBeNull();
  });
});
