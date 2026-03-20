import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { getCommissionRate, calculatePlatformFee } from '@/lib/utils'
import { filterContactInfo } from '@/lib/content-filter'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { serviceId, date, time, locationType, address, guestCount, notes, giftVoucherCode } = body

    // Input validation
    if (!serviceId || !date || !time || !locationType) {
      return NextResponse.json({ error: 'serviceId, date, time, and locationType are required' }, { status: 400 })
    }
    if (!['AT_HOME', 'STUDIO'].includes(locationType)) {
      return NextResponse.json({ error: 'locationType must be AT_HOME or STUDIO' }, { status: 400 })
    }
    if (!/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json({ error: 'time must be in HH:MM format' }, { status: 400 })
    }
    const bookingDate = new Date(date)
    if (isNaN(bookingDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (bookingDate < today) {
      return NextResponse.json({ error: 'Booking date cannot be in the past' }, { status: 400 })
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { provider: { include: { user: true } } },
    })
    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })

    // --- Availability & double-booking check ---
    const DAY_TO_SENTINEL: Record<number, string> = {
      1: '2000-01-03', 2: '2000-01-04', 3: '2000-01-05',
      4: '2000-01-06', 5: '2000-01-07', 6: '2000-01-08', 0: '2000-01-09',
    }
    const parseDateNoonUTC = (ds: string) => {
      const [y, m, d] = ds.split('-').map(Number)
      return new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
    }
    const bookingDateNoon = parseDateNoonUTC(date)

    // Look up date-specific override first
    let providerAvailability = await prisma.availability.findUnique({
      where: {
        providerId_date: {
          providerId: service.provider.id,
          date: bookingDateNoon,
        },
      },
    })
    const isOverride = providerAvailability && providerAvailability.date.getFullYear() !== 2000

    // Fall back to weekly default
    if (!isOverride) {
      const dow = bookingDateNoon.getUTCDay()
      const sentinel = DAY_TO_SENTINEL[dow]
      if (sentinel) {
        providerAvailability = await prisma.availability.findUnique({
          where: {
            providerId_date: {
              providerId: service.provider.id,
              date: parseDateNoonUTC(sentinel),
            },
          },
        })
      } else {
        providerAvailability = null
      }
    }

    if (!providerAvailability || providerAvailability.isBlocked) {
      return NextResponse.json({ error: 'Provider is not available on this date' }, { status: 400 })
    }

    // Check if the requested time slot exists in the provider's availability
    if (!providerAvailability.timeSlots.includes(time)) {
      return NextResponse.json({ error: 'Requested time slot is not available' }, { status: 400 })
    }

    // Check for conflicting bookings (same provider, same date, overlapping time)
    const dayStart = new Date(Date.UTC(bookingDateNoon.getUTCFullYear(), bookingDateNoon.getUTCMonth(), bookingDateNoon.getUTCDate(), 0, 0, 0))
    const dayEnd = new Date(Date.UTC(bookingDateNoon.getUTCFullYear(), bookingDateNoon.getUTCMonth(), bookingDateNoon.getUTCDate(), 23, 59, 59, 999))

    const existingBookings = await prisma.booking.findMany({
      where: {
        providerId: service.provider.userId,
        date: { gte: dayStart, lte: dayEnd },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      include: { service: { select: { duration: true } } },
    })

    // Build set of occupied 30-min slots from existing bookings
    const occupiedSlots = new Set<string>()
    for (const existing of existingBookings) {
      const [eh, em] = existing.time.split(':').map(Number)
      const dur = existing.service.duration
      const slotsNeeded = Math.ceil(dur / 30)
      for (let i = 0; i < slotsNeeded; i++) {
        const mins = eh * 60 + em + i * 30
        occupiedSlots.add(`${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`)
      }
    }

    // Check all 30-min slots the new booking would occupy
    const [rh, rm] = time.split(':').map(Number)
    const newSlotsNeeded = Math.ceil(service.duration / 30)
    for (let i = 0; i < newSlotsNeeded; i++) {
      const mins = rh * 60 + rm + i * 30
      const slotKey = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
      if (occupiedSlots.has(slotKey)) {
        return NextResponse.json(
          { error: 'This time slot conflicts with an existing booking' },
          { status: 400 }
        )
      }
    }
    // --- End availability & double-booking check ---

    const customer = await prisma.customerProfile.findUnique({
      where: { userId: session.user.id },
    })

    const isMember = customer?.membership === 'PREMIUM'
    const platformFee = calculatePlatformFee(service.price, isMember)
    const commissionRate = getCommissionRate(service.provider.tier)
    const totalPrice = service.price + platformFee

    let voucherDiscount = 0
    if (giftVoucherCode) {
      // Atomic check-and-set to prevent double-spend race condition
      const result = await prisma.giftVoucher.updateMany({
        where: {
          code: giftVoucherCode,
          isRedeemed: false,
          expiresAt: { gt: new Date() },
        },
        data: {
          isRedeemed: true,
          usedBy: session.user.id,
        },
      })
      if (result.count === 0) {
        return NextResponse.json({ error: 'Voucher is invalid, expired, or already used' }, { status: 400 })
      }
      const voucher = await prisma.giftVoucher.findUnique({ where: { code: giftVoucherCode } })
      voucherDiscount = voucher?.amount ?? 0
    }

    const finalPrice = Math.max(0, totalPrice - voucherDiscount)

    // Filter contact info from booking notes
    let sanitizedNotes = notes?.trim() || null
    let notesFilter: ReturnType<typeof filterContactInfo> | null = null
    if (sanitizedNotes) {
      notesFilter = filterContactInfo(sanitizedNotes)
      if (notesFilter.flagged) {
        sanitizedNotes = notesFilter.text
      }
    }

    const booking = await prisma.booking.create({
      data: {
        customerId: session.user.id,
        providerId: service.provider.userId,
        serviceId,
        date: new Date(date),
        time,
        locationType,
        address,
        guestCount,
        notes: sanitizedNotes,
        giftVoucherCode,
        totalPrice: finalPrice,
        platformFee,
        commissionRate,
        acceptDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'PENDING',
        paymentStatus: finalPrice > 0 ? 'AUTH_PENDING' : 'NONE',
      },
    })

    // Create Stripe PaymentIntent (manual capture — authorize only)
    // Skip payment for $0 bookings (fully covered by voucher)
    let clientSecret: string | null = null
    if (finalPrice > 0) {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(finalPrice * 100), // cents AUD
          currency: 'aud',
          capture_method: 'manual',
          metadata: {
            bookingId: booking.id,
            customerId: session.user.id,
            providerId: service.provider.userId,
            serviceTitle: service.title,
          },
        })

        await prisma.booking.update({
          where: { id: booking.id },
          data: { stripePaymentId: paymentIntent.id, paymentStatus: 'AUTH_PENDING' },
        })

        clientSecret = paymentIntent.client_secret
      } catch (stripeError) {
        // Rollback booking if Stripe fails
        await prisma.booking.delete({ where: { id: booking.id } })
        // Un-redeem voucher if one was used
        if (giftVoucherCode) {
          await prisma.giftVoucher.updateMany({
            where: { code: giftVoucherCode },
            data: { isRedeemed: false, usedBy: null },
          })
        }
        console.error('Stripe PaymentIntent creation failed:', stripeError)
        return NextResponse.json(
          { error: 'Payment setup failed. Please try again.' },
          { status: 500 }
        )
      }
    }

    await prisma.notification.create({
      data: {
        userId: service.provider.userId,
        type: 'NEW_BOOKING',
        title: 'New Booking Request',
        message: `You have a new booking request for ${service.title}`,
        link: `/dashboard/provider/bookings/${booking.id}`,
      },
    })

    // Log contact leakage flag if notes were sanitized
    if (notesFilter?.flagged && sanitizedNotes !== (notes?.trim() || null)) {
      await prisma.contactLeakageFlag.create({
        data: {
          bookingId: booking.id,
          userId: session.user.id,
          flagType: notesFilter.flagType!,
          snippet: notesFilter.matches.join(', '),
        },
      })
    }

    return NextResponse.json({ booking, clientSecret })
  } catch (error) {
    console.error('Booking create error:', error)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role') || 'customer'
  const filterProviderId = searchParams.get('providerId')
  const filterStatus = searchParams.get('status')
  const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined

  try {
    // Build where clause
    const where: Record<string, unknown> = role === 'customer'
      ? { customerId: session.user.id }
      : { providerId: session.user.id }

    if (filterProviderId) where.providerId = filterProviderId
    if (filterStatus) where.status = filterStatus

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        service: true,
        customer: true,
        provider: true,
        review: true,
      },
      orderBy: { createdAt: 'desc' },
      ...(limit ? { take: limit } : {}),
    })

    return NextResponse.json({ bookings, count: bookings.length })
  } catch (error) {
    console.error('Bookings fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }
}
