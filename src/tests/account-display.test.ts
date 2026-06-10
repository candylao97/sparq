import { describe, it, expect } from "vitest";
import {
  splitName,
  joinName,
  maskAccountNumber,
  maskBsb,
} from "@/lib/account-display";

describe("splitName", () => {
  it("splits a two-part name", () => {
    expect(splitName("Jane Doe")).toEqual({ firstName: "Jane", lastName: "Doe" });
  });

  it("treats everything after the first token as the last name", () => {
    expect(splitName("Jane Mary Doe")).toEqual({
      firstName: "Jane",
      lastName: "Mary Doe",
    });
  });

  it("handles a single name", () => {
    expect(splitName("Cher")).toEqual({ firstName: "Cher", lastName: "" });
  });

  it("collapses extra whitespace and handles empty input", () => {
    expect(splitName("  Jane   Doe  ")).toEqual({
      firstName: "Jane",
      lastName: "Doe",
    });
    expect(splitName("")).toEqual({ firstName: "", lastName: "" });
  });
});

describe("joinName", () => {
  it("recombines first and last names", () => {
    expect(joinName("Jane", "Doe")).toBe("Jane Doe");
  });

  it("trims and drops empty parts", () => {
    expect(joinName(" Jane ", "")).toBe("Jane");
    expect(joinName("", "")).toBe("");
  });

  it("returns empty when both parts are whitespace only", () => {
    expect(joinName("   ", "   ")).toBe("");
  });

  it("round-trips with splitName for multi-token names", () => {
    const { firstName, lastName } = splitName("Jane Mary Doe");
    expect(joinName(firstName, lastName)).toBe("Jane Mary Doe");
  });
});

describe("maskAccountNumber", () => {
  it("reveals only the last 4 digits", () => {
    expect(maskAccountNumber("12345678")).toBe("•••• 5678");
  });

  it("ignores whitespace", () => {
    expect(maskAccountNumber("1234 5678")).toBe("•••• 5678");
  });

  it("returns an empty string for empty input", () => {
    expect(maskAccountNumber("")).toBe("");
  });

  it("reveals all digits when fewer than 4 are present", () => {
    expect(maskAccountNumber("12")).toBe("•••• 12");
  });

  it("masks exactly the last 4 of a longer number", () => {
    expect(maskAccountNumber("0011223344")).toBe("•••• 3344");
  });
});

describe("maskBsb", () => {
  it("masks the whole value when present", () => {
    expect(maskBsb("062-000")).toBe("•••-•••");
  });

  it("returns an empty string when blank", () => {
    expect(maskBsb("   ")).toBe("");
  });
});
