import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { filterContactInfo } from '@/lib/content-filter'
import { rateLimit } from '@/lib/rate-limit'
import { sendNewMessageEmail } from '@/lib/email'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const bookingId = searchParams.get('bookingId')
  if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })

  // Verify the user is a participant in this booking
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (booking.customerId !== session.user.id && booking.providerUserId !== session.user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const [messages] = await Promise.all([
    prisma.message.findMany({
      where: { bookingId },
      include: { sender: true },
      orderBy: { createdAt: 'asc' },
    }),
    // Mark all unread messages sent by the other party as read
    prisma.message.updateMany({
      where: {
        bookingId,
        senderId: { not: session.user.id },
        read: false,
      },
      data: { read: true },
    }),
  ])

  return NextResponse.json({ messages })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allowed = await rateLimit(`message:${session.user.id}`, 60, 60)
  if (!allowed) return NextResponse.json({ error: 'Too many messages' }, { status: 429 })

  // Verify the sender's account is active before allowing messages
  const senderUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { accountStatus: true },
  })
  if (senderUser?.accountStatus && senderUser.accountStatus !== 'ACTIVE') {
    return NextResponse.json({ error: 'Your account is not active' }, { status: 403 })
  }

  try {
    const { bookingId, text } = await req.json()

    // Validate text is not empty
    if (!text?.trim()) {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 })
    }
    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId is required' }, { status: 400 })
    }

    // Verify booking exists and user is a participant BEFORE creating the message
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    if (booking.customerId !== session.user.id && booking.providerUserId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // P1-4: Per-recipient throttle — max 3 messages per minute per (sender, recipient) pair.
    // Prevents a provider or customer from flooding a single conversation partner.
    const recipientId = session.user.id === booking.customerId ? booking.providerUserId : booking.customerId
    const perRecipientAllowed = await rateLimit(`msg-pair:${session.user.id}:${recipientId}`, 3, 60)
    if (!perRecipientAllowed) {
      return NextResponse.json({ error: 'Sending too fast. Please wait a moment.' }, { status: 429 })
    }

    // BL-L2: Block messages containing contact info to prevent off-platform leakage
    const filterResult = filterContactInfo(text.trim())
    if (filterResult.flagged) {
      // Log the attempt for admin review without delivering the message
      await prisma.contactLeakageFlag.create({
        data: {
          messageId: null,
          userId: session.user.id,
          bookingId: bookingId,
          flagType: filterResult.flagType!,
          snippet: filterResult.matches.join(', '),
        },
      })
      return NextResponse.json(
        {
          error:
            'Your message appears to contain contact information (phone number, email, or social handle). For your protection, all bookings and payments must stay on Sparq.',
          code: 'CONTACT_LEAKAGE',
        },
        { status: 422 }
      )
    }

    const message = await prisma.message.create({
      data: { bookingId, senderId: session.user.id, text: text.trim() },
      include: { sender: true },
    })

    // Notify the other party (recipientId already resolved above for P1-4 rate limit)
    await Promise.all([
      prisma.notification.create({
        data: {
          userId: recipientId,
          type: 'NEW_MESSAGE',
          title: 'New Message',
          message: 'You have a new message',
          link: `/messages?bookingId=${bookingId}`,
        },
      }),
      prisma.booking.update({
        where: { id: bookingId },
        data: { updatedAt: new Date() },
      }),
    ])

    // Send email to recipient — dedup: skip if a message was already sent in the last 10 min
    const recentMessage = await prisma.message.findFirst({
      where: {
        bookingId,
        senderId: session.user.id,
        createdAt: { gt: new Date(Date.now() - 10 * 60 * 1000) },
        id: { not: message.id },
      },
    })

    if (!recentMessage) {
      const recipient = await prisma.user.findUnique({
        where: { id: recipientId },
        select: { email: true, name: true },
      })
      if (recipient?.email) {
        const preview = text.trim().substring(0, 100) + (text.trim().length > 100 ? '...' : '')
        const senderName = message.sender.name ?? 'Someone'
        sendNewMessageEmail(
          recipient.email,
          recipient.name ?? 'there',
          senderName,
          preview,
          '/messages'
        ).catch(() => {})
      }
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Message send error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
