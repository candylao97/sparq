import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
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
            dispute: true,
          },
        },
      },
      take: 50,
    })

    let processed = 0
    let failed = 0
    let skipped = 0

    for (const payout of pendingPayouts) {
      // Skip if booking has an open dispute
      if (payout.booking.dispute && !['RESOLVED_NO_REFUND', 'CLOSED'].includes(payout.booking.dispute.status)) {
        skipped++
        continue
      }

      // Skip if booking was refunded or disputed
      if (['REFUNDED', 'DISPUTED'].includes(payout.booking.status)) {
        await prisma.payout.update({
          where: { id: payout.id },
          data: { status: 'CANCELLED' },
        })
        skipped++
        continue
      }

      const providerProfile = payout.booking.provider.providerProfile
      if (!providerProfile?.stripeAccountId) {
        await prisma.payout.update({
          where: { id: payout.id },
          data: { status: 'FAILED', failedAt: now, failureReason: 'No Stripe Connect account' },
        })
        failed++
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

        // Update provider earnings
        await prisma.providerProfile.update({
          where: { id: providerProfile.id },
          data: { totalEarnings: { increment: payout.amount } },
        })

        // Notify provider
        await prisma.notification.create({
          data: {
            userId: payout.booking.providerId,
            type: 'PAYOUT_SENT',
            title: 'Payout Sent',
            message: `$${payout.amount.toFixed(2)} has been transferred to your account.`,
            link: '/dashboard/provider/payouts',
          },
        })

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
        failed++
      }
    }

    return NextResponse.json({ processed, failed, skipped, total: pendingPayouts.length })
  } catch (error) {
    console.error('Process payouts error:', error)
    return NextResponse.json({ error: 'Failed to process payouts' }, { status: 500 })
  }
}
