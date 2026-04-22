import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAdminAction } from '@/lib/auditLog'
import { computeRiskSignals } from '@/lib/riskScoring'
import { sendKycDecisionEmail } from '@/lib/email'

// GET — full KYC detail for one provider
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const provider = await prisma.providerProfile.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, name: true, email: true, image: true, createdAt: true, phone: true } },
      kycRecord: true,
      verification: true,
      services: { select: { id: true, title: true, price: true, isActive: true, category: true } },
      portfolio: { select: { url: true, caption: true }, take: 6 },
      scoreFactors: true,
    },
  })

  if (!provider) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const recentBookings = await prisma.booking.findMany({
    where: { providerUserId: provider.userId },
    select: { id: true, status: true, totalPrice: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  // Recompute risk signals on fetch
  const { signals, level } = await computeRiskSignals(params.id)

  // Update risk in DB if changed
  if (provider.kycRecord && (provider.kycRecord.riskLevel !== level)) {
    await prisma.kYCRecord.update({
      where: { providerProfileId: params.id },
      data: { riskLevel: level, riskSignals: JSON.parse(JSON.stringify(signals)) },
    })
  }

  return NextResponse.json({ provider: { ...provider, recentBookings }, riskSignals: signals, riskLevel: level })
}

// PATCH — update KYC status / risk / notes
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { action, reason, adminNotes } = body

  const provider = await prisma.providerProfile.findUnique({
    where: { id: params.id },
    include: { kycRecord: true },
  })
  if (!provider) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const kycData: Record<string, unknown> = {
    reviewedBy: (session.user as { id: string }).id,
    reviewedAt: new Date(),
  }

  if (adminNotes !== undefined) kycData.adminNotes = adminNotes

  switch (action) {
    case 'approve':
      kycData.status = 'VERIFIED'
      kycData.rejectedReason = null
      // Also mark provider as verified
      await prisma.providerProfile.update({
        where: { id: params.id },
        data: { isVerified: true, accountStatus: 'ACTIVE' },
      })
      break

    case 'reject':
      kycData.status = 'REJECTED'
      kycData.rejectedReason = reason
      await prisma.providerProfile.update({
        where: { id: params.id },
        data: { isVerified: false, accountStatus: 'UNDER_REVIEW' },
      })
      break

    case 'request_info':
      kycData.status = 'REQUIRES_ACTION'
      kycData.adminNotes = adminNotes || reason
      break

    case 'flag':
      kycData.status = 'UNDER_REVIEW'
      kycData.riskLevel = 'HIGH'
      await prisma.providerProfile.update({
        where: { id: params.id },
        data: { accountStatus: 'UNDER_REVIEW' },
      })
      break

    case 'recalculate_risk': {
      const { signals, level } = await computeRiskSignals(params.id)
      kycData.riskLevel = level
      kycData.riskSignals = JSON.parse(JSON.stringify(signals))
      break
    }

    case 'save_notes':
      // adminNotes already set above; no status change
      break

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  // Upsert KYC record
  const updated = await prisma.kYCRecord.upsert({
    where: { providerProfileId: params.id },
    create: { providerProfileId: params.id, ...kycData },
    update: kycData,
  })

  // Notify provider on approve / reject
  const newStatus = kycData.status as string | undefined
  if (newStatus === 'VERIFIED' || newStatus === 'REJECTED') {
    const providerUser = await prisma.providerProfile.findUnique({
      where: { id: params.id },
      select: { userId: true, user: { select: { email: true, name: true } } },
    })
    if (providerUser) {
      await prisma.notification.create({
        data: {
          userId: providerUser.userId,
          type: 'GENERAL',
          title: newStatus === 'VERIFIED' ? '✓ Identity verified' : 'Verification update',
          message: newStatus === 'VERIFIED'
            ? 'Your identity has been verified. You can now receive payments and bookings!'
            : 'There was an issue with your verification. Please check your dashboard for next steps.',
          link: '/dashboard/provider',
        },
      }).catch(() => {})

      if (providerUser.user?.email) {
        sendKycDecisionEmail(
          providerUser.user.email,
          providerUser.user.name ?? 'there',
          newStatus as 'VERIFIED' | 'REJECTED',
          newStatus === 'REJECTED' ? (reason as string | undefined) : undefined
        ).catch(() => {})
      }
    }
  }

  await logAdminAction({
    actorId: (session.user as { id: string }).id,
    action: `KYC_${action.toUpperCase()}`,
    targetType: 'KYCRecord',
    targetId: params.id,
    reason,
  })

  return NextResponse.json({ kyc: updated })
}
