// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import ProviderAvailabilityPage from "@/app/provider/availability/page";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Keep the calendar/day-panel out of the way; we only assert on what the page
// itself renders (relocation guard), not on calendar internals (covered elsewhere).
vi.mock("@/components/provider/availability-calendar", () => ({
  AvailabilityCalendar: () => <div data-testid="calendar" />,
}));
vi.mock("@/components/provider/availability-day-panel", () => ({
  AvailabilityDayPanel: () => <div data-testid="day-panel" />,
}));

function setupFetch() {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/availability") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ rules: [], overrides: [], blockedDates: [] }),
      } as Response);
    }
    if (url === "/api/bookings") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response);
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ProviderAvailabilityPage – Location & coverage relocated away", () => {
  it("no longer renders the Location & coverage / Service area section or suburb checklist", async () => {
    setupFetch();
    render(<ProviderAvailabilityPage />);
    await waitFor(() => expect(screen.getByTestId("calendar")).toBeInTheDocument());

    expect(screen.queryByText(/Location & coverage/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Service area/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: /service mode/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Studio address/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Mobile radius/i)).not.toBeInTheDocument();
    // The serviced-suburbs checklist moved too.
    expect(screen.queryByRole("checkbox", { name: /Carlton/i })).not.toBeInTheDocument();
  });

  it("does not fetch /api/providers/me anymore (location data lives on Profile)", async () => {
    const fetchMock = setupFetch();
    render(<ProviderAvailabilityPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/availability"));
    const calledMe = fetchMock.mock.calls.some(([u]) => String(u) === "/api/providers/me");
    expect(calledMe).toBe(false);
  });

  it("no longer renders the Default hours weekly editor (defaults are set via the day panel's Apply-to-weekday)", async () => {
    setupFetch();
    render(<ProviderAvailabilityPage />);
    await waitFor(() => expect(screen.getByTestId("calendar")).toBeInTheDocument());

    expect(screen.queryByText(/Default hours/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Save schedule/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Monday")).not.toBeInTheDocument();
    expect(screen.queryByText("Sunday")).not.toBeInTheDocument();
  });
});
