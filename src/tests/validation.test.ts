import { describe, it, expect } from "vitest";
import { loginSchema, signupSchema, forgotPasswordSchema, resetPasswordSchema } from "@/server/validation/auth.schema";
import { serviceSchema, availabilityRuleSchema, blockedDateSchema } from "@/server/validation/service.schema";
import { createBookingSchema, respondBookingSchema, cancelBookingSchema } from "@/server/validation/booking.schema";
import { createReviewSchema } from "@/server/validation/review.schema";

describe("Auth Validation", () => {
  describe("loginSchema", () => {
    it("accepts valid login", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "password123",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid email", () => {
      const result = loginSchema.safeParse({
        email: "invalid",
        password: "password123",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty password", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("signupSchema", () => {
    it("accepts valid signup", () => {
      const result = signupSchema.safeParse({
        name: "Jane Doe",
        email: "jane@example.com",
        password: "Password1",
        confirmPassword: "Password1",
        role: "CUSTOMER",
      });
      expect(result.success).toBe(true);
    });

    it("rejects short password", () => {
      const result = signupSchema.safeParse({
        name: "Jane Doe",
        email: "jane@example.com",
        password: "Pass1",
        confirmPassword: "Pass1",
        role: "CUSTOMER",
      });
      expect(result.success).toBe(false);
    });

    it("rejects password without uppercase", () => {
      const result = signupSchema.safeParse({
        name: "Jane Doe",
        email: "jane@example.com",
        password: "password1",
        confirmPassword: "password1",
        role: "CUSTOMER",
      });
      expect(result.success).toBe(false);
    });

    it("rejects password without number", () => {
      const result = signupSchema.safeParse({
        name: "Jane Doe",
        email: "jane@example.com",
        password: "Password",
        confirmPassword: "Password",
        role: "CUSTOMER",
      });
      expect(result.success).toBe(false);
    });

    it("rejects mismatched passwords", () => {
      const result = signupSchema.safeParse({
        name: "Jane Doe",
        email: "jane@example.com",
        password: "Password1",
        confirmPassword: "Password2",
        role: "CUSTOMER",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid role", () => {
      const result = signupSchema.safeParse({
        name: "Jane Doe",
        email: "jane@example.com",
        password: "Password1",
        confirmPassword: "Password1",
        role: "ADMIN",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("forgotPasswordSchema", () => {
    it("accepts valid email", () => {
      const result = forgotPasswordSchema.safeParse({ email: "test@example.com" });
      expect(result.success).toBe(true);
    });

    it("rejects invalid email", () => {
      const result = forgotPasswordSchema.safeParse({ email: "not-an-email" });
      expect(result.success).toBe(false);
    });
  });

  describe("resetPasswordSchema", () => {
    it("accepts valid reset", () => {
      const result = resetPasswordSchema.safeParse({
        token: "valid-token",
        password: "NewPassword1",
        confirmPassword: "NewPassword1",
      });
      expect(result.success).toBe(true);
    });
  });
});

describe("Service Validation", () => {
  describe("serviceSchema", () => {
    it("accepts valid service", () => {
      const result = serviceSchema.safeParse({
        title: "Gel Manicure",
        category: "NAILS",
        description: "A lovely gel manicure",
        durationMinutes: 60,
        basePrice: 55,
        serviceMode: "STUDIO",
        isActive: true,
      });
      expect(result.success).toBe(true);
    });

    it("rejects too-short title", () => {
      const result = serviceSchema.safeParse({
        title: "Ge",
        category: "NAILS",
        durationMinutes: 60,
        basePrice: 55,
        serviceMode: "STUDIO",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid category", () => {
      const result = serviceSchema.safeParse({
        title: "Facial",
        category: "FACIAL",
        durationMinutes: 60,
        basePrice: 55,
        serviceMode: "STUDIO",
      });
      expect(result.success).toBe(false);
    });

    it("rejects zero price", () => {
      const result = serviceSchema.safeParse({
        title: "Gel Manicure",
        category: "NAILS",
        durationMinutes: 60,
        basePrice: 0,
        serviceMode: "STUDIO",
      });
      expect(result.success).toBe(false);
    });

    it("rejects too-short duration", () => {
      const result = serviceSchema.safeParse({
        title: "Gel Manicure",
        category: "NAILS",
        durationMinutes: 5,
        basePrice: 55,
        serviceMode: "STUDIO",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("availabilityRuleSchema", () => {
    it("accepts valid rule", () => {
      const result = availabilityRuleSchema.safeParse({
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "17:00",
      });
      expect(result.success).toBe(true);
    });

    it("rejects end before start", () => {
      const result = availabilityRuleSchema.safeParse({
        dayOfWeek: 1,
        startTime: "17:00",
        endTime: "09:00",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid day", () => {
      const result = availabilityRuleSchema.safeParse({
        dayOfWeek: 7,
        startTime: "09:00",
        endTime: "17:00",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid time format", () => {
      const result = availabilityRuleSchema.safeParse({
        dayOfWeek: 1,
        startTime: "9am",
        endTime: "5pm",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("blockedDateSchema", () => {
    it("accepts valid date", () => {
      const result = blockedDateSchema.safeParse({
        date: "2026-04-01",
        reason: "Holiday",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid date", () => {
      const result = blockedDateSchema.safeParse({
        date: "not-a-date",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("Booking Validation", () => {
  describe("createBookingSchema", () => {
    it("accepts valid booking for studio", () => {
      const result = createBookingSchema.safeParse({
        providerId: "cltest123456789012345",
        serviceId: "cltest123456789012345",
        bookingDate: "2026-04-01",
        startTime: "10:00",
        serviceMode: "STUDIO",
        paymentMethodId: "pm_card_visa",
      });
      expect(result.success).toBe(true);
    });

    it("requires address for mobile", () => {
      const result = createBookingSchema.safeParse({
        providerId: "cltest123456789012345",
        serviceId: "cltest123456789012345",
        bookingDate: "2026-04-01",
        startTime: "10:00",
        serviceMode: "MOBILE",
        paymentMethodId: "pm_card_visa",
      });
      expect(result.success).toBe(false);
    });

    it("accepts mobile with address", () => {
      const result = createBookingSchema.safeParse({
        providerId: "cltest123456789012345",
        serviceId: "cltest123456789012345",
        bookingDate: "2026-04-01",
        startTime: "10:00",
        serviceMode: "MOBILE",
        address: "123 Smith Street, Fitzroy",
        paymentMethodId: "pm_card_visa",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("respondBookingSchema", () => {
    it("accepts valid accept", () => {
      const result = respondBookingSchema.safeParse({
        bookingId: "cltest123456789012345",
        action: "accept",
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid decline", () => {
      const result = respondBookingSchema.safeParse({
        bookingId: "cltest123456789012345",
        action: "decline",
        reason: "Fully booked",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid action", () => {
      const result = respondBookingSchema.safeParse({
        bookingId: "cltest123456789012345",
        action: "maybe",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("cancelBookingSchema", () => {
    it("requires reason", () => {
      const result = cancelBookingSchema.safeParse({
        bookingId: "cltest123456789012345",
        reason: "",
      });
      expect(result.success).toBe(false);
    });

    it("accepts with reason", () => {
      const result = cancelBookingSchema.safeParse({
        bookingId: "cltest123456789012345",
        reason: "Changed my plans",
      });
      expect(result.success).toBe(true);
    });
  });
});

describe("Review Validation", () => {
  describe("createReviewSchema", () => {
    it("accepts valid review", () => {
      const result = createReviewSchema.safeParse({
        bookingId: "cltest123456789012345",
        rating: 5,
        comment: "Amazing service!",
      });
      expect(result.success).toBe(true);
    });

    it("rejects rating out of range", () => {
      const result = createReviewSchema.safeParse({
        bookingId: "cltest123456789012345",
        rating: 6,
      });
      expect(result.success).toBe(false);
    });

    it("rejects rating below 1", () => {
      const result = createReviewSchema.safeParse({
        bookingId: "cltest123456789012345",
        rating: 0,
      });
      expect(result.success).toBe(false);
    });

    it("allows review without comment", () => {
      const result = createReviewSchema.safeParse({
        bookingId: "cltest123456789012345",
        rating: 4,
      });
      expect(result.success).toBe(true);
    });
  });
});
