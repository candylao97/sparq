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
    const { subject, body: noteBody, category, pinned } = body

    const updateData: Record<string, unknown> = {}
    if (subject !== undefined) updateData.subject = subject
    if (noteBody !== undefined) updateData.body = noteBody
    if (category !== undefined) updateData.category = category
    if (typeof pinned === 'boolean') updateData.pinned = pinned

    const note = await prisma.adminNote.update({
      where: { id: params.id },
      data: updateData,
      include: {
        admin: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(note)
  } catch (error) {
    console.error('Admin note update error:', error)
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
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
    await prisma.adminNote.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin note delete error:', error)
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
  }
}
