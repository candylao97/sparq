import { prisma } from "@/lib/prisma";
import { stripe, PLATFORM_FEE_PERCENT } from "@/lib/stripe";
import { PaymentStatus } from "@prisma/client";
import { randomBytes } from "crypto";
import type Stripe from "stripe";

export async function createPaymentAuthorization(data: {
  bookingId: string;
  amount: number;
  paymentMethodId: string;
  customerId: string;
  stripeConnectAccountId: string | null;
}) {
  const amountInCents = Math.round(data.amount * 100);
  const platformFee = Math.round(amountInCents * (PLATFORM_FEE_PERCENT / 100));
  const providerAmount = amountInCents - platformFee;
  const idempotencyKey = randomBytes(16).toString("hex");

  // Create payment record first
  const payment = await prisma.payment.create({
    data: {
      bookingId: data.bookingId,
      amount: data.amount,
      platformFee: platformFee / 100,
      providerAmount: providerAmount / 100,
      status: PaymentStatus.AUTH_PENDING,
      idempotencyKey,
    },
  });

  try {
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: amountInCents,
      currency: "aud",
      payment_method: data.paymentMethodId,
      capture_method: "manual",
      confirm: true,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/customer/bookings`,
      metadata: {
        bookingId: data.bookingId,
        paymentId: payment.id,
      },
    };

    // If provider has Stripe Connect, use transfer_data
    if (data.stripeConnectAccountId) {
      paymentIntentParams.transfer_data = {
        destination: data.stripeConnectAccountId,
      };
      paymentIntentParams.application_fee_amount = platformFee;
    }

    const paymentIntent = await stripe.paymentIntents.create(
      paymentIntentParams,
      { idempotencyKey }
    );

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        stripePaymentIntentId: paymentIntent.id,
        status: paymentIntent.status === "requires_capture"
          ? PaymentStatus.AUTHORISED
          : PaymentStatus.AUTH_PENDING,
      },
    });

    return payment;
  } catch (error) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        failureReason: error instanceof Error ? error.message : "Unknown error",
      },
    });
    throw error;
  }
}

export async function capturePayment(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) throw new Error("Payment not found");
  if (payment.status !== PaymentStatus.AUTHORISED) {
    throw new Error("Payment cannot be captured in current status");
  }

  if (!payment.stripePaymentIntentId) {
    throw new Error("No Stripe PaymentIntent found");
  }

  const paymentIntent = await stripe.paymentIntents.capture(
    payment.stripePaymentIntentId
  );

  return prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: paymentIntent.status === "succeeded"
        ? PaymentStatus.CAPTURED
        : PaymentStatus.FAILED,
      capturedAt: new Date(),
    },
  });
}

export async function releaseAuthorization(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) throw new Error("Payment not found");
  if (payment.status !== PaymentStatus.AUTHORISED) {
    throw new Error("Payment auth cannot be released in current status");
  }

  if (!payment.stripePaymentIntentId) {
    throw new Error("No Stripe PaymentIntent found");
  }

  await stripe.paymentIntents.cancel(payment.stripePaymentIntentId);

  return prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: PaymentStatus.AUTH_RELEASED,
      releasedAt: new Date(),
    },
  });
}

export async function refundPayment(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { booking: true },
  });

  if (!payment) throw new Error("Payment not found");
  if (payment.status !== PaymentStatus.CAPTURED) {
    throw new Error("Only captured payments can be refunded");
  }

  if (!payment.stripePaymentIntentId) {
    throw new Error("No Stripe PaymentIntent found");
  }

  const refund = await stripe.refunds.create({
    payment_intent: payment.stripePaymentIntentId,
  });

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: PaymentStatus.REFUNDED,
      refundedAt: new Date(),
      stripeRefundId: refund.id,
    },
  });

  await prisma.booking.update({
    where: { id: payment.bookingId },
    data: { status: "REFUNDED" },
  });

  return payment;
}

export async function createStripeConnectAccount(userId: string, email: string) {
  const account = await stripe.accounts.create({
    type: "express",
    country: "AU",
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: "individual",
  });

  await prisma.providerProfile.update({
    where: { userId },
    data: { stripeAccountId: account.id },
  });

  return account;
}

export async function createStripeConnectOnboardingLink(accountId: string) {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/provider/settings?stripe=refresh`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/provider/settings?stripe=success`,
    type: "account_onboarding",
  });

  return accountLink.url;
}

export async function checkStripeAccountStatus(accountId: string) {
  const account = await stripe.accounts.retrieve(accountId);
  return {
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
  };
}

export async function createPayout(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true, provider: true },
  });

  if (!booking) throw new Error("Booking not found");
  if (booking.status !== "COMPLETED") throw new Error("Booking is not completed");
  if (!booking.payment || booking.payment.status !== "CAPTURED") {
    throw new Error("Payment has not been captured");
  }

  const existingPayout = await prisma.payout.findUnique({
    where: { bookingId },
  });

  if (existingPayout) throw new Error("Payout already exists for this booking");

  return prisma.payout.create({
    data: {
      providerId: booking.providerId,
      bookingId: booking.id,
      amount: booking.payment.providerAmount || booking.totalPrice,
      status: "completed",
      paidAt: new Date(),
    },
  });
}
