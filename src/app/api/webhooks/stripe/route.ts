import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  // T&S-8: Validate secret is configured — fail loudly so monitoring can catch misconfiguration
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('CRITICAL: STRIPE_WEBHOOK_SECRET env var is not set. Webhook validation is disabled.')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  // BL11: Idempotency — skip already-processed webhook events
  const alreadyProcessed = await prisma.processedWebhookEvent.findUnique({
    where: { eventId: event.id },
  })
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, duplicate: true })
  }
  // TS-7: For payment_intent.succeeded (the most critical event), the idempotency record
  // is written atomically inside the handler transaction below. For all other event types,
  // write it here as a best-effort guard before the switch.
  const TRANSACTIONAL_EVENTS = ['payment_intent.succeeded']
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

  switch (event.type) {
    // ─── Identity Verification Events ────────────────────────────────
    case 'identity.verification_session.verified': {
      const session = event.data.object as Stripe.Identity.VerificationSession
      const providerId = session.metadata?.provider_id
      if (providerId) {
        // T&S-3: Always resolve by userId first (prevents stale profileId issues)
        let resolvedProfile = await prisma.providerProfile.findUnique({ where: { userId: providerId } })
        if (!resolvedProfile) {
          // Legacy: metadata may have stored profileId
          resolvedProfile = await prisma.providerProfile.findUnique({ where: { id: providerId } })
        }
        const resolvedId = resolvedProfile?.id ?? providerId

        await prisma.verification.update({
          where: { providerProfileId: resolvedId },
          data: { status: 'APPROVED', reviewedAt: new Date() },
        }).catch(e => console.warn(`Verification update failed for ${resolvedId}:`, e))
        // T&S-R7: Store verificationSessionId + verifiedAt locally for audit trail
        await prisma.providerProfile.update({
          where: { id: resolvedId },
          data: {
            isVerified: true,
            // Store session ID in kycRecord for audit trail
          },
        }).catch(e => console.warn(`ProviderProfile isVerified update failed for ${resolvedId}:`, e))
        // T&S-R7: Upsert KYC record to store verified name + session ID for audit trail.
        // KYCRecord has no separate verifiedName/stripeSessionId fields — store both in adminNotes.
        // stripeStatus stores the semantic verification state ('verified'), not the raw session ID.
        const verifiedName = (session as { verified_outputs?: { name?: string } }).verified_outputs?.name
          ?? (session as { metadata?: { name?: string } }).metadata?.name
          ?? null
        const adminNotesValue = [
          verifiedName ? `Verified name: ${verifiedName}` : null,
          `Stripe session: ${session.id}`,
        ].filter(Boolean).join(' | ')
        await prisma.kYCRecord.upsert({
          where: { providerProfileId: resolvedId },
          create: {
            providerProfileId: resolvedId,
            stripeStatus: 'verified',
            reviewedAt: new Date(),
            adminNotes: adminNotesValue,
            status: 'VERIFIED',
          },
          update: {
            stripeStatus: 'verified',
            reviewedAt: new Date(),
            adminNotes: adminNotesValue,
            status: 'VERIFIED',
          },
        }).catch(e => console.warn(`KYC record upsert failed for ${resolvedId}:`, e))
      }
      break
    }

    case 'identity.verification_session.requires_input': {
      const session = event.data.object as Stripe.Identity.VerificationSession
      const providerId = session.metadata?.provider_id
      if (providerId) {
        // T&S-3: Always resolve by userId first (prevents stale profileId issues)
        let resolvedProfile = await prisma.providerProfile.findUnique({ where: { userId: providerId } })
        if (!resolvedProfile) {
          resolvedProfile = await prisma.providerProfile.findUnique({ where: { id: providerId } })
        }
        const resolvedId = resolvedProfile?.id ?? providerId

        await prisma.verification.update({
          where: { providerProfileId: resolvedId },
          data: { status: 'REJECTED', reviewedAt: new Date() },
        }).catch(e => console.warn(`Verification rejected update failed for ${resolvedId}:`, e))
      }
      break
    }

    case 'identity.verification_session.processing':
      // Still processing — keep as PENDING
      break

    // ─── Payment Events ──────────────────────────────────────────────
    case 'payment_intent.amount_capturable_updated': {
      // Card hold placed — mark as authorised
      const pi = event.data.object as Stripe.PaymentIntent
      const bookingId = pi.metadata?.bookingId
      if (bookingId) {
        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
        })
        if (booking) {
          // P1-4: Extend acceptDeadline once payment is authorised. The booking
          // was created with a 2h deadline to free up abandoned slots quickly.
          // Tier system removed — flat 24h accept window for everyone.
          const newDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000)

          await prisma.booking.update({
            where: { id: bookingId },
            data: {
              paymentStatus: 'AUTHORISED',
              acceptDeadline: newDeadline,
            },
          })
        } else {
          console.log(`Webhook: No booking found for PI ${pi.id} (amount_capturable_updated)`)
        }
      }
      break
    }

    case 'payment_intent.succeeded': {
      // Payment captured successfully
      // TS-7: Write idempotency record atomically WITH the booking update inside a transaction.
      // If the booking update fails, the idempotency record rolls back so the next Stripe retry
      // will re-attempt the update rather than being silently skipped.
      const pi = event.data.object as Stripe.PaymentIntent
      const bookingId = pi.metadata?.bookingId
      if (bookingId) {
        const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
        if (booking) {
          try {
            await prisma.$transaction([
              prisma.processedWebhookEvent.create({
                data: { eventId: event.id, source: 'stripe' },
              }),
              prisma.booking.update({
                where: { id: bookingId },
                data: { paymentStatus: 'CAPTURED' },
              }),
            ])
          } catch (txErr: unknown) {
            // Unique constraint on eventId = concurrent duplicate, safe to ignore
            if ((txErr as { code?: string })?.code === 'P2002') {
              return NextResponse.json({ received: true, duplicate: true })
            }
            throw txErr
          }
        } else {
          console.log(`Webhook: No booking found for PI ${pi.id} (succeeded)`)
        }
      }
      break
    }

    case 'payment_intent.payment_failed': {
      // P0-8: Handle payment failure for both PENDING (auth failed) and CONFIRMED (capture failed)
      const pi = event.data.object as Stripe.PaymentIntent
      const bookingId = pi.metadata?.bookingId
      if (bookingId) {
        const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
        if (booking) {
          if (booking.status === 'PENDING') {
            // Auth failed before provider accepted — cancel and release
            await prisma.booking.update({
              where: { id: bookingId },
              data: { status: 'CANCELLED', paymentStatus: 'FAILED' },
            })
            await prisma.notification.create({
              data: {
                userId: booking.customerId,
                type: 'BOOKING_CANCELLED',
                title: 'Payment failed',
                message: 'Your payment authorization failed. The booking has been cancelled.',
                link: '/dashboard/customer',
              },
            })
          } else if (booking.status === 'CONFIRMED') {
            // Capture failed after provider confirmed — mark paymentStatus FAILED,
            // keep booking CONFIRMED so provider is aware and customer can retry
            await prisma.booking.update({
              where: { id: bookingId },
              data: { paymentStatus: 'FAILED' },
            })
            await prisma.notification.create({
              data: {
                userId: booking.customerId,
                type: 'BOOKING_CANCELLED',
                title: 'Payment failed — action required',
                message: `Your payment for the booking could not be processed. Please update your payment method to keep this booking.`,
                link: `/bookings`,
              },
            })
            // Also notify provider so they can follow up if needed
            await prisma.notification.create({
              data: {
                userId: booking.providerUserId,
                type: 'BOOKING_CANCELLED',
                title: 'Payment failed for a booking',
                message: 'A payment capture failed for one of your confirmed bookings. We have notified the client to update their payment method.',
                link: '/dashboard/provider',
              },
            })
          }
        } else {
          console.log(`Webhook: No booking found for PI ${pi.id} (payment_failed)`)
        }
      }
      break
    }

    case 'payment_intent.canceled': {
      // PI expired (uncaptured after 7 days) or was cancelled
      const pi = event.data.object as Stripe.PaymentIntent
      const bookingId = pi.metadata?.bookingId
      if (bookingId) {
        const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
        if (booking) {
          await prisma.booking.update({
            where: { id: bookingId },
            data: {
              status: booking.status === 'PENDING' ? 'CANCELLED' : booking.status,
              paymentStatus: 'AUTH_RELEASED',
            },
          })
          if (booking.status === 'PENDING') {
            await prisma.notification.create({
              data: {
                userId: booking.customerId,
                type: 'BOOKING_CANCELLED',
                title: 'Booking expired',
                message: 'Your booking was not accepted in time. Your card hold has been released.',
                link: '/dashboard/customer',
              },
            })
          }
        } else {
          console.log(`Webhook: No booking found for PI ${pi.id} (canceled)`)
        }
      }
      break
    }

    case 'charge.refunded': {
      // Sync refund back to booking when admin refunds via Stripe Dashboard
      // (bypassing our API — this ensures booking state stays consistent)
      const charge = event.data.object as Stripe.Charge
      const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
      if (!piId) break

      const booking = await prisma.booking.findFirst({
        where: { stripePaymentId: piId },
      })
      if (!booking) break

      const refundedCents = charge.amount_refunded ?? 0
      const chargedCents = charge.amount ?? 0
      const isFullRefund = refundedCents >= chargedCents
      const refundReason = charge.refunds?.data?.[0]?.reason ?? 'Refunded via Stripe Dashboard'

      // Only update if not already processed by our own refund flow
      if (booking.refundStatus !== 'PROCESSED') {
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            paymentStatus: (isFullRefund ? 'REFUNDED' : 'PARTIAL_REFUND') as any,
            refundStatus: 'PROCESSED',
            refundAmount: refundedCents / 100,
            refundedAt: new Date(),
            refundReason: refundReason,
          },
        })
        console.log(`[charge.refunded] Booking ${booking.id} synced — ${refundedCents / 100} AUD refunded`)
      }
      break
    }

    // ─── Chargeback / Dispute Events ────────────────────────────────
    case 'charge.dispute.created': {
      const stripeDispute = event.data.object as Stripe.Dispute
      const chargeId = stripeDispute.charge as string
      const charge = await stripe.charges.retrieve(chargeId)
      const paymentIntentId = charge.payment_intent as string | null
      if (!paymentIntentId) break

      const booking = await prisma.booking.findFirst({
        where: { stripePaymentId: paymentIntentId },
        include: { provider: { select: { id: true } }, customer: { select: { id: true } } },
      })
      if (!booking) break

      // Freeze any pending payout
      await prisma.payout.updateMany({
        where: { bookingId: booking.id, status: { in: ['SCHEDULED', 'PROCESSING'] } },
        data: { status: 'CANCELLED', failureReason: 'Chargeback dispute opened' },
      })

      // Update booking status to DISPUTED if not already
      if (!['DISPUTED', 'REFUNDED', 'CANCELLED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_PROVIDER'].includes(booking.status)) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'DISPUTED' },
        })
      }

      // Notify customer
      await prisma.notification.create({
        data: {
          userId: booking.customerId,
          type: 'BOOKING_DISPUTED',
          title: 'Chargeback Filed',
          message: `A Stripe chargeback has been filed for your booking. Our team will review it within 2 business days.`,
          link: '/dashboard/customer',
        },
      }).catch(() => {})

      console.warn(`[CHARGEBACK] Stripe dispute ${stripeDispute.id} for booking ${booking.id} — payout frozen`)
      break
    }

    case 'charge.dispute.closed': {
      const stripeDispute = event.data.object as Stripe.Dispute
      const chargeId = stripeDispute.charge as string
      const charge = await stripe.charges.retrieve(chargeId)
      const paymentIntentId = charge.payment_intent as string | null
      if (!paymentIntentId) break

      const booking = await prisma.booking.findFirst({
        where: { stripePaymentId: paymentIntentId },
      })
      if (!booking) break

      const wonDispute = stripeDispute.status === 'won'

      if (wonDispute) {
        // Platform/provider won — restore booking to COMPLETED and re-schedule payout 24h from now
        await prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'COMPLETED' as any },
        })
        await prisma.payout.updateMany({
          where: { bookingId: booking.id, status: 'CANCELLED' },
          data: {
            status: 'SCHEDULED',
            scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            failureReason: null,
          },
        })
      } else {
        // Dispute lost — customer refunded by Stripe; mark booking refunded
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            paymentStatus: 'REFUNDED' as any,
            refundStatus: 'PROCESSED',
            refundAmount: stripeDispute.amount / 100,
            refundedAt: new Date(),
            refundReason: 'Chargeback dispute lost',
          },
        })
      }

      console.log(`[chargeback.closed] Booking ${booking.id} — dispute ${stripeDispute.status}`)
      break
    }

    // ─── Refund Failure Events ───────────────────────────────────────
    case 'refund.failed': {
      const refund = event.data.object as Stripe.Refund
      // Log prominently — a customer may be expecting money they won't get
      console.error(`[REFUND FAILED] Stripe refund ${refund.id} failed for PI ${refund.payment_intent}`)
      const booking = await prisma.booking.findFirst({
        where: { stripePaymentId: refund.payment_intent as string },
      })
      if (booking) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { refundStatus: 'DENIED' },
        })
        // P2-8/FIX-9: Use BOOKING_CANCELLED type (indicates a problem) rather than
        // REFUND_PROCESSED (which implies success). The message now clearly states failure.
        await prisma.notification.create({
          data: {
            userId: booking.customerId,
            type: 'BOOKING_CANCELLED',
            title: 'Refund failed',
            message: 'We were unable to process your refund. Our team has been notified and will contact you within 24 hours.',
            link: '/dashboard/customer',
          },
        }).catch(() => {})
      }
      break
    }

    // ─── Transfer / Payout Events ────────────────────────────────────
    case 'transfer.created':
    case 'transfer.updated': {
      const transfer = event.data.object as Stripe.Transfer
      if (transfer.metadata?.bookingId) {
        await prisma.payout.updateMany({
          where: { bookingId: transfer.metadata.bookingId },
          data: {
            stripeTransferId: transfer.id,
            status: 'COMPLETED',
            processedAt: new Date(),
          },
        })
      }
      break
    }

    case 'transfer.reversed': {
      const transfer = event.data.object as Stripe.Transfer
      if (transfer.metadata?.bookingId) {
        await prisma.payout.updateMany({
          where: { bookingId: transfer.metadata.bookingId },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            failureReason: 'Stripe transfer reversed',
          },
        })
      }
      break
    }

    // ─── Connect Account Events ────────────────────────────────────
    case 'account.updated': {
      const account = event.data.object as Stripe.Account
      if (account.id) {
        const profile = await prisma.providerProfile.findFirst({
          where: { stripeAccountId: account.id },
        })
        if (profile) {
          // Persist live Stripe Connect status so payout eligibility checks are accurate
          await Promise.all([
            prisma.providerProfile.update({
              where: { id: profile.id },
              data: {
                stripeChargesEnabled: account.charges_enabled ?? false,
                stripePayoutsEnabled: account.payouts_enabled ?? false,
                stripeDetailsSubmitted: account.details_submitted ?? false,
              },
            }),
            // Also keep KYCRecord in sync if one exists
            prisma.kYCRecord.updateMany({
              where: { providerProfileId: profile.id },
              data: {
                chargesEnabled: account.charges_enabled ?? false,
                payoutsEnabled: account.payouts_enabled ?? false,
                stripeStatus: account.details_submitted ? 'ACTIVE' : 'PENDING',
              },
            }),
          ])
        } else {
          console.log(`Webhook: No provider profile found for Connect account ${account.id}`)
        }
      }
      break
    }

    default:
      // Ignore unhandled event types
      break
  }

  return NextResponse.json({ received: true })
}
