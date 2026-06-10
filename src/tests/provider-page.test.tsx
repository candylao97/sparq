// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import ProviderBookingsPage from "@/app/provider/page";

// next/link just needs to render an anchor for these tests so we can assert on
// href / role="link". Preserve className so focus-state classes are inspectable.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// Provide a stable signed-in session so the greeting renders deterministically.
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { name: "Aki Tan" } } }),
}));

// Capture toast calls without rendering sonner's portal.
const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

type RawBooking = {
  id: string;
  status: string;
  bookingDate: string;
  startTime: string;
  endTime?: string;
  createdAt: string;
  totalPrice?: number;
  payment?: { amount: number } | null;
  customer?: { name: string };
  service?: { title: string };
};

function makeBooking(
  overrides: Partial<RawBooking> & { id: string; status: string }
): RawBooking {
  // Default to the current month so "This month" earnings are deterministic for
  // completed-booking fixtures regardless of when the suite runs.
  const now = new Date();
  const inMonth = new Date(now.getFullYear(), now.getMonth(), 15)
    .toISOString()
    .slice(0, 10);
  return {
    bookingDate: inMonth,
    startTime: "10:00",
    endTime: "11:00",
    createdAt: "2026-06-01T00:00:00.000Z",
    totalPrice: 80,
    customer: { name: "Jordan Lee" },
    service: { title: "Balayage" },
    ...overrides,
  };
}

/**
 * Renders the page with the GET /api/bookings fetch stubbed to resolve to the
 * given bookings, then waits for the fetch to fire.
 */
async function renderWithBookings(bookings: RawBooking[]) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/bookings") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(bookings),
      } as Response);
    }
    // /api/bookings/:id/respond and /complete
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
  });
  vi.stubGlobal("fetch", fetchMock);

  const utils = render(<ProviderBookingsPage />);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/bookings"));
  return { ...utils, fetchMock };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  toastSuccess.mockClear();
  toastError.mockClear();
});

function statCard(label: string) {
  const span = screen
    .getAllByText(label)
    .find((el) => el.tagName === "SPAN" && /uppercase/.test(el.className));
  return span?.closest("div.rounded-2xl, a.rounded-2xl") as HTMLElement;
}

describe("ProviderBookingsPage – heading & stat cards", () => {
  it("renders the greeting derived from the session name", async () => {
    await renderWithBookings([]);
    expect(
      await screen.findByRole("heading", { name: /Hi Aki/i })
    ).toBeInTheDocument();
  });

  it("renders the at-a-glance stat counts", async () => {
    await renderWithBookings([
      makeBooking({ id: "p1", status: "PENDING_PROVIDER_RESPONSE" }),
      makeBooking({ id: "c1", status: "CONFIRMED" }),
      makeBooking({ id: "c2", status: "CONFIRMED" }),
      makeBooking({ id: "d1", status: "COMPLETED" }),
    ]);
    await waitFor(() =>
      expect(within(statCard("Pending")).getByText("1")).toBeInTheDocument()
    );
    expect(within(statCard("Confirmed")).getByText("2")).toBeInTheDocument();
    expect(within(statCard("Completed")).getByText("1")).toBeInTheDocument();
  });

  it("renders an accented 'This month' card linking to settings/payout", async () => {
    await renderWithBookings([
      makeBooking({ id: "d1", status: "COMPLETED", totalPrice: 80 }),
      makeBooking({ id: "d2", status: "COMPLETED", totalPrice: 50 }),
    ]);

    const card = statCard("This month");
    await waitFor(() =>
      expect(within(card).getByText("$130.00")).toBeInTheDocument()
    );
    // It is a link to the payout (settings) view, visually accented.
    expect(card.tagName).toBe("A");
    expect(card).toHaveAttribute("href", "/provider/settings");
    expect(card.className).toMatch(/indigo/);
  });
});

describe("ProviderBookingsPage – booking list & actions", () => {
  it("shows an empty message when there are no bookings in a tab", async () => {
    await renderWithBookings([]);
    expect(await screen.findAllByText(/No bookings found\./i)).not.toHaveLength(0);
  });

  it("renders price with two decimals", async () => {
    await renderWithBookings([
      makeBooking({ id: "p1", status: "PENDING_PROVIDER_RESPONSE", totalPrice: 80 }),
    ]);
    expect(await screen.findByText("$80.00")).toBeInTheDocument();
  });

  it("accepts a pending booking: posts to respond and optimistically confirms", async () => {
    const { fetchMock } = await renderWithBookings([
      makeBooking({ id: "p1", status: "PENDING_PROVIDER_RESPONSE", customer: { name: "Jordan Lee" } }),
    ]);

    const acceptBtn = await screen.findByRole("button", { name: /^Accept$/i });
    fireEvent.click(acceptBtn);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/bookings/p1/respond",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ action: "accept" }),
        })
      )
    );
    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith("Booking accepted")
    );
  });

  it("declines a pending booking with the destructive action", async () => {
    const { fetchMock } = await renderWithBookings([
      makeBooking({ id: "p1", status: "PENDING_PROVIDER_RESPONSE" }),
    ]);

    const declineBtn = await screen.findByRole("button", { name: /^Decline$/i });
    fireEvent.click(declineBtn);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/bookings/p1/respond",
        expect.objectContaining({
          body: JSON.stringify({ action: "decline" }),
        })
      )
    );
    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith("Booking declined")
    );
  });

  it("marks a confirmed booking complete via the complete endpoint", async () => {
    const { fetchMock } = await renderWithBookings([
      makeBooking({ id: "c1", status: "CONFIRMED" }),
    ]);

    // Switch to the Confirmed tab to reveal the action.
    fireEvent.click(await screen.findByRole("tab", { name: /Confirmed/i }));
    const completeBtn = await screen.findByRole("button", {
      name: /Mark complete/i,
    });
    fireEvent.click(completeBtn);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/bookings/c1/complete",
        expect.objectContaining({ method: "POST" })
      )
    );
    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith("Booking marked as complete")
    );
  });

  it("surfaces an error toast when the respond request fails", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/bookings") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              makeBooking({ id: "p1", status: "PENDING_PROVIDER_RESPONSE" }),
            ]),
        } as Response);
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) } as Response);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ProviderBookingsPage />);
    const acceptBtn = await screen.findByRole("button", { name: /^Accept$/i });
    fireEvent.click(acceptBtn);

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Failed to respond to booking")
    );
  });
});
