import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { date: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
    })
    if (!profile) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })

    const [y, m, d] = params.date.split('-').map(Number)
    const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))

    await prisma.availability.delete({
      where: { providerId_date: { providerId: profile.id, date } },
    }).catch(() => {
      // Record may not exist — that's fine
    })

    return NextResponse.json({ success: true, date: params.date })
  } catch (error) {
    console.error('Availability DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete availability' }, { status: 500 })
  }
}
