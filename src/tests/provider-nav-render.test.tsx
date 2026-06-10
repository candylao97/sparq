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
  { href: "/provider", label: "Overview" },
  { href: "/provider/profile", label: "Profile" },
  { href: "/provider/services", label: "Services" },
  { href: "/provider/availability", label: "Availability" },
  { href: "/provider/bookings", label: "Bookings" },
  { href: "/provider/earnings", label: "Earnings" },
  { href: "/provider/reviews", label: "Reviews" },
  { href: "/provider/settings", label: "Settings" },
];

afterEach(() => {
  cleanup();
  usePathname.mockReset();
  usePathname.mockReturnValue("/provider");
});

describe("ProviderNavSidebar", () => {
  it("renders all 8 provider links with correct labels and hrefs", () => {
    usePathname.mockReturnValue("/provider");
    render(<ProviderNavSidebar />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(PROVIDER_LINKS.length);

    for (const { href, label } of PROVIDER_LINKS) {
      const link = screen.getByRole("link", { name: label });
      expect(link).toHaveAttribute("href", href);
    }
  });

  it("marks only the Overview link active on the /provider root", () => {
    usePathname.mockReturnValue("/provider");
    render(<ProviderNavSidebar />);

    const overview = screen.getByRole("link", { name: "Overview" });
    expect(overview).toHaveAttribute("aria-current", "page");
    expect(overview).toHaveClass(
      "border-neutral-900",
      "bg-white",
      "font-semibold",
      "text-neutral-900"
    );

    // Every other link is inactive.
    for (const { label } of PROVIDER_LINKS.filter(
      (l) => l.label !== "Overview"
    )) {
      const link = screen.getByRole("link", { name: label });
      expect(link).not.toHaveAttribute("aria-current");
      expect(link).toHaveClass("border-transparent", "text-neutral-600");
    }
  });

  it("does not mark Overview active on a nested provider sub-path", () => {
    usePathname.mockReturnValue("/provider/bookings");
    render(<ProviderNavSidebar />);

    expect(
      screen.getByRole("link", { name: "Overview" })
    ).not.toHaveAttribute("aria-current");
  });

  it("marks a section link active on an exact match", () => {
    usePathname.mockReturnValue("/provider/services");
    render(<ProviderNavSidebar />);

    const services = screen.getByRole("link", { name: "Services" });
    expect(services).toHaveAttribute("aria-current", "page");
    expect(services).toHaveClass("border-neutral-900", "font-semibold");

    expect(
      screen.getByRole("link", { name: "Overview" })
    ).not.toHaveAttribute("aria-current");
  });

  it("marks a section link active on a nested sub-path", () => {
    usePathname.mockReturnValue("/provider/bookings/abc-123");
    render(<ProviderNavSidebar />);

    expect(
      screen.getByRole("link", { name: "Bookings" })
    ).toHaveAttribute("aria-current", "page");
  });

  it("activates exactly one link for any given route", () => {
    usePathname.mockReturnValue("/provider/earnings");
    render(<ProviderNavSidebar />);

    const active = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("aria-current") === "page");
    expect(active).toHaveLength(1);
    expect(active[0]).toHaveAccessibleName("Earnings");
  });

  it("does not mark a sibling whose href is a string prefix of the path", () => {
    // "/provider/bookingsX" must not activate "/provider/bookings".
    usePathname.mockReturnValue("/provider/bookingsX");
    render(<ProviderNavSidebar />);

    expect(
      screen.getByRole("link", { name: "Bookings" })
    ).not.toHaveAttribute("aria-current");
  });
});

describe("ProviderNavMobile", () => {
  it("renders all 8 links reachable on mobile", () => {
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
    usePathname.mockReturnValue("/provider/reviews");
    render(<ProviderNavMobile />);

    const reviews = screen.getByRole("link", { name: "Reviews" });
    expect(reviews).toHaveAttribute("aria-current", "page");
    expect(reviews).toHaveClass("border-b-2", "border-neutral-900");

    const overview = screen.getByRole("link", { name: "Overview" });
    expect(overview).not.toHaveAttribute("aria-current");
    expect(overview).toHaveClass("text-neutral-500");
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
