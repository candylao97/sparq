import { prisma } from "@/lib/prisma";

export async function createReview(data: {
  bookingId: string;
  customerId: string;
  rating: number;
  comment?: string;
}) {
  const booking = await prisma.booking.findUnique({
    where: { id: data.bookingId },
    include: { review: true },
  });

  if (!booking) throw new Error("Booking not found");
  if (booking.customerId !== data.customerId) throw new Error("Unauthorized");
  if (booking.status !== "COMPLETED") throw new Error("Only completed bookings can be reviewed");
  if (booking.review) throw new Error("A review already exists for this booking");

  const review = await prisma.review.create({
    data: {
      bookingId: data.bookingId,
      customerId: data.customerId,
      providerId: booking.providerId,
      rating: data.rating,
      comment: data.comment,
      isVerified: true,
    },
  });

  // Update provider average rating
  const stats = await prisma.review.aggregate({
    where: { providerId: booking.providerId, status: "PUBLISHED" },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.providerProfile.update({
    where: { id: booking.providerId },
    data: {
      avgRating: stats._avg.rating,
      reviewCount: stats._count.rating,
    },
  });

  return review;
}

export async function getProviderReviews(providerId: string) {
  return prisma.review.findMany({
    where: { providerId, status: "PUBLISHED" },
    include: {
      customer: { select: { id: true, name: true, image: true } },
      booking: { include: { service: { select: { title: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function hideReview(reviewId: string) {
  const review = await prisma.review.update({
    where: { id: reviewId },
    data: { status: "HIDDEN" },
  });

  // Recalculate provider rating
  const stats = await prisma.review.aggregate({
    where: { providerId: review.providerId, status: "PUBLISHED" },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.providerProfile.update({
    where: { id: review.providerId },
    data: {
      avgRating: stats._avg.rating,
      reviewCount: stats._count.rating,
    },
  });

  return review;
}

export async function restoreReview(reviewId: string) {
  const review = await prisma.review.update({
    where: { id: reviewId },
    data: { status: "PUBLISHED" },
  });

  const stats = await prisma.review.aggregate({
    where: { providerId: review.providerId, status: "PUBLISHED" },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.providerProfile.update({
    where: { id: review.providerId },
    data: {
      avgRating: stats._avg.rating,
      reviewCount: stats._count.rating,
    },
  });

  return review;
}
