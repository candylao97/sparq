import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serviceSchema } from "@/server/validation/service.schema";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: "Provider profile not found" }, { status: 404 });
    }

    const services = await prisma.service.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(services);
  } catch (error) {
    console.error("Get services error:", error);
    return NextResponse.json({ error: "Failed to get services" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: "Provider profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const validated = serviceSchema.parse(body);

    const service = await prisma.service.create({
      data: {
        ...validated,
        profileId: profile.id,
      },
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...data } = body;
    const validated = serviceSchema.parse(data);

    const service = await prisma.service.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (!service || service.profile.userId !== session.user.id) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const updated = await prisma.service.update({
      where: { id },
      data: validated,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Service ID is required" }, { status: 400 });
    }

    const service = await prisma.service.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (!service || service.profile.userId !== session.user.id) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    await prisma.service.delete({ where: { id } });
    return NextResponse.json({ message: "Service deleted" });
  } catch (error) {
    console.error("Delete service error:", error);
    return NextResponse.json({ error: "Failed to delete service" }, { status: 500 });
  }
}
