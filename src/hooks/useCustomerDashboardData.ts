'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { CustomerDashboardData, CustomerAiInsights } from '@/types/dashboard'

function buildCustomerAiContext(data: CustomerDashboardData) {
  return {
    firstName: '', // filled by caller
    memberSince: data.profile.memberSince,
    upcomingBookingCount: data.upcomingBookings.length,
    nextBooking: data.upcomingBookings[0] ? {
      serviceName: data.upcomingBookings[0].service.title,
      providerName: data.upcomingBookings[0].provider.name,
      date: data.upcomingBookings[0].date,
      time: data.upcomingBookings[0].time,
      status: data.upcomingBookings[0].status,
    } : null,
    totalCompleted: data.stats.completedBookings,
    completedThisMonth: data.stats.completedThisMonth,
    unreviewedCount: data.stats.unreviewed,
    oldestUnreviewed: data.unreviewedBookings[0] ? {
      providerName: data.unreviewedBookings[0].provider.name,
      serviceName: data.unreviewedBookings[0].service.title,
      date: data.unreviewedBookings[0].date,
    } : null,
    spendThisMonth: data.spending.thisMonth,
    spendPrevMonth: data.spending.previousMonth,
    spendThisQuarter: data.spending.thisQuarter,
    spendPrevQuarter: data.spending.previousQuarter,
    avgPerBooking: data.spending.averagePerBooking,
    totalSpent: data.spending.allTime,
    estimatedSavings: Math.round(data.spending.allTime * 0.15),
    savingsPercentage: 15,
    uniqueTalents: data.stats.uniqueTalentsBooked,
    topTalent: data.favouriteTalents[0] ? {
      name: data.favouriteTalents[0].name,
      bookingCount: data.favouriteTalents[0].bookingCount,
      topService: data.favouriteTalents[0].topService,
    } : null,
    categoriesBooked: Array.from(new Set(data.pastBookings.map(b => b.service.category))),
    allCategories: ['NAILS', 'LASHES', 'MAKEUP'],
    daysSinceLastBooking: data.pastBookings.length > 0
      ? Math.floor((Date.now() - new Date(data.pastBookings[0].date).getTime()) / 86400000)
      : null,
    reviewsLeftCount: data.stats.reviewsLeft,
  }
}

export function useCustomerDashboardData() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<CustomerDashboardData | null>(null)
  const [aiInsights, setAiInsights] = useState<CustomerAiInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && session?.user?.role === 'PROVIDER') router.push('/dashboard/provider')
  }, [status, session, router])

  const fetchData = useCallback(async () => {
    if (!session?.user) return

    try {
      // Phase 1: DB data (instant)
      const res = await fetch('/api/dashboard/customer')
      if (res.status === 401) {
        // Session expired or user no longer exists — redirect to login
        router.push('/login')
        return
      }
      if (!res.ok) throw new Error('Failed to fetch dashboard')
      const d: CustomerDashboardData = await res.json()
      setData(d)
      setLoading(false)

      // Phase 2: AI insights (async, non-blocking)
      try {
        setAiLoading(true)
        const context = buildCustomerAiContext(d)
        context.firstName = session.user.name?.split(' ')[0] || 'there'
        const aiRes = await fetch('/api/ai/customer-insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context }),
        })
        if (aiRes.ok) {
          const insights: CustomerAiInsights = await aiRes.json()
          setAiInsights(insights)
        }
      } catch {
        // Graceful degradation: AI insights stay null
      } finally {
        setAiLoading(false)
      }
    } catch (err) {
      console.error('Customer dashboard fetch error:', err)
      setLoading(false)
      setAiLoading(false)
    }
  }, [session, router])

  useEffect(() => {
    if (session) fetchData()
  }, [session, fetchData])

  return {
    data,
    aiInsights,
    loading,
    aiLoading,
    session,
    status,
    refreshData: fetchData,
  }
}
