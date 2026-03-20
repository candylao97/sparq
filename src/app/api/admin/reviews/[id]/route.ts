import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { isFlagged, isVisible, flagReason } = body

    const updateData: Record<string, unknown> = {}

    if (typeof isFlagged === 'boolean') updateData.isFlagged = isFlagged
    if (typeof isVisible === 'boolean') updateData.isVisible = isVisible
    if (flagReason !== undefined) updateData.flagReason = flagReason

    // Always set moderation metadata when moderating
    updateData.moderatedAt = new Date()
    updateData.moderatedBy = (session.user as { id: string }).id

    const review = await prisma.review.update({
      where: { id: params.id },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true, email: true } },
        booking: {
          include: {
            service: { select: { id: true, title: true } },
            provider: { select: { id: true, name: true } },
          },
        },
      },
    })

    return NextResponse.json(review)
  } catch (error) {
    console.error('Admin review moderate error:', error)
    return NextResponse.json({ error: 'Failed to moderate review' }, { status: 500 })
  }
}
