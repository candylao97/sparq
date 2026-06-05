import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { PaymentStatus } from "@prisma/client";
import Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.amount_capturable_updated": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await handlePaymentAuthorized(pi);
        break;
      }

      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(pi);
        break;
      }

      case "payment_intent.canceled": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await handlePaymentCanceled(pi);
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(pi);
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await handleAccountUpdated(account);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Webhook handler error for ${event.type}:`, error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

async function handlePaymentAuthorized(pi: Stripe.PaymentIntent) {
  const paymentId = pi.metadata?.paymentId;
  if (!paymentId) return;

  // Idempotent: only update if still AUTH_PENDING
  await prisma.payment.updateMany({
    where: { id: paymentId, status: PaymentStatus.AUTH_PENDING },
    data: {
      status: PaymentStatus.AUTHORISED,
      stripePaymentIntentId: pi.id,
    },
  });
}

async function handlePaymentSucceeded(pi: Stripe.PaymentIntent) {
  const paymentId = pi.metadata?.paymentId;
  if (!paymentId) return;

  await prisma.payment.updateMany({
    where: { id: paymentId, status: PaymentStatus.AUTHORISED },
    data: {
      status: PaymentStatus.CAPTURED,
      capturedAt: new Date(),
    },
  });
}

async function handlePaymentCanceled(pi: Stripe.PaymentIntent) {
  const paymentId = pi.metadata?.paymentId;
  if (!paymentId) return;

  await prisma.payment.updateMany({
    where: { id: paymentId, status: PaymentStatus.AUTHORISED },
    data: {
      status: PaymentStatus.AUTH_RELEASED,
      releasedAt: new Date(),
    },
  });
}

async function handlePaymentFailed(pi: Stripe.PaymentIntent) {
  const paymentId = pi.metadata?.paymentId;
  if (!paymentId) return;

  await prisma.payment.updateMany({
    where: {
      id: paymentId,
      status: { in: [PaymentStatus.AUTH_PENDING, PaymentStatus.AUTHORISED] },
    },
    data: {
      status: PaymentStatus.FAILED,
      failureReason: pi.last_payment_error?.message || "Payment failed",
    },
  });
}

async function handleAccountUpdated(account: Stripe.Account) {
  if (account.details_submitted) {
    await prisma.providerProfile.updateMany({
      where: { stripeAccountId: account.id },
      data: { stripeOnboarded: true },
    });
  }
}
