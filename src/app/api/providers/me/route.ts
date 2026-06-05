import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProviderProfile } from "@/server/services/provider.service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProviderProfile(session.user.id);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      businessName: profile.businessName,
      bio: profile.bio,
      serviceTypes: profile.serviceTypes,
      serviceMode: profile.serviceMode,
      studioAddress: profile.studioAddress,
      studioSuburb: profile.studioSuburb,
      mobileRadius: profile.mobileRadius,
      abn: profile.abn,
      yearsExperience: profile.yearsExperience,
      moderationStatus: profile.moderationStatus,
      profilePhoto: profile.user?.image ?? null,
      suburbs: profile.suburbs.map((s) => s.suburb),
      portfolioImages: profile.portfolioImages.map((img) => ({
        id: img.id,
        url: img.url,
      })),
    });
  } catch (error) {
    console.error("Get provider profile error:", error);
    return NextResponse.json({ error: "Failed to get profile" }, { status: 500 });
  }
}
