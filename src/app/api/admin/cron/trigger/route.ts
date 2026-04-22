import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ALLOWED_CRON_JOBS = [
  'expire-bookings',
  'expire-featured',
  'expire-payments',
  'reconcile-payments',
  'process-payouts',
  're-engage-providers',
  'review-reminders',
  'send-reminders',
  'update-tiers',
  'cleanup-notifications',
  'cleanup-webhook-events',
  'notify-waitlist',
] as const

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { cronName?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { cronName } = body
  if (!cronName || !(ALLOWED_CRON_JOBS as readonly string[]).includes(cronName)) {
    return NextResponse.json(
      { error: `Invalid cron job name. Allowed: ${ALLOWED_CRON_JOBS.join(', ')}` },
      { status: 400 }
    )
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const secret = process.env.CRON_SECRET ?? ''

  try {
    const cronRes = await fetch(`${baseUrl}/api/cron/${cronName}`, {
      headers: { Authorization: `Bearer ${secret}` },
    })

    let responseBody: unknown
    const contentType = cronRes.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      responseBody = await cronRes.json()
    } else {
      responseBody = await cronRes.text()
    }

    return NextResponse.json(
      { ok: cronRes.ok, status: cronRes.status, result: responseBody },
      { status: cronRes.ok ? 200 : 502 }
    )
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to call cron: ${(err as Error).message}` },
      { status: 500 }
    )
  }
}
