import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/portfolio/reorder
// Body: { orderedIds: string[] }
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { orderedIds } = await req.json()
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return NextResponse.json({ error: 'orderedIds must be a non-empty array' }, { status: 400 })
  }

  // Fetch provider profile to verify ownership
  const providerProfile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!providerProfile) {
    return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 })
  }

  // Verify all photos belong to this provider
  const photos = await prisma.portfolioPhoto.findMany({
    where: { id: { in: orderedIds }, providerId: providerProfile.id },
    select: { id: true },
  })
  if (photos.length !== orderedIds.length) {
    return NextResponse.json({ error: 'One or more photos not found or do not belong to you' }, { status: 403 })
  }

  // Update order for each photo in parallel
  await Promise.all(
    orderedIds.map((id: string, index: number) =>
      prisma.portfolioPhoto.update({
        where: { id },
        data: { order: index },
      })
    )
  )

  return NextResponse.json({ success: true })
}
