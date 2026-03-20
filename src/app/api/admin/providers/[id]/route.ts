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
    const { isVerified, accountStatus, suspendReason, verificationStatus, backgroundCheckStatus, adminNotes } = body

    const updateData: Record<string, unknown> = {}

    if (typeof isVerified === 'boolean') {
      updateData.isVerified = isVerified
    }
    if (accountStatus) {
      updateData.accountStatus = accountStatus
      if (accountStatus === 'SUSPENDED') {
        updateData.suspendedAt = new Date()
        if (suspendReason) updateData.suspendReason = suspendReason
      } else if (accountStatus === 'ACTIVE') {
        updateData.suspendReason = null
        updateData.suspendedAt = null
      }
    }

    const provider = await prisma.providerProfile.update({
      where: { id: params.id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true } },
        verification: true,
      },
    })

    // Update verification record if verification fields are provided
    if (verificationStatus || backgroundCheckStatus || adminNotes !== undefined) {
      const verificationUpdate: Record<string, unknown> = {}
      if (verificationStatus) verificationUpdate.status = verificationStatus
      if (backgroundCheckStatus) verificationUpdate.backgroundCheckStatus = backgroundCheckStatus
      if (adminNotes !== undefined) verificationUpdate.adminNotes = adminNotes
      if (verificationStatus === 'APPROVED' || verificationStatus === 'REJECTED') {
        verificationUpdate.reviewedAt = new Date()
      }

      await prisma.verification.upsert({
        where: { providerId: params.id },
        update: verificationUpdate,
        create: {
          providerId: params.id,
          status: verificationStatus || 'PENDING',
          backgroundCheckStatus: backgroundCheckStatus || 'PENDING',
          adminNotes: adminNotes || null,
        },
      })
    }

    return NextResponse.json(provider)
  } catch (error) {
    console.error('Admin provider update error:', error)
    return NextResponse.json({ error: 'Failed to update provider' }, { status: 500 })
  }
}
