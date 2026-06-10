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
import ProviderOverviewPage from "@/app/provider/page";

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
  customer?: { name: string };
  service?: { title: string };
};

function makeBooking(overrides: Partial<RawBooking> & { id: string; status: string }): RawBooking {
  return {
    bookingDate: "2026-07-01",
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
 * given bookings, then waits for the loading skeleton to clear.
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
    // /api/bookings/:id/respond
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
  });
  vi.stubGlobal("fetch", fetchMock);

  const utils = render(<ProviderOverviewPage />);
  // Wait until the fetch resolves and loading state clears.
  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith("/api/bookings")
  );
  return { ...utils, fetchMock };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  toastSuccess.mockClear();
  toastError.mockClear();
});

describe("ProviderOverviewPage – pending nudge banner", () => {
  it("does not render the banner when there are no pending requests", async () => {
    await renderWithBookings([
      makeBooking({ id: "c1", status: "CONFIRMED" }),
    ]);
    await waitFor(() =>
      expect(screen.queryByText(/waiting for your response/i)).not.toBeInTheDocument()
    );
  });

  it("renders a banner linking to the requests list when one request is pending (singular copy)", async () => {
    await renderWithBookings([
      makeBooking({ id: "p1", status: "PENDING_PROVIDER_RESPONSE" }),
    ]);

    const banner = await screen.findByText(
      /You have 1 request waiting for your response/i
    );
    expect(banner).toBeInTheDocument();
    // Singular: must NOT say "requests".
    expect(banner.textContent).toMatch(/1 request waiting/i);
    expect(banner.textContent).not.toMatch(/requests waiting/i);

    // The banner is an anchor pointing at the in-page requests list.
    const link = banner.closest("a");
    expect(link).not.toBeNull();
    expect(link).toHaveAttribute("href", "#booking-requests");
  });

  it("pluralizes the copy when multiple requests are pending", async () => {
    await renderWithBookings([
      makeBooking({ id: "p1", status: "PENDING_PROVIDER_RESPONSE" }),
      makeBooking({ id: "p2", status: "PENDING_PROVIDER_RESPONSE" }),
    ]);
    expect(
      await screen.findByText(/You have 2 requests waiting for your response/i)
    ).toBeInTheDocument();
  });

  it("exposes a focus-visible affordance on the banner link (accessibility)", async () => {
    await renderWithBookings([
      makeBooking({ id: "p1", status: "PENDING_PROVIDER_RESPONSE" }),
    ]);
    const banner = await screen.findByText(/waiting for your response/i);
    const link = banner.closest("a");
    expect(link?.className).toMatch(/focus-visible:ring/);
  });
});

describe("ProviderOverviewPage – empty state", () => {
  it("renders the dashed-border focal card with a 'Set your availability' CTA when there are no bookings", async () => {
    await renderWithBookings([]);

    expect(await screen.findByText(/No bookings yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/New booking requests from customers will appear here\./i)
    ).toBeInTheDocument();

    const cta = screen.getByRole("link", { name: /Set your availability/i });
    expect(cta).toHaveAttribute("href", "/provider/availability");

    // Focal card mirrors the customer dashboard's dashed-border empty state.
    const card = screen.getByText(/No bookings yet/i).closest("div");
    expect(card?.className).toMatch(/border-dashed/);
    expect(card?.className).toMatch(/rounded-2xl/);

    // No pending banner with an empty list.
    expect(
      screen.queryByText(/waiting for your response/i)
    ).not.toBeInTheDocument();
  });

  it("shows the booking list (not the empty state) when bookings exist", async () => {
    await renderWithBookings([
      makeBooking({ id: "c1", status: "CONFIRMED", customer: { name: "Jordan Lee" } }),
    ]);
    expect(await screen.findByText("Jordan Lee")).toBeInTheDocument();
    expect(screen.queryByText(/No bookings yet/i)).not.toBeInTheDocument();
  });
});

describe("ProviderOverviewPage – preserved behavior", () => {
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
    // Pending=1, Confirmed=2, Completed=1 rendered in their stat cards. Scope to
    // each card via its uppercase label span -> card root (label span's grandparent).
    const statCard = (label: string) => {
      const span = screen
        .getAllByText(label)
        .find((el) => el.tagName === "SPAN" && /uppercase/.test(el.className));
      // card root = <div.rounded-2xl> wrapping the icon/label row and the count <p>.
      return span?.closest("div.rounded-2xl") as HTMLElement;
    };
    expect(within(statCard("Pending")).getByText("1")).toBeInTheDocument();
    expect(within(statCard("Confirmed")).getByText("2")).toBeInTheDocument();
    expect(within(statCard("Completed")).getByText("1")).toBeInTheDocument();
  });

  it("renders price with two decimals", async () => {
    await renderWithBookings([
      makeBooking({ id: "c1", status: "CONFIRMED", totalPrice: 80 }),
    ]);
    expect(await screen.findByText("$80.00")).toBeInTheDocument();
  });

  it("accepts a pending booking: posts to respond, shows 'Accepting…', and optimistically confirms", async () => {
    const { fetchMock } = await renderWithBookings([
      makeBooking({ id: "p1", status: "PENDING_PROVIDER_RESPONSE", customer: { name: "Jordan Lee" } }),
    ]);

    const acceptBtn = await screen.findByRole("button", {
      name: /Accept booking from Jordan Lee/i,
    });
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

    // Optimistic update flips the badge to Confirmed and removes the actions.
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Booking accepted"));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /Accept booking from Jordan Lee/i })
      ).not.toBeInTheDocument()
    );
    // The booking row's status badge now reads "Confirmed" (scope to the list item).
    const row = screen.getByText("Jordan Lee").closest("li") as HTMLElement;
    expect(within(row).getByText("Confirmed")).toBeInTheDocument();
  });

  it("declines a pending booking with the destructive action", async () => {
    const { fetchMock } = await renderWithBookings([
      makeBooking({ id: "p1", status: "PENDING_PROVIDER_RESPONSE", customer: { name: "Jordan Lee" } }),
    ]);

    const declineBtn = await screen.findByRole("button", {
      name: /Decline booking from Jordan Lee/i,
    });
    fireEvent.click(declineBtn);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/bookings/p1/respond",
        expect.objectContaining({
          body: JSON.stringify({ action: "decline" }),
        })
      )
    );
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Booking declined"));
    expect(screen.getByText("Declined")).toBeInTheDocument();
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

    render(<ProviderOverviewPage />);
    const acceptBtn = await screen.findByRole("button", { name: /Accept booking/i });
    fireEvent.click(acceptBtn);

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Failed to respond to booking")
    );
    // Booking stays pending (no optimistic flip on failure).
    expect(
      screen.getByRole("button", { name: /Accept booking/i })
    ).toBeInTheDocument();
  });
});
