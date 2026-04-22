import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; addonId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Verify the service belongs to this provider
    const service = await prisma.service.findFirst({
      where: { id: params.id, provider: { userId: session.user.id } },
      select: { id: true },
    })
    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })

    await prisma.serviceAddon.delete({ where: { id: params.addonId } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Addon delete error:', error)
    return NextResponse.json({ error: 'Failed to delete add-on' }, { status: 500 })
  }
}
