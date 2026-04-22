import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// P0-1: Default notification preference structure.
// Keys align with the UI toggles in account-settings/page.tsx (NotificationsSection).
const DEFAULT_PREFS = {
  emailBookingConfirmation: true,
  emailBookingReminder: true,
  emailReviewRequest: true,
  emailMarketing: false,
  smsBookingConfirmation: true,
  smsBookingReminder: true,
  pushNewMessage: true,
  pushBookingUpdate: true,
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, notificationPreferences: true },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // P0-1: Merge stored prefs over defaults so new keys always have a fallback value
  const stored = (user.notificationPreferences ?? {}) as Record<string, unknown>
  const preferences = { ...DEFAULT_PREFS, ...stored }

  return NextResponse.json({ preferences })
}

export async function POST(req: NextRequest) {
  return _savePrefs(req)
}

export async function PATCH(req: NextRequest) {
  return _savePrefs(req)
}

async function _savePrefs(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // P0-1: Only allow whitelisted keys — reject unknown fields to prevent data injection
  const allowed = new Set(Object.keys(DEFAULT_PREFS))
  const updates: Record<string, boolean> = {}
  for (const [key, val] of Object.entries(body)) {
    if (!allowed.has(key)) continue
    if (typeof val !== 'boolean') continue
    updates[key] = val
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid preference keys provided' }, { status: 400 })
  }

  // Fetch current stored prefs and merge
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { notificationPreferences: true },
  })
  const current = ((user?.notificationPreferences ?? {}) as Record<string, unknown>)
  const merged = { ...DEFAULT_PREFS, ...current, ...updates }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { notificationPreferences: merged },
  })

  return NextResponse.json({ preferences: merged })
}
