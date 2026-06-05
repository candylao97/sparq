import { NextResponse } from "next/server";
import { getProviderById } from "@/server/services/provider.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const provider = await getProviderById(id);

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    return NextResponse.json(provider);
  } catch (error) {
    console.error("Get provider error:", error);
    return NextResponse.json({ error: "Failed to get provider" }, { status: 500 });
  }
}
