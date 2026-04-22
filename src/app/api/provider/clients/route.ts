import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const role = session.user.role
  if (role !== 'PROVIDER' && role !== 'BOTH' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const bookings = await prisma.booking.findMany({
    where: {
      providerId: session.user.id,
      status: 'COMPLETED',
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          image: true,
          email: true,
          createdAt: true,
        },
      },
      service: {
        select: {
          id: true,
          title: true,
          category: true,
        },
      },
      review: {
        select: {
          rating: true,
        },
      },
    },
    orderBy: {
      date: 'desc',
    },
  })

  // Group by customerId
  const customerMap = new Map<
    string,
    {
      id: string
      name: string
      avatar: string | null
      email: string | null
      firstVisitDate: Date
      lastVisitDate: Date
      visits: number
      totalSpentCents: number
      serviceTitles: Set<string>
      ratingSum: number
      ratingCount: number
      history: Array<{ serviceTitle: string; date: Date; amount: number }>
    }
  >()

  for (const booking of bookings) {
    const cid = booking.customerId
    const existing = customerMap.get(cid)

    if (!existing) {
      customerMap.set(cid, {
        id: cid,
        name: booking.customer.name ?? 'Unknown',
        avatar: booking.customer.image,
        email: booking.customer.email,
        firstVisitDate: booking.date,
        lastVisitDate: booking.date,
        visits: 1,
        totalSpentCents: Math.round(booking.totalPrice * 100),
        serviceTitles: new Set([booking.service.title]),
        ratingSum: booking.review ? booking.review.rating : 0,
        ratingCount: booking.review ? 1 : 0,
        history: [
          {
            serviceTitle: booking.service.title,
            date: booking.date,
            amount: booking.totalPrice,
          },
        ],
      })
    } else {
      existing.visits += 1
      existing.totalSpentCents += Math.round(booking.totalPrice * 100)
      if (booking.date > existing.lastVisitDate) {
        existing.lastVisitDate = booking.date
      }
      if (booking.date < existing.firstVisitDate) {
        existing.firstVisitDate = booking.date
      }
      if (existing.serviceTitles.size < 5) {
        existing.serviceTitles.add(booking.service.title)
      }
      if (booking.review) {
        existing.ratingSum += booking.review.rating
        existing.ratingCount += 1
      }
      existing.history.push({
        serviceTitle: booking.service.title,
        date: booking.date,
        amount: booking.totalPrice,
      })
    }
  }

  const clients = Array.from(customerMap.values())
    .map((c) => {
      const totalSpent = c.totalSpentCents / 100
      const avgTicket = totalSpent / c.visits

      let tier: 'VIP' | 'LOYAL' | 'ACTIVE' | 'NEW'
      if (c.visits >= 10) tier = 'VIP'
      else if (c.visits >= 5) tier = 'LOYAL'
      else if (c.visits >= 2) tier = 'ACTIVE'
      else tier = 'NEW'

      // Sort history desc by date, take most recent 10
      const sortedHistory = [...c.history].sort(
        (a, b) => b.date.getTime() - a.date.getTime()
      ).slice(0, 10)

      return {
        id: c.id,
        name: c.name,
        avatar: c.avatar,
        email: c.email,
        visits: c.visits,
        totalSpent,
        avgTicket,
        lastVisitDate: c.lastVisitDate.toISOString(),
        firstVisitDate: c.firstVisitDate.toISOString(),
        services: Array.from(c.serviceTitles),
        averageRating: c.ratingCount > 0 ? c.ratingSum / c.ratingCount : null,
        tier,
        history: sortedHistory.map((h) => ({
          serviceTitle: h.serviceTitle,
          date: h.date.toISOString(),
          amount: h.amount,
        })),
      }
    })
    .sort(
      (a, b) =>
        new Date(b.lastVisitDate).getTime() - new Date(a.lastVisitDate).getTime()
    )

  return NextResponse.json({ clients, total: clients.length })
}
