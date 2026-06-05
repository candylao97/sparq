import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createReview } from "@/server/services/review.service";
import { createReviewSchema } from "@/server/validation/review.schema";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = createReviewSchema.parse(body);

    const review = await createReview({
      ...validated,
      customerId: session.user.id,
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
