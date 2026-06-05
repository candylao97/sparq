import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getAvailabilityRules,
  setAvailabilityRules,
  getBlockedDates,
  addBlockedDate,
  removeBlockedDate,
  getAvailableSlots,
} from "@/server/services/availability.service";
import { availabilityBulkSchema, blockedDateSchema } from "@/server/validation/service.schema";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const profileId = searchParams.get("profileId");
    const date = searchParams.get("date");
    const duration = searchParams.get("duration");

    // Public: get available slots for a specific date
    if (profileId && date && duration) {
      const slots = await getAvailableSlots(profileId, date, Number(duration));
      return NextResponse.json({ slots });
    }

    // Provider: get own availability
    const session = await auth();
    if (!session?.user || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const [rules, blocked] = await Promise.all([
      getAvailabilityRules(profile.id),
      getBlockedDates(profile.id),
    ]);

    return NextResponse.json({ rules, blockedDates: blocked });
  } catch (error) {
    console.error("Get availability error:", error);
    return NextResponse.json({ error: "Failed to get availability" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const validated = availabilityBulkSchema.parse(body);

    const rules = await setAvailabilityRules(profile.id, validated.rules);
    return NextResponse.json(rules);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const validated = blockedDateSchema.parse(body);

    const blocked = await addBlockedDate(profile.id, validated.date, validated.reason);
    return NextResponse.json(blocked, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const dateId = searchParams.get("id");

    if (!dateId) {
      return NextResponse.json({ error: "Date ID is required" }, { status: 400 });
    }

    await removeBlockedDate(profile.id, dateId);
    return NextResponse.json({ message: "Blocked date removed" });
  } catch (error) {
    console.error("Delete blocked date error:", error);
    return NextResponse.json({ error: "Failed to remove blocked date" }, { status: 500 });
  }
}
