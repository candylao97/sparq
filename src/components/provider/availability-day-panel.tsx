"use client";

import { useId, useState } from "react";
import { Check, Home, MapPin, Store, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { dateKey, type EffectiveDay } from "@/lib/availability";
import {
  bookingsForDate,
  weekdayPlural,
  type BookingDTO,
} from "@/components/provider/availability-utils";

type ServiceMode = "STUDIO" | "MOBILE" | "BOTH";

const SERVICE_MODE_OPTIONS: {
  value: ServiceMode;
  label: string;
  icon: typeof Store;
}[] = [
  { value: "STUDIO", label: "At my studio", icon: Store },
  { value: "MOBILE", label: "Client's home", icon: Home },
  { value: "BOTH", label: "Both", icon: MapPin },
];

const STATE_TEXT: Record<EffectiveDay["state"], string> = {
  available: "Available",
  partial: "Available — has bookings",
  unavailable: "Day off",
};

const FULL_DATE_FORMATTER = new Intl.DateTimeFormat("en-AU", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function isServiceMode(value: string | null): value is ServiceMode {
  return value === "STUDIO" || value === "MOBILE" || value === "BOTH";
}

export interface SaveDayPayload {
  date: string;
  isAvailable: boolean;
  startTime: string | null;
  endTime: string | null;
  serviceMode: ServiceMode | null;
}

interface AvailabilityDayPanelProps {
  date: Date;
  effective: EffectiveDay;
  bookings: BookingDTO[];
  saving: boolean;
  onClose: () => void;
  onSaveDay: (payload: SaveDayPayload) => Promise<void>;
  onApplyToWeekday: (
    dayOfWeek: number,
    startTime: string,
    endTime: string
  ) => Promise<void>;
}

export function AvailabilityDayPanel({
  date,
  effective,
  bookings,
  saving,
  onClose,
  onSaveDay,
  onApplyToWeekday,
}: AvailabilityDayPanelProps) {
  const [isAvailable, setIsAvailable] = useState(effective.isAvailable);
  const [startTime, setStartTime] = useState(effective.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(effective.endTime ?? "17:00");
  const [serviceMode, setServiceMode] = useState<ServiceMode | null>(
    isServiceMode(effective.serviceMode) ? effective.serviceMode : null
  );
  const fieldId = useId();
  const availableId = `${fieldId}-available`;
  const startId = `${fieldId}-start`;
  const endId = `${fieldId}-end`;

  // The form is seeded once from `effective`; the page remounts this panel
  // (via a `key` on the selected date) when a different day is chosen, so a
  // re-sync effect is unnecessary.
  const dayBookings = bookingsForDate(date, bookings);
  const dayOfWeek = date.getDay();

  function handleSaveDay() {
    void onSaveDay({
      date: dateKey(date),
      isAvailable,
      startTime: isAvailable ? startTime : null,
      endTime: isAvailable ? endTime : null,
      serviceMode: isAvailable ? serviceMode : null,
    });
  }

  function handleApplyToWeekday() {
    void onApplyToWeekday(dayOfWeek, startTime, endTime);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{FULL_DATE_FORMATTER.format(date)}</p>
          <p className="text-xs text-muted-foreground">{STATE_TEXT[effective.state]}</p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close day panel"
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="mt-5 space-y-6 overflow-y-auto">
        {/* Working hours */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor={availableId} className="cursor-pointer">
              Available this day
            </Label>
            <Switch
              id={availableId}
              checked={isAvailable}
              onCheckedChange={setIsAvailable}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor={startId} className="text-xs text-muted-foreground">
                Start
              </Label>
              <Input
                id={startId}
                type="time"
                value={startTime}
                disabled={!isAvailable}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <span className="mt-5 text-sm text-muted-foreground">to</span>
            <div className="flex-1 space-y-1">
              <Label htmlFor={endId} className="text-xs text-muted-foreground">
                End
              </Label>
              <Input
                id={endId}
                type="time"
                value={endTime}
                disabled={!isAvailable}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Service location */}
        <section className="space-y-2">
          <Label className="text-sm font-medium">Service location</Label>
          <div className="grid gap-2" role="radiogroup" aria-label="Service location">
            {SERVICE_MODE_OPTIONS.map(({ value, label, icon: Icon }) => {
              const active = serviceMode === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={!isAvailable}
                  onClick={() => setServiceMode(value)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    active
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                      : "border-border hover:border-muted-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1 font-medium">{label}</span>
                  {active && <Check className="size-4 text-indigo-600" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* Bookings on this day */}
        {dayBookings.length > 0 && (
          <section className="space-y-2">
            <Label className="text-sm font-medium">Booked this day</Label>
            <ul className="space-y-2">
              {dayBookings.map((booking) => (
                <li
                  key={booking.id}
                  className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm"
                >
                  <p className="font-medium">
                    {booking.startTime} · {booking.customer?.name ?? "Client"}
                  </p>
                  {booking.service?.title && (
                    <p className="text-xs text-muted-foreground">
                      {booking.service.title}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Actions */}
      <div className="mt-6 space-y-3 border-t border-border pt-4">
        <Button className="w-full" onClick={handleSaveDay} disabled={saving}>
          {saving ? "Saving…" : "Save day"}
        </Button>
        <button
          type="button"
          onClick={handleApplyToWeekday}
          disabled={saving || !isAvailable}
          className="w-full text-center text-sm font-medium text-indigo-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          Apply to all {weekdayPlural(dayOfWeek)}
        </button>
      </div>
    </div>
  );
}
