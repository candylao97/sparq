import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { filterContactInfo } from '@/lib/content-filter'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const bookingId = searchParams.get('bookingId')
  if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })

  // Verify the user is a participant in this booking
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (booking.customerId !== session.user.id && booking.providerId !== session.user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const messages = await prisma.message.findMany({
    where: { bookingId },
    include: { sender: true },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ messages })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    if (booking.customerId !== session.user.id && booking.providerId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Filter contact info from message content
    const filterResult = filterContactInfo(text.trim())
    const sanitizedText = filterResult.flagged ? filterResult.text : text.trim()

    const message = await prisma.message.create({
      data: { bookingId, senderId: session.user.id, text: sanitizedText },
      include: { sender: true },
    })

    // Create leakage flag if contact info was detected
    if (filterResult.flagged) {
      await prisma.contactLeakageFlag.create({
        data: {
          messageId: message.id,
          userId: session.user.id,
          bookingId: bookingId,
          flagType: filterResult.flagType!,
          snippet: filterResult.matches.join(', '),
        },
      })
    }

    // Notify the other party
    const recipientId = session.user.id === booking.customerId ? booking.providerId : booking.customerId
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

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Message send error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
