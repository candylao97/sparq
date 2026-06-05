import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getProviderApprovalQueue,
  getAllProviders,
  approveProvider,
  rejectProvider,
  suspendProvider,
} from "@/server/services/admin.service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const queue = searchParams.get("queue");
    const status = searchParams.get("status");

    if (queue === "true") {
      const providers = await getProviderApprovalQueue();
      return NextResponse.json(providers);
    }

    const providers = await getAllProviders(
      status as Parameters<typeof getAllProviders>[0]
    );
    return NextResponse.json(providers);
  } catch (error) {
    console.error("Admin providers error:", error);
    return NextResponse.json({ error: "Failed to get providers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { profileId, action, reason } = body;

    if (!profileId || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let result;
    switch (action) {
      case "approve":
        result = await approveProvider(profileId, session.user.id);
        break;
      case "reject":
        if (!reason) {
          return NextResponse.json({ error: "Reason is required for rejection" }, { status: 400 });
        }
        result = await rejectProvider(profileId, session.user.id, reason);
        break;
      case "suspend":
        if (!reason) {
          return NextResponse.json({ error: "Reason is required for suspension" }, { status: 400 });
        }
        result = await suspendProvider(profileId, session.user.id, reason);
        break;
      default:
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
