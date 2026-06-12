// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  AvailabilityDayPanel,
  type SaveDayPayload,
} from "@/components/provider/availability-day-panel";
import type { EffectiveDay } from "@/lib/availability";
import type { BookingDTO } from "@/components/provider/availability-utils";

// 8 June 2026 is a Monday (dayOfWeek 1).
const MONDAY = new Date(2026, 5, 8);

const availableEffective: EffectiveDay = {
  state: "available",
  isAvailable: true,
  startTime: "09:00",
  endTime: "17:00",
  serviceMode: "STUDIO",
  hasOverride: false,
};

const bookings: BookingDTO[] = [
  {
    id: "b1",
    bookingDate: "2026-06-08T00:00:00.000Z",
    startTime: "10:00",
    status: "CONFIRMED",
    service: { title: "Haircut" },
    customer: { name: "Alice" },
  },
];

function renderPanel(
  props: Partial<{
    date: Date;
    effective: EffectiveDay;
    bookings: BookingDTO[];
    saving: boolean;
    onClose: () => void;
    onSaveDay: (p: SaveDayPayload) => Promise<void>;
    onApplyToWeekday: (d: number, s: string, e: string) => Promise<void>;
  }> = {}
) {
  const onSaveDay = props.onSaveDay ?? vi.fn().mockResolvedValue(undefined);
  const onApplyToWeekday = props.onApplyToWeekday ?? vi.fn().mockResolvedValue(undefined);
  const onClose = props.onClose ?? vi.fn();
  render(
    <AvailabilityDayPanel
      date={props.date ?? MONDAY}
      effective={props.effective ?? availableEffective}
      bookings={props.bookings ?? bookings}
      saving={props.saving ?? false}
      onClose={onClose}
      onSaveDay={onSaveDay}
      onApplyToWeekday={onApplyToWeekday}
    />
  );
  return { onSaveDay, onApplyToWeekday, onClose };
}

describe("AvailabilityDayPanel", () => {
  afterEach(() => cleanup());

  it("shows the selected date and its status", () => {
    renderPanel();
    // en-AU long format: "Monday 8 June 2026" (comma is ICU-version dependent).
    expect(screen.getByText(/Monday,? 8 June 2026/)).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();
  });

  it("seeds the working-hours inputs from the effective day", () => {
    renderPanel();
    expect(screen.getByLabelText("Start")).toHaveValue("09:00");
    expect(screen.getByLabelText("End")).toHaveValue("17:00");
  });

  it("saves an override payload with the edited hours and selected location", () => {
    const { onSaveDay } = renderPanel();

    fireEvent.change(screen.getByLabelText("Start"), { target: { value: "10:30" } });
    fireEvent.change(screen.getByLabelText("End"), { target: { value: "16:00" } });
    fireEvent.click(screen.getByRole("radio", { name: /client's home/i }));
    fireEvent.click(screen.getByRole("button", { name: /^save day$/i }));

    expect(onSaveDay).toHaveBeenCalledWith({
      date: "2026-06-08",
      isAvailable: true,
      startTime: "10:30",
      endTime: "16:00",
      serviceMode: "MOBILE",
    });
  });

  it("marks the selected service location with aria-checked", () => {
    renderPanel();
    // STUDIO seeded as selected.
    expect(screen.getByRole("radio", { name: /at my studio/i })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    fireEvent.click(screen.getByRole("radio", { name: /both/i }));
    expect(screen.getByRole("radio", { name: /both/i })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    expect(screen.getByRole("radio", { name: /at my studio/i })).toHaveAttribute(
      "aria-checked",
      "false"
    );
  });

  it("turning the day OFF disables hours/location and nulls them in the saved payload", () => {
    const { onSaveDay } = renderPanel();

    fireEvent.click(screen.getByRole("switch", { name: /available this day/i }));

    // Hours and location controls are disabled when off.
    expect(screen.getByLabelText("Start")).toBeDisabled();
    expect(screen.getByLabelText("End")).toBeDisabled();
    expect(screen.getByRole("radio", { name: /at my studio/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /^save day$/i }));
    expect(onSaveDay).toHaveBeenCalledWith({
      date: "2026-06-08",
      isAvailable: false,
      startTime: null,
      endTime: null,
      serviceMode: null,
    });
  });

  it("Apply-to-weekday posts the weekday index and current hours", () => {
    const { onApplyToWeekday } = renderPanel();
    fireEvent.change(screen.getByLabelText("Start"), { target: { value: "08:00" } });
    fireEvent.change(screen.getByLabelText("End"), { target: { value: "12:00" } });
    fireEvent.click(screen.getByRole("button", { name: /apply to all mondays/i }));
    expect(onApplyToWeekday).toHaveBeenCalledWith(1, "08:00", "12:00");
  });

  it("disables Apply-to-weekday when the day is off", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("switch", { name: /available this day/i }));
    expect(screen.getByRole("button", { name: /apply to all mondays/i })).toBeDisabled();
  });

  it("disables actions and shows a saving label while saving", () => {
    renderPanel({ saving: true });
    const save = screen.getByRole("button", { name: /saving/i });
    expect(save).toBeDisabled();
    expect(screen.getByRole("button", { name: /apply to all mondays/i })).toBeDisabled();
  });

  it("lists the day's bookings (client, time, service) read-only", () => {
    renderPanel();
    expect(screen.getByText("Booked this day")).toBeInTheDocument();
    expect(screen.getByText(/10:00 · Alice/)).toBeInTheDocument();
    expect(screen.getByText("Haircut")).toBeInTheDocument();
  });

  it("omits the bookings section when there are none", () => {
    renderPanel({ bookings: [] });
    expect(screen.queryByText("Booked this day")).not.toBeInTheDocument();
  });

  it("calls onClose from the close button", () => {
    const { onClose } = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /close day panel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders the correct weekday in the apply link for other days", () => {
    // 10 June 2026 is a Wednesday (dayOfWeek 3).
    renderPanel({ date: new Date(2026, 5, 10), bookings: [] });
    expect(
      screen.getByRole("button", { name: /apply to all wednesdays/i })
    ).toBeInTheDocument();
  });
});
