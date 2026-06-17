// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { AvailabilityCalendar } from "@/components/provider/availability-calendar";
import {
  buildDayMaps,
  type AvailabilityRuleDTO,
  type AvailabilityOverrideDTO,
  type BookingDTO,
} from "@/components/provider/availability-utils";

// All scenarios are anchored to June 2026. June 1 2026 is a Monday.
const JUNE = new Date(2026, 5, 1);

// Weekly default: Mondays 09:00–17:00 (dayOfWeek 1).
const rules: AvailabilityRuleDTO[] = [
  { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
];

// 15 June 2026 is a Monday turned OFF via an override (unavailable).
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

// 8 June 2026 (Monday) has an active booking => "partial".
const bookings: BookingDTO[] = [
  {
    id: "b1",
    bookingDate: "2026-06-08T00:00:00.000Z",
    startTime: "10:00",
    status: "CONFIRMED",
    service: { title: "Cut" },
    customer: { name: "Alice" },
  },
];

const maps = buildDayMaps(rules, overrides, bookings);

function renderCalendar(
  overridesProps: Partial<{
    selectedDate: Date | null;
  }> = {}
) {
  const onSelectDate = vi.fn();
  const onMonthChange = vi.fn();
  render(
    <AvailabilityCalendar
      monthAnchor={JUNE}
      onMonthChange={onMonthChange}
      selectedDate={overridesProps.selectedDate ?? null}
      onSelectDate={onSelectDate}
      maps={maps}
    />
  );
  return { onSelectDate, onMonthChange };
}

// Helper: get the day-cell button for a given June date by its accessible name prefix.
function getDayButton(label: RegExp) {
  return screen.getByRole("button", { name: label });
}

describe("AvailabilityCalendar", () => {
  afterEach(() => cleanup());

  it("renders the month/year header and weekday headers", () => {
    renderCalendar();
    expect(screen.getByText("June 2026")).toBeInTheDocument();
    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((d) =>
      expect(screen.getByText(d)).toBeInTheDocument()
    );
  });

  it("encodes the three states via accessible name and background tint", () => {
    renderCalendar();

    // available: a plain Monday default (1 June 2026), no booking, no override.
    const available = getDayButton(/^1 June 2026 — available$/);
    expect(available.className).toContain("bg-teal-50");

    // partial: 8 June has a booking.
    const partial = getDayButton(/^8 June 2026 — has bookings, 1 booking$/);
    expect(partial.className).toContain("bg-blue-50");

    // unavailable: 15 June override turns the day off (also a custom day).
    const unavailable = getDayButton(/^15 June 2026 — unavailable, custom day$/);
    expect(unavailable.className).toContain("bg-neutral-100");

    // A non-rule weekday (e.g. Tuesday 2 June) with no rule => unavailable.
    expect(getDayButton(/^2 June 2026 — unavailable$/)).toBeInTheDocument();
  });

  it("shows an override indicator dot only on overridden days", () => {
    renderCalendar();
    const overridden = getDayButton(/^15 June 2026 — unavailable, custom day$/);
    // The subtle dot is an aria-hidden span inside the button.
    expect(overridden.querySelector("span[aria-hidden='true']")).toBeInTheDocument();

    // A plain default day has no override marker in its accessible name.
    expect(screen.queryByRole("button", { name: /1 June 2026.*custom day/ })).toBeNull();
  });

  it("marks the selected day with aria-pressed and a ring", () => {
    renderCalendar({ selectedDate: new Date(2026, 5, 8) });
    const selected = getDayButton(/^8 June 2026 —/);
    expect(selected).toHaveAttribute("aria-pressed", "true");
    expect(selected.className).toContain("ring-2");

    const other = getDayButton(/^1 June 2026 —/);
    expect(other).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onSelectDate with the tapped local-midnight date", () => {
    const { onSelectDate } = renderCalendar();
    fireEvent.click(getDayButton(/^8 June 2026 —/));
    expect(onSelectDate).toHaveBeenCalledTimes(1);
    const arg = onSelectDate.mock.calls[0][0] as Date;
    expect(arg.getFullYear()).toBe(2026);
    expect(arg.getMonth()).toBe(5);
    expect(arg.getDate()).toBe(8);
  });

  it("navigates to previous and next months", () => {
    const { onMonthChange } = renderCalendar();
    fireEvent.click(screen.getByRole("button", { name: /previous month/i }));
    fireEvent.click(screen.getByRole("button", { name: /next month/i }));

    const prev = onMonthChange.mock.calls[0][0] as Date;
    expect(prev.getMonth()).toBe(4); // May
    const next = onMonthChange.mock.calls[1][0] as Date;
    expect(next.getMonth()).toBe(6); // July
  });

  it("Today jumps the month to the current month and selects today", () => {
    const { onMonthChange, onSelectDate } = renderCalendar();
    fireEvent.click(screen.getByRole("button", { name: /today/i }));
    const now = new Date();
    const anchor = onMonthChange.mock.calls[0][0] as Date;
    expect(anchor.getMonth()).toBe(now.getMonth());
    expect(anchor.getDate()).toBe(1);
    const selected = onSelectDate.mock.calls[0][0] as Date;
    expect(selected.getDate()).toBe(now.getDate());
  });

  it("renders a legend covering exactly the three states plus the custom-day marker", () => {
    renderCalendar();
    // Legend labels live in muted-foreground text; scope to avoid header collisions.
    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getByText("Has bookings")).toBeInTheDocument();
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    expect(screen.getByText("Custom day")).toBeInTheDocument();
  });

  it("renders a fully padded 6x7 grid (42 day buttons)", () => {
    renderCalendar();
    // Every day cell is a button with an accessible name ending in a state word.
    const dayButtons = screen
      .getAllByRole("button")
      .filter((b) => /\d+ June|\d+ May|\d+ July/.test(b.getAttribute("aria-label") ?? ""));
    expect(dayButtons).toHaveLength(42);
  });

  it("uses explicit per-state swatch colours in the legend (not derived from cell classes)", () => {
    const { container } = render(
      <AvailabilityCalendar
        monthAnchor={JUNE}
        onMonthChange={vi.fn()}
        selectedDate={null}
        onSelectDate={vi.fn()}
        maps={maps}
      />
    );
    // Each legend row pairs an aria-hidden swatch with its text label. Walk from
    // the label to the sibling swatch and assert the brand colour per state.
    const swatchFor = (label: string) => {
      const text = within(container as HTMLElement).getByText(label);
      const row = text.parentElement as HTMLElement;
      return row.querySelector("span[aria-hidden='true']") as HTMLElement;
    };

    expect(swatchFor("Available").className).toContain("bg-teal-50");
    expect(swatchFor("Has bookings").className).toContain("bg-blue-50");
    expect(swatchFor("Unavailable").className).toContain("bg-neutral-100");
    // The custom-day marker is the neutral dot, distinct from the state swatches.
    expect(swatchFor("Custom day").className).toContain("bg-neutral-500");
  });

  it("renders today with a distinct treatment from the selected ring (disambiguating selected-today)", () => {
    const now = new Date();
    const todayAnchor = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Render with TODAY also selected: the cell must read as both at once.
    render(
      <AvailabilityCalendar
        monthAnchor={todayAnchor}
        onMonthChange={vi.fn()}
        selectedDate={today}
        onSelectDate={vi.fn()}
        maps={buildDayMaps([], [], [])}
      />
    );

    const todayCell = screen.getByRole("button", { name: new RegExp(`^${today.getDate()} `) });

    // Selection is still the dark ring on the button.
    expect(todayCell).toHaveAttribute("aria-pressed", "true");
    expect(todayCell.className).toContain("ring-2");
    expect(todayCell.className).toContain("ring-neutral-900");

    // Today is differentiated by a treatment on the inner number span (underline),
    // NOT by a near-black filled circle that would clash with the selection ring.
    const inner = todayCell.querySelector("span") as HTMLElement;
    expect(inner.className).toContain("underline");
    expect(inner.className).not.toContain("bg-neutral-900");
    expect(inner.className).not.toContain("rounded-full");
  });

  it("does not apply the today treatment to a non-today selected day", () => {
    // 8 June 2026 is selected but (almost certainly) not the real 'today'.
    render(
      <AvailabilityCalendar
        monthAnchor={JUNE}
        onMonthChange={vi.fn()}
        selectedDate={new Date(2026, 5, 8)}
        onSelectDate={vi.fn()}
        maps={maps}
      />
    );
    const selected = screen.getByRole("button", { name: /^8 June 2026 —/ });
    const inner = selected.querySelector("span") as HTMLElement;
    // Guard against the suite happening to run on 8 June of some year — only
    // assert when 2026-06-08 is genuinely not today.
    const realToday = new Date();
    const isReallyToday =
      realToday.getFullYear() === 2026 &&
      realToday.getMonth() === 5 &&
      realToday.getDate() === 8;
    if (!isReallyToday) {
      expect(inner.className).not.toContain("underline");
    }
  });

  it("dims days outside the anchored month", () => {
    renderCalendar();
    // 31 May 2026 is the leading pad cell.
    const padCell = getDayButton(/^31 May 2026 —/);
    expect(padCell.className).toContain("opacity-60");
    // In-month day is not dimmed.
    const inMonth = within(getDayButton(/^1 June 2026 —/) as HTMLElement);
    expect(inMonth).toBeTruthy();
    expect(getDayButton(/^1 June 2026 —/).className).not.toContain("opacity-60");
  });
});
