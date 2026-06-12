"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dateKey, type DayState } from "@/lib/availability";
import {
  buildMonthGrid,
  effectiveDayFor,
  type DayMaps,
} from "@/components/provider/availability-utils";

const WEEKDAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTH_FORMATTER = new Intl.DateTimeFormat("en-AU", {
  month: "long",
  year: "numeric",
});

const FULL_DATE_FORMATTER = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const STATE_LABEL: Record<DayState, string> = {
  available: "available",
  partial: "has bookings",
  unavailable: "unavailable",
};

interface DayCellProps {
  date: Date;
  inCurrentMonth: boolean;
  isToday: boolean;
  selected: boolean;
  /** Reserved for future drag-to-select range support; currently a no-op visual. */
  inRange: boolean;
  state: DayState;
  hasOverride: boolean;
  bookingCount: number;
  onSelect: (date: Date) => void;
}

const STATE_CELL_CLASSES: Record<DayState, string> = {
  available: "bg-teal-50 border-teal-200 text-teal-900 hover:bg-teal-100",
  partial: "bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100",
  unavailable:
    "bg-neutral-100 border-neutral-200 text-neutral-600 hover:bg-neutral-200",
};

function DayCell({
  date,
  inCurrentMonth,
  isToday,
  selected,
  inRange,
  state,
  hasOverride,
  bookingCount,
  onSelect,
}: DayCellProps) {
  const accessibleName = `${FULL_DATE_FORMATTER.format(date)} — ${STATE_LABEL[state]}${
    bookingCount > 0
      ? `, ${bookingCount} booking${bookingCount === 1 ? "" : "s"}`
      : ""
  }${hasOverride ? ", custom day" : ""}`;

  return (
    <button
      type="button"
      aria-label={accessibleName}
      aria-pressed={selected}
      onClick={() => onSelect(date)}
      className={cn(
        "relative flex aspect-square flex-col items-center justify-center rounded-xl border text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        STATE_CELL_CLASSES[state],
        !inCurrentMonth && "opacity-60",
        inRange && "ring-1 ring-inset ring-teal-300",
        selected && "ring-2 ring-neutral-900 ring-offset-1"
      )}
    >
      <span className={cn(isToday && "flex size-6 items-center justify-center rounded-full bg-neutral-900 text-white")}>
        {date.getDate()}
      </span>
      {hasOverride && (
        <span
          aria-hidden="true"
          className="absolute bottom-1.5 size-1.5 rounded-full bg-neutral-500"
        />
      )}
    </button>
  );
}

interface LegendProps {
  className?: string;
}

function Legend({ className }: LegendProps) {
  const items: { state: DayState; label: string }[] = [
    { state: "available", label: "Available" },
    { state: "partial", label: "Has bookings" },
    { state: "unavailable", label: "Unavailable" },
  ];
  return (
    <div className={cn("flex flex-wrap items-center gap-4", className)}>
      {items.map(({ state, label }) => (
        <div key={state} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn(
              "size-3 rounded-[4px] border",
              STATE_CELL_CLASSES[state].split(" ").slice(0, 2).join(" ")
            )}
          />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-neutral-500" />
        <span className="text-xs text-muted-foreground">Custom day</span>
      </div>
    </div>
  );
}

interface AvailabilityCalendarProps {
  monthAnchor: Date;
  onMonthChange: (next: Date) => void;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  maps: DayMaps;
}

export function AvailabilityCalendar({
  monthAnchor,
  onMonthChange,
  selectedDate,
  onSelectDate,
  maps,
}: AvailabilityCalendarProps) {
  const cells = buildMonthGrid(monthAnchor);
  const todayKey = dateKey(new Date());
  const selectedKey = selectedDate ? dateKey(selectedDate) : null;
  const currentMonth = monthAnchor.getMonth();

  function goToMonth(offset: number) {
    onMonthChange(
      new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + offset, 1)
    );
  }

  function goToday() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    onMonthChange(new Date(now.getFullYear(), now.getMonth(), 1));
    onSelectDate(today);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{MONTH_FORMATTER.format(monthAnchor)}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => goToMonth(-1)}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => goToMonth(1)}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1.5">
        {WEEKDAY_HEADERS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((date) => {
          const effective = effectiveDayFor(date, maps);
          const key = dateKey(date);
          const bookingCount = maps.bookingCountByDateKey.get(key) ?? 0;
          return (
            <DayCell
              key={key}
              date={date}
              inCurrentMonth={date.getMonth() === currentMonth}
              isToday={key === todayKey}
              selected={key === selectedKey}
              inRange={false}
              state={effective.state}
              hasOverride={effective.hasOverride}
              bookingCount={bookingCount}
              onSelect={onSelectDate}
            />
          );
        })}
      </div>

      <Legend className="mt-5" />
    </div>
  );
}
