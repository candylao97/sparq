import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function createProviderPayout(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      provider: {
        include: { providerProfile: { select: { stripeAccountId: true } } },
      },
    },
  })

  if (!booking) throw new Error('Booking not found')
  if (booking.status !== 'COMPLETED') throw new Error('Booking is not completed')

  const stripeAccountId = booking.provider.providerProfile?.stripeAccountId
  if (!stripeAccountId) {
    console.log(`Provider ${booking.providerId} has no Stripe Connect account — skipping payout`)
    return null
  }

  // Calculate transfer amount: total price minus platform fee
  const transferAmount = booking.totalPrice - booking.platformFee
  if (transferAmount <= 0) return null

  try {
    const transfer = await stripe.transfers.create({
      amount: Math.round(transferAmount * 100), // cents
      currency: 'aud',
      destination: stripeAccountId,
      transfer_group: booking.id,
      metadata: {
        bookingId: booking.id,
        providerId: booking.providerId,
      },
    })

    // Update provider's total earnings
    await prisma.providerProfile.update({
      where: { userId: booking.providerId },
      data: {
        totalEarnings: { increment: transferAmount },
      },
    })

    return transfer
  } catch (error) {
    console.error('Stripe transfer error:', error)
    throw error
  }
}
