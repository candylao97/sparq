import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { randomInt } from 'crypto'
import { authOptions } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return 'SPARQ-' + Array.from({ length: 8 }, () => chars[randomInt(chars.length)]).join('')
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // AUDIT-017: Velocity check on gift-card purchase. Each purchase creates
  // a Stripe PaymentIntent; a burst of purchases is expensive (Stripe fees,
  // potential card-testing abuse). Tier 1 by IP (card-testing often uses
  // multiple accounts from one network), tier 2 by user.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ipAllowed = await rateLimit(`gift-card-purchase-ip:${ip}`, 10, 3600)
  if (!ipAllowed) {
    return NextResponse.json(
      { error: 'Too many gift card purchases from your network. Please try again later.' },
      { status: 429 },
    )
  }
  const userAllowed = await rateLimit(`gift-card-purchase-user:${session.user.id}`, 20, 86400)
  if (!userAllowed) {
    return NextResponse.json(
      { error: 'Daily gift card purchase limit reached. Please contact support if you need to purchase more.' },
      { status: 429 },
    )
  }

  try {
    const { amount, recipientName, recipientEmail, personalMessage } = await req.json()

    if (!amount || amount < 10 || amount > 500) {
      return NextResponse.json({ error: 'Amount must be between $10 and $500' }, { status: 400 })
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!recipientEmail || !emailRegex.test(recipientEmail)) {
      return NextResponse.json({ error: 'Valid recipient email is required' }, { status: 400 })
    }

    const origin = req.headers.get('origin') ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

    // Pre-generate the voucher code so we can include it in the Stripe metadata
    let code = generateCode()
    // Ensure uniqueness
    while (await prisma.giftVoucher.findUnique({ where: { code } })) {
      code = generateCode()
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'aud',
          product_data: {
            name: `Sparq Gift Card${recipientName ? ` for ${recipientName}` : ''}`,
            description: personalMessage || 'A gift card for beauty services on Sparq',
            images: [],
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      success_url: `${origin}/gift-cards/success?session_id={CHECKOUT_SESSION_ID}&code=${code}`,
      cancel_url: `${origin}/gift-cards`,
      metadata: {
        buyerId: session.user.id,
        recipientName: recipientName || '',
        recipientEmail,
        personalMessage: personalMessage || '',
        voucherCode: code,
        amount: String(amount),
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (err) {
    console.error('[gift-cards/purchase] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
