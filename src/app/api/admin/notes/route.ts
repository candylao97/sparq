import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const notes = await prisma.adminNote.findMany({
      include: {
        admin: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ notes })
  } catch (error) {
    console.error('Admin notes list error:', error)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { subject, body: noteBody, category, pinned } = body

    if (!subject || !noteBody) {
      return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 })
    }

    const note = await prisma.adminNote.create({
      data: {
        adminId: (session.user as { id: string }).id,
        subject,
        body: noteBody,
        category: category || 'general',
        pinned: pinned === true,
      },
      include: {
        admin: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    console.error('Admin note create error:', error)
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
  }
}
