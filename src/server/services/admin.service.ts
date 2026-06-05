import { prisma } from "@/lib/prisma";
import { ProviderModerationStatus } from "@prisma/client";
import type { DashboardMetrics, LeakageIndicators } from "@/types";

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [
    totalBookings,
    totalRevenue,
    totalProviders,
    totalCustomers,
    pendingApprovals,
    activeBookings,
    completedBookings,
    avgRating,
  ] = await Promise.all([
    prisma.booking.count(),
    prisma.payment.aggregate({
      where: { status: "CAPTURED" },
      _sum: { amount: true },
    }),
    prisma.providerProfile.count({ where: { moderationStatus: "APPROVED" } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.providerProfile.count({ where: { moderationStatus: "SUBMITTED" } }),
    prisma.booking.count({
      where: { status: { in: ["PENDING_PROVIDER_RESPONSE", "CONFIRMED"] } },
    }),
    prisma.booking.count({ where: { status: "COMPLETED" } }),
    prisma.review.aggregate({
      where: { status: "PUBLISHED" },
      _avg: { rating: true },
    }),
  ]);

  return {
    totalBookings,
    totalRevenue: totalRevenue._sum.amount || 0,
    totalProviders,
    totalCustomers,
    pendingApprovals,
    activeBookings,
    completedBookings,
    averageRating: avgRating._avg.rating || 0,
  };
}

export async function getProviderApprovalQueue() {
  return prisma.providerProfile.findMany({
    where: {
      moderationStatus: { in: ["SUBMITTED", "UNDER_REVIEW"] },
    },
    include: {
      user: { select: { name: true, email: true, createdAt: true } },
      suburbs: true,
      services: true,
      portfolioImages: true,
    },
    orderBy: { submittedAt: "asc" },
  });
}

export async function approveProvider(profileId: string, adminId: string) {
  const profile = await prisma.providerProfile.update({
    where: { id: profileId },
    data: {
      moderationStatus: ProviderModerationStatus.APPROVED,
      approvedAt: new Date(),
    },
  });

  await prisma.adminNote.create({
    data: {
      authorId: adminId,
      providerId: profileId,
      content: "Provider approved",
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminId,
      action: "PROVIDER_APPROVED",
      entity: "ProviderProfile",
      entityId: profileId,
    },
  });

  return profile;
}

export async function rejectProvider(profileId: string, adminId: string, reason: string) {
  const profile = await prisma.providerProfile.update({
    where: { id: profileId },
    data: {
      moderationStatus: ProviderModerationStatus.REJECTED,
      rejectionReason: reason,
    },
  });

  await prisma.adminNote.create({
    data: {
      authorId: adminId,
      providerId: profileId,
      content: `Provider rejected: ${reason}`,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminId,
      action: "PROVIDER_REJECTED",
      entity: "ProviderProfile",
      entityId: profileId,
      metadata: { reason },
    },
  });

  return profile;
}

export async function suspendProvider(profileId: string, adminId: string, reason: string) {
  const profile = await prisma.providerProfile.update({
    where: { id: profileId },
    data: {
      moderationStatus: ProviderModerationStatus.SUSPENDED,
    },
  });

  await prisma.adminNote.create({
    data: {
      authorId: adminId,
      providerId: profileId,
      content: `Provider suspended: ${reason}`,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminId,
      action: "PROVIDER_SUSPENDED",
      entity: "ProviderProfile",
      entityId: profileId,
      metadata: { reason },
    },
  });

  return profile;
}

export async function getAllProviders(status?: ProviderModerationStatus) {
  return prisma.providerProfile.findMany({
    where: status ? { moderationStatus: status } : undefined,
    include: {
      user: { select: { name: true, email: true, createdAt: true } },
      suburbs: true,
      _count: { select: { bookings: true, reviews: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllBookings(status?: string) {
  return prisma.booking.findMany({
    where: status ? { status: status as never } : undefined,
    include: {
      service: true,
      customer: { select: { id: true, name: true, email: true } },
      provider: {
        include: { user: { select: { name: true, email: true } } },
      },
      payment: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllReviews(status?: string) {
  return prisma.review.findMany({
    where: status ? { status: status as never } : undefined,
    include: {
      customer: { select: { id: true, name: true } },
      provider: {
        include: { user: { select: { name: true } } },
      },
      booking: { include: { service: { select: { title: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getLeakageIndicators(): Promise<LeakageIndicators> {
  // Get providers with high expiry rate
  const providers = await prisma.providerProfile.findMany({
    where: { moderationStatus: "APPROVED" },
    include: {
      user: { select: { name: true } },
      bookings: {
        select: { status: true },
      },
    },
  });

  const highExpiryRateProviders = providers
    .map((p) => {
      const total = p.bookings.length;
      if (total < 3) return null;
      const expired = p.bookings.filter((b) => b.status === "EXPIRED").length;
      const expiryRate = (expired / total) * 100;
      return expiryRate > 30
        ? { providerId: p.id, name: p.user.name || "Unknown", expiryRate }
        : null;
    })
    .filter(Boolean) as LeakageIndicators["highExpiryRateProviders"];

  const unusualCancellationPatterns = providers
    .map((p) => {
      const total = p.bookings.length;
      if (total < 3) return null;
      const cancelled = p.bookings.filter(
        (b) => b.status === "CANCELLED_BY_PROVIDER"
      ).length;
      const cancellationRate = (cancelled / total) * 100;
      return cancellationRate > 40
        ? { providerId: p.id, name: p.user.name || "Unknown", cancellationRate }
        : null;
    })
    .filter(Boolean) as LeakageIndicators["unusualCancellationPatterns"];

  const poorResponseRate = providers
    .filter((p) => p.responseRate !== null && p.responseRate < 70)
    .map((p) => ({
      providerId: p.id,
      name: p.user.name || "Unknown",
      responseRate: p.responseRate || 0,
    }));

  return {
    highExpiryRateProviders,
    unusualCancellationPatterns,
    poorResponseRate,
  };
}

export async function addAdminNote(data: {
  authorId: string;
  providerId?: string;
  bookingId?: string;
  content: string;
}) {
  return prisma.adminNote.create({ data });
}

export async function getAdminNotes(providerId: string) {
  return prisma.adminNote.findMany({
    where: { providerId },
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}
