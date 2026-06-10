// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ReviewPromptBanner } from "@/components/customer/review-prompt-banner";

// next/link just needs to render an anchor for these tests.
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

const DISMISS_KEY = "booking-123";
const STORAGE_KEY = `review-dismissed:${DISMISS_KEY}`;

function renderBanner(overrides: Partial<{ providerName: string; href: string; dismissKey: string }> = {}) {
  return render(
    <ReviewPromptBanner
      providerName={overrides.providerName ?? "Aki Salon"}
      href={overrides.href ?? "/customer/bookings/booking-123"}
      dismissKey={overrides.dismissKey ?? DISMISS_KEY}
    />
  );
}

describe("ReviewPromptBanner", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the review prompt with the provider name", () => {
    renderBanner({ providerName: "Aki Salon" });
    expect(
      screen.getByText(/How was your visit with Aki Salon\? Leave a review/i)
    ).toBeInTheDocument();
  });

  it("links to the booking review href", () => {
    renderBanner({ href: "/customer/bookings/booking-123" });
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/customer/bookings/booking-123"
    );
  });

  it("stays hidden when this booking was already dismissed", () => {
    localStorage.setItem(STORAGE_KEY, "1");
    renderBanner();
    expect(screen.queryByText(/Leave a review/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("shows when a different booking key was dismissed", () => {
    localStorage.setItem("review-dismissed:other-booking", "1");
    renderBanner();
    expect(screen.getByText(/Leave a review/i)).toBeInTheDocument();
  });

  it("hides the banner and persists the flag when dismissed", () => {
    renderBanner();
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByText(/Leave a review/i)).not.toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBe("1");
  });

  it("prevents navigation when the dismiss button is clicked", () => {
    renderBanner();
    const button = screen.getByRole("button", { name: /dismiss/i });
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    const preventDefault = vi.spyOn(event, "preventDefault");
    button.dispatchEvent(event);
    expect(preventDefault).toHaveBeenCalled();
  });

  it("falls back to showing the banner when localStorage reads throw", () => {
    const getItem = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    renderBanner();
    expect(screen.getByText(/Leave a review/i)).toBeInTheDocument();
    getItem.mockRestore();
  });

  it("does not throw when localStorage writes fail on dismiss", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    renderBanner();
    expect(() =>
      fireEvent.click(screen.getByRole("button", { name: /dismiss/i }))
    ).not.toThrow();
    // Banner still hides even though persistence failed.
    expect(screen.queryByText(/Leave a review/i)).not.toBeInTheDocument();
  });
});
