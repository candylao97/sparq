// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// usePathname drives the active-state. Each test sets the value before render.
const usePathname = vi.fn<() => string>(() => "/provider");
vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
}));

// next/link only needs to render an anchor for these tests.
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

import {
  ProviderNavSidebar,
  ProviderNavMobile,
} from "@/components/provider/provider-nav";

const PROVIDER_LINKS: { href: string; label: string }[] = [
  { href: "/provider", label: "Bookings" },
  { href: "/provider/availability", label: "Availability" },
  { href: "/provider/services", label: "Services" },
  { href: "/provider/profile", label: "Profile" },
  { href: "/provider/settings", label: "Settings" },
];

afterEach(() => {
  cleanup();
  usePathname.mockReset();
  usePathname.mockReturnValue("/provider");
});

describe("ProviderNavSidebar", () => {
  it("renders the 5 provider links with correct labels and hrefs", () => {
    usePathname.mockReturnValue("/provider");
    render(<ProviderNavSidebar />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(PROVIDER_LINKS.length);

    for (const { href, label } of PROVIDER_LINKS) {
      const link = screen.getByRole("link", { name: label });
      expect(link).toHaveAttribute("href", href);
    }
  });

  it("marks only the Bookings link active on the /provider root", () => {
    usePathname.mockReturnValue("/provider");
    render(<ProviderNavSidebar />);

    const bookings = screen.getByRole("link", { name: "Bookings" });
    expect(bookings).toHaveAttribute("aria-current", "page");
    expect(bookings).toHaveClass(
      "border-neutral-900",
      "bg-white",
      "font-semibold",
      "text-neutral-900"
    );

    // Every other link is inactive. The four primary inactive items use the
    // standard text-neutral-600 treatment; Settings is deliberately rendered
    // with a muted text-neutral-400 (still inactive, transparent border).
    for (const { label } of PROVIDER_LINKS.filter(
      (l) => l.label !== "Bookings"
    )) {
      const link = screen.getByRole("link", { name: label });
      expect(link).not.toHaveAttribute("aria-current");
      expect(link).toHaveClass("border-transparent");
      expect(link).toHaveClass(
        label === "Settings" ? "text-neutral-500" : "text-neutral-600"
      );
    }
  });

  it("does not mark Bookings active on a nested provider sub-path", () => {
    usePathname.mockReturnValue("/provider/availability");
    render(<ProviderNavSidebar />);

    expect(
      screen.getByRole("link", { name: "Bookings" })
    ).not.toHaveAttribute("aria-current");
  });

  it("marks a section link active on an exact match", () => {
    usePathname.mockReturnValue("/provider/services");
    render(<ProviderNavSidebar />);

    const services = screen.getByRole("link", { name: "Services" });
    expect(services).toHaveAttribute("aria-current", "page");
    expect(services).toHaveClass("border-neutral-900", "font-semibold");

    expect(
      screen.getByRole("link", { name: "Bookings" })
    ).not.toHaveAttribute("aria-current");
  });

  it("marks a section link active on a nested sub-path", () => {
    usePathname.mockReturnValue("/provider/services/abc-123");
    render(<ProviderNavSidebar />);

    expect(
      screen.getByRole("link", { name: "Services" })
    ).toHaveAttribute("aria-current", "page");
  });

  it("activates exactly one link for any given route", () => {
    usePathname.mockReturnValue("/provider/settings");
    render(<ProviderNavSidebar />);

    const active = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("aria-current") === "page");
    expect(active).toHaveLength(1);
    expect(active[0]).toHaveAccessibleName("Settings");
  });

  it("does not mark a sibling whose href is a string prefix of the path", () => {
    // "/provider/servicesX" must not activate "/provider/services".
    usePathname.mockReturnValue("/provider/servicesX");
    render(<ProviderNavSidebar />);

    expect(
      screen.getByRole("link", { name: "Services" })
    ).not.toHaveAttribute("aria-current");
  });
});

describe("ProviderNavMobile", () => {
  it("renders all 5 links reachable on mobile", () => {
    usePathname.mockReturnValue("/provider");
    render(<ProviderNavMobile />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(PROVIDER_LINKS.length);
    for (const { href, label } of PROVIDER_LINKS) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute(
        "href",
        href
      );
    }
  });

  it("applies the active underline treatment to the current section", () => {
    usePathname.mockReturnValue("/provider/profile");
    render(<ProviderNavMobile />);

    const profile = screen.getByRole("link", { name: "Profile" });
    expect(profile).toHaveAttribute("aria-current", "page");
    expect(profile).toHaveClass("border-b-2", "border-neutral-900");

    const bookings = screen.getByRole("link", { name: "Bookings" });
    expect(bookings).not.toHaveAttribute("aria-current");
    expect(bookings).toHaveClass("text-neutral-500");
  });

  it("renders an icon alongside each link label", () => {
    usePathname.mockReturnValue("/provider");
    const { container } = render(<ProviderNavMobile />);

    // lucide-react renders one <svg> per link icon.
    const link = screen.getByRole("link", { name: "Availability" });
    expect(within(link).getByText("Availability")).toBeInTheDocument();
    expect(container.querySelectorAll("svg")).toHaveLength(
      PROVIDER_LINKS.length
    );
  });
});
