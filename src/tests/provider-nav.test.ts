import { describe, it, expect } from "vitest";
import { isProviderNavActive } from "@/components/provider/provider-nav";

describe("isProviderNavActive", () => {
  it("matches the Bookings root only on an exact path", () => {
    expect(isProviderNavActive("/provider", "/provider")).toBe(true);
    expect(isProviderNavActive("/provider", "/provider/availability")).toBe(false);
    expect(isProviderNavActive("/provider", "/provider/profile")).toBe(false);
  });

  it("matches a section link on an exact path", () => {
    expect(
      isProviderNavActive("/provider/availability", "/provider/availability")
    ).toBe(true);
  });

  it("matches a section link on a nested sub-path", () => {
    expect(
      isProviderNavActive("/provider/services", "/provider/services/123")
    ).toBe(true);
  });

  it("does not match unrelated or sibling sections", () => {
    expect(isProviderNavActive("/provider/availability", "/provider")).toBe(false);
    expect(
      isProviderNavActive("/provider/services", "/provider/servicesX")
    ).toBe(false);
    expect(
      isProviderNavActive("/provider/services", "/provider/availability")
    ).toBe(false);
  });
});
