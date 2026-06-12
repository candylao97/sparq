import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Customer-facing slot-engine tests for getAvailableSlots. The Stage-1 backend
 * gap: the engine consulted AvailabilityRule + the legacy BlockedDate table but
 * never AvailabilityOverride, so a provider turning a day OFF (or narrowing its
 * hours) via the calendar still let customers book the old default-rule hours.
 *
 * We mock Prisma so no real DB is touched and drive the engine through the
 * override resolution path: a day off must yield zero slots, and narrowed hours
 * must restrict the generated slots.
 */

const ruleFindMany = vi.fn();
const blockedFindFirst = vi.fn();
const overrideFindUnique = vi.fn();
const bookingFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    availabilityRule: {
      findMany: (...args: unknown[]) => ruleFindMany(...args),
    },
    blockedDate: {
      findFirst: (...args: unknown[]) => blockedFindFirst(...args),
    },
    availabilityOverride: {
      findUnique: (...args: unknown[]) => overrideFindUnique(...args),
    },
    booking: {
      findMany: (...args: unknown[]) => bookingFindMany(...args),
    },
  },
}));

import { getAvailableSlots } from "@/server/services/availability.service";

// A weekday that carries a default 09:00–17:00 working rule.
const DATE = "2026-06-08";
const PROFILE = "profile_1";

function defaultRule() {
  return [{ startTime: "09:00", endTime: "17:00" }];
}

describe("getAvailableSlots (override-aware)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    blockedFindFirst.mockResolvedValue(null);
    bookingFindMany.mockResolvedValue([]);
    overrideFindUnique.mockResolvedValue(null);
    ruleFindMany.mockResolvedValue(defaultRule());
  });

  it("generates default-rule slots when there is no override", async () => {
    const slots = await getAvailableSlots(PROFILE, DATE, 60);

    // 09:00 default open through to a slot ending at 17:00.
    expect(slots[0]).toBe("09:00");
    expect(slots).toContain("16:00"); // 16:00–17:00 fits exactly
    expect(slots).not.toContain("16:30"); // would end 17:30, past the window
  });

  it("(a) an override turning a default-available weekday off yields zero slots", async () => {
    overrideFindUnique.mockResolvedValue({
      isAvailable: false,
      startTime: null,
      endTime: null,
      serviceMode: null,
    });

    const slots = await getAvailableSlots(PROFILE, DATE, 60);

    expect(slots).toEqual([]);
    // The booking conflict query must not even run for a closed day.
    expect(bookingFindMany).not.toHaveBeenCalled();
  });

  it("(b) an override narrowing the hours restricts the generated slots", async () => {
    overrideFindUnique.mockResolvedValue({
      isAvailable: true,
      startTime: "11:00",
      endTime: "13:00",
      serviceMode: null,
    });

    const slots = await getAvailableSlots(PROFILE, DATE, 60);

    // Only the 11:00–13:00 window: 11:00, 11:30, 12:00 (12:00–13:00 fits exactly).
    expect(slots).toEqual(["11:00", "11:30", "12:00"]);
    // Default-rule hours outside the override window must be gone.
    expect(slots).not.toContain("09:00");
    expect(slots).not.toContain("16:00");
  });

  it("an available override with null hours falls back to the weekday rule hours", async () => {
    overrideFindUnique.mockResolvedValue({
      isAvailable: true,
      startTime: null,
      endTime: null,
      serviceMode: "MOBILE",
    });

    const slots = await getAvailableSlots(PROFILE, DATE, 60);

    // serviceMode-only override keeps the default 09:00–17:00 window.
    expect(slots[0]).toBe("09:00");
    expect(slots).toContain("16:00");
  });

  it("still honours the legacy blocked-date table", async () => {
    blockedFindFirst.mockResolvedValue({ id: "blocked_1" });

    const slots = await getAvailableSlots(PROFILE, DATE, 60);

    expect(slots).toEqual([]);
  });

  it("excludes slots that conflict with existing bookings", async () => {
    bookingFindMany.mockResolvedValue([{ startTime: "09:00", endTime: "10:00" }]);

    const slots = await getAvailableSlots(PROFILE, DATE, 60);

    // 09:00 overlaps the booking; 10:00 onward is free.
    expect(slots).not.toContain("09:00");
    expect(slots).toContain("10:00");
  });
});
