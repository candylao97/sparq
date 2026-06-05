import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllReviews } from "@/server/services/admin.service";
import { hideReview, restoreReview } from "@/server/services/review.service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = request.nextUrl.searchParams.get("status") || undefined;
    const reviews = await getAllReviews(status);
    return NextResponse.json(reviews);
  } catch (error) {
    console.error("Admin reviews error:", error);
    return NextResponse.json({ error: "Failed to get reviews" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { reviewId, action } = body;

    if (!reviewId || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let result;
    if (action === "hide") {
      result = await hideReview(reviewId);
    } else if (action === "restore") {
      result = await restoreReview(reviewId);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
