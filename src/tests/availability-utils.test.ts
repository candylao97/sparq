import { describe, it, expect } from "vitest";
import {
  buildDayMaps,
  bookingsForDate,
  buildMonthGrid,
  effectiveDayFor,
  weekdayLabel,
  weekdayPlural,
  type AvailabilityRuleDTO,
  type AvailabilityOverrideDTO,
  type BlockedDateDTO,
  type BookingDTO,
} from "@/components/provider/availability-utils";
import { dateKey } from "@/lib/availability";

const rules: AvailabilityRuleDTO[] = [
  { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
];

const overrides: AvailabilityOverrideDTO[] = [
  {
    id: "o1",
    date: "2026-06-15T00:00:00.000Z",
    isAvailable: false,
    startTime: null,
    endTime: null,
    serviceMode: null,
  },
];

const bookings: BookingDTO[] = [
  {
    id: "b1",
    bookingDate: "2026-06-08T00:00:00.000Z",
    startTime: "10:00",
    status: "CONFIRMED",
    service: { title: "Cut" },
    customer: { name: "Alice" },
  },
  {
    id: "b2",
    bookingDate: "2026-06-08T00:00:00.000Z",
    startTime: "09:00",
    status: "PENDING_PROVIDER_RESPONSE",
    service: { title: "Colour" },
    customer: { name: "Bob" },
  },
  // Cancelled booking must not be counted.
  {
    id: "b3",
    bookingDate: "2026-06-08T00:00:00.000Z",
    startTime: "12:00",
    status: "DECLINED",
    service: { title: "Trim" },
    customer: { name: "Carol" },
  },
];

describe("buildDayMaps", () => {
  it("keys rules by weekday", () => {
    const { ruleByWeekday } = buildDayMaps(rules, [], []);
    expect(ruleByWeekday.get(1)).toEqual({ startTime: "09:00", endTime: "17:00" });
    expect(ruleByWeekday.has(2)).toBe(false);
  });

  it("keys overrides by their UTC calendar day", () => {
    const { overrideByDateKey } = buildDayMaps([], overrides, []);
    expect(overrideByDateKey.get("2026-06-15")).toEqual({
      isAvailable: false,
      startTime: null,
      endTime: null,
      serviceMode: null,
    });
  });

  it("counts only active bookings per day", () => {
    const { bookingCountByDateKey } = buildDayMaps([], [], bookings);
    expect(bookingCountByDateKey.get("2026-06-08")).toBe(2);
  });

  it("keys legacy blocked dates by their UTC calendar day", () => {
    const blocked: BlockedDateDTO[] = [{ date: "2026-06-22T00:00:00.000Z" }];
    const { blockedDateKeys } = buildDayMaps([], [], [], blocked);
    expect(blockedDateKeys.has("2026-06-22")).toBe(true);
  });

  it("defaults to no blocked dates when the argument is omitted", () => {
    const { blockedDateKeys } = buildDayMaps(rules, [], []);
    expect(blockedDateKeys.size).toBe(0);
  });
});

describe("effectiveDayFor with legacy blocked dates", () => {
  // 22 June 2026 is a Monday, which the weekly rule marks available 09:00–17:00.
  const blocked: BlockedDateDTO[] = [{ date: "2026-06-22T00:00:00.000Z" }];

  it("renders a blocked day as a closed 'day off', overriding the weekly rule", () => {
    const maps = buildDayMaps(rules, [], [], blocked);
    const effective = effectiveDayFor(new Date(2026, 5, 22), maps);
    expect(effective.state).toBe("unavailable");
    expect(effective.isAvailable).toBe(false);
    expect(effective.startTime).toBeNull();
    expect(effective.endTime).toBeNull();
  });

  it("lets a block win over an isAvailable override on the same date", () => {
    const openOverride: AvailabilityOverrideDTO[] = [
      {
        id: "o2",
        date: "2026-06-22T00:00:00.000Z",
        isAvailable: true,
        startTime: "10:00",
        endTime: "14:00",
        serviceMode: "STUDIO",
      },
    ];
    const maps = buildDayMaps(rules, openOverride, [], blocked);
    const effective = effectiveDayFor(new Date(2026, 5, 22), maps);
    expect(effective.state).toBe("unavailable");
    expect(effective.isAvailable).toBe(false);
  });

  it("leaves non-blocked days resolving from rules as usual", () => {
    const maps = buildDayMaps(rules, [], [], blocked);
    // 15 June 2026 is a Monday with no block — stays available.
    const effective = effectiveDayFor(new Date(2026, 5, 15), maps);
    expect(effective.state).toBe("available");
    expect(effective.isAvailable).toBe(true);
  });
});

describe("bookingsForDate", () => {
  it("returns active bookings for the cell sorted by start time", () => {
    const cell = new Date(2026, 5, 8); // local 8 June 2026
    const result = bookingsForDate(cell, bookings);
    expect(result.map((b) => b.id)).toEqual(["b2", "b1"]);
  });

  it("excludes inactive bookings and other days", () => {
    const otherDay = new Date(2026, 5, 9);
    expect(bookingsForDate(otherDay, bookings)).toEqual([]);
  });
});

describe("weekday labels", () => {
  it("maps 0-6 to full names", () => {
    expect(weekdayLabel(0)).toBe("Sunday");
    expect(weekdayLabel(1)).toBe("Monday");
    expect(weekdayLabel(6)).toBe("Saturday");
  });

  it("pluralises for the apply-to-weekday action", () => {
    expect(weekdayPlural(1)).toBe("Mondays");
  });
});

describe("buildMonthGrid", () => {
  it("returns 42 cells starting on the Sunday on/before the 1st", () => {
    const grid = buildMonthGrid(new Date(2026, 5, 1)); // June 2026, 1st is a Monday
    expect(grid).toHaveLength(42);
    expect(grid[0].getDay()).toBe(0);
    // First cell is the Sunday before/on June 1 => 31 May 2026.
    expect(dateKey(grid[0])).toBe("2026-05-31");
    // June 1 (Monday) is the second cell.
    expect(dateKey(grid[1])).toBe("2026-06-01");
  });
});
