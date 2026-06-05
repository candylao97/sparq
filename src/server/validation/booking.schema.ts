import { z } from "zod";

export const createBookingSchema = z.object({
  providerId: z.string().cuid(),
  serviceId: z.string().cuid(),
  bookingDate: z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid date"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format"),
  serviceMode: z.enum(["STUDIO", "MOBILE"]),
  address: z.string().optional(),
  notes: z.string().max(500).optional(),
  paymentMethodId: z.string().min(1, "Payment method is required"),
}).refine(
  (data) => {
    if (data.serviceMode === "MOBILE") {
      return !!data.address;
    }
    return true;
  },
  { message: "Address is required for mobile services", path: ["address"] }
);

export const respondBookingSchema = z.object({
  bookingId: z.string().cuid(),
  action: z.enum(["accept", "decline"]),
  reason: z.string().max(500).optional(),
});

export const cancelBookingSchema = z.object({
  bookingId: z.string().cuid(),
  reason: z.string().min(1, "Reason is required").max(500),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type RespondBookingInput = z.infer<typeof respondBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
