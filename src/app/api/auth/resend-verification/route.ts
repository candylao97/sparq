import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    const normalizedEmail = email.trim().toLowerCase()

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

    // Always return 200 to avoid leaking which emails are registered
    if (!user) {
      return NextResponse.json({ success: true })
    }

    // Already verified — nothing to do
    if (user.emailVerified) {
      return NextResponse.json({ success: true })
    }

    // Delete any existing token for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier: normalizedEmail },
    })

    // Create a fresh token
    const token = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await prisma.verificationToken.create({
      data: { identifier: normalizedEmail, token, expires },
    })

    await sendVerificationEmail(normalizedEmail, token)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json({ error: 'Failed to resend verification email' }, { status: 500 })
  }
}
