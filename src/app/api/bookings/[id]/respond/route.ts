import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { acceptBooking, declineBooking } from "@/server/services/booking.service";
import { respondBookingSchema } from "@/server/validation/booking.schema";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const validated = respondBookingSchema.parse({ ...body, bookingId: id });

    let booking;
    if (validated.action === "accept") {
      booking = await acceptBooking(id, profile.id);
    } else {
      booking = await declineBooking(id, profile.id, validated.reason);
    }

    return NextResponse.json(booking);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
