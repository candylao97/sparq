import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookingId } = await req.json()
  if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })

  // Verify user is a participant
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      OR: [{ customerId: session.user.id }, { providerId: session.user.id }],
    },
  })
  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.message.updateMany({
    where: {
      bookingId,
      senderId: { not: session.user.id },
      read: false,
    },
    data: { read: true },
  })

  return NextResponse.json({ success: true })
}
