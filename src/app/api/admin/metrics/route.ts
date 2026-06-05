import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDashboardMetrics, getLeakageIndicators } from "@/server/services/admin.service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [metrics, leakage] = await Promise.all([
      getDashboardMetrics(),
      getLeakageIndicators(),
    ]);

    return NextResponse.json({ metrics, leakage });
  } catch (error) {
    console.error("Admin metrics error:", error);
    return NextResponse.json({ error: "Failed to get metrics" }, { status: 500 });
  }
}
