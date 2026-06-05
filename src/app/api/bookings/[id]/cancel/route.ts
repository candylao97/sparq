import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cancelBookingByCustomer } from "@/server/services/booking.service";
import { cancelBookingSchema } from "@/server/validation/booking.schema";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = cancelBookingSchema.parse({ ...body, bookingId: id });

    const booking = await cancelBookingByCustomer(
      id,
      session.user.id,
      validated.reason
    );

    return NextResponse.json(booking);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
