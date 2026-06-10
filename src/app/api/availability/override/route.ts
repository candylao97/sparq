import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  upsertAvailabilityOverride,
  deleteAvailabilityOverride,
} from "@/server/services/availability.service";
import { availabilityOverrideSchema } from "@/server/validation/service.schema";

async function resolveProviderProfile() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PROVIDER") {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) {
    return { error: NextResponse.json({ error: "Profile not found" }, { status: 404 }) };
  }

  return { profile };
}

export async function POST(request: Request) {
  try {
    const { profile, error } = await resolveProviderProfile();
    if (error) return error;

    const body = await request.json();
    const validated = availabilityOverrideSchema.parse(body);

    const override = await upsertAvailabilityOverride(profile.id, validated);
    return NextResponse.json(override);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { profile, error } = await resolveProviderProfile();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    let date = searchParams.get("date");

    if (!date) {
      const body = await request.json().catch(() => null);
      if (body && typeof body.date === "string") {
        date = body.date;
      }
    }

    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    await deleteAvailabilityOverride(profile.id, date);
    return NextResponse.json({ message: "Override removed" });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
