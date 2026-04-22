import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: params.id },
    include: { customer: { select: { id: true, name: true } } },
  })
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Ensure the provider owns this entry
  if (entry.providerId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Mark as notified
  await prisma.waitlistEntry.update({
    where: { id: params.id },
    data: { notified: true },
  })

  // Send notification to customer
  await prisma.notification.create({
    data: {
      userId: entry.customerId,
      type: 'NEW_BOOKING',
      title: "You're off the waitlist!",
      message: "An artist you're waiting for has availability. Book now before it fills up!",
    },
  }).catch(() => {})

  return NextResponse.json({ notified: true })
}
