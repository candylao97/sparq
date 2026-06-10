import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchProviders, updateProviderProfile } from "@/server/services/provider.service";
import { providerProfileSchema } from "@/server/validation/provider.schema";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const filters = {
      keyword: searchParams.get("keyword") || undefined,
      category: searchParams.get("category") || undefined,
      suburb: searchParams.get("suburb") || undefined,
      serviceMode: searchParams.get("serviceMode") || undefined,
      minPrice: searchParams.get("minPrice")
        ? Number(searchParams.get("minPrice"))
        : undefined,
      maxPrice: searchParams.get("maxPrice")
        ? Number(searchParams.get("maxPrice"))
        : undefined,
      minRating: searchParams.get("minRating")
        ? Number(searchParams.get("minRating"))
        : undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : 12,
    };

    const result = await searchProviders(filters);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Search providers error:", error);
    return NextResponse.json({ error: "Failed to search providers" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    // Partial validation: only the fields present in the body are validated and
    // updated. updateProviderProfile treats undefined as "leave unchanged", so
    // omitted fields (and relations like suburbs) are never wiped.
    // abn and yearsExperience are intentionally omitted — they are managed in
    // their own flows and must not be writable through this route.
    const validated = providerProfileSchema
      .omit({ abn: true, yearsExperience: true })
      .partial()
      .parse(body);

    const profile = await updateProviderProfile(session.user.id, validated);
    return NextResponse.json(profile);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
