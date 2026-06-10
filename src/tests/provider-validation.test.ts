import { describe, it, expect } from "vitest";
import {
  providerProfileSchema,
  providerLocationSchema,
} from "@/server/validation/provider.schema";

describe("Provider Profile Validation", () => {
  describe("providerProfileSchema.partial() (partial-update safety)", () => {
    it("accepts a businessName + bio only object", () => {
      const result = providerProfileSchema.partial().safeParse({
        businessName: "Luxe Nails",
        bio: "We provide premium nail care services in Melbourne.",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        // Omitted fields are absent, not nulled — so the service leaves them unchanged.
        expect(result.data).toEqual({
          businessName: "Luxe Nails",
          bio: "We provide premium nail care services in Melbourne.",
        });
        expect("serviceTypes" in result.data).toBe(false);
        expect("suburbs" in result.data).toBe(false);
        expect("serviceMode" in result.data).toBe(false);
      }
    });

    it("accepts a location-only object (serviceMode + suburbs + studio details)", () => {
      const result = providerProfileSchema.partial().safeParse({
        serviceMode: "STUDIO",
        studioAddress: "1 Collins St",
        studioSuburb: "Melbourne CBD",
        suburbs: ["Melbourne CBD", "Carlton"],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect("businessName" in result.data).toBe(false);
        expect("bio" in result.data).toBe(false);
      }
    });

    it("accepts a serviceTypes-only object", () => {
      const result = providerProfileSchema.partial().safeParse({
        serviceTypes: ["NAILS", "LASHES"],
      });
      expect(result.success).toBe(true);
    });

    it("accepts an empty object (nothing to update)", () => {
      const result = providerProfileSchema.partial().safeParse({});
      expect(result.success).toBe(true);
    });

    it("still validates fields that are present", () => {
      const result = providerProfileSchema.partial().safeParse({
        businessName: "x", // too short (min 2)
      });
      expect(result.success).toBe(false);
    });
  });

  describe("route validation schema (omit abn/yearsExperience, then partial)", () => {
    // Mirrors what the PUT /api/providers handler builds: these fields are
    // managed in their own flows and must never be writable through this route.
    const routeSchema = providerProfileSchema
      .omit({ abn: true, yearsExperience: true })
      .partial();

    it("strips abn even when sent in the body", () => {
      const result = routeSchema.safeParse({
        businessName: "Luxe Nails",
        abn: "12345678901",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect("abn" in result.data).toBe(false);
        expect(result.data).toEqual({ businessName: "Luxe Nails" });
      }
    });

    it("strips yearsExperience even when sent in the body", () => {
      const result = routeSchema.safeParse({
        bio: "We provide premium nail care services in Melbourne.",
        yearsExperience: 12,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect("yearsExperience" in result.data).toBe(false);
      }
    });

    it("accepts a profile-only slice ({ businessName, bio })", () => {
      const result = routeSchema.safeParse({
        businessName: "Luxe Nails",
        bio: "We provide premium nail care services in Melbourne.",
      });
      expect(result.success).toBe(true);
    });
  });
});

describe("providerLocationSchema", () => {
  it("accepts a valid studio configuration", () => {
    const result = providerLocationSchema.safeParse({
      serviceMode: "STUDIO",
      studioAddress: "1 Collins St",
      studioSuburb: "Melbourne CBD",
      suburbs: ["Melbourne CBD"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects studio mode without address + suburb", () => {
    const result = providerLocationSchema.safeParse({
      serviceMode: "STUDIO",
      suburbs: ["Melbourne CBD"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid mobile configuration", () => {
    const result = providerLocationSchema.safeParse({
      serviceMode: "MOBILE",
      mobileRadius: 10,
      suburbs: ["Carlton"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects mobile mode without radius", () => {
    const result = providerLocationSchema.safeParse({
      serviceMode: "MOBILE",
      suburbs: ["Carlton"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts BOTH with studio details and radius", () => {
    const result = providerLocationSchema.safeParse({
      serviceMode: "BOTH",
      studioAddress: "1 Collins St",
      studioSuburb: "Melbourne CBD",
      mobileRadius: 15,
      suburbs: ["Melbourne CBD", "Fitzroy"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects BOTH missing studio details", () => {
    const result = providerLocationSchema.safeParse({
      serviceMode: "BOTH",
      mobileRadius: 15,
      suburbs: ["Melbourne CBD"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects BOTH missing radius", () => {
    const result = providerLocationSchema.safeParse({
      serviceMode: "BOTH",
      studioAddress: "1 Collins St",
      studioSuburb: "Melbourne CBD",
      suburbs: ["Melbourne CBD"],
    });
    expect(result.success).toBe(false);
  });

  it("requires at least one suburb", () => {
    const result = providerLocationSchema.safeParse({
      serviceMode: "STUDIO",
      studioAddress: "1 Collins St",
      studioSuburb: "Melbourne CBD",
      suburbs: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a suburb outside LAUNCH_SUBURBS", () => {
    const result = providerLocationSchema.safeParse({
      serviceMode: "STUDIO",
      studioAddress: "1 Collins St",
      studioSuburb: "Melbourne CBD",
      suburbs: ["Sydney CBD"],
    });
    expect(result.success).toBe(false);
  });
});
