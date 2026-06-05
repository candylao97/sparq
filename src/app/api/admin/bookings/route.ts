import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllBookings } from "@/server/services/admin.service";
import { refundPayment } from "@/server/services/payment.service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = request.nextUrl.searchParams.get("status") || undefined;
    const bookings = await getAllBookings(status);
    return NextResponse.json(bookings);
  } catch (error) {
    console.error("Admin bookings error:", error);
    return NextResponse.json({ error: "Failed to get bookings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { paymentId, action } = body;

    if (action === "refund" && paymentId) {
      const result = await refundPayment(paymentId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
