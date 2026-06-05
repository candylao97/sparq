import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@prisma/client";
import { addMinutes, format, addHours } from "date-fns";
import { createPaymentAuthorization, capturePayment, releaseAuthorization } from "./payment.service";
import { PROVIDER_RESPONSE_WINDOW_HOURS } from "@/lib/constants";

export async function createBooking(data: {
  customerId: string;
  providerId: string;
  serviceId: string;
  bookingDate: string;
  startTime: string;
  serviceMode: "STUDIO" | "MOBILE";
  address?: string;
  notes?: string;
  paymentMethodId: string;
}) {
  // Get service details
  const service = await prisma.service.findUnique({
    where: { id: data.serviceId },
    include: { profile: true },
  });

  if (!service) throw new Error("Service not found");
  if (!service.isActive) throw new Error("Service is not available");
  if (service.profileId !== data.providerId) throw new Error("Service does not belong to provider");

  // Check provider is approved
  const provider = await prisma.providerProfile.findUnique({
    where: { id: data.providerId },
  });

  if (!provider || provider.moderationStatus !== "APPROVED") {
    throw new Error("Provider is not available");
  }

  // Calculate end time
  const startDate = new Date(`${data.bookingDate}T${data.startTime}:00`);
  const endDate = addMinutes(startDate, service.durationMinutes);
  const endTime = format(endDate, "HH:mm");

  // Check for double-booking
  const conflict = await prisma.booking.findFirst({
    where: {
      providerId: data.providerId,
      bookingDate: new Date(data.bookingDate),
      status: { in: ["PENDING_PROVIDER_RESPONSE", "CONFIRMED"] },
      OR: [
        { startTime: { lt: endTime }, endTime: { gt: data.startTime } },
      ],
    },
  });

  if (conflict) throw new Error("This time slot is no longer available");

  // Create booking
  const responseDeadline = addHours(new Date(), PROVIDER_RESPONSE_WINDOW_HOURS);

  const booking = await prisma.booking.create({
    data: {
      customerId: data.customerId,
      providerId: data.providerId,
      serviceId: data.serviceId,
      bookingDate: new Date(data.bookingDate),
      startTime: data.startTime,
      endTime,
      totalPrice: service.basePrice,
      serviceMode: data.serviceMode,
      address: data.address,
      notes: data.notes,
      status: BookingStatus.PENDING_PROVIDER_RESPONSE,
      providerResponseDeadline: responseDeadline,
    },
  });

  // Create payment authorization
  try {
    await createPaymentAuthorization({
      bookingId: booking.id,
      amount: service.basePrice,
      paymentMethodId: data.paymentMethodId,
      customerId: data.customerId,
      stripeConnectAccountId: provider.stripeAccountId,
    });
  } catch (error) {
    // If payment auth fails, cancel the booking
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.CANCELLED_BY_CUSTOMER },
    });
    throw new Error(`Payment authorization failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  return booking;
}

export async function acceptBooking(bookingId: string, providerId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true },
  });

  if (!booking) throw new Error("Booking not found");
  if (booking.providerId !== providerId) throw new Error("Unauthorized");
  if (booking.status !== BookingStatus.PENDING_PROVIDER_RESPONSE) {
    throw new Error("Booking cannot be accepted in current status");
  }

  // Check if response window has passed
  if (booking.providerResponseDeadline && new Date() > booking.providerResponseDeadline) {
    throw new Error("Response window has expired");
  }

  // Capture payment
  if (booking.payment) {
    await capturePayment(booking.payment.id);
  }

  return prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: BookingStatus.CONFIRMED,
      respondedAt: new Date(),
    },
  });
}

export async function declineBooking(bookingId: string, providerId: string, reason?: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true },
  });

  if (!booking) throw new Error("Booking not found");
  if (booking.providerId !== providerId) throw new Error("Unauthorized");
  if (booking.status !== BookingStatus.PENDING_PROVIDER_RESPONSE) {
    throw new Error("Booking cannot be declined in current status");
  }

  // Release payment authorization
  if (booking.payment) {
    await releaseAuthorization(booking.payment.id);
  }

  return prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: BookingStatus.DECLINED,
      respondedAt: new Date(),
      cancellationReason: reason,
    },
  });
}

export async function completeBooking(bookingId: string, providerId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) throw new Error("Booking not found");
  if (booking.providerId !== providerId) throw new Error("Unauthorized");
  if (booking.status !== BookingStatus.CONFIRMED) {
    throw new Error("Only confirmed bookings can be completed");
  }

  return prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: BookingStatus.COMPLETED,
      completedAt: new Date(),
    },
  });
}

export async function cancelBookingByCustomer(bookingId: string, customerId: string, reason: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true },
  });

  if (!booking) throw new Error("Booking not found");
  if (booking.customerId !== customerId) throw new Error("Unauthorized");
  if (!["PENDING_PROVIDER_RESPONSE", "CONFIRMED"].includes(booking.status)) {
    throw new Error("Booking cannot be cancelled in current status");
  }

  // Release payment authorization if pending
  if (booking.payment && booking.payment.status === "AUTHORISED") {
    await releaseAuthorization(booking.payment.id);
  }

  return prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: BookingStatus.CANCELLED_BY_CUSTOMER,
      cancelledAt: new Date(),
      cancellationReason: reason,
    },
  });
}

export async function expireStaleBookings() {
  const staleBookings = await prisma.booking.findMany({
    where: {
      status: BookingStatus.PENDING_PROVIDER_RESPONSE,
      providerResponseDeadline: { lt: new Date() },
    },
    include: { payment: true },
  });

  for (const booking of staleBookings) {
    if (booking.payment) {
      try {
        await releaseAuthorization(booking.payment.id);
      } catch (error) {
        console.error(`Failed to release auth for booking ${booking.id}:`, error);
      }
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.EXPIRED },
    });
  }

  return staleBookings.length;
}

export async function getCustomerBookings(customerId: string, status?: BookingStatus) {
  return prisma.booking.findMany({
    where: { customerId, ...(status && { status }) },
    include: {
      service: true,
      provider: {
        include: { user: { select: { name: true, image: true } } },
      },
      payment: true,
      review: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProviderBookings(providerId: string, status?: BookingStatus) {
  return prisma.booking.findMany({
    where: { providerId, ...(status && { status }) },
    include: {
      service: true,
      customer: { select: { id: true, name: true, email: true, image: true } },
      payment: true,
      review: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getBookingById(bookingId: string) {
  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      service: true,
      provider: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
      customer: { select: { id: true, name: true, email: true, image: true } },
      payment: true,
      review: true,
    },
  });
}
