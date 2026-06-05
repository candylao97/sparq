import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { submitProfileForApproval } from "@/server/services/provider.service";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await submitProfileForApproval(session.user.id);
    return NextResponse.json(profile);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
