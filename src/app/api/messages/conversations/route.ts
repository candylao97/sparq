import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id

  // Get all bookings where user is a participant and that have messages
  const bookings = await prisma.booking.findMany({
    where: {
      OR: [{ customerId: userId }, { providerUserId: userId }],
      messages: { some: {} },
    },
    include: {
      service: { select: { title: true, category: true } },
      customer: { select: { id: true, name: true, image: true } },
      provider: { select: { id: true, name: true, image: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  // Get unread counts per booking in one query
  const unreadCounts = await prisma.message.groupBy({
    by: ['bookingId'],
    where: {
      bookingId: { in: bookings.map(b => b.id) },
      senderId: { not: userId },
      read: false,
    },
    _count: { id: true },
  })

  const unreadMap = new Map(unreadCounts.map(u => [u.bookingId, u._count.id]))

  // Build conversation list
  const conversations = bookings
    .map(b => {
      const isCustomer = b.customerId === userId
      const otherParty = isCustomer
        ? { id: b.provider.id, name: b.provider.name || 'Unknown', image: b.provider.image }
        : { id: b.customer.id, name: b.customer.name || 'Unknown', image: b.customer.image }

      const lastMsg = b.messages[0] || null

      return {
        bookingId: b.id,
        otherParty,
        service: { title: b.service.title, category: b.service.category },
        booking: {
          status: b.status,
          date: b.date.toISOString(),
          time: b.time,
          totalPrice: b.totalPrice,
          locationType: b.locationType,
          address: ['CONFIRMED', 'COMPLETED'].includes(b.status) ? b.address : null,
        },
        lastMessage: lastMsg
          ? { text: lastMsg.text, createdAt: lastMsg.createdAt.toISOString(), senderId: lastMsg.senderId }
          : null,
        unreadCount: unreadMap.get(b.id) || 0,
      }
    })
    .sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0
      const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0
      return bTime - aTime
    })

  return NextResponse.json({ conversations })
}
