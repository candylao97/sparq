import { describe, it, expect } from "vitest";
import { formatCurrency } from "@/lib/utils";

describe("formatCurrency", () => {
  it("formats with default (2) fraction digits", () => {
    expect(formatCurrency(12345)).toBe("$123.45");
  });

  it("respects an explicit 2-fraction-digit option", () => {
    expect(formatCurrency(12345, { minimumFractionDigits: 2 })).toBe("$123.45");
  });

  it("rounds to whole dollars when fraction digits are zeroed", () => {
    expect(
      formatCurrency(12345, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
    ).toBe("$123");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats a large value with thousands separators", () => {
    expect(formatCurrency(123456789)).toBe("$1,234,567.89");
  });
});
