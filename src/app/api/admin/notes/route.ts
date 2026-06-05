import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addAdminNote, getAdminNotes } from "@/server/services/admin.service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const providerId = request.nextUrl.searchParams.get("providerId");
    if (!providerId) {
      return NextResponse.json({ error: "Provider ID required" }, { status: 400 });
    }

    const notes = await getAdminNotes(providerId);
    return NextResponse.json(notes);
  } catch (error) {
    console.error("Admin notes error:", error);
    return NextResponse.json({ error: "Failed to get notes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { providerId, bookingId, content } = body;

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const note = await addAdminNote({
      authorId: session.user.id,
      providerId,
      bookingId,
      content,
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error("Add admin note error:", error);
    return NextResponse.json({ error: "Failed to add note" }, { status: 500 });
  }
}
