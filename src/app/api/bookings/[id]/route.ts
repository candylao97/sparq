import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBookingById } from "@/server/services/booking.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const booking = await getBookingById(id);

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check access
    const isCustomer = session.user.role === "CUSTOMER" && booking.customerId === session.user.id;
    const isProvider = session.user.role === "PROVIDER" && booking.provider.userId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isCustomer && !isProvider && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error("Get booking error:", error);
    return NextResponse.json({ error: "Failed to get booking" }, { status: 500 });
  }
}
