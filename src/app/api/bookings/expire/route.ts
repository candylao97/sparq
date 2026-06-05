import { NextResponse } from "next/server";
import { expireStaleBookings } from "@/server/services/booking.service";

// This endpoint should be called by a cron job to expire stale bookings
// In production, use Vercel Cron or similar
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Protect the endpoint with a secret
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const expiredCount = await expireStaleBookings();

    return NextResponse.json({
      message: `Expired ${expiredCount} stale bookings`,
      count: expiredCount,
    });
  } catch (error) {
    console.error("Expire bookings error:", error);
    return NextResponse.json({ error: "Failed to expire bookings" }, { status: 500 });
  }
}
