import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as Record<string, unknown>).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const resolved = searchParams.get('resolved') === 'true'

    const flags = await prisma.contactLeakageFlag.findMany({
      where: { resolved },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ flags })
  } catch (error) {
    console.error('Leakage flags error:', error)
    return NextResponse.json({ error: 'Failed to fetch flags' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as Record<string, unknown>).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { flagId } = await req.json()

    const flag = await prisma.contactLeakageFlag.update({
      where: { id: flagId },
      data: {
        resolved: true,
        resolvedBy: session.user.id,
        resolvedAt: new Date(),
      },
    })

    return NextResponse.json({ flag })
  } catch (error) {
    console.error('Resolve flag error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
