import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role')

  if (role === 'provider') {
    // Return all waitlist entries for the current provider
    if (!['PROVIDER', 'BOTH'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const entries = await prisma.waitlistEntry.findMany({
      where: { providerUserId: session.user.id },
      include: {
        customer: { select: { name: true, image: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      entries: entries.map(e => ({
        id: e.id,
        user: { name: e.customer.name ?? 'Client', image: e.customer.image },
        serviceId: e.serviceId,
        createdAt: e.createdAt.toISOString(),
        notified: e.notified,
      })),
    })
  }

  // Default: return customer's own waitlist entries
  const entries = await prisma.waitlistEntry.findMany({
    where: { customerId: session.user.id, notified: false },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ entries })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Sign in to join the waitlist' }, { status: 401 })

  const { providerId, date, serviceId } = await req.json()
  if (!providerId) {
    return NextResponse.json({ error: 'providerId required' }, { status: 400 })
  }

  // Use provided date or a far-future date as "any availability" sentinel
  const entryDate = date ? new Date(date) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)

  // Check if already waitlisted for this provider (not yet notified)
  const existing = await prisma.waitlistEntry.findFirst({
    where: {
      customerId: session.user.id,
      providerUserId: providerId,
      notified: false,
    },
  })
  if (existing) {
    return NextResponse.json({ entry: existing, alreadyJoined: true })
  }

  const entry = await prisma.waitlistEntry.create({
    data: {
      customerId: session.user.id,
      providerUserId: providerId,
      serviceId: serviceId || null,
      date: entryDate,
    },
  })

  return NextResponse.json({ entry })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { providerId } = await req.json()
  await prisma.waitlistEntry.deleteMany({
    where: { customerId: session.user.id, providerUserId: providerId },
  })

  return NextResponse.json({ ok: true })
}
