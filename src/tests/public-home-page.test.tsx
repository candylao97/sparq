// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import HomePage, { metadata } from "@/app/(public)/page";

const SUBURBS = [
  "Melbourne CBD",
  "Southbank",
  "Docklands",
  "Carlton",
  "Fitzroy",
  "Richmond",
  "South Yarra",
  "Brunswick",
];

afterEach(() => {
  cleanup();
});

describe("Public HomePage", () => {
  describe("preserved metadata", () => {
    it("keeps the exported title and description", () => {
      expect(metadata.title).toBe(
        "Sparq | Find Trusted Nail & Lash Artists in Melbourne"
      );
      expect(metadata.description).toBe(
        "Sparq connects you with verified nail and lash artists across Melbourne. Browse, book, and pay securely — all in one place."
      );
    });
  });

  describe("heading", () => {
    it("renders exactly one h1 as the page heading", () => {
      render(<HomePage />);
      const h1s = screen.getAllByRole("heading", { level: 1 });
      expect(h1s).toHaveLength(1);
      // Headline text is split across a <br>, so match on its words.
      expect(h1s[0]).toHaveTextContent(/Book beauty,\s*beautifully\./);
    });

    it("has no competing higher-or-equal-level headings", () => {
      render(<HomePage />);
      // Only the single h1 should exist; no stray h2/h3 etc.
      expect(screen.getAllByRole("heading")).toHaveLength(1);
    });
  });

  describe("search form (preserved contract)", () => {
    it("submits to /providers", () => {
      const { container } = render(<HomePage />);
      const form = container.querySelector("form");
      expect(form).not.toBeNull();
      expect(form).toHaveAttribute("action", "/providers");
    });

    it("keeps the search input named 'keyword'", () => {
      render(<HomePage />);
      const input = screen.getByRole("searchbox");
      expect(input).toHaveAttribute("name", "keyword");
    });
  });

  describe("search accessibility", () => {
    it("gives the search input an accessible name (not just a placeholder)", () => {
      render(<HomePage />);
      // getByRole resolves the accessible name from a tied <label> or aria-label.
      // It must NOT be derived solely from the placeholder.
      const input = screen.getByRole("searchbox", {
        name: /search artists, services or suburbs/i,
      });
      expect(input).toBeInTheDocument();
    });

    it("ties the label to the input via htmlFor/id", () => {
      const { container } = render(<HomePage />);
      const input = screen.getByRole("searchbox");
      const id = input.getAttribute("id");
      expect(id).toBeTruthy();
      const label = container.querySelector(`label[for="${id}"]`);
      expect(label).not.toBeNull();
    });

    it("exposes a submit button with an accessible 'Search' name", () => {
      render(<HomePage />);
      const button = screen.getByRole("button", { name: /search/i });
      expect(button).toHaveAttribute("type", "submit");
    });

    it("marks decorative icons as aria-hidden", () => {
      const { container } = render(<HomePage />);
      // The search icon and the arrow icon should be hidden from the a11y tree.
      const svgs = container.querySelectorAll("svg");
      expect(svgs.length).toBeGreaterThanOrEqual(2);
      svgs.forEach((svg) => {
        expect(svg).toHaveAttribute("aria-hidden", "true");
      });
    });
  });

  describe("suburb quick-links (preserved hrefs)", () => {
    it("renders one link per suburb pointing at the encoded provider filter", () => {
      render(<HomePage />);
      for (const suburb of SUBURBS) {
        const link = screen.getByRole("link", { name: suburb });
        expect(link).toHaveAttribute(
          "href",
          `/providers?suburb=${encodeURIComponent(suburb)}`
        );
      }
    });

    it("renders exactly the SUBURBS list and nothing extra", () => {
      render(<HomePage />);
      const links = screen
        .getAllByRole("link")
        .filter((a) => a.getAttribute("href")?.startsWith("/providers?suburb="));
      expect(links).toHaveLength(SUBURBS.length);
    });

    it("URL-encodes multi-word suburbs (spaces become %20)", () => {
      render(<HomePage />);
      const link = screen.getByRole("link", { name: "Melbourne CBD" });
      expect(link).toHaveAttribute(
        "href",
        "/providers?suburb=Melbourne%20CBD"
      );
    });
  });

  describe("structure", () => {
    it("renders a single search form (no duplicate/added sections)", () => {
      const { container } = render(<HomePage />);
      expect(container.querySelectorAll("form")).toHaveLength(1);
    });

    it("keeps the search submit button inside the search form", () => {
      const { container } = render(<HomePage />);
      const form = container.querySelector("form")!;
      const button = within(form).getByRole("button", { name: /search/i });
      expect(button).toBeInTheDocument();
    });
  });
});
