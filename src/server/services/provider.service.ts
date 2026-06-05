import { prisma } from "@/lib/prisma";
import { ProviderModerationStatus, ServiceCategory, ServiceMode } from "@prisma/client";
import type { ProviderSearchFilters, ProviderCard } from "@/types";

export async function getProviderProfile(userId: string) {
  return prisma.providerProfile.findUnique({
    where: { userId },
    include: {
      user: { select: { name: true, email: true, image: true } },
      suburbs: true,
      services: true,
      portfolioImages: { orderBy: { sortOrder: "asc" } },
      availabilityRules: { orderBy: { dayOfWeek: "asc" } },
      blockedDates: { where: { date: { gte: new Date() } } },
    },
  });
}

export async function getProviderById(profileId: string) {
  return prisma.providerProfile.findUnique({
    where: { id: profileId, moderationStatus: "APPROVED" },
    include: {
      user: { select: { id: true, name: true, image: true } },
      suburbs: true,
      services: { where: { isActive: true } },
      portfolioImages: { orderBy: { sortOrder: "asc" } },
      availabilityRules: { orderBy: { dayOfWeek: "asc" } },
      blockedDates: { where: { date: { gte: new Date() } } },
      reviews: {
        where: { status: "PUBLISHED" },
        include: { customer: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
}

export async function updateProviderProfile(
  userId: string,
  data: {
    businessName?: string;
    bio?: string;
    serviceTypes?: ServiceCategory[];
    serviceMode?: ServiceMode;
    studioAddress?: string | null;
    studioSuburb?: string | null;
    mobileRadius?: number | null;
    abn?: string;
    yearsExperience?: number;
    suburbs?: string[];
  }
) {
  const { suburbs, ...profileData } = data;

  const profile = await prisma.providerProfile.update({
    where: { userId },
    data: profileData,
  });

  if (suburbs) {
    await prisma.providerSuburb.deleteMany({ where: { profileId: profile.id } });
    await prisma.providerSuburb.createMany({
      data: suburbs.map((suburb) => ({ profileId: profile.id, suburb })),
    });
  }

  return profile;
}

export async function submitProfileForApproval(userId: string) {
  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    include: { services: true, suburbs: true, availabilityRules: true },
  });

  if (!profile) throw new Error("Provider profile not found");
  if (profile.moderationStatus !== "DRAFT" && profile.moderationStatus !== "REJECTED") {
    throw new Error("Profile cannot be submitted in current status");
  }

  // Validate minimum requirements
  if (!profile.businessName) throw new Error("Business name is required");
  if (!profile.bio) throw new Error("Bio is required");
  if (!profile.abn) throw new Error("ABN is required");
  if (profile.services.length === 0) throw new Error("At least one service is required");
  if (profile.suburbs.length === 0) throw new Error("At least one suburb is required");
  if (profile.availabilityRules.length === 0) throw new Error("Availability is required");

  return prisma.providerProfile.update({
    where: { userId },
    data: {
      moderationStatus: ProviderModerationStatus.SUBMITTED,
      submittedAt: new Date(),
    },
  });
}

export async function searchProviders(
  filters: ProviderSearchFilters
): Promise<{ providers: ProviderCard[]; total: number }> {
  const { keyword, category, suburb, serviceMode, minPrice, maxPrice, minRating, page = 1, limit = 12 } = filters;

  const where: Record<string, unknown> = {
    moderationStatus: "APPROVED",
  };

  if (category) {
    where.serviceTypes = { has: category as ServiceCategory };
  }

  if (serviceMode) {
    where.serviceMode = { in: [serviceMode as ServiceMode, "BOTH"] };
  }

  if (suburb) {
    where.suburbs = { some: { suburb } };
  }

  if (minRating) {
    where.avgRating = { gte: minRating };
  }

  if (keyword) {
    where.OR = [
      { businessName: { contains: keyword, mode: "insensitive" } },
      { bio: { contains: keyword, mode: "insensitive" } },
      { user: { name: { contains: keyword, mode: "insensitive" } } },
      { services: { some: { title: { contains: keyword, mode: "insensitive" } } } },
    ];
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    const priceFilter: Record<string, number> = {};
    if (minPrice !== undefined) priceFilter.gte = minPrice;
    if (maxPrice !== undefined) priceFilter.lte = maxPrice;
    where.services = {
      some: { basePrice: priceFilter, isActive: true },
    };
  }

  const [profiles, total] = await Promise.all([
    prisma.providerProfile.findMany({
      where,
      include: {
        user: { select: { name: true, image: true } },
        suburbs: true,
        services: { where: { isActive: true }, orderBy: { basePrice: "asc" }, take: 1 },
      },
      orderBy: [{ avgRating: { sort: "desc", nulls: "last" } }, { reviewCount: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.providerProfile.count({ where }),
  ]);

  const providers: ProviderCard[] = profiles.map((p) => ({
    id: p.id,
    name: p.user.name || "Provider",
    businessName: p.businessName,
    image: p.user.image,
    bio: p.bio,
    serviceTypes: p.serviceTypes,
    suburbs: p.suburbs.map((s) => s.suburb),
    serviceMode: p.serviceMode,
    priceFrom: p.services[0]?.basePrice ?? null,
    avgRating: p.avgRating,
    reviewCount: p.reviewCount,
    isApproved: p.moderationStatus === "APPROVED",
  }));

  return { providers, total };
}
