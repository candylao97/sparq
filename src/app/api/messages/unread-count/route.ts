import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/messages/unread-count
// Returns the total count of unread messages sent TO the current user.
// Auth required. Returns: { count: number }
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id

  // Find all booking IDs where the current user is a participant
  const participantBookings = await prisma.booking.findMany({
    where: {
      OR: [{ customerId: userId }, { providerUserId: userId }],
    },
    select: { id: true },
  })

  const bookingIds = participantBookings.map(b => b.id)

  // Count messages in those bookings that were NOT sent by the current user and are unread
  const count = await prisma.message.count({
    where: {
      bookingId: { in: bookingIds },
      senderId: { not: userId },
      read: false,
    },
  })

  return NextResponse.json({ count })
}
