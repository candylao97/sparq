import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reason } = await req.json()

  // Validate reason: must be a non-empty string, max 500 chars
  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return NextResponse.json({ error: 'A reason is required to flag a review' }, { status: 400 })
  }
  if (reason.trim().length > 500) {
    return NextResponse.json({ error: 'Reason must be 500 characters or fewer' }, { status: 400 })
  }

  // Fetch the review to check authorship
  const review = await prisma.review.findUnique({
    where: { id: params.id },
    select: { customerId: true },
  })

  if (!review) {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 })
  }

  // Users cannot flag their own review
  if (review.customerId === session.user.id) {
    return NextResponse.json({ error: 'You cannot flag your own review' }, { status: 403 })
  }

  await prisma.review.update({
    where: { id: params.id },
    data: {
      isFlagged: true,
      flagReason: `User report: ${reason.trim()}`,
    },
  })

  return NextResponse.json({ ok: true })
}
