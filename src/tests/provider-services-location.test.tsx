// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import ProviderServicesPage from "@/app/provider/services/page";

// Capture toast calls without rendering sonner's portal.
const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

type RawService = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  durationMinutes: number;
  basePrice: number; // cents
  serviceMode: "STUDIO" | "MOBILE" | "BOTH";
  isActive: boolean;
};

const MOBILE_SERVICE: RawService = {
  id: "svc1",
  title: "Mobile Gel Manicure",
  category: "NAILS",
  description: "At your place",
  durationMinutes: 60,
  basePrice: 8000,
  serviceMode: "MOBILE",
  isActive: true,
};

/**
 * Stub GET /api/services to resolve to `services`, and capture any mutating
 * request (POST/PUT) so we can assert on the body the page sends.
 */
function setupFetch(services: RawService[]) {
  const lastMutation: { method?: string; body?: Record<string, unknown> } = {};
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "/api/services" && (!init || init.method === "GET" || !init.method)) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(services),
      } as Response);
    }
    if (url === "/api/services") {
      lastMutation.method = init?.method;
      lastMutation.body = init?.body ? JSON.parse(init.body as string) : undefined;
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ ...MOBILE_SERVICE, ...(lastMutation.body ?? {}), id: "svc1" }),
      } as Response);
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
  });
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, lastMutation };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  toastSuccess.mockClear();
  toastError.mockClear();
});

function locationGroup() {
  return screen.getByRole("radiogroup", { name: /service location/i });
}

describe("ProviderServicesPage – Service location control", () => {
  it("renders the three location options with the calendar-style labels in the Add dialog", async () => {
    setupFetch([]);
    render(<ProviderServicesPage />);

    fireEvent.click(await screen.findByRole("button", { name: /add your first service|add service/i }));

    const group = await screen.findByRole("radiogroup", { name: /service location/i });
    const g = within(group);
    expect(g.getByRole("radio", { name: /At my studio/i })).toBeInTheDocument();
    expect(g.getByRole("radio", { name: /Client's home/i })).toBeInTheDocument();
    expect(g.getByRole("radio", { name: /Both/i })).toBeInTheDocument();
  });

  it("defaults a new service to STUDIO (At my studio) selected", async () => {
    setupFetch([]);
    render(<ProviderServicesPage />);
    fireEvent.click(await screen.findByRole("button", { name: /add/i }));

    const g = within(await screen.findByRole("radiogroup", { name: /service location/i }));
    expect(g.getByRole("radio", { name: /At my studio/i })).toHaveAttribute("aria-checked", "true");
    expect(g.getByRole("radio", { name: /Client's home/i })).toHaveAttribute("aria-checked", "false");
    expect(g.getByRole("radio", { name: /Both/i })).toHaveAttribute("aria-checked", "false");
  });

  it("changing the location updates the active option (single-select)", async () => {
    setupFetch([]);
    render(<ProviderServicesPage />);
    fireEvent.click(await screen.findByRole("button", { name: /add/i }));
    await screen.findByRole("radiogroup", { name: /service location/i });

    const both = within(locationGroup()).getByRole("radio", { name: /Both/i });
    fireEvent.click(both);

    expect(both).toHaveAttribute("aria-checked", "true");
    expect(within(locationGroup()).getByRole("radio", { name: /At my studio/i })).toHaveAttribute(
      "aria-checked",
      "false"
    );
  });

  it("pre-selects the existing serviceMode when editing a service", async () => {
    setupFetch([MOBILE_SERVICE]);
    render(<ProviderServicesPage />);

    // Wait for the list, then open the edit dialog (pencil button).
    await screen.findByText("Mobile Gel Manicure");
    const editButtons = screen.getAllByRole("button").filter((b) =>
      b.querySelector("svg.lucide-pencil")
    );
    fireEvent.click(editButtons[0]);

    const g = within(await screen.findByRole("radiogroup", { name: /service location/i }));
    expect(g.getByRole("radio", { name: /Client's home/i })).toHaveAttribute("aria-checked", "true");
    expect(g.getByRole("radio", { name: /At my studio/i })).toHaveAttribute("aria-checked", "false");
  });

  it("sends the chosen serviceMode in the save payload", async () => {
    const { fetchMock, lastMutation } = setupFetch([]);
    render(<ProviderServicesPage />);
    fireEvent.click(await screen.findByRole("button", { name: /add/i }));
    await screen.findByRole("radiogroup", { name: /service location/i });

    // Fill the required fields.
    fireEvent.change(screen.getByLabelText(/^Title$/i), { target: { value: "House-call Lashes" } });
    fireEvent.change(screen.getByLabelText(/Duration/i), { target: { value: "60" } });
    fireEvent.change(screen.getByLabelText(/Price/i), { target: { value: "120" } });

    // Pick MOBILE (Client's home).
    fireEvent.click(within(locationGroup()).getByRole("radio", { name: /Client's home/i }));

    // The dialog's submit button (type="submit"), distinct from the header
    // "Add service" button which opens the dialog.
    const submit = screen
      .getAllByRole("button", { name: /^Add service$/i })
      .find((b) => (b as HTMLButtonElement).type === "submit") as HTMLButtonElement;
    fireEvent.click(submit);

    await waitFor(() => expect(lastMutation.method).toBe("POST"));
    expect(lastMutation.body).toMatchObject({
      title: "House-call Lashes",
      serviceMode: "MOBILE",
      basePrice: 12000, // dollars -> cents
    });
    expect(fetchMock).toHaveBeenCalled();
  });
});
