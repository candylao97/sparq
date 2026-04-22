import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { randomBytes, randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { sendVerificationEmail } from '@/lib/email'
import { rateLimit } from '@/lib/rate-limit'
import { CURRENT_TOS_VERSION } from '@/lib/tos'

const schema = z.object({
  name:           z.string().min(2).optional(),
  email:          z.string().email(),
  password:       z.string().min(8),
  role:           z.enum(['CUSTOMER', 'PROVIDER', 'BOTH']).default('CUSTOMER'),
  ref:            z.string().optional(),
  // Accept either `true` or anything else — we check explicitly below so the
  // message is the same whether the field is missing, false, or a non-boolean.
  acceptedTerms:  z.unknown().optional(),
  termsVersion:   z.string().min(1).optional(),
})

export async function POST(req: NextRequest) {
  try {
    // TS04: Rate limit registrations — 5 accounts per IP per hour
    const registrationIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown'

    const registrationAllowed = await rateLimit(`register:${registrationIp}`, 5, 3600)
    if (!registrationAllowed) {
      return NextResponse.json(
        { error: 'Too many accounts created from this network. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const parsed = schema.parse(body)
    const { name, email, password, role, ref, acceptedTerms, termsVersion } = parsed
    // FIND-4: hard-require ToS acceptance at the DB-write boundary, regardless
    // of whether the client sent `true`, `false`, or omitted the field.
    if (acceptedTerms !== true) {
      return NextResponse.json(
        { error: 'You must accept the Terms of Service to create an account.' },
        { status: 400 },
      )
    }
    const normalizedEmail = email.trim().toLowerCase()
    const acceptedVersion = termsVersion ?? CURRENT_TOS_VERSION
    const resolvedName = name || normalizedEmail.split('@')[0]

    // T&S-R8: registrationIp already extracted above for rate limiting; reused here for duplicate account detection

    const existing = await prisma.user.findFirst({
      where: { email: normalizedEmail },
    })
    if (existing) {
      return NextResponse.json({ error: 'An account with that email already exists.' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        name: resolvedName,
        email: normalizedEmail,
        password: hashed,
        role,
        // FIND-4: consent captured at the same DB write as user creation so
        // there's no window where an account exists without recorded consent.
        termsAcceptedAt: new Date(),
        termsVersion: acceptedVersion,
        customerProfile: (role === 'CUSTOMER' || role === 'BOTH') ? { create: {} } : undefined,
        providerProfile: (role === 'PROVIDER' || role === 'BOTH') ? {
          create: {
            icalToken: randomUUID(),
            scoreFactors: { create: { updatedAt: new Date() } },
          }
        } : undefined,
      },
    })

    // Track referral if a ref code was provided
    if (ref) {
      try {
        const referrerId = Buffer.from(ref, 'base64url').toString()
        await prisma.referral.create({
          data: { referrerId, referredEmail: normalizedEmail, referredId: user.id, status: 'PENDING' },
        })
      } catch {
        // Non-blocking — don't fail registration if referral tracking fails
      }
    }

    // Create email verification token (expires in 24 hours)
    const token = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await prisma.verificationToken.create({
      data: { identifier: normalizedEmail, token, expires },
    })

    // Send verification email (uses Resend in production, logs to console in dev)
    try {
      await sendVerificationEmail(normalizedEmail, token)
    } catch (emailError) {
      // Non-blocking — user can request resend later
      console.error('Verification email error:', emailError)
    }

    // T&S-R8: Check for banned accounts registered from the same IP and flag for manual review
    if (registrationIp !== 'unknown') {
      // Look for existing banned users whose ContactLeakageFlags include this IP
      const suspiciousFlags = await prisma.contactLeakageFlag.findMany({
        where: { flagType: 'REGISTRATION_IP', snippet: registrationIp },
        include: { user: { select: { id: true, providerProfile: { select: { accountStatus: true } } } } },
      })
      const hasBannedAccount = suspiciousFlags.some(f => {
        const status = f.user?.providerProfile?.accountStatus
        return status === 'SUSPENDED' || status === 'BANNED'
      })

      // Log this registration IP regardless (for future cross-referencing)
      await prisma.contactLeakageFlag.create({
        data: {
          userId: user.id,
          flagType: 'REGISTRATION_IP',
          snippet: registrationIp,
          resolved: !hasBannedAccount, // auto-resolve if no banned match
        },
      }).catch(() => {})

      if (hasBannedAccount) {
        console.warn(`T&S-R8: New registration from IP ${registrationIp} matches a previously banned/suspended account. User ID: ${user.id}`)
      }
    }

    return NextResponse.json({ success: true, userId: user.id, requiresVerification: true })
  } catch (error) {
    // Surface validation errors (including the FIND-4 "must accept ToS" case)
    // as 400 with the specific message rather than a generic 500.
    if (error instanceof z.ZodError) {
      const first = error.issues[0]
      return NextResponse.json(
        { error: first?.message ?? 'Invalid input' },
        { status: 400 },
      )
    }
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
