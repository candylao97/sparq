import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getPayoutDetails,
  updatePayoutDetails,
} from "@/server/services/provider.service";
import { payoutDetailsSchema } from "@/server/validation/provider.schema";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const details = await getPayoutDetails(session.user.id);
    return NextResponse.json(details ?? {});
  } catch (error) {
    console.error("Get payout details error:", error);
    return NextResponse.json(
      { error: "Failed to load payout details" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const validated = payoutDetailsSchema.parse(body);
    const details = await updatePayoutDetails(session.user.id, validated);
    return NextResponse.json(details);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
