import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST — no auth required (public)
// Increments providerProfile.profileViews by 1 for the given userId
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.providerProfile.updateMany({
      where: { userId: params.id },
      data: { profileViews: { increment: 1 } },
    })
    return NextResponse.json({ ok: true })
  } catch {
    // Silently fail — view tracking is non-critical
    return NextResponse.json({ ok: true })
  }
}
