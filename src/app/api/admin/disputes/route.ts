import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const statusFilter = searchParams.get('status')
  const searchFilter = searchParams.get('search')

  type DisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED_REFUND' | 'RESOLVED_NO_REFUND' | 'CLOSED'

  const disputes = await prisma.dispute.findMany({
    where: {
      ...(statusFilter && statusFilter !== 'ALL' && { status: statusFilter as DisputeStatus }),
      ...(searchFilter && {
        OR: [
          { booking: { customer: { name: { contains: searchFilter, mode: 'insensitive' } } } },
          { booking: { provider: { name: { contains: searchFilter, mode: 'insensitive' } } } },
          { reason: { contains: searchFilter, mode: 'insensitive' } },
        ],
      }),
    },
    include: {
      booking: {
        include: {
          customer: { select: { id: true, name: true, email: true, image: true } },
          provider: { select: { id: true, name: true, email: true, image: true } },
          service: { select: { title: true, price: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ disputes })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { disputeId, status, resolution, refundAmount, refundReason } = await req.json()

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        booking: {
          select: {
            customerId: true,
            providerId: true,
            stripePaymentId: true,
            totalPrice: true,
            status: true,
            refundStatus: true,
            refundAmount: true,
          },
        },
      },
    })

    if (!dispute) return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })

    // NEW-11: Refund amount bounds check
    if (refundAmount !== undefined) {
      const maxRefund = dispute.booking?.totalPrice ?? 0
      if (refundAmount <= 0 || refundAmount > maxRefund) {
        return NextResponse.json(
          { error: `Refund amount must be between $0.01 and $${maxRefund.toFixed(2)}` },
          { status: 400 }
        )
      }
    }

    // P0-6/UX-10: Guard against double-refund.
    // If this booking was previously (partially) refunded, the admin can only refund
    // up to the remaining balance (totalPrice - alreadyRefunded).
    if (status === 'RESOLVED_REFUND' && refundAmount !== undefined) {
      const booking = dispute.booking
      const alreadyRefunded = booking?.refundStatus === 'PROCESSED' ? (booking.refundAmount ?? 0) : 0
      const maxAdditionalRefund = (booking?.totalPrice ?? 0) - alreadyRefunded

      if (refundAmount > maxAdditionalRefund) {
        return NextResponse.json(
          {
            error: `Refund exceeds remaining refundable amount. Booking total: $${booking?.totalPrice?.toFixed(2)}. Already refunded: $${alreadyRefunded.toFixed(2)}. Maximum additional refund: $${maxAdditionalRefund.toFixed(2)}.`,
          },
          { status: 400 }
        )
      }
    }

    // Track reversal status (used in final response)
    let reversalStatus: 'success' | 'failed' | 'skipped' = 'skipped'
    let reversalError: string | null = null

    // P0-5: Wrap the entire refund operation in a transaction and re-read the booking's
    // refundStatus inside it. This prevents a double-refund race condition where two
    // concurrent admin requests both pass the outer refundStatus check and issue duplicate
    // Stripe refunds. The re-read within the transaction serialises concurrent writes at
    // the DB level, and the throw aborts the transaction atomically.
    // eslint-disable-next-line prefer-const
    let updatedDispute: Awaited<ReturnType<typeof prisma.dispute.update>> | undefined = undefined

    if (status === 'RESOLVED_REFUND') {
      await prisma.$transaction(async (tx) => {
        // Re-read booking inside the transaction to detect any concurrent refund
        const bookingInTx = await tx.booking.findUnique({
          where: { id: dispute.bookingId },
          select: { refundStatus: true },
        })
        if (bookingInTx?.refundStatus === 'PROCESSED') {
          throw new Error('DOUBLE_REFUND: A refund has already been processed for this booking.')
        }

        // Atomically mark booking as refunded inside the transaction so no second request
        // can pass the re-read guard above after this completes.
        await tx.booking.update({
          where: { id: dispute.bookingId },
          data: {
            status: 'REFUNDED',
            paymentStatus: 'REFUNDED',
            refundStatus: 'PROCESSED',
            refundAmount: refundAmount ?? dispute.booking.totalPrice,
            refundedAt: new Date(),
            ...(refundReason ? { refundReason: String(refundReason) } : {}),
          },
        })

        updatedDispute = await tx.dispute.update({
          where: { id: disputeId },
          data: {
            status,
            resolution: resolution || null,
            resolvedBy: session.user.id,
            resolvedAt: new Date(),
          },
        })
      })

      // After the transaction committed, process Stripe operations (outside tx — Stripe calls
      // cannot be rolled back and must not hold a DB transaction open).

      // Check if payout was already sent — attempt transfer reversal if so
      const existingPayout = await prisma.payout.findFirst({
        where: { bookingId: dispute.bookingId },
      })

      if (existingPayout && existingPayout.status === 'COMPLETED' && existingPayout.stripeTransferId &&
          !existingPayout.stripeTransferId.startsWith('no_payment') &&
          !existingPayout.stripeTransferId.startsWith('penalty')) {
        try {
          const reversal = await stripe.transfers.createReversal(existingPayout.stripeTransferId, {
            amount: Math.round((refundAmount ?? dispute.booking.totalPrice) * 100),
            metadata: { disputeId: dispute.id, bookingId: dispute.bookingId },
          })
          // Mark payout as reversed
          await prisma.payout.update({
            where: { id: existingPayout.id },
            data: { status: 'CANCELLED', stripeTransferId: `reversed:${reversal.id}` },
          })
          reversalStatus = 'success'
        } catch (reversalErr) {
          // Log but continue — admin will need to manually reconcile
          reversalStatus = 'failed'
          reversalError = String(reversalErr)
          console.error('[DISPUTE_REVERSAL_FAILED]', reversalErr)
          await prisma.auditLog.create({
            data: {
              actorId: session.user.id,
              action: 'DISPUTE_REVERSAL_FAILED',
              targetType: 'Dispute',
              targetId: dispute.id,
              details: { error: String(reversalErr), disputeId: dispute.id },
            },
          }).catch(() => {})
          // Still process the customer refund from platform funds
        }
      }

      // P1-8: Cancel any scheduled/processing payout. Log audit entry for traceability.
      if (existingPayout && ['SCHEDULED', 'PROCESSING'].includes(existingPayout.status)) {
        await prisma.payout.update({
          where: { id: existingPayout.id },
          data: { status: 'CANCELLED' },
        })
        await prisma.auditLog.create({
          data: {
            actorId: session.user.id,
            action: 'PAYOUT_CANCELLED_FOR_DISPUTE_REFUND',
            targetType: 'Payout',
            targetId: existingPayout.id,
            details: { disputeId: dispute.id, bookingId: dispute.bookingId, priorStatus: existingPayout.status },
          },
        }).catch(() => {})
      }

      // Refund the customer
      if (dispute.booking.stripePaymentId) {
        try {
          const pi = await stripe.paymentIntents.retrieve(dispute.booking.stripePaymentId)
          if (pi.status === 'succeeded') {
            await stripe.refunds.create(
              {
                payment_intent: dispute.booking.stripePaymentId,
                amount: Math.round((refundAmount ?? dispute.booking.totalPrice) * 100),
                reason: 'fraudulent',
                metadata: { disputeId: dispute.id, bookingId: dispute.bookingId },
              },
              {
                idempotencyKey: `dispute_${dispute.id}_refund`,
              }
            )
          }
        } catch (e) {
          console.error('Dispute refund failed:', e)
          // Revert both the dispute status and booking status since Stripe failed.
          // The booking was already updated to REFUNDED inside the transaction above,
          // so we must undo that here to keep DB state consistent with Stripe state.
          await prisma.$transaction([
            prisma.dispute.update({
              where: { id: disputeId },
              data: { status: dispute.status, resolvedBy: null, resolvedAt: null, resolution: null },
            }),
            prisma.booking.update({
              where: { id: dispute.bookingId },
              data: { status: 'DISPUTED', paymentStatus: 'CAPTURED', refundStatus: 'NONE', refundAmount: null, refundedAt: null },
            }),
          ])
          return NextResponse.json(
            { error: 'Stripe refund failed — dispute not resolved. Please retry or process the refund manually in the Stripe Dashboard.' },
            { status: 502 }
          )
        }
      }
      // Note: booking status was already set to REFUNDED inside the prisma.$transaction above.
    } else if (status === 'RESOLVED_NO_REFUND' || status === 'CLOSED') {
      updatedDispute = await prisma.dispute.update({
        where: { id: disputeId },
        data: {
          status,
          resolution: resolution || null,
          resolvedBy: session.user.id,
          resolvedAt: new Date(),
        },
      })

      // P1-8: Fetch payout with explicit status to handle each case correctly.
      // Include all statuses so we can warn about already-completed payouts.
      const existingPayout = await prisma.payout.findFirst({
        where: { bookingId: dispute.bookingId },
      })

      if (existingPayout) {
        if (existingPayout.status === 'CANCELLED') {
          // Dispute ruled in provider's favour — re-schedule the payout
          await prisma.payout.update({
            where: { id: existingPayout.id },
            data: { status: 'SCHEDULED', scheduledAt: new Date() },
          })
          await prisma.auditLog.create({
            data: {
              actorId: session.user.id,
              action: 'PAYOUT_RESCHEDULED_AFTER_DISPUTE',
              targetType: 'Payout',
              targetId: existingPayout.id,
              details: { disputeId: dispute.id, bookingId: dispute.bookingId, status },
            },
          }).catch(() => {})
        } else if (existingPayout.status === 'PROCESSING' || existingPayout.status === 'COMPLETED') {
          // P1-8: Payout is already in-flight or sent — too late to cancel. Log a warning.
          console.warn(
            `[DISPUTE_RESOLVE] Payout ${existingPayout.id} is ${existingPayout.status} ` +
            `for dispute ${dispute.id} — cannot modify at this stage. Manual reconciliation may be required.`
          )
          await prisma.auditLog.create({
            data: {
              actorId: session.user.id,
              action: 'DISPUTE_PAYOUT_UNMODIFIED_WARNING',
              targetType: 'Payout',
              targetId: existingPayout.id,
              details: {
                disputeId: dispute.id,
                bookingId: dispute.bookingId,
                payoutStatus: existingPayout.status,
                warning: 'Payout already in-flight or completed — manual review required.',
              },
            },
          }).catch(() => {})
        }
      }

      // Reset booking to COMPLETED
      await prisma.booking.update({
        where: { id: dispute.bookingId },
        data: { status: 'COMPLETED' },
      })
    }

    // Log status change
    await prisma.bookingStatusHistory.create({
      data: {
        bookingId: dispute.bookingId,
        fromStatus: 'DISPUTED',
        toStatus: status === 'RESOLVED_REFUND' ? 'REFUNDED' : 'COMPLETED',
        changedBy: session.user.id,
        reason: `Dispute resolved: ${status}`,
      },
    }).catch(() => {})

    // Notify customer of dispute outcome
    await prisma.notification.create({
      data: {
        userId: dispute.booking.customerId,
        type: 'DISPUTE_RESOLVED',
        title: status === 'RESOLVED_REFUND' ? 'Dispute Resolved — Refund Issued' : 'Dispute Resolved',
        message: status === 'RESOLVED_REFUND'
          ? 'Your dispute has been resolved and a full refund has been issued to your original payment method.'
          : 'Your dispute has been reviewed and resolved. No refund will be issued.',
        link: '/dashboard/customer',
      },
    }).catch(() => {})

    // Notify provider of dispute outcome
    await prisma.notification.create({
      data: {
        userId: dispute.booking.providerId,
        type: 'DISPUTE_RESOLVED',
        title: status === 'RESOLVED_NO_REFUND' ? 'Dispute Resolved — No Refund' : 'Dispute Resolved',
        message: status === 'RESOLVED_NO_REFUND'
          ? 'A dispute was resolved in your favour. Your payout will proceed normally.'
          : 'A dispute has been resolved. A refund was issued to the customer.',
        link: '/dashboard/provider',
      },
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      dispute: updatedDispute,
      reversalStatus: status === 'RESOLVED_REFUND' ? (reversalStatus ?? 'skipped') : 'skipped',
      reversalError: status === 'RESOLVED_REFUND' ? (reversalError ?? null) : null,
      message: status === 'RESOLVED_REFUND' && reversalStatus === 'failed'
        ? 'Dispute resolved, but transfer reversal failed — manual reconciliation required.'
        : 'Dispute resolved successfully.',
    })
  } catch (error) {
    // P0-5: Surface double-refund guard errors with a clear 409 so the admin UI can
    // display an informative message rather than a generic "Failed" toast.
    if (error instanceof Error && error.message.startsWith('DOUBLE_REFUND:')) {
      console.warn('[DISPUTE_DOUBLE_REFUND_BLOCKED]', error.message)
      return NextResponse.json(
        { error: 'A refund has already been processed for this booking. Duplicate refund blocked.' },
        { status: 409 }
      )
    }
    console.error('Dispute resolution error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
