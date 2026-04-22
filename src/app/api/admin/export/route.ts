import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function toCsv(rows: Record<string, string | number | null | undefined>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  return [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
  ].join('\n')
}

/**
 * M17: Admin CSV export
 * GET /api/admin/export?type=bookings|providers|users
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const type = req.nextUrl.searchParams.get('type') ?? 'bookings'
  const now = new Date().toISOString().split('T')[0]

  try {
    let csv = ''
    let filename = ''

    if (type === 'bookings') {
      const bookings = await prisma.booking.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          date: true,
          time: true,
          totalPrice: true,
          platformFee: true,
          createdAt: true,
          completedAt: true,
          customer: { select: { name: true, email: true } },
          provider: { select: { name: true, email: true } },
          service: { select: { title: true } },
        },
      })

      const rows = bookings.map(b => ({
        id: b.id,
        status: b.status,
        date: b.date instanceof Date ? b.date.toISOString().split('T')[0] : String(b.date),
        time: b.time,
        service: b.service?.title ?? '',
        customer_name: b.customer?.name ?? '',
        customer_email: b.customer?.email ?? '',
        provider_name: b.provider?.name ?? '',
        provider_email: b.provider?.email ?? '',
        total_price: b.totalPrice,
        platform_fee: b.platformFee,
        created_at: b.createdAt.toISOString(),
        completed_at: b.completedAt?.toISOString() ?? '',
      }))

      csv = toCsv(rows)
      filename = `sparq-bookings-${now}.csv`
    } else if (type === 'providers') {
      const providers = await prisma.providerProfile.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true, createdAt: true } },
          _count: { select: { services: true } },
        },
      })

      const rows = providers.map(p => ({
        id: p.id,
        name: p.user.name ?? '',
        email: p.user.email ?? '',
        tier: p.tier,
        total_earnings: p.totalEarnings,
        is_verified: p.isVerified ? 'Yes' : 'No',
        subscription_plan: p.subscriptionPlan,
        services_count: p._count.services,
        suburb: p.suburb ?? '',
        city: p.city ?? '',
        joined_at: p.user.createdAt.toISOString(),
      }))

      csv = toCsv(rows)
      filename = `sparq-providers-${now}.csv`
    } else if (type === 'users') {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          _count: { select: { bookingsAsCustomer: true } },
        },
      })

      const rows = users.map(u => ({
        id: u.id,
        name: u.name ?? '',
        email: u.email ?? '',
        role: u.role,
        bookings_count: u._count.bookingsAsCustomer,
        joined_at: u.createdAt.toISOString(),
      }))

      csv = toCsv(rows)
      filename = `sparq-users-${now}.csv`
    } else {
      return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Admin export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
