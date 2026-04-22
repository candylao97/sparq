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
  // TS-7: Do NOT write idempotency record here for the critical event types below.
  // For customer.subscription.updated, the idempotency record is written atomically
  // inside the same transaction as the DB update, so both succeed or fail together.
  // For all other event types, write the record here as a best-effort guard.
  const TRANSACTIONAL_EVENTS = ['customer.subscription.updated']
  if (!TRANSACTIONAL_EVENTS.includes(event.type)) {
    try {
      await prisma.processedWebhookEvent.create({
        data: { eventId: event.id, source: 'stripe' },
      })
    } catch {
      // Unique constraint = concurrent duplicate, safe to ignore
      return NextResponse.json({ received: true, duplicate: true })
    }
  }

  const planFromPriceId = (priceId: string): 'PRO' | 'ELITE' | 'FREE' => {
    if (priceId === process.env.STRIPE_PRICE_PRO) return 'PRO'
    if (priceId === process.env.STRIPE_PRICE_ELITE) return 'ELITE'
    return 'FREE'
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session

      // Handle subscription checkout completions
      if (session.mode === 'subscription') {
        const userId = session.metadata?.userId
        const type = session.metadata?.type

        // Handle premium membership subscription
        if (type === 'premium_membership' && userId) {
          // Store Stripe subscription ID and customer ID for future cancellation
          const stripeSubscriptionId = typeof session.subscription === 'string'
            ? session.subscription
            : (session.subscription as { id?: string } | null)?.id ?? null

          const stripeCustomerId = typeof session.customer === 'string'
            ? session.customer
            : (session.customer as { id?: string } | null)?.id ?? null

          // P0-3: Single atomic upsert — merging membership + subscription IDs avoids a
          // partial-write window where membership is PREMIUM but IDs are not yet stored.
          await prisma.customerProfile.upsert({
            where: { userId },
            create: {
              userId,
              membership: 'PREMIUM',
              stripeSubscriptionId: stripeSubscriptionId ?? undefined,
              stripeCustomerId: stripeCustomerId ?? undefined,
            },
            update: {
              membership: 'PREMIUM',
              ...(stripeSubscriptionId && { stripeSubscriptionId }),
              ...(stripeCustomerId && { stripeCustomerId }),
            },
          })

          await prisma.notification.create({
            data: {
              userId,
              type: 'PAYMENT_RECEIVED',
              title: 'Welcome to Sparq Premium! ⭐',
              message: 'You now have zero booking fees on all appointments. Enjoy exclusive access to top artists!',
            },
          }).catch(() => {})
          break
        }

        const plan = session.metadata?.plan as 'PRO' | 'ELITE' | undefined
        if (!userId || !plan) break

        await prisma.providerProfile.update({
          where: { userId },
          data: {
            subscriptionPlan: plan,
            stripeSubscriptionId: session.subscription as string,
            stripeSubscriptionStatus: 'active',
          },
        })
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

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const userId = sub.metadata?.userId
      const type = sub.metadata?.type

      // Handle provider subscription plan changes
      if (type !== 'premium_membership') {
        const priceId = sub.items.data[0]?.price.id ?? ''
        const plan = planFromPriceId(priceId)

        // TS-7: Write idempotency record atomically WITH the profile update so both succeed or fail
        // together. If the profile update fails and rolls back, the idempotency record is also rolled
        // back — meaning the next retry will attempt the update again. Without this, a failed profile
        // update after a successful idempotency write would permanently skip re-processing.
        try {
          await prisma.$transaction([
            prisma.processedWebhookEvent.create({
              data: { eventId: event.id, source: 'stripe' },
            }),
            prisma.providerProfile.updateMany({
              where: { stripeSubscriptionId: sub.id },
              data: {
                subscriptionPlan: sub.status === 'active' ? plan : 'FREE',
                stripeSubscriptionStatus: sub.status,
              },
            }),
          ])
        } catch (txErr: unknown) {
          // Unique constraint on eventId = concurrent duplicate, safe to ignore
          if ((txErr as { code?: string })?.code === 'P2002') {
            return NextResponse.json({ received: true, duplicate: true })
          }
          throw txErr
        }
      }

      // Handle premium membership status changes
      if (type === 'premium_membership' && userId) {
        if (sub.status === 'past_due' || sub.status === 'unpaid' || sub.status === 'canceled') {
          await prisma.customerProfile.update({
            where: { userId },
            data: { membership: 'FREE', stripeSubscriptionId: null },
          })
          await prisma.notification.create({
            data: {
              userId,
              type: 'PAYMENT_RECEIVED',
              title: 'Premium membership issue',
              message: sub.status === 'past_due'
                ? 'Your Sparq Premium payment failed. Please update your payment method to keep your benefits.'
                : 'Your Sparq Premium membership has been cancelled due to a payment issue.',
              link: '/dashboard/customer/premium',
            },
          }).catch(() => {})
        }
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      // MON-R2: Downgrade plan AND unset isFeatured — featured placement is a paid perk
      await prisma.providerProfile.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: {
          subscriptionPlan: 'FREE',
          stripeSubscriptionStatus: 'cancelled',
          stripeSubscriptionId: null,
          isFeatured: false,
        },
      })

      // BL-1: Downgrade premium customer membership when their subscription ends.
      // The cancel route stores stripeCustomerId on the profile — look up by that.
      const customerId = typeof sub.customer === 'string'
        ? sub.customer
        : (sub.customer as { id?: string } | null)?.id
      if (customerId) {
        const profile = await prisma.customerProfile.findFirst({
          where: { stripeCustomerId: customerId },
        })
        if (profile) {
          await prisma.customerProfile.update({
            where: { id: profile.id },
            data: { membership: 'FREE', stripeSubscriptionId: null },
          })
        }
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
