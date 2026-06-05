import { describe, it, expect } from "vitest";
import {
  LAUNCH_SUBURBS,
  SERVICE_CATEGORIES,
  BOOKING_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  APP_NAME,
} from "@/lib/constants";

describe("Constants", () => {
  it("has 8 launch suburbs", () => {
    expect(LAUNCH_SUBURBS).toHaveLength(8);
  });

  it("includes Melbourne CBD", () => {
    expect(LAUNCH_SUBURBS).toContain("Melbourne CBD");
  });

  it("has 2 service categories", () => {
    expect(SERVICE_CATEGORIES).toHaveLength(2);
    expect(SERVICE_CATEGORIES).toContain("Nails");
    expect(SERVICE_CATEGORIES).toContain("Lashes");
  });

  it("has labels for all booking statuses", () => {
    const expectedStatuses = [
      "PENDING_PROVIDER_RESPONSE",
      "DECLINED",
      "CONFIRMED",
      "COMPLETED",
      "CANCELLED_BY_CUSTOMER",
      "CANCELLED_BY_PROVIDER",
      "REFUNDED",
      "EXPIRED",
      "DISPUTED",
    ];
    for (const status of expectedStatuses) {
      expect(BOOKING_STATUS_LABELS[status]).toBeDefined();
    }
  });

  it("has labels for all payment statuses", () => {
    const expectedStatuses = [
      "AUTH_PENDING",
      "AUTHORISED",
      "CAPTURED",
      "AUTH_RELEASED",
      "REFUNDED",
      "FAILED",
    ];
    for (const status of expectedStatuses) {
      expect(PAYMENT_STATUS_LABELS[status]).toBeDefined();
    }
  });

  it("app name is Sparq", () => {
    expect(APP_NAME).toBe("Sparq");
  });
});
