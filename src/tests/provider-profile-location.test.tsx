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
import ProviderProfilePage from "@/app/provider/profile/page";

// next/image: render a plain img so the page mounts in jsdom.
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

// Reviews has its own fetch lifecycle; stub it out so this test stays focused on
// the relocated Location & coverage section.
vi.mock("@/components/provider/provider-reviews", () => ({
  ProviderReviews: () => <div data-testid="provider-reviews" />,
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

type MeData = Record<string, unknown>;

const BASE_ME: MeData = {
  businessName: "Luxe Nails",
  bio: "We do nails",
  moderationStatus: "DRAFT",
  profilePhoto: null,
  portfolioImages: [],
  serviceMode: "BOTH",
  studioAddress: "12 Collins St",
  studioSuburb: "Melbourne CBD",
  mobileRadius: 15,
  suburbs: ["Carlton", "Fitzroy"],
};

/**
 * Stub GET /api/providers/me -> me, and capture the PUT /api/providers payload.
 */
function setupFetch(me: MeData = BASE_ME) {
  const lastPut: { body?: Record<string, unknown> } = {};
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "/api/providers/me") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(me) } as Response);
    }
    if (url === "/api/providers" && init?.method === "PUT") {
      lastPut.body = init.body ? JSON.parse(init.body as string) : undefined;
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
  });
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, lastPut };
}

async function renderPage(me: MeData = BASE_ME) {
  const ctx = setupFetch(me);
  render(<ProviderProfilePage />);
  // Page shows "Loading profile..." until the me fetch resolves.
  await waitFor(() =>
    expect(screen.queryByText(/Loading profile/i)).not.toBeInTheDocument()
  );
  return ctx;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  toastSuccess.mockClear();
  toastError.mockClear();
});

function locationModeGroup() {
  return screen.getByRole("radiogroup", { name: /service mode/i });
}

describe("ProviderProfilePage – relocated Location & coverage section", () => {
  it("renders the Service area section on the Profile page", async () => {
    await renderPage();
    expect(screen.getByText(/Service area/i)).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /service mode/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save location/i })).toBeInTheDocument();
  });

  it("hydrates the service mode from /api/providers/me", async () => {
    await renderPage(); // BASE_ME.serviceMode === "BOTH"
    expect(within(locationModeGroup()).getByRole("radio", { name: /Both/i })).toHaveAttribute(
      "aria-checked",
      "true"
    );
  });

  it("hydrates studio + mobile + suburb fields from the provider record", async () => {
    await renderPage();
    expect(screen.getByLabelText(/Studio address/i)).toHaveValue("12 Collins St");
    expect(screen.getByLabelText(/Studio suburb/i)).toHaveValue("Melbourne CBD");
    expect(screen.getByLabelText(/Mobile radius/i)).toHaveValue(15);
    // Pre-checked suburbs reflect the saved coverage.
    expect(screen.getByRole("checkbox", { name: /Carlton/i })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Fitzroy/i })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Southbank/i })).not.toBeChecked();
  });

  it("hides studio fields for a MOBILE-only provider and shows radius", async () => {
    await renderPage({ ...BASE_ME, serviceMode: "MOBILE", studioAddress: null, studioSuburb: null });
    expect(screen.queryByLabelText(/Studio address/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Mobile radius/i)).toBeInTheDocument();
  });

  it("hides the mobile radius for a STUDIO-only provider and shows studio fields", async () => {
    await renderPage({ ...BASE_ME, serviceMode: "STUDIO", mobileRadius: null });
    expect(screen.getByLabelText(/Studio address/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Mobile radius/i)).not.toBeInTheDocument();
  });

  it("reveals studio fields when switching mode to BOTH", async () => {
    await renderPage({ ...BASE_ME, serviceMode: "MOBILE", studioAddress: null, studioSuburb: null });
    expect(screen.queryByLabelText(/Studio address/i)).not.toBeInTheDocument();

    fireEvent.click(within(locationModeGroup()).getByRole("radio", { name: /Both/i }));
    expect(await screen.findByLabelText(/Studio address/i)).toBeInTheDocument();
  });

  it("PUTs the location payload to /api/providers on save", async () => {
    const { lastPut } = await renderPage();
    fireEvent.click(screen.getByRole("button", { name: /save location/i }));

    await waitFor(() => expect(lastPut.body).toBeDefined());
    expect(lastPut.body).toMatchObject({
      serviceMode: "BOTH",
      studioAddress: "12 Collins St",
      studioSuburb: "Melbourne CBD",
      mobileRadius: 15,
      suburbs: ["Carlton", "Fitzroy"],
    });
    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith("Location & coverage saved")
    );
  });

  it("toggling a suburb checkbox is reflected in the saved payload", async () => {
    const { lastPut } = await renderPage();
    fireEvent.click(screen.getByRole("checkbox", { name: /Southbank/i }));
    fireEvent.click(screen.getByRole("button", { name: /save location/i }));

    await waitFor(() => expect(lastPut.body).toBeDefined());
    expect(lastPut.body?.suburbs).toEqual(
      expect.arrayContaining(["Carlton", "Fitzroy", "Southbank"])
    );
  });

  it("surfaces an error toast when the location save fails", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/providers/me") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(BASE_ME) } as Response);
      }
      if (url === "/api/providers" && init?.method === "PUT") {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: "Save failed" }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ProviderProfilePage />);
    await waitFor(() =>
      expect(screen.queryByText(/Loading profile/i)).not.toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("button", { name: /save location/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Save failed"));
  });
});
