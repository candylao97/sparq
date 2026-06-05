import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadImage } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string; // "portfolio" | "profile"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be under 5MB" }, { status: 400 });
    }

    // Convert to base64 for Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    const folder = type === "profile" ? "profiles" : "portfolio";
    const { url, publicId } = await uploadImage(base64, folder);

    if (type === "profile") {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { image: url },
      });
    } else if (type === "portfolio") {
      const profile = await prisma.providerProfile.findUnique({
        where: { userId: session.user.id },
      });

      if (profile) {
        const count = await prisma.portfolioImage.count({
          where: { profileId: profile.id },
        });

        await prisma.portfolioImage.create({
          data: {
            profileId: profile.id,
            url,
            publicId,
            sortOrder: count,
          },
        });
      }
    }

    return NextResponse.json({ url, publicId }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
