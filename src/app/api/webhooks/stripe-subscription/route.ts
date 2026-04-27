import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const webhookSecret = process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    console.error('[STRIPE_SUBSCRIPTION_WEBHOOK] STRIPE_SUBSCRIPTION_WEBHOOK_SECRET is not configured')
    return new NextResponse('Webhook secret not configured', { status: 500 })
  }

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  if (!sig) return new NextResponse('Missing signature', { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret!)
  } catch {
    return new NextResponse('Invalid signature', { status: 400 })
  }

  // BL11: Idempotency — skip already-processed webhook events
  const alreadyProcessed = await prisma.processedWebhookEvent.findUnique({
    where: { eventId: event.id },
  })
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, duplicate: true })
  }
  // Best-effort idempotency record. The TS-7 transactional path that
  // previously bundled this with subscription.updated is gone — there's no
  // longer a write that needs to be coupled to the idempotency record.
  try {
    await prisma.processedWebhookEvent.create({
      data: { eventId: event.id, source: 'stripe' },
    })
  } catch {
    // Unique constraint = concurrent duplicate, safe to ignore
    return NextResponse.json({ received: true, duplicate: true })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session

      // Subscription mode (was customer PREMIUM membership + artist PRO/ELITE
      // plans) is no longer used. Tier system removed; ignore any stray events.
      if (session.mode === 'subscription') {
        break
      }

      // Handle gift card payment checkout completions
      if (session.mode === 'payment') {
        // Handle featured listing purchase
        if (session.metadata?.type === 'featured_listing') {
          const { profileId, durationDays } = session.metadata
          const days = parseInt(durationDays ?? '30')
          const now = new Date()
          const newFeaturedUntil = new Date(now.getTime() + days * 24 * 3600 * 1000)

          // Cap featuredUntil at max(existing, new) so an existing longer window is not shortened
          const existingProfile = await prisma.providerProfile.findUnique({
            where: { id: profileId },
            select: { featuredUntil: true },
          })
          const existingUntil = existingProfile?.featuredUntil
          const featuredUntil = existingUntil && existingUntil > newFeaturedUntil
            ? existingUntil
            : newFeaturedUntil

          await prisma.providerProfile.update({
            where: { id: profileId },
            data: {
              isFeatured: true,
              featuredUntil,
            },
          })

          // Notify provider
          const profile = await prisma.providerProfile.findUnique({
            where: { id: profileId },
            select: { userId: true },
          })
          if (profile) {
            await prisma.notification.create({
              data: {
                userId: profile.userId,
                type: 'PAYMENT_RECEIVED',
                title: 'Featured listing activated! ⭐',
                message: `Your profile is now Featured in search results until ${featuredUntil.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}.`,
              },
            }).catch(() => {})
          }

          await prisma.auditLog.create({
            data: {
              actorId: session.metadata.providerId,
              action: 'FEATURED_PURCHASED',
              targetType: 'ProviderProfile',
              targetId: profileId,
              details: { days, featuredUntil: featuredUntil.toISOString(), stripeSessionId: session.id },
            },
          }).catch(() => {})

          break
        }

        const { buyerId, recipientName, recipientEmail, personalMessage, voucherCode, amount } = session.metadata ?? {}
        if (!voucherCode || !buyerId || !amount) break

        // Idempotency: skip if already created
        const existing = await prisma.giftVoucher.findUnique({ where: { code: voucherCode } })
        if (existing) break

        const parsedAmount = parseFloat(amount)
        await prisma.giftVoucher.create({
          data: {
            code: voucherCode,
            amount: parsedAmount,
            remainingBalance: parsedAmount,
            usedAmount: 0,
            isRedeemed: false,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
            issuedBy: buyerId,
          },
        })

        // Send gift card email to recipient if email provided (non-blocking)
        if (recipientEmail) {
          const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
          fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.RESEND_API_KEY ?? ''}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: process.env.RESEND_FROM_EMAIL ?? 'Sparq <noreply@sparq.com.au>',
              to: recipientEmail,
              subject: `You've received a Sparq gift card worth $${parsedAmount.toFixed(2)}!`,
              html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px;"><h1 style="font-size:24px;color:#1A1A1A;">You've got a gift card! 🎁</h1><p style="color:#717171;">${personalMessage || `Someone special sent you a Sparq gift card.`}</p><div style="background:#f9f2ef;border-radius:12px;padding:20px;margin:20px 0;text-align:center;"><p style="font-size:12px;color:#717171;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Your code</p><p style="font-size:28px;font-weight:800;color:#1A1A1A;letter-spacing:4px;margin:0;">${voucherCode}</p><p style="font-size:20px;font-weight:700;color:#E96B56;margin:8px 0 0;">$${parsedAmount.toFixed(2)} AUD</p></div><a href="${APP_URL}/search" style="display:inline-block;background:#E96B56;color:#fff;font-weight:600;padding:14px 28px;border-radius:12px;text-decoration:none;font-size:15px;">Book a service</a><p style="color:#aaa;font-size:12px;margin-top:24px;">Valid for 12 months. Use at checkout when booking any Sparq service.</p></div>`,
            }),
          }).catch(() => {}) // Non-blocking, skip if Resend not configured
        }
        break
      }
      break
    }

    // Subscription lifecycle events (was customer PREMIUM membership +
    // artist PRO/ELITE plans) are no longer used. Tier system removed.
    // Stripe-side: archive the corresponding Products/Prices and disable
    // this webhook endpoint after deploy so retries stop arriving.
  }

  return NextResponse.json({ received: true })
}
