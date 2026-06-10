import { describe, it, expect } from "vitest";
import {
  dateKey,
  dateKeyUTC,
  resolveEffectiveDay,
  type DayState,
} from "@/lib/availability";

type WeekdayRule = { startTime: string; endTime: string };
type OverrideForDay = {
  isAvailable: boolean;
  startTime: string | null;
  endTime: string | null;
  serviceMode: string | null;
};

const emptyRules = (): Map<number, WeekdayRule> => new Map();
const emptyOverrides = (): Map<string, OverrideForDay> => new Map();
const emptyBookings = (): Map<string, number> => new Map();

describe("dateKey", () => {
  it("returns local yyyy-MM-dd with zero-padding", () => {
    // 2026-03-09 in local time
    const d = new Date(2026, 2, 9, 13, 45, 0);
    expect(dateKey(d)).toBe("2026-03-09");
  });

  it("pads single-digit month and day", () => {
    const d = new Date(2026, 0, 1, 0, 0, 0);
    expect(dateKey(d)).toBe("2026-01-01");
  });

  it("uses local components, not UTC (late-evening local time stays on the same local day)", () => {
    // 23:30 local on 2026-06-30 — under UTC this could roll to July 1 in +tz
    const d = new Date(2026, 5, 30, 23, 30, 0);
    expect(dateKey(d)).toBe("2026-06-30");
    // sanity: matches manual local-component formatting
    const manual = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    expect(dateKey(d)).toBe(manual);
  });
});

describe("dateKeyUTC", () => {
  it("reads UTC components, not local", () => {
    const d = new Date(2026, 2, 9, 13, 45, 0); // local 2026-03-09 13:45
    expect(dateKeyUTC(d)).toBe(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
        d.getUTCDate()
      ).padStart(2, "0")}`
    );
  });

  it("@db.Date round-trip: write key (new Date('yyyy-MM-dd')) and read key agree, even under a negative-offset TZ", () => {
    // Prisma materializes a @db.Date as a Date at UTC midnight. The write path
    // stores it as `new Date("2026-06-08")` (UTC midnight). Reading it back with
    // dateKeyUTC must yield the same calendar day...
    const dbDate = new Date("2026-06-08"); // UTC midnight, as Prisma returns
    expect(dateKeyUTC(dbDate)).toBe("2026-06-08");

    // ...and that read key must equal the local dateKey of the UI's
    // local-midnight grid cell for the same calendar day, regardless of host TZ.
    const uiCell = new Date(2026, 5, 8); // local midnight 2026-06-08
    expect(dateKeyUTC(dbDate)).toBe(dateKey(uiCell));

    // Guard the documented bug: in a negative-UTC-offset TZ, keying the @db.Date
    // value with LOCAL components rolls it back a day. The local dateKey of a
    // UTC-midnight value is either the same day (offset >= 0) or the previous day
    // (offset < 0) — so it must never be the day AFTER. dateKeyUTC is invariant.
    expect(dateKey(dbDate) <= dateKeyUTC(dbDate)).toBe(true);
  });
});

describe("resolveEffectiveDay", () => {
  // Monday 2026-06-08 (getDay() === 1)
  const monday = new Date(2026, 5, 8);
  expect(monday.getDay()).toBe(1);

  it("default working weekday (rule exists, no override, no bookings) -> available", () => {
    const rules = new Map<number, WeekdayRule>([
      [1, { startTime: "09:00", endTime: "17:00" }],
    ]);
    const result = resolveEffectiveDay(monday, rules, emptyOverrides(), emptyBookings());
    expect(result).toEqual({
      state: "available" satisfies DayState,
      isAvailable: true,
      startTime: "09:00",
      endTime: "17:00",
      serviceMode: null,
      hasOverride: false,
    });
  });

  it("weekday with no rule -> unavailable", () => {
    const result = resolveEffectiveDay(monday, emptyRules(), emptyOverrides(), emptyBookings());
    expect(result.state).toBe("unavailable");
    expect(result.isAvailable).toBe(false);
    expect(result.startTime).toBeNull();
    expect(result.endTime).toBeNull();
    expect(result.serviceMode).toBeNull();
    expect(result.hasOverride).toBe(false);
  });

  it("override isAvailable=false -> unavailable + hasOverride (even with a working rule)", () => {
    const rules = new Map<number, WeekdayRule>([
      [1, { startTime: "09:00", endTime: "17:00" }],
    ]);
    const overrides = new Map<string, OverrideForDay>([
      [
        dateKey(monday),
        { isAvailable: false, startTime: null, endTime: null, serviceMode: null },
      ],
    ]);
    const result = resolveEffectiveDay(monday, rules, overrides, emptyBookings());
    expect(result.state).toBe("unavailable");
    expect(result.isAvailable).toBe(false);
    expect(result.hasOverride).toBe(true);
  });

  it("override with custom hours -> those hours are used", () => {
    const rules = new Map<number, WeekdayRule>([
      [1, { startTime: "09:00", endTime: "17:00" }],
    ]);
    const overrides = new Map<string, OverrideForDay>([
      [
        dateKey(monday),
        { isAvailable: true, startTime: "11:00", endTime: "15:00", serviceMode: "MOBILE" },
      ],
    ]);
    const result = resolveEffectiveDay(monday, rules, overrides, emptyBookings());
    expect(result.startTime).toBe("11:00");
    expect(result.endTime).toBe("15:00");
    expect(result.serviceMode).toBe("MOBILE");
    expect(result.hasOverride).toBe(true);
    expect(result.state).toBe("available");
  });

  it("a day with >= 1 booking -> partial", () => {
    const rules = new Map<number, WeekdayRule>([
      [1, { startTime: "09:00", endTime: "17:00" }],
    ]);
    const bookings = new Map<string, number>([[dateKey(monday), 2]]);
    const result = resolveEffectiveDay(monday, rules, emptyOverrides(), bookings);
    expect(result.state).toBe("partial");
    expect(result.isAvailable).toBe(true);
  });

  it("override.isAvailable=true on a non-working weekday -> available (and partial when booked)", () => {
    // No rule for Monday at all
    const overrides = new Map<string, OverrideForDay>([
      [
        dateKey(monday),
        { isAvailable: true, startTime: "10:00", endTime: "14:00", serviceMode: null },
      ],
    ]);

    const available = resolveEffectiveDay(monday, emptyRules(), overrides, emptyBookings());
    expect(available.state).toBe("available");
    expect(available.isAvailable).toBe(true);
    expect(available.startTime).toBe("10:00");
    expect(available.hasOverride).toBe(true);

    const bookings = new Map<string, number>([[dateKey(monday), 1]]);
    const booked = resolveEffectiveDay(monday, emptyRules(), overrides, bookings);
    expect(booked.state).toBe("partial");
  });

  it("override hours fall back to the weekday rule hours when override hours are null", () => {
    const rules = new Map<number, WeekdayRule>([
      [1, { startTime: "08:30", endTime: "16:30" }],
    ]);
    const overrides = new Map<string, OverrideForDay>([
      [
        dateKey(monday),
        { isAvailable: true, startTime: null, endTime: null, serviceMode: "STUDIO" },
      ],
    ]);
    const result = resolveEffectiveDay(monday, rules, overrides, emptyBookings());
    expect(result.startTime).toBe("08:30");
    expect(result.endTime).toBe("16:30");
    expect(result.serviceMode).toBe("STUDIO");
    expect(result.hasOverride).toBe(true);
  });

  it("override available=true with null hours and no weekday rule -> hours null", () => {
    const overrides = new Map<string, OverrideForDay>([
      [
        dateKey(monday),
        { isAvailable: true, startTime: null, endTime: null, serviceMode: null },
      ],
    ]);
    const result = resolveEffectiveDay(monday, emptyRules(), overrides, emptyBookings());
    expect(result.startTime).toBeNull();
    expect(result.endTime).toBeNull();
    expect(result.state).toBe("available");
  });

  it("Stage-2 contract: @db.Date override keyed via dateKeyUTC resolves onto the local-midnight grid cell", () => {
    // The grid cell is a local-midnight Date the UI constructs.
    const uiCell = new Date(2026, 5, 8); // local midnight 2026-06-08 (Monday)
    // The override row comes from Prisma as a @db.Date materialized at UTC
    // midnight, and per the contract is keyed with dateKeyUTC.
    const dbDate = new Date("2026-06-08"); // UTC midnight, as Prisma returns
    const overrides = new Map<string, OverrideForDay>([
      [
        dateKeyUTC(dbDate),
        { isAvailable: false, startTime: null, endTime: null, serviceMode: null },
      ],
    ]);
    const bookings = new Map<string, number>([[dateKeyUTC(dbDate), 3]]);

    const result = resolveEffectiveDay(uiCell, emptyRules(), overrides, bookings);
    // If the @db.Date were mis-keyed with local dateKey under a negative-offset
    // TZ, it would land on the previous day and this override would be missed.
    expect(result.hasOverride).toBe(true);
    expect(result.isAvailable).toBe(false);
    expect(result.state).toBe("unavailable");
  });

  it("produces exactly one of the three allowed states", () => {
    const allowed: DayState[] = ["available", "partial", "unavailable"];
    const rules = new Map<number, WeekdayRule>([
      [1, { startTime: "09:00", endTime: "17:00" }],
    ]);
    const result = resolveEffectiveDay(monday, rules, emptyOverrides(), emptyBookings());
    expect(allowed).toContain(result.state);
  });
});
