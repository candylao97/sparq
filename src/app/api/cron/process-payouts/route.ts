import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { sendPayoutEmail } from '@/lib/email'
import { formatShortDate } from '@/lib/utils'

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()

    // Find scheduled payouts where dispute window has passed
    const pendingPayouts = await prisma.payout.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now },
      },
      include: {
        booking: {
          include: {
            provider: { include: { providerProfile: true } },
            service: { select: { title: true } },
            dispute: true,
          },
        },
      },
      // Note: booking fields like refundStatus, refundAmount, totalPrice, status
      // are fetched via the booking relation above.
      take: 50,
    })

    let processed = 0
    let failed = 0
    let skipped = 0

    for (const payout of pendingPayouts) {
      // BL-6: Block payout for ANY unresolved dispute state.
      // OPEN and UNDER_REVIEW both hold funds; RESOLVED_REFUND means money goes back to customer.
      // Only RESOLVED_NO_REFUND and CLOSED allow payout to proceed.
      const DISPUTE_BLOCKING_STATUSES = ['OPEN', 'UNDER_REVIEW', 'RESOLVED_REFUND']
      if (payout.booking.dispute && DISPUTE_BLOCKING_STATUSES.includes(payout.booking.dispute.status)) {
        skipped++
        continue
      }

      // BL-6 (cont): If the booking itself has been refunded, cancel the payout record —
      // the funds went back to the customer so the artist payout must not proceed.
      if (['REFUNDED', 'DISPUTED'].includes(payout.booking.status)) {
        await prisma.payout.update({
          where: { id: payout.id },
          data: { status: 'CANCELLED' },
        })
        skipped++
        continue
      }

      // BL-6 (cont): Also block if a refund was processed at the booking level regardless
      // of the booking status (covers partial refunds from late cancellations).
      if (payout.booking.refundStatus === 'PROCESSED' && payout.booking.refundAmount !== null) {
        // If the full amount was refunded, cancel the payout entirely
        if (payout.booking.refundAmount >= payout.booking.totalPrice) {
          await prisma.payout.update({
            where: { id: payout.id },
            data: { status: 'CANCELLED' },
          })
          skipped++
          continue
        }
        // Partial refund: the payout amount was already adjusted at booking time; proceed.
      }

      // P0-C/BL-C2: Skip $0 payouts — no Stripe transfer needed, just mark complete.
      // Negative amounts (penalty payouts) are handled by the offset logic below.
      if (payout.amount === 0) {
        await prisma.payout.update({
          where: { id: payout.id },
          data: { status: 'COMPLETED', processedAt: now, stripeTransferId: 'zero_amount_skip' },
        })
        processed++
        continue
      }

      // Negative penalty records are picked up as offsets against the next positive payout.
      // Skip standalone negative records here — they are resolved via offset below.
      if (payout.amount < 0) {
        // Leave as SCHEDULED so the offset logic below picks it up against a future positive payout
        skipped++
        continue
      }

      // Check for unprocessed penalty payouts for this provider and offset them
      if (payout.amount > 0) {
        // P1-B: Exclude penalties older than 90 days (expired penalties are not deducted).
        // We use penaltyExpiresAt when set, otherwise fall back to createdAt + 90-day window.
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

        // P1-B: Find penalties that are now expired and still SCHEDULED — notify the provider
        // so they understand the penalty lifecycle and can see it expired without deduction.
        const expiredPenalties = await prisma.payout.findMany({
          where: {
            providerUserId: payout.providerUserId,
            amount: { lt: 0 },
            status: 'SCHEDULED',
            OR: [
              { penaltyExpiresAt: { lte: new Date() } },
              { penaltyExpiresAt: null, createdAt: { lte: ninetyDaysAgo } },
            ],
          },
        })

        for (const penalty of expiredPenalties) {
          // Mark expired penalty as CANCELLED so it is not revisited
          await prisma.payout.update({
            where: { id: penalty.id },
            data: { status: 'CANCELLED' },
          }).catch(() => {})

          // Notify provider their penalty has expired
          await prisma.notification.create({
            data: {
              userId: payout.booking.providerUserId,
              type: 'PAYOUT_SENT',
              title: 'Cancellation penalty expired',
              message: `A $${Math.abs(penalty.amount).toFixed(2)} cancellation penalty from ${formatShortDate(penalty.createdAt)} has expired and will no longer be deducted from your payouts.`,
              link: penalty.bookingId ? `/bookings/${penalty.bookingId}` : '/dashboard/provider/payments',
            },
          }).catch(() => {})
        }

        // P0-2: Wrap the entire penalty query + deduction + settlement update in a transaction.
        // Race condition being prevented: without a transaction, two concurrent payout cron runs
        // (e.g. overlapping invocations) could both read the same penalty records as SCHEDULED,
        // both compute the same deduction, and both attempt to settle — resulting in the penalty
        // being double-deducted from the provider or the payout amount going negative. The
        // transaction serialises reads and writes so only one run can mutate a given penalty record.
        const penaltyResult = await prisma.$transaction(async (tx) => {
          const penalties = await tx.payout.findMany({
            where: {
              providerUserId: payout.providerUserId,
              amount: { lt: 0 },
              status: 'SCHEDULED',
              OR: [
                { penaltyExpiresAt: { gt: new Date() } },
                { penaltyExpiresAt: null, createdAt: { gt: ninetyDaysAgo } },
              ],
            },
          })

          const totalPenalty = penalties.reduce((sum, p) => sum + Math.abs(p.amount), 0)
          if (totalPenalty === 0) return null

          const deduction = Math.min(totalPenalty, payout.amount)
          // Clamp to zero — prevents negative payout amount corruption.
          const adjustedAmount = Math.max(0, payout.amount - deduction)

          // BL-D: Carry forward remaining penalty balance.
          // Only mark penalties as COMPLETED up to the amount we can actually deduct.
          // Remaining balance stays SCHEDULED for the next payout run.
          let remainingDeduction = deduction
          for (const penalty of penalties) {
            if (remainingDeduction <= 0) break
            const penaltyAbs = Math.abs(penalty.amount)
            if (penaltyAbs <= remainingDeduction) {
              // Fully settled — mark as completed
              await tx.payout.update({
                where: { id: penalty.id },
                data: { status: 'COMPLETED', stripeTransferId: `deducted_from:${payout.id}` },
              })
              remainingDeduction -= penaltyAbs
            } else {
              // Partially settled — reduce penalty amount, leave as SCHEDULED for carry-forward
              await tx.payout.update({
                where: { id: penalty.id },
                data: { amount: -(penaltyAbs - remainingDeduction) },
              })
              remainingDeduction = 0
            }
          }

          if (adjustedAmount <= 0) {
            // Full offset — no transfer needed; mark payout completed inside the transaction
            await tx.payout.update({
              where: { id: payout.id },
              data: { status: 'COMPLETED', processedAt: now, stripeTransferId: 'fully_offset_by_penalties', amount: adjustedAmount },
            })
          } else {
            // Partially offset — persist reduced amount inside the transaction
            await tx.payout.update({
              where: { id: payout.id },
              data: { amount: adjustedAmount },
            })
          }

          return { adjustedAmount, deduction, totalPenalty }
        })

        if (penaltyResult !== null) {
          const { adjustedAmount, deduction, totalPenalty } = penaltyResult
          if (adjustedAmount <= 0) {
            processed++
            continue  // skip to next payout
          }
          // Update local variable for the actual transfer
          payout.amount = adjustedAmount
        }
      }

      const providerProfile = payout.booking.provider.providerProfile

      // BL-3: Stripe Connect account must exist AND have charges enabled.
      // An account can become disabled after booking (failed verification, etc.).
      if (!providerProfile?.stripeAccountId) {
        await prisma.payout.update({
          where: { id: payout.id },
          data: { status: 'FAILED', failedAt: now, failureReason: 'No Stripe Connect account' },
        })
        failed++
        continue
      }

      if (!providerProfile.stripeChargesEnabled) {
        // P0-5: Don't permanently fail — account may be re-enabled. Keep as SCHEDULED so the
        // next cron run retries automatically once the provider resolves their Stripe account issues.
        // Log a warning so admin can investigate.
        console.warn(`Payout ${payout.id} skipped: Stripe charges disabled for provider ${providerProfile.id}`)

        // Notify provider their payout is on hold so they can take action
        await prisma.notification.create({
          data: {
            userId: payout.providerUserId,
            type: 'PAYOUT_SENT',  // reuse existing type — no new enum value needed
            title: 'Action required: payout on hold',
            message: `Your payout of $${payout.amount.toFixed(2)} is on hold because your Stripe account needs attention. Please check your payment settings to receive your earnings.`,
            link: '/dashboard/provider/payments',
          },
        }).catch(() => {})

        skipped++
        continue
      }

      // Skip if booking had no actual Stripe payment (fully voucher-covered)
      if (!payout.booking.stripePaymentId) {
        await prisma.payout.update({
          where: { id: payout.id },
          data: { status: 'COMPLETED', processedAt: now, stripeTransferId: 'no_payment_skip' },
        })
        processed++
        continue
      }

      try {
        await prisma.payout.update({
          where: { id: payout.id },
          data: { status: 'PROCESSING' },
        })

        const transfer = await stripe.transfers.create({
          amount: Math.round(payout.amount * 100),
          currency: 'aud',
          destination: providerProfile.stripeAccountId,
          metadata: { bookingId: payout.bookingId, payoutId: payout.id },
        }, {
          idempotencyKey: `payout_${payout.id}`,
        })

        await prisma.payout.update({
          where: { id: payout.id },
          data: { status: 'COMPLETED', stripeTransferId: transfer.id, processedAt: now },
        })

        // NOTE: totalEarnings includes tip amounts. It represents gross received by the provider
        // (service amount + tip), not net service earnings. Do not display as "service revenue" in UI.
        await prisma.providerProfile.update({
          where: { id: providerProfile.id },
          data: { totalEarnings: { increment: payout.amount } }, // gross inc. tip
        })

        // Notify provider
        await prisma.notification.create({
          data: {
            userId: payout.booking.providerUserId,
            type: 'PAYOUT_SENT',
            title: 'Payout Sent',
            message: `$${payout.amount.toFixed(2)} has been transferred to your account.`,
            link: '/dashboard/provider/payouts',
          },
        })

        // Send payout email (non-blocking)
        const providerUser = await prisma.user.findUnique({
          where: { id: payout.booking.providerUserId },
          select: { email: true, name: true },
        })
        if (providerUser?.email) {
          sendPayoutEmail(providerUser.email, {
            providerName: providerUser.name ?? 'there',
            amount: payout.amount,
            serviceTitle: payout.booking.service?.title ?? 'your service',
          }).catch(err => console.error('Payout email error:', err))
        }

        processed++
      } catch (error) {
        console.error(`Payout ${payout.id} failed:`, error)
        await prisma.payout.update({
          where: { id: payout.id },
          data: {
            status: 'FAILED',
            failedAt: now,
            failureReason: error instanceof Error ? error.message : 'Unknown error',
          },
        })

        // Notify provider of failed payout
        const providerUser = await prisma.user.findUnique({
          where: { id: payout.booking.providerUserId },
          select: { email: true, name: true },
        })
        if (providerUser?.email) {
          const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
          fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.RESEND_API_KEY ?? ''}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: process.env.RESEND_FROM_EMAIL ?? 'Sparq <noreply@sparq.com.au>',
              to: providerUser.email,
              subject: 'Action required: your Sparq payout failed',
              html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px;"><h1 style="font-size:22px;color:#1A1A1A;">Payout failed ⚠️</h1><p style="color:#717171;">Hi ${providerUser.name ?? 'there'}, your payout of <strong>$${payout.amount.toFixed(2)}</strong> for <strong>${payout.booking.service?.title ?? 'a service'}</strong> could not be processed.</p><p style="color:#717171;">Please check your Stripe Connect account to ensure your bank details are correct.</p><a href="${APP_URL}/dashboard/provider/payments" style="display:inline-block;background:#E96B56;color:#fff;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;margin:16px 0;">Check payment settings</a><p style="color:#aaa;font-size:12px;margin-top:24px;">If this issue persists, contact us at support@sparq.com.au</p></div>`,
            }),
          }).catch(() => {})
        }
        await prisma.notification.create({
          data: {
            userId: payout.booking.providerUserId,
            type: 'PAYOUT_SENT',
            title: 'Payout Failed',
            message: `Your payout of $${payout.amount.toFixed(2)} could not be processed. Please check your payment settings.`,
            link: '/dashboard/provider/payments',
          },
        }).catch(() => {})

        failed++
      }
    }

    return NextResponse.json({ processed, failed, skipped, total: pendingPayouts.length })
  } catch (error) {
    console.error('Process payouts error:', error)
    return NextResponse.json({ error: 'Failed to process payouts' }, { status: 500 })
  }
}
