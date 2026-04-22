import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

    // Always return success to avoid leaking account existence
    if (!user || !user.password) {
      return NextResponse.json({ success: true })
    }

    // Delete any existing reset token for this email, then create a fresh one
    await prisma.verificationToken.deleteMany({
      where: { identifier: `reset:${normalizedEmail}` },
    })

    const token = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    await prisma.verificationToken.create({
      data: { identifier: `reset:${normalizedEmail}`, token, expires },
    })

    const resetUrl = `${APP_URL}/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`

    try {
      await sendPasswordResetEmail(normalizedEmail, resetUrl)
    } catch (emailError) {
      console.error('Password reset email error:', emailError)
      // Non-blocking in production; in dev the email is logged to console
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
