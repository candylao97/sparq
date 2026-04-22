import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { BookingStatus, PaymentStatus } from '@prisma/client'
import { logAdminAction } from '@/lib/auditLog'

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
      if (isVerified === true) {
        // Require actual KYC completion unless explicitly overridden by superadmin
        if (!body.overrideKYC) {
          const kycRecord = await prisma.kYCRecord.findUnique({
            where: { providerId: params.id },
          })
          const verification = await prisma.verification.findUnique({
            where: { providerId: params.id },
          })
          const kycVerified = kycRecord?.status === 'VERIFIED'
          const verificationApproved = verification?.status === 'APPROVED'
          if (!kycVerified && !verificationApproved) {
            return NextResponse.json(
              { error: 'Cannot verify provider: no completed KYC record or approved verification found. Complete Stripe Identity verification first, or pass overrideKYC: true to manually override.' },
              { status: 400 }
            )
          }
        }
        updateData.isVerified = true
      } else {
        updateData.isVerified = false
      }
    }
    if (typeof body.isFeatured === 'boolean') {
      updateData.isFeatured = body.isFeatured
      updateData.featuredUntil = body.featuredUntil ? new Date(body.featuredUntil) : null
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

    // Auto-cancel active bookings when an artist is suspended or banned
    if (accountStatus === 'SUSPENDED' || accountStatus === 'BANNED') {
      const activeBookings = await prisma.booking.findMany({
        where: {
          providerId: provider.userId,
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
        include: {
          service: { select: { title: true } },
          customer: { select: { id: true, name: true, phone: true } },
        },
      })

      for (const booking of activeBookings) {
        // Determine correct payment status based on PI state
        let newPaymentStatus: string = 'REFUNDED'
        const newBookingStatus = 'CANCELLED_BY_PROVIDER'

        if (booking.stripePaymentId) {
          try {
            const pi = await stripe.paymentIntents.retrieve(booking.stripePaymentId)
            if (pi.status === 'requires_capture') {
              // Auth not yet captured — cancel (not refund)
              await stripe.paymentIntents.cancel(booking.stripePaymentId)
              newPaymentStatus = 'AUTH_RELEASED'
            } else if (pi.status === 'succeeded') {
              await stripe.refunds.create({ payment_intent: booking.stripePaymentId })
              newPaymentStatus = 'REFUNDED'
            } else if (['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(pi.status)) {
              // Payment not started or incomplete — cancel PI
              await stripe.paymentIntents.cancel(booking.stripePaymentId)
              newPaymentStatus = 'AUTH_RELEASED'
            }
          } catch (stripeErr) {
            console.error(`Stripe action failed for booking ${booking.id}:`, stripeErr)
          }
        } else {
          // No payment (voucher-covered or free)
          newPaymentStatus = 'NONE'
        }

        // Cancel payout if scheduled or processing
        await prisma.payout.updateMany({
          where: { bookingId: booking.id, status: { in: ['SCHEDULED', 'PROCESSING'] } },
          data: { status: 'CANCELLED' },
        })

        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: newBookingStatus as BookingStatus,
            paymentStatus: newPaymentStatus as PaymentStatus,
            refundStatus: newPaymentStatus === 'REFUNDED' ? 'PROCESSED' : 'NONE',
            refundAmount: newPaymentStatus === 'REFUNDED' ? booking.totalPrice : null,
            refundedAt: newPaymentStatus === 'REFUNDED' ? new Date() : null,
            refundReason: 'Provider unavailable — full refund issued',
          },
        })
        // Notify the customer
        await prisma.notification.create({
          data: {
            userId: booking.customerId,
            type: 'BOOKING_CANCELLED',
            title: 'Your booking has been cancelled',
            message: 'Unfortunately your artist is no longer available on Sparq. A full refund has been issued.',
            link: `/bookings/${booking.id}`,
          },
        }).catch(() => {})
      }

    }

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

    await logAdminAction({
      actorId: session.user.id,
      action: `UPDATE_PROVIDER`,
      targetType: 'ProviderProfile',
      targetId: params.id,
      reason: body.suspendReason || body.adminNotes || JSON.stringify(Object.keys(body)),
    }).catch(() => {})

    return NextResponse.json(provider)
  } catch (error) {
    console.error('Admin provider update error:', error)
    return NextResponse.json({ error: 'Failed to update provider' }, { status: 500 })
  }
}
