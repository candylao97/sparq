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
    const { name, postcode, state, city, isActive } = body

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (postcode !== undefined) updateData.postcode = postcode
    if (state !== undefined) updateData.state = state
    if (city !== undefined) updateData.city = city
    if (typeof isActive === 'boolean') updateData.isActive = isActive

    const suburb = await prisma.suburb.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(suburb)
  } catch (error) {
    console.error('Admin suburb update error:', error)
    return NextResponse.json({ error: 'Failed to update suburb' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await prisma.suburb.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin suburb delete error:', error)
    return NextResponse.json({ error: 'Failed to delete suburb' }, { status: 500 })
  }
}
