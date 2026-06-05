import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createStripeConnectAccount,
  createStripeConnectOnboardingLink,
  checkStripeAccountStatus,
} from "@/server/services/payment.service";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    let accountId = profile.stripeAccountId;

    if (!accountId) {
      const account = await createStripeConnectAccount(
        session.user.id,
        session.user.email
      );
      accountId = account.id;
    }

    const url = await createStripeConnectOnboardingLink(accountId);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Stripe Connect error:", error);
    return NextResponse.json({ error: "Failed to create Stripe Connect link" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile?.stripeAccountId) {
      return NextResponse.json({ connected: false });
    }

    const status = await checkStripeAccountStatus(profile.stripeAccountId);

    if (status.detailsSubmitted && !profile.stripeOnboarded) {
      await prisma.providerProfile.update({
        where: { userId: session.user.id },
        data: { stripeOnboarded: true },
      });
    }

    return NextResponse.json({
      connected: true,
      ...status,
    });
  } catch (error) {
    console.error("Stripe status error:", error);
    return NextResponse.json({ error: "Failed to check Stripe status" }, { status: 500 });
  }
}
