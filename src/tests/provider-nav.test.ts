import { describe, it, expect } from "vitest";
import { isProviderNavActive } from "@/components/provider/provider-nav";

describe("isProviderNavActive", () => {
  it("matches the Overview root only on an exact path", () => {
    expect(isProviderNavActive("/provider", "/provider")).toBe(true);
    expect(isProviderNavActive("/provider", "/provider/bookings")).toBe(false);
    expect(isProviderNavActive("/provider", "/provider/profile")).toBe(false);
  });

  it("matches a section link on an exact path", () => {
    expect(isProviderNavActive("/provider/bookings", "/provider/bookings")).toBe(
      true
    );
  });

  it("matches a section link on a nested sub-path", () => {
    expect(
      isProviderNavActive("/provider/bookings", "/provider/bookings/123")
    ).toBe(true);
  });

  it("does not match unrelated or sibling sections", () => {
    expect(isProviderNavActive("/provider/bookings", "/provider")).toBe(false);
    expect(
      isProviderNavActive("/provider/bookings", "/provider/bookingsX")
    ).toBe(false);
    expect(isProviderNavActive("/provider/services", "/provider/bookings")).toBe(
      false
    );
  });
});
