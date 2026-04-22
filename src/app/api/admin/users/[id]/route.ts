import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAdminAction } from '@/lib/auditLog'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      providerProfile: true,
      customerProfile: true,
      bookingsAsCustomer: {
        include: { service: { select: { title: true } }, provider: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      bookingsAsProvider: {
        include: { service: { select: { title: true } }, customer: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ user })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { action, reason } = body

  // Find user's provider profile (may not exist for customer-only accounts)
  const providerProfile = await prisma.providerProfile.findUnique({
    where: { userId: params.id },
  })

  if (action === 'suspend') {
    // Always update User.accountStatus
    await prisma.user.update({
      where: { id: params.id },
      data: { accountStatus: 'SUSPENDED' },
    })
    // Also update ProviderProfile if it exists
    if (providerProfile) {
      await prisma.providerProfile.update({
        where: { userId: params.id },
        data: { accountStatus: 'SUSPENDED', suspendReason: reason },
      })
    }
  } else if (action === 'unsuspend') {
    await prisma.user.update({
      where: { id: params.id },
      data: { accountStatus: 'ACTIVE' },
    })
    if (providerProfile) {
      await prisma.providerProfile.update({
        where: { userId: params.id },
        data: { accountStatus: 'ACTIVE', suspendReason: null },
      })
    }
  } else if (action === 'ban') {
    await prisma.user.update({
      where: { id: params.id },
      data: { accountStatus: 'BANNED' },
    })
    if (providerProfile) {
      await prisma.providerProfile.update({
        where: { userId: params.id },
        data: { accountStatus: 'BANNED', suspendReason: reason },
      })
    }
  } else if (action === 'flag') {
    await prisma.user.update({
      where: { id: params.id },
      data: { accountStatus: 'UNDER_REVIEW' },
    })
    if (providerProfile) {
      await prisma.providerProfile.update({
        where: { userId: params.id },
        data: { accountStatus: 'UNDER_REVIEW' },
      })
    }
  }

  await logAdminAction({
    actorId: (session.user as { id: string }).id,
    action: action.toUpperCase() + '_USER',
    targetType: 'User',
    targetId: params.id,
    reason,
  })

  return NextResponse.json({ ok: true })
}
