import { z } from "zod";

export const serviceSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  category: z.enum(["NAILS", "LASHES"]),
  description: z.string().max(1000).optional(),
  durationMinutes: z.number().min(15, "Minimum 15 minutes").max(480, "Maximum 8 hours"),
  basePrice: z.number().min(1, "Price must be at least $1"),
  serviceMode: z.enum(["STUDIO", "MOBILE", "BOTH"]),
  isActive: z.boolean().default(true),
});

export const availabilityRuleSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format"),
}).refine(
  (data) => data.startTime < data.endTime,
  { message: "End time must be after start time", path: ["endTime"] }
);

export const blockedDateSchema = z.object({
  date: z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid date"),
  reason: z.string().max(200).optional(),
});

export const availabilityBulkSchema = z.object({
  rules: z.array(availabilityRuleSchema),
});

export type ServiceInput = z.infer<typeof serviceSchema>;
export type AvailabilityRuleInput = z.infer<typeof availabilityRuleSchema>;
export type BlockedDateInput = z.infer<typeof blockedDateSchema>;
