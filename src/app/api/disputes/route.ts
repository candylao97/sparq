import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { filterContactInfo } from '@/lib/content-filter'
import { sendDisputeOpenedEmail } from '@/lib/email'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // AUDIT-017: Velocity check on dispute filing. Legitimate users file at most
  // a handful of disputes over the lifetime of an account; a user opening
  // 5+ disputes in 24h is almost certainly abuse (fraud fishing, refund
  // farming, or a compromised account). 5/day is conservative but safe —
  // the per-booking unique constraint already prevents duplicate filings
  // on the same booking.
  const allowed = await rateLimit(`dispute-create:${session.user.id}`, 5, 86400)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many dispute filings in the last 24 hours. Please contact support if you need help.' },
      { status: 429 },
    )
  }

  try {
    const { bookingId, reason, evidence } = await req.json()

    if (!bookingId || !reason?.trim()) {
      return NextResponse.json({ error: 'bookingId and reason are required' }, { status: 400 })
    }
    if (reason.length > 2000) {
      return NextResponse.json({ error: 'Reason must be 2000 characters or less' }, { status: 400 })
    }
    if (evidence && evidence.length > 5000) {
      return NextResponse.json({ error: 'Evidence must be 5000 characters or less' }, { status: 400 })
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { dispute: true },
      // completedAt is needed for fallback dispute deadline calculation (P0-4)
    })

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    if (booking.customerId !== session.user.id) {
      return NextResponse.json({ error: 'Only the customer can open a dispute' }, { status: 403 })
    }
    // P4-4: Also allow disputes on NO_SHOW bookings — provider marked no-show but customer
    // may disagree (e.g., they showed up but provider was unavailable). This prevents the
    // customer from being stuck with a charged booking and no recourse.
    if (!['COMPLETED', 'NO_SHOW'].includes(booking.status)) {
      return NextResponse.json({ error: 'Can only dispute completed or no-show bookings' }, { status: 400 })
    }
    if (booking.dispute) {
      return NextResponse.json({ error: 'A dispute already exists for this booking' }, { status: 400 })
    }

    // T&S-R4: Rate limit — max 3 disputes per customer per 30-day rolling window
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentDisputeCount = await prisma.dispute.count({
      where: {
        customerId: session.user.id,
        createdAt: { gte: thirtyDaysAgo },
      },
    })
    if (recentDisputeCount >= 3) {
      return NextResponse.json(
        { error: 'You have opened too many disputes recently. Please contact support if you need further assistance.' },
        { status: 429 }
      )
    }

    // Per-provider limit: max 2 disputes per provider per 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const disputesAgainstThisProvider = await prisma.dispute.count({
      where: {
        customerId: session.user.id,
        booking: { providerId: booking.providerId },
        createdAt: { gte: ninetyDaysAgo },
      },
    })
    if (disputesAgainstThisProvider >= 2) {
      return NextResponse.json(
        { error: 'You have already opened multiple disputes with this artist. Please contact support for further assistance.' },
        { status: 429 }
      )
    }

    // P0-4: Robust dispute deadline with multi-level null fallback.
    // Priority: explicit disputeDeadline → completedAt+48h → createdAt+50days → now+24h
    // Ensures customers always have a window to dispute regardless of which timestamps are set.
    let deadline = booking.disputeDeadline
    if (!deadline) {
      if (booking.completedAt) {
        deadline = new Date(booking.completedAt.getTime() + 48 * 60 * 60 * 1000)
      } else if (booking.createdAt) {
        // Grace period: 50 days from creation for very old bookings without completedAt
        deadline = new Date(booking.createdAt.getTime() + 50 * 24 * 60 * 60 * 1000)
      } else {
        // Should never happen, but fail open for customer benefit
        deadline = new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    }
    if (new Date() > deadline) {
      return NextResponse.json({ error: 'The dispute window for this booking has closed.' }, { status: 400 })
    }

    // TS07: Filter PII from dispute description and evidence
    const trimmedReason = reason.trim()
    const trimmedEvidence = evidence?.trim() || null

    const descFilter = filterContactInfo(trimmedReason)
    if (descFilter.flagged) {
      return NextResponse.json(
        { error: 'Your dispute description appears to contain contact information. Please remove it and use the in-app messaging system for direct communication.' },
        { status: 422 }
      )
    }
    if (trimmedEvidence) {
      const evidenceFilter = filterContactInfo(trimmedEvidence)
      if (evidenceFilter.flagged) {
        return NextResponse.json(
          { error: 'Your dispute evidence appears to contain contact information. Please remove it.' },
          { status: 422 }
        )
      }
    }

    const dispute = await prisma.dispute.create({
      data: {
        bookingId,
        customerId: session.user.id,
        reason: trimmedReason,
        evidence: trimmedEvidence,
      },
    })

    // Update booking status
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'DISPUTED' },
    })

    // BL-M3: Cancel any pending payout — both SCHEDULED and PROCESSING must be halted
    // A PROCESSING payout is still stoppable before the Stripe transfer is created
    await prisma.payout.updateMany({
      where: { bookingId, status: { in: ['SCHEDULED', 'PROCESSING'] } },
      data: { status: 'CANCELLED' },
    })

    // Log status change
    await prisma.bookingStatusHistory.create({
      data: {
        bookingId,
        fromStatus: 'COMPLETED',
        toStatus: 'DISPUTED',
        changedBy: session.user.id,
        reason: `Dispute opened: ${reason.trim().substring(0, 100)}`,
      },
    })

    // Notify provider
    await prisma.notification.create({
      data: {
        userId: booking.providerId,
        type: 'BOOKING_DISPUTED',
        title: 'Booking Disputed',
        message: 'A customer has opened a dispute for a completed booking.',
        link: '/dashboard/provider',
      },
    })

    // Email the provider about the dispute
    const providerUser = await prisma.user.findUnique({
      where: { id: booking.providerId },
      select: { email: true, name: true },
    })
    if (providerUser?.email) {
      sendDisputeOpenedEmail(
        providerUser.email,
        providerUser.name ?? 'there',
        bookingId,
        trimmedReason
      ).catch(() => {})
    }

    return NextResponse.json({ dispute })
  } catch (error) {
    console.error('Dispute creation error:', error)
    return NextResponse.json({ error: 'Failed to create dispute' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const disputeId = searchParams.get('id')
  if (!disputeId) return NextResponse.json({ error: 'Dispute ID required' }, { status: 400 })

  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { booking: { select: { customerId: true, id: true } } },
  })

  if (!dispute) return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })
  if (dispute.booking?.customerId !== session.user.id) {
    return NextResponse.json({ error: 'You can only withdraw your own disputes.' }, { status: 403 })
  }
  if (dispute.status !== 'OPEN') {
    return NextResponse.json({ error: 'Only open disputes can be withdrawn.' }, { status: 400 })
  }

  // Mark as CLOSED (withdrawn by customer)
  await prisma.dispute.update({
    where: { id: disputeId },
    data: {
      status: 'CLOSED',
      resolution: 'Withdrawn by customer.',
    },
  })

  // P1-4 / P2-7: Restore booking to COMPLETED and re-schedule cancelled payout
  await prisma.booking.update({
    where: { id: dispute.bookingId },
    data: { status: 'COMPLETED' },
  })

  const cancelledPayout = await prisma.payout.findFirst({
    where: { bookingId: dispute.bookingId, status: 'CANCELLED' },
  })

  // TS-3: Don't restore the payout if a refund was already processed —
  // funds went back to the customer so the artist payout must not proceed.
  const freshBooking = await prisma.booking.findUnique({
    where: { id: dispute.bookingId },
    select: { refundStatus: true, refundAmount: true, totalPrice: true, platformFee: true },
  })

  if (cancelledPayout && freshBooking?.refundStatus !== 'PROCESSED') {
    await prisma.payout.update({
      where: { id: cancelledPayout.id },
      data: {
        status: 'SCHEDULED',
        // Adjust payout amount if a partial refund was applied
        amount: freshBooking?.refundAmount
          ? Math.max(0, freshBooking.totalPrice - freshBooking.refundAmount - (freshBooking.platformFee ?? 0))
          : cancelledPayout.amount,
      },
    })
  }

  // TS-1: Log dispute withdrawal to AuditLog
  await prisma.auditLog.create({
    data: {
      action: 'DISPUTE_WITHDRAWN',
      actorId: session.user.id,
      targetId: dispute.id,
      targetType: 'Dispute',
      details: JSON.stringify({
        bookingId: dispute.bookingId,
        disputeReason: dispute.reason,
        withdrawnAt: new Date().toISOString(),
      }),
    },
  }).catch(e => console.error('[DISPUTE_WITHDRAW_AUDIT]', e))

  await prisma.notification.create({
    data: {
      userId: session.user.id,
      type: 'BOOKING_CANCELLED',
      title: 'Dispute withdrawn',
      message: 'Your dispute has been withdrawn. If you still have concerns, contact our support team.',
      link: dispute.booking?.id ? `/bookings/${dispute.booking.id}` : '/dashboard/customer',
    },
  }).catch(() => {})

  return NextResponse.json({ withdrawn: true })
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const bookingId = searchParams.get('bookingId')
  const role = searchParams.get('role')

  // UX05: Support ?role=customer to fetch all active disputes for the current customer
  if (role === 'customer') {
    const disputes = await prisma.dispute.findMany({
      where: {
        customerId: session.user.id,
        status: { notIn: ['RESOLVED_REFUND', 'RESOLVED_NO_REFUND', 'CLOSED'] },
      },
      include: {
        booking: {
          select: {
            id: true,
            service: { select: { title: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ disputes })
  }

  if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (booking.customerId !== session.user.id && booking.providerId !== session.user.id && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const dispute = await prisma.dispute.findUnique({ where: { bookingId } })
  return NextResponse.json({ dispute })
}
