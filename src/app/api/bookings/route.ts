import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createBooking, getCustomerBookings, getProviderBookings } from "@/server/services/booking.service";
import { createBookingSchema } from "@/server/validation/booking.schema";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "CUSTOMER") {
      const bookings = await getCustomerBookings(session.user.id);
      return NextResponse.json(bookings);
    }

    if (session.user.role === "PROVIDER") {
      const profile = await prisma.providerProfile.findUnique({
        where: { userId: session.user.id },
      });
      if (!profile) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }
      const bookings = await getProviderBookings(profile.id);
      return NextResponse.json(bookings);
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } catch (error) {
    console.error("Get bookings error:", error);
    return NextResponse.json({ error: "Failed to get bookings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = createBookingSchema.parse(body);

    const booking = await createBooking({
      ...validated,
      customerId: session.user.id,
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
