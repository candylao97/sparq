import { z } from "zod";
import { LAUNCH_SUBURBS } from "@/lib/constants";

export const providerProfileSchema = z.object({
  businessName: z.string().min(2, "Business name must be at least 2 characters").max(100),
  bio: z.string().min(20, "Bio must be at least 20 characters").max(1000),
  serviceTypes: z
    .array(z.enum(["NAILS", "LASHES"]))
    .min(1, "Select at least one service type"),
  serviceMode: z.enum(["STUDIO", "MOBILE", "BOTH"]),
  studioAddress: z.string().optional(),
  studioSuburb: z.string().optional(),
  mobileRadius: z.number().min(1).max(50).optional(),
  suburbs: z
    .array(z.string())
    .min(1, "Select at least one suburb"),
  abn: z
    .string()
    .regex(/^\d{11}$/, "ABN must be 11 digits"),
  yearsExperience: z.number().min(0).max(50),
});

export const providerLocationSchema = z.object({
  serviceMode: z.enum(["STUDIO", "MOBILE", "BOTH"]),
  studioAddress: z.string().optional(),
  studioSuburb: z.string().optional(),
  mobileRadius: z.number().min(1).max(50).optional(),
  suburbs: z
    .array(z.enum(LAUNCH_SUBURBS as unknown as [string, ...string[]]))
    .min(1, "Select at least one suburb"),
}).refine(
  (data) => {
    if (data.serviceMode === "STUDIO" || data.serviceMode === "BOTH") {
      return !!data.studioAddress && !!data.studioSuburb;
    }
    return true;
  },
  { message: "Studio address and suburb are required", path: ["studioAddress"] }
).refine(
  (data) => {
    if (data.serviceMode === "MOBILE" || data.serviceMode === "BOTH") {
      return !!data.mobileRadius;
    }
    return true;
  },
  { message: "Mobile radius is required", path: ["mobileRadius"] }
);

export const payoutDetailsSchema = z.object({
  accountName: z
    .string()
    .min(2, "Account name is required")
    .max(100),
  bsb: z
    .string()
    .regex(/^\d{3}-?\d{3}$/, "BSB must be 6 digits (e.g. 062-000)"),
  accountNumber: z
    .string()
    .regex(/^\d{5,10}$/, "Account number must be 5–10 digits"),
});

export type ProviderProfileInput = z.infer<typeof providerProfileSchema>;
export type ProviderLocationInput = z.infer<typeof providerLocationSchema>;
export type PayoutDetailsInput = z.infer<typeof payoutDetailsSchema>;
