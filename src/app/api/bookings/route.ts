import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { getCommissionRateAsync, calculatePlatformFeeAsync, getBookingNoticeHours, getMaxBookingDays, getTipCap } from '@/lib/utils.server'
import { isValidBookingAddress } from '@/lib/address-validation'
import { getSettingFloat } from '@/lib/settings'
import { filterContactInfo, filterContactInfoLax } from '@/lib/content-filter'
import { sendBookingRequestEmail, sendBookingConfirmationToCustomer } from '@/lib/email'
import { sendBookingRequestSms, sendNewBookingRequestSms } from '@/lib/sms'
import { rateLimit } from '@/lib/rate-limit'
import { getSentinelDateString } from '@/lib/availability-sentinel'

/** Haversine distance in km between two lat/lng points. */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // AUDIT-017: Velocity check on booking creation. Tier 1 by IP (catches
  // bursts from a compromised network / scraper), tier 2 by user. Limits
  // are deliberately generous — a legitimate customer books occasionally,
  // while an abuser tries dozens in minutes.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ipAllowed = await rateLimit(`booking-create-ip:${ip}`, 30, 3600)
  if (!ipAllowed) {
    return NextResponse.json(
      { error: 'Too many booking requests from your network. Please try again later.' },
      { status: 429 },
    )
  }
  const userAllowed = await rateLimit(`booking-create-user:${session.user.id}`, 10, 3600)
  if (!userAllowed) {
    return NextResponse.json(
      { error: 'Too many booking requests. Please wait a bit before trying again.' },
      { status: 429 },
    )
  }

  try {
    const body = await req.json()
    const {
      serviceId, date, time, locationType, address,
      guestCount, notes, giftVoucherCode, tip,
      // BL-2: optional customer coordinates for service-radius validation
      customerLat, customerLng,
      // M02: optional add-on IDs
      addonIds,
      // NEW-18: optional promo code
      promoCode,
      // P0-8: clientTotalPrice is accepted ONLY for tamper-detection logging. It is NEVER
      // used to compute what the customer pays — all pricing is recalculated server-side
      // from DB values. Never trust any price field supplied by the client.
      totalPrice: clientTotalPrice,
    } = body

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

    // BL-R7: Minimum booking notice — must be at least N hours in the future (from platform settings)
    // P1-3: The notice check is done again below (after service fetch) using the provider's
    // timezone. This early check uses local-system interpretation as a fast-path guard only.
    const noticeHours = await getBookingNoticeHours()
    const minimumNoticeMs = noticeHours * 60 * 60 * 1000

    // UX10: Max booking window — cannot book more than N days in advance (from platform settings)
    const maxDays = await getMaxBookingDays()
    const maxBookingDate = new Date()
    maxBookingDate.setDate(maxBookingDate.getDate() + maxDays)
    if (bookingDate > maxBookingDate) {
      return NextResponse.json(
        { error: `Bookings can only be made up to ${maxDays} days in advance.` },
        { status: 400 }
      )
    }

    // BL-2: AT_HOME bookings must have a valid AU street address.
    // Batch B Item 5: shared regex via `isValidBookingAddress` so client
    // + server enforce identical structural rules.
    if (locationType === 'AT_HOME') {
      const trimmedAddress = (address ?? '').trim()
      if (!isValidBookingAddress(trimmedAddress)) {
        return NextResponse.json(
          { error: 'Please provide your full street address (e.g., 42 George St, Bondi NSW 2026)' },
          { status: 400 }
        )
      }
      // P2-5: Use lax filter for address field — skips ADDRESS_REGEX/POSTCODE_REGEX to
      // avoid false positives on legitimate street addresses like "42 George Street, Sydney"
      const addressFilter = filterContactInfoLax(trimmedAddress)
      if (addressFilter.flagged) {
        return NextResponse.json(
          { error: 'The address field may not contain contact information. Please enter only the street address.' },
          { status: 422 }
        )
      }
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { provider: { include: { user: true } } },
    })
    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })

    // M02: Fetch selected add-ons and compute their price/duration contribution
    if (addonIds?.length > 15) {
      return NextResponse.json({ error: 'Too many add-ons selected' }, { status: 400 })
    }
    let selectedAddons: { id: string; name: string; price: number; duration: number }[] = []
    if (Array.isArray(addonIds) && addonIds.length > 0) {
      selectedAddons = await prisma.serviceAddon.findMany({
        where: { id: { in: addonIds }, serviceId, isActive: true },
        select: { id: true, name: true, price: true, duration: true },
      })
    }
    const addonPrice = selectedAddons.reduce((sum, a) => sum + a.price, 0)
    const effectiveServicePrice = service.price + addonPrice

    if (!service.isActive || service.isDeleted) {
      return NextResponse.json({ error: 'This service is no longer available for booking.' }, { status: 400 })
    }

    // P1-3: Validate booking notice using the provider's local timezone.
    // The early guard above has been replaced; this is the authoritative check.
    // We parse date+time as local time in the provider's timezone, convert to UTC,
    // then compare against now to ensure the required notice window is respected correctly.
    {
      const tz = service.provider.timezone ?? 'Australia/Sydney'
      const [apptH, apptM] = time.split(':').map(Number)
      const [apptYear, apptMonth, apptDay] = (date as string).split('-').map(Number)
      // Build midnight UTC for the appointment date as a reference point
      const apptMidnightUTC = new Date(Date.UTC(apptYear, apptMonth - 1, apptDay, 0, 0, 0))
      // Use Intl.DateTimeFormat to find what UTC midnight looks like in the provider's TZ,
      // which reveals the UTC offset at that instant (DST-aware)
      const tzFormatter = new Intl.DateTimeFormat('en-AU', {
        timeZone: tz,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      })
      const tzParts = tzFormatter.formatToParts(apptMidnightUTC)
      const tzH = parseInt(tzParts.find(p => p.type === 'hour')?.value ?? '0')
      const tzMin = parseInt(tzParts.find(p => p.type === 'minute')?.value ?? '0')
      // Derive UTC offset: what the local clock reads at midnight UTC (i.e. UTC+X → tzH=X)
      let offsetMinutes = tzH * 60 + tzMin
      // Handle negative offsets (e.g. ACST−9:30 reads as 14:30 in 24h → subtract 24h)
      if (offsetMinutes > 12 * 60) offsetMinutes -= 24 * 60
      // Appointment UTC = midnight UTC + local appointment time − offset
      const appointmentUTC = new Date(
        apptMidnightUTC.getTime() + (apptH * 60 + apptM - offsetMinutes) * 60_000
      )
      if (appointmentUTC.getTime() - Date.now() < minimumNoticeMs) {
        return NextResponse.json(
          { error: `Bookings must be made at least ${noticeHours} hours in advance. Please choose a later time.` },
          { status: 400 }
        )
      }
    }

    if (guestCount !== undefined && guestCount !== null) {
      const gc = parseInt(String(guestCount))
      if (isNaN(gc) || gc < 1) {
        return NextResponse.json({ error: 'Guest count must be at least 1' }, { status: 400 })
      }
      if (gc > (service.maxGuests ?? 1)) {
        return NextResponse.json(
          { error: `This service accommodates a maximum of ${service.maxGuests ?? 1} guest${(service.maxGuests ?? 1) !== 1 ? 's' : ''}.` },
          { status: 400 }
        )
      }
    }

    // T&S-1: KYC gate — both Stripe-verified AND account must be ACTIVE
    if (!service.provider.isVerified) {
      return NextResponse.json(
        { error: 'This artist is not yet verified and cannot accept bookings. Please choose a verified artist.' },
        { status: 400 }
      )
    }
    if (service.provider.accountStatus !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'This artist is not currently accepting bookings.' },
        { status: 400 }
      )
    }

    // MON-2: Enforce minimum service price of $10 AUD for paid services (including add-ons)
    if (effectiveServicePrice > 0 && effectiveServicePrice < 10) {
      return NextResponse.json(
        { error: 'Service price must be at least $10 AUD.' },
        { status: 400 }
      )
    }

    // BL-2: Service-radius check for AT_HOME bookings.
    // If the customer passed their coordinates AND the provider has coordinates + a
    // service radius set, reject the booking if the customer is too far away.
    if (
      locationType === 'AT_HOME' &&
      typeof customerLat === 'number' &&
      typeof customerLng === 'number' &&
      service.provider.latitude !== null &&
      service.provider.longitude !== null
    ) {
      const radiusKm = service.provider.serviceRadius ?? 10
      const distanceKm = haversineKm(
        service.provider.latitude,
        service.provider.longitude,
        customerLat,
        customerLng,
      )
      if (distanceKm > radiusKm) {
        return NextResponse.json(
          {
            error: `This artist only travels within ${radiusKm} km of their base location. Your address is approximately ${Math.round(distanceKm)} km away.`,
          },
          { status: 400 }
        )
      }
    }

    // P0-5: If the provider has a serviceRadius set and no customer coordinates were provided,
    // reject the booking — radius check must not be opt-in (bypassable by the client).
    if (locationType === 'AT_HOME' && (typeof customerLat !== 'number' || typeof customerLng !== 'number')) {
      if (service.provider.latitude && service.provider.longitude && service.provider.serviceRadius) {
        return NextResponse.json(
          {
            error: 'Location required',
            message: 'This artist requires your location to confirm they cover your area. Please allow location access and try again.',
          },
          { status: 400 }
        )
      }
    }

    // --- Availability & double-booking check ---
    const parseDateNoonUTC = (ds: string) => {
      const [y, m, d] = ds.split('-').map(Number)
      return new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
    }
    const bookingDateNoon = parseDateNoonUTC(date)

    // Look up date-specific override first
    let providerAvailability = await prisma.availability.findUnique({
      where: {
        providerProfileId_date: {
          providerProfileId: service.provider.id,
          date: bookingDateNoon,
        },
      },
    })
    const isOverride = providerAvailability && providerAvailability.date.getFullYear() !== 2000

    // Fall back to weekly default
    if (!isOverride) {
      const dow = bookingDateNoon.getUTCDay()
      const sentinelStr = getSentinelDateString(dow)
      providerAvailability = await prisma.availability.findUnique({
        where: {
          providerProfileId_date: {
            providerProfileId: service.provider.id,
            date: parseDateNoonUTC(sentinelStr),
          },
        },
      })
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
        providerUserId: service.provider.userId,
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

    // Premium-tier system removed — all customers pay the same booking fee
    // and all artists are charged the same flat commission rate.
    const isMember = false
    const commissionRate = await getCommissionRateAsync()
    // MON-1: Commission rate sanity check — catch misconfiguration before it silently costs revenue.
    // BL-4: Allow rate of 0 for free services (effectiveServicePrice === 0)
    if (effectiveServicePrice > 0 && (commissionRate < 0 || commissionRate > 0.50)) {
      console.error(`Invalid commission rate ${commissionRate}`)
      return NextResponse.json({ error: 'Invalid platform commission rate.' }, { status: 500 })
    }
    const tipAmount = typeof tip === 'number' && tip > 0 ? Math.round(tip * 100) / 100 : 0

    // BL-M2: Tip cap — max of tipCapMultiplier× effective service price (incl. add-ons) or tipCapMax, whichever is lower
    if (tipAmount > 0) {
      const tipCap = await getTipCap(effectiveServicePrice)
      if (tipAmount > tipCap) {
        return NextResponse.json(
          { error: `Tip cannot exceed ${tipCap === 200 ? '$200' : `2× the service price ($${tipCap.toFixed(2)})`}. Please adjust your tip amount.` },
          { status: 400 }
        )
      }
    }

    let voucherDiscount = 0
    if (giftVoucherCode) {
      // T&S-4: IP-based rate limit for gift voucher use at booking time — prevents brute-force
      const giftIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
      const giftIpAllowed = await rateLimit(`gift-validate:${giftIp}`, 10, 3600)
      if (!giftIpAllowed) {
        return NextResponse.json({ error: 'Too many voucher attempts' }, { status: 429 })
      }

      // BL-7: Treat expiresAt as end-of-day in Sydney time so a voucher valid
      // "today" isn't rejected because the customer reaches checkout just after
      // midnight UTC.  We compare against the start of today in Sydney (UTC+10/+11)
      // to give the full local calendar day.
      //
      // We add a 90-minute grace buffer to handle:
      //   - Users who load the booking form at 11:55 PM and submit at 12:05 AM
      //   - Checkout sessions that span midnight
      const gracePeriodMs = 90 * 60 * 1000 // 90 minutes
      const effectiveNow = new Date(Date.now() - gracePeriodMs)

      // P1-G/MON-2: Fetch voucher first to check remaining balance (supports partial redemption)
      const voucher = await prisma.giftVoucher.findUnique({ where: { code: giftVoucherCode } })
      if (!voucher) {
        return NextResponse.json({ error: 'Invalid or inactive voucher code.' }, { status: 400 })
      }
      if (voucher.isRedeemed || new Date(voucher.expiresAt) <= effectiveNow) {
        return NextResponse.json({ error: 'Voucher is invalid, expired, or already used' }, { status: 400 })
      }
      // Validate voucher recipient if binding exists
      if (voucher.recipientEmail && voucher.recipientEmail !== session.user.email) {
        return NextResponse.json({ error: 'This voucher was not issued to you.' }, { status: 400 })
      }

      // M-3: Check and manage reservation hold to prevent double-spend race conditions.
      // If held by a different user within the last 15 minutes, block the booking.
      // Note: heldByUserId/heldAt fields require `prisma db push` to take effect.
      const holdWindowMs = 15 * 60 * 1000
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const voucherAny = voucher as any
      if (voucherAny.heldByUserId && voucherAny.heldByUserId !== session.user.id) {
        if (voucherAny.heldAt && Date.now() - new Date(voucherAny.heldAt).getTime() < holdWindowMs) {
          return NextResponse.json(
            { error: 'This voucher is temporarily reserved. Please try again in a few minutes.' },
            { status: 400 }
          )
        }
      }
      // Place a hold so concurrent requests by other users see this as reserved
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma.giftVoucher.update as any)({
        where: { code: giftVoucherCode },
        data: { heldByUserId: session.user.id, heldAt: new Date() },
      }).catch(() => {}) // Non-blocking — hold is best-effort; atomic deduplication is inside the transaction

      // Always compute remaining balance from amount - usedAmount (don't trust potentially stale remainingBalance)
      const available = (voucher.amount ?? 0) - (voucher.usedAmount ?? 0)
      if (available <= 0) {
        return NextResponse.json({ error: 'This voucher has no remaining balance' }, { status: 400 })
      }
      voucherDiscount = Math.min(available, effectiveServicePrice) // cap at effective service price
    }

    // NEW-18: Validate and apply promo code discount
    let promoDiscount = 0
    let validatedPromo: { id: string; discountType: string; discountValue: number } | null = null
    if (promoCode) {
      const promo = await prisma.promoCode.findUnique({
        where: { code: String(promoCode).toUpperCase().trim() },
      })
      if (!promo || !promo.isActive) {
        return NextResponse.json({ error: 'Invalid promo code' }, { status: 400 })
      }
      if (promo.expiresAt && promo.expiresAt < new Date()) {
        return NextResponse.json({ error: 'This promo code has expired' }, { status: 400 })
      }
      if (promo.maxUses !== null && promo.currentUses >= promo.maxUses) {
        return NextResponse.json({ error: 'This promo code has reached its usage limit' }, { status: 400 })
      }
      // M-6: Budget cap check — block if the code has issued its maximum total discount
      // Note: budgetCap/totalDiscountIssued require `prisma db push` to take effect
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const promoAny = promo as any
      if (promoAny.budgetCap && promoAny.totalDiscountIssued >= promoAny.budgetCap) {
        return NextResponse.json({ error: 'This promo code has reached its maximum discount limit' }, { status: 400 })
      }
      if (effectiveServicePrice < promo.minOrderAmount) {
        return NextResponse.json({
          error: `Minimum order amount of $${promo.minOrderAmount} required for this promo code`,
        }, { status: 400 })
      }
      // P2-6: Use Math.floor to always round down to the nearest cent — never over-discount.
      const rawPromoDiscount = promo.discountType === 'PERCENT'
        ? Math.floor(effectiveServicePrice * (promo.discountValue / 100) * 100) / 100
        : Math.floor(Math.min(promo.discountValue, effectiveServicePrice) * 100) / 100

      // P0-6: Cap promo discount so that promo alone cannot exceed platform.max_combined_discount
      // (default 20%) of the original service price. This prevents a promo code from wiping out
      // nearly all revenue. Voucher discounts are pre-paid gifts treated separately.
      // The combined voucher+promo cap (P1-C) is enforced below after both discounts are known.
      const maxCombinedDiscountRate = await getSettingFloat('platform.max_combined_discount')
      const maxPromoDiscountAmount = effectiveServicePrice * maxCombinedDiscountRate
      promoDiscount = Math.min(rawPromoDiscount, maxPromoDiscountAmount)
      validatedPromo = { id: promo.id, discountType: promo.discountType, discountValue: promo.discountValue }

      // P1-2: Pre-transaction per-user check — prevents obvious double-use without relying solely
      // on the upsert inside the transaction (which can't stop two concurrent requests both passing
      // this point before either one writes). The upsert inside the transaction remains as the
      // final atomic guard against a true race condition.
      if (session.user.id) {
        const existingUsage = await prisma.promoCodeUsage.findUnique({
          where: { promoCodeId_userId: { promoCodeId: promo.id, userId: session.user.id } },
        })
        if (existingUsage) {
          return NextResponse.json({ error: 'You have already used this promo code.' }, { status: 400 })
        }
      }
    }

    // P1-C: Combined voucher + promo cap — ensure the promo can never push the total discount
    // above 100% of the service price (prevents $0 service with platform fee on nothing).
    // Voucher is treated as pre-paid (takes priority); promo is clamped to the remainder.
    // e.g. $50 service, $40 voucher, 30% promo ($15) → promo clamped to $10 (the remaining $50-$40).
    if (voucherDiscount > 0 && promoDiscount > 0) {
      const maxRemainingForPromo = Math.max(0, effectiveServicePrice - voucherDiscount)
      promoDiscount = Math.min(promoDiscount, maxRemainingForPromo)
    }

    // Calculate platform fee on the post-voucher, post-promo effective service price
    const discountedServicePrice = Math.max(0, effectiveServicePrice - voucherDiscount - promoDiscount)
    const { fee: rawFee, floor: feeFloor } = await calculatePlatformFeeAsync(discountedServicePrice, isMember)
    // P0-3/MON-R1: Always enforce the fee floor AFTER all discounts (voucher + promo).
    // Members have the fee waived; for everyone else, the floor ensures the platform always
    // earns something regardless of how heavily the service price was discounted.
    const PLATFORM_FEE_FLOOR = feeFloor
    const platformFee = !isMember && effectiveServicePrice > 0
      ? Math.max(rawFee, PLATFORM_FEE_FLOOR)
      : rawFee
    // P0-E: Use integer-cent arithmetic throughout to avoid floating-point rounding errors
    // (e.g. 0.1 + 0.2 = 0.30000000000000004). All money values are converted to whole cents,
    // summed/subtracted as integers, then divided back to dollars.
    const totalPriceCents = Math.round(effectiveServicePrice * 100) + Math.round(platformFee * 100) + Math.round(tipAmount * 100)
    const totalPrice = totalPriceCents / 100
    const totalDiscountsCents = Math.round(voucherDiscount * 100) + Math.round(promoDiscount * 100)
    const totalDiscounts = totalDiscountsCents / 100
    // MON-R1 continued: ensure finalPrice is at least the platformFee when a voucher is applied
    const finalPriceCents = !isMember && effectiveServicePrice > 0 && totalDiscounts > 0
      ? Math.max(Math.round(platformFee * 100), totalPriceCents - totalDiscountsCents)
      : Math.max(0, totalPriceCents - totalDiscountsCents)
    const finalPrice = finalPriceCents / 100

    // P0-8: Compare client-supplied total to server-calculated total. Log a warning if they
    // differ by more than $0.01 — this indicates a potential price-tampering attempt or a
    // stale frontend quoting stale prices. The server-calculated finalPrice is ALWAYS used
    // for Stripe and DB; clientTotalPrice is only captured for fraud signal auditing.
    if (typeof clientTotalPrice === 'number' && Math.abs(clientTotalPrice - finalPrice) > 0.01) {
      console.warn(
        `[P0-8 PRICE_TAMPER_DETECTED] booking for service ${serviceId} by user ${session.user.id}: ` +
        `client supplied $${clientTotalPrice.toFixed(2)}, server calculated $${finalPrice.toFixed(2)} ` +
        `(diff: $${(clientTotalPrice - finalPrice).toFixed(2)})`
      )
    }

    // T&S-3: Enforce max length on booking notes BEFORE the regex filter runs — prevents ReDoS
    // from very long inputs being passed to the content filter regex patterns
    const trimmedNotes = notes?.trim() || null
    if (trimmedNotes && trimmedNotes.length > 500) {
      return NextResponse.json({ error: 'Notes must be 500 characters or less' }, { status: 400 })
    }

    // BL-L2: Block booking notes that contain contact info to prevent off-platform leakage
    if (trimmedNotes) {
      const notesFilter = filterContactInfo(trimmedNotes)
      if (notesFilter.flagged) {
        return NextResponse.json(
          {
            error:
              'Your booking notes appear to contain contact information (phone number, email, or social handle). For your protection, please remove it and use the in-app messaging instead.',
            code: 'CONTACT_LEAKAGE',
          },
          { status: 422 }
        )
      }
    }
    // M02: Prepend add-on names to notes so they're visible in the booking record
    const addonNotePrefix = selectedAddons.length > 0
      ? `[Add-ons: ${selectedAddons.map(a => a.name).join(', ')}]\n`
      : ''
    const combined = addonNotePrefix + (trimmedNotes ?? '')
    const sanitizedNotes = combined.length > 0 ? combined : null

    const promoCodeValue = promoCode ? String(promoCode).toUpperCase().trim() : null

    // P0-1/P0-7/BL-C1: Atomic slot reservation — wrap conflict re-check + booking create
    // + promo increment in a single transaction so two simultaneous requests cannot claim
    // the same slot and promo increments roll back on any failure.
    const booking = await prisma.$transaction(async (tx) => {
      // Re-check for conflicts inside the transaction to prevent the race condition
      // between the outer check (above) and the INSERT.
      const dayStart2 = new Date(Date.UTC(bookingDateNoon.getUTCFullYear(), bookingDateNoon.getUTCMonth(), bookingDateNoon.getUTCDate(), 0, 0, 0))
      const dayEnd2   = new Date(Date.UTC(bookingDateNoon.getUTCFullYear(), bookingDateNoon.getUTCMonth(), bookingDateNoon.getUTCDate(), 23, 59, 59, 999))
      const existingInTx = await tx.booking.findMany({
        where: {
          providerUserId: service.provider.userId,
          date: { gte: dayStart2, lte: dayEnd2 },
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
        include: { service: { select: { duration: true } } },
      })
      const occupied2 = new Set<string>()
      for (const b of existingInTx) {
        const [eh, em] = b.time.split(':').map(Number)
        const slots = Math.ceil(b.service.duration / 30)
        for (let i = 0; i < slots; i++) {
          const m = eh * 60 + em + i * 30
          occupied2.add(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
        }
      }
      const [rh2, rm2] = time.split(':').map(Number)
      const needed2 = Math.ceil(service.duration / 30)
      for (let i = 0; i < needed2; i++) {
        const m = rh2 * 60 + rm2 + i * 30
        const k = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
        if (occupied2.has(k)) {
          throw Object.assign(new Error('This time slot was just taken by another booking. Please choose a different time.'), { status: 409 })
        }
      }

      // NEW-18/P0-1: Atomic promo increment inside the transaction so it rolls back on failure.
      // Using raw SQL ensures the check+increment is atomic at the DB level, eliminating the
      // race condition between reading currentUses and incrementing it in application code.
      if (promoCodeValue && validatedPromo) {
        const promoUpdate = await tx.$executeRaw`
          UPDATE "PromoCode"
          SET "currentUses" = "currentUses" + 1
          WHERE code = ${promoCodeValue}
            AND "isActive" = true
            AND ("maxUses" IS NULL OR "currentUses" < "maxUses")
            AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
        `
        if (promoUpdate === 0) {
          throw Object.assign(new Error('Promo code is no longer valid or has reached its usage limit.'), { status: 400 })
        }
        // M-6: Increment totalDiscountIssued to track budget cap consumption
        // Note: totalDiscountIssued requires `prisma db push` to take effect
        if (validatedPromo && promoDiscount > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (tx.promoCode.update as any)({
            where: { id: validatedPromo.id },
            data: { totalDiscountIssued: { increment: promoDiscount } },
          }).catch(() => {}) // Non-blocking until schema migration applied
        }
      }

      // P1-G/MON-2: Persist gift card partial redemption inside the transaction
      if (giftVoucherCode && voucherDiscount > 0) {
        const latestVoucher = await tx.giftVoucher.findUnique({ where: { code: giftVoucherCode } })
        if (!latestVoucher || latestVoucher.isRedeemed) {
          throw Object.assign(new Error('Voucher is no longer valid'), { status: 409 })
        }
        // Always compute from amount - usedAmount to keep remainingBalance in sync
        const newUsedAmount = (latestVoucher.usedAmount ?? 0) + voucherDiscount
        const newRemainingBalance = (latestVoucher.amount ?? 0) - newUsedAmount
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (tx.giftVoucher.update as any)({
          where: { code: giftVoucherCode },
          data: {
            usedAmount: newUsedAmount,
            remainingBalance: newRemainingBalance,
            usedBy: session.user.id,
            isRedeemed: newRemainingBalance <= 0,
            // M-3: Clear the reservation hold when booking is completed
            heldByUserId: null,
            heldAt: null,
          },
        })
      }

      const newBooking = await tx.booking.create({
        data: {
          customerId: session.user.id,
          providerUserId: service.provider.userId,
          serviceId,
          date: new Date(date),
          time,
          locationType,
          address,
          guestCount,
          notes: sanitizedNotes,
          giftVoucherCode,
          totalPrice: finalPrice,
          tipAmount,
          platformFee,
          commissionRate,
          // BL-R1: Start with a 2h deadline to release abandoned payment-form slots quickly.
          // Stripe webhook (payment_intent.succeeded) extends this to the full 24h window.
          // Tier system removed — flat 24h accept window for everyone.
          acceptDeadline: finalPrice > 0
            ? new Date(Date.now() + 2 * 60 * 60 * 1000) // 2h — released if payment form abandoned
            : new Date(Date.now() + 24 * 60 * 60 * 1000),
          status: 'PENDING',
          paymentStatus: finalPrice > 0 ? 'AUTH_PENDING' : 'NONE',
        },
      })

      // NEW-18/P2: Record per-user promo code usage to prevent reuse
      if (promoCodeValue && validatedPromo && session.user.id) {
        await tx.promoCodeUsage.upsert({
          where: { promoCodeId_userId: { promoCodeId: validatedPromo.id, userId: session.user.id } },
          create: { promoCodeId: validatedPromo.id, userId: session.user.id, bookingId: newBooking.id },
          update: {},
        })
      }

      return newBooking
    })

    // P2-4: Increment usage count on each selected add-on
    if (addonIds && addonIds.length > 0) {
      await prisma.serviceAddon.updateMany({
        where: { id: { in: addonIds } },
        data: { usageCount: { increment: 1 } },
      }).catch(e => console.error('[P2-4] Failed to increment addon usageCount:', e))
    }

    // Create Stripe PaymentIntent (manual capture — authorize only)
    // Skip payment for $0 bookings (fully covered by voucher)
    let clientSecret: string | null = null
    // P0-E: Declare piCreated in outer scope so the instant-book guard below can read it
    let piCreated = false
    if (finalPrice > 0) {
      // P0-B: Retry Stripe PI creation up to 3 times with exponential backoff.
      // Transient Stripe errors (network timeouts, rate limits) should not lose the booking.
      const PI_MAX_ATTEMPTS = 3
      let piAttempt = 0
      let piLastError: unknown = null

      while (piAttempt < PI_MAX_ATTEMPTS && !piCreated) {
        piAttempt++
        try {
          // Idempotency key ensures Stripe deduplicates across retries
          const paymentIntent = await stripe.paymentIntents.create(
            {
              amount: Math.round(finalPrice * 100), // cents AUD
              currency: 'aud',
              capture_method: 'manual',
              metadata: {
                bookingId: booking.id,
                customerId: session.user.id,
                providerUserId: service.provider.userId,
                serviceTitle: service.title,
              },
            },
            { idempotencyKey: `pi_${booking.id}` },
          )

          await prisma.booking.update({
            where: { id: booking.id },
            data: { stripePaymentId: paymentIntent.id, paymentStatus: 'AUTH_PENDING' },
          })

          clientSecret = paymentIntent.client_secret
          piCreated = true
        } catch (err) {
          piLastError = err
          // Only retry on transient errors (network / rate-limit / 5xx); never retry card declines
          const stripeErr = err as { type?: string; statusCode?: number }
          const isRetryable =
            stripeErr?.type === 'StripeConnectionError' ||
            stripeErr?.type === 'StripeAPIError' ||
            (stripeErr?.statusCode !== undefined && stripeErr.statusCode >= 500)
          if (!isRetryable || piAttempt >= PI_MAX_ATTEMPTS) break
          // Exponential backoff: 200ms, 400ms
          await new Promise(r => setTimeout(r, 200 * piAttempt))
        }
      }

      if (!piCreated) {
        const stripeError = piLastError
        // Rollback booking if Stripe fails after all retries
        await prisma.booking.delete({ where: { id: booking.id } })
        // P1-G: Reverse partial voucher redemption on Stripe failure
        if (giftVoucherCode && voucherDiscount > 0) {
          const v = await prisma.giftVoucher.findUnique({ where: { code: giftVoucherCode } })
          if (v) {
            const revertedUsed = Math.max(0, v.usedAmount - voucherDiscount)
            await prisma.giftVoucher.update({
              where: { code: giftVoucherCode },
              data: {
                usedAmount: revertedUsed,
                remainingBalance: v.amount - revertedUsed,
                isRedeemed: false,
                usedBy: revertedUsed > 0 ? v.usedBy : null,
              },
            })
          }
        }
        console.error(`Stripe PaymentIntent creation failed after ${piAttempt} attempt(s):`, stripeError)
        return NextResponse.json(
          { error: 'Payment setup failed. Please try again.' },
          { status: 500 }
        )
      }
    }

    // P0-1/NEW-17: Auto-confirm if service has Instant Book enabled.
    // This block MUST run after the Stripe PaymentIntent is created and stripePaymentId
    // is persisted on the booking — so the provider never sees a "confirmed" notification
    // for a booking whose payment setup has not yet completed.
    // For paid bookings: stripePaymentId was saved above before reaching this line.
    // For $0 bookings: no Stripe PI needed, safe to confirm immediately.
    if (service.instantBook) {
      const isPaid = finalPrice > 0
      // P0-E: Only auto-confirm + notify if payment is secured.
      // For paid instant bookings, piCreated must be true (PI persisted to DB above).
      // For free bookings, no Stripe PI is needed so confirm immediately.
      if (!isPaid || (isPaid && piCreated)) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'CONFIRMED' },
        })
        // Notify customer of instant confirmation
        await prisma.notification.create({
          data: {
            userId: session.user.id,
            type: 'BOOKING_ACCEPTED',
            title: 'Booking confirmed instantly!',
            message: `Your appointment for ${service.title} has been automatically confirmed.`,
            link: `/bookings/${booking.id}`,
          },
        }).catch(() => {})
      }
    }

    await prisma.notification.create({
      data: {
        userId: service.provider.userId,
        type: 'NEW_BOOKING',
        title: service.instantBook ? 'New Instant Booking' : 'New Booking Request',
        message: `You have a new booking ${service.instantBook ? '(auto-confirmed)' : 'request'} for ${service.title}`,
        link: `/dashboard/provider/bookings/${booking.id}`,
      },
    })

    // Send booking request email to provider (non-blocking)
    // TS-4: Guard against null email — provider email is optional in the schema
    if (service.provider.user.email) {
      sendBookingRequestEmail(service.provider.user.email, {
        providerName: service.provider.user.name ?? 'there',
        customerName: session.user.name ?? 'A client',
        serviceTitle: service.title,
        bookingDate: date,
        bookingTime: time,
        bookingId: booking.id,
      }).catch(err => console.error('[EMAIL_SEND_ERROR]', err))
    }

    // Send booking confirmation email to customer (non-blocking)
    if (session.user.email) {
      sendBookingConfirmationToCustomer(session.user.email, {
        customerName: session.user.name ?? 'there',
        serviceTitle: service.title,
        providerName: service.provider.user.name ?? 'your artist',
        bookingDate: date,
        bookingTime: time,
        bookingId: booking.id,
      }).catch(err => console.error('Booking confirmation email error:', err))
    }

    // Fetch customer + provider phone numbers for SMS (non-blocking — never blocks booking)
    prisma.user.findMany({
      where: { id: { in: [session.user.id, service.provider.userId] } },
      select: { id: true, phone: true },
    }).then(users => {
      const customerPhone = users.find(u => u.id === session.user.id)?.phone
      const providerPhone  = users.find(u => u.id === service.provider.userId)?.phone
      // SMS to customer
      sendBookingRequestSms(customerPhone, {
        customerName: session.user.name ?? 'there',
        serviceTitle: service.title,
        providerName: service.provider.user.name ?? 'your artist',
        bookingDate: date,
        bookingTime: time,
      }).catch(err => console.error('Booking request SMS (customer) error:', err))
      // SMS to provider
      sendNewBookingRequestSms(providerPhone, {
        providerName: service.provider.user.name ?? 'there',
        customerName: session.user.name ?? 'a client',
        serviceTitle: service.title,
        bookingDate: date,
        bookingTime: time,
      }).catch(err => console.error('Booking request SMS (provider) error:', err))
    }).catch(err => console.error('Phone lookup for SMS error:', err))

    const publicBooking = {
      id: booking.id,
      customerId: booking.customerId,
      providerUserId: booking.providerUserId,
      serviceId: booking.serviceId,
      date: booking.date,
      time: booking.time,
      locationType: booking.locationType,
      address: booking.address,
      status: booking.status,
      totalPrice: booking.totalPrice,
      tipAmount: booking.tipAmount,
      paymentStatus: booking.paymentStatus,
      giftVoucherCode: booking.giftVoucherCode,
      notes: booking.notes,
      acceptDeadline: booking.acceptDeadline,
      createdAt: booking.createdAt,
    }
    // Build voucher summary if one was used
    let voucherSummary: { code: string; discount: number; remaining: number } | null = null
    if (giftVoucherCode && voucherDiscount > 0) {
      const updatedVoucher = await prisma.giftVoucher.findUnique({
        where: { code: giftVoucherCode },
        select: { remainingBalance: true, code: true },
      })
      voucherSummary = {
        code: giftVoucherCode,
        discount: voucherDiscount,
        remaining: updatedVoucher?.remainingBalance ?? 0,
      }
    }

    return NextResponse.json({
      booking: publicBooking,
      clientSecret,
      voucherSummary,
      promoSummary: promoDiscount > 0 ? { code: promoCodeValue, discount: promoDiscount } : null,
    })
  } catch (error: unknown) {
    // Surface errors thrown from the transaction with a specific status code
    if (error instanceof Error) {
      const status = (error as { status?: number }).status
      if (status === 409 || status === 400) {
        return NextResponse.json({ error: error.message }, { status })
      }
    }
    // Unique index violation = double-booking race condition
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'That time slot was just taken. Please choose another time.' },
        { status: 409 }
      )
    }
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
    // MF-P0-5: Build where clause — ALWAYS scope to the authenticated user so that
    // adding a status or providerId filter cannot leak another user's bookings.
    const isAdmin = session.user.role === 'ADMIN'
    const ownershipFilter = isAdmin
      ? {}
      : role === 'customer'
        ? { customerId: session.user.id }
        : { providerUserId: session.user.id }

    const where = {
      ...ownershipFilter,
      ...(filterStatus && { status: filterStatus as import('@prisma/client').BookingStatus }),
      // Only allow providerId filter for admins — customers/providers are already scoped above
      ...(filterProviderId && isAdmin && { providerUserId: filterProviderId }),
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        service: true,
        customer: true,
        provider: {
          include: {
            providerProfile: { select: { cancellationPolicyType: true } },
          },
        },
        review: true,
        dispute: {
          select: { id: true, status: true, reason: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      ...(limit ? { take: limit } : {}),
    })

    // P1-8: Redact customer address from provider view until booking is PENDING or CONFIRMED
    // (address is shared from PENDING so providers know where to travel before confirming)
    const sanitized = bookings.map(b => ({
      ...b,
      address: ['PENDING', 'CONFIRMED', 'COMPLETED'].includes(b.status) ? b.address : null,
    }))

    return NextResponse.json({ bookings: sanitized, count: sanitized.length })
  } catch (error) {
    console.error('Bookings fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }
}
