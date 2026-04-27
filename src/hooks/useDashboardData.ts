'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import type { DashboardData, AiInsights } from '@/types/dashboard'

function buildAiContext(data: DashboardData) {
  const sf = data.profile.scoreFactors
  return {
    firstName: '', // filled by caller
    scoreFactors: sf ? {
      reviewScore: sf.reviewScore,
      completionScore: sf.completionScore,
      responseScore: sf.responseScore,
      consistencyScore: sf.consistencyScore,
      verificationScore: sf.verificationScore,
    } : null,
    scoreFactorMaxes: { review: 35, completion: 20, response: 15, consistency: 15, verification: 15 },
    isVerified: data.profile.isVerified,
    pendingBookingCount: data.pendingBookings.length,
    todayBookingCount: data.todayBookings.length,
    earningsMonth: data.earnings.month,
    earningsPrevMonth: data.earnings.previousMonth,
    earningsLast3MonthAvg: data.earnings.last3MonthsAvg,
    completedThisMonth: data.stats.completedThisMonth,
    avgPerBooking: data.stats.completedBookings > 0
      ? data.earnings.allTime / data.stats.completedBookings
      : 0,
    avgRating: data.stats.averageRating,
    totalReviews: data.stats.totalReviews,
    portfolioPhotoCount: data.stats.portfolioPhotoCount,
    serviceCount: data.profile.services.length,
    categories: Array.from(new Set(data.profile.services.map(s => s.category))),
    suburb: data.profile.suburb || data.profile.city,
    unrespondedReviewCount: data.unrespondedReviews.length,
    responseTimeHours: data.stats.avgResponseTimeHours,
    completionRate: data.profile.completionRate,
  }
}

export function useDashboardData() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [aiInsights, setAiInsights] = useState<AiInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && session?.user?.role === 'CUSTOMER') router.push('/dashboard/customer')
  }, [status, session, router])

  const fetchData = useCallback(async () => {
    if (!session?.user) return

    try {
      // Phase 1: DB data (instant)
      const res = await fetch('/api/dashboard/provider')
      if (!res.ok) throw new Error('Failed to fetch dashboard')
      const d: DashboardData = await res.json()
      setData(d)
      setLoading(false)

      // Phase 2: AI insights (async, non-blocking)
      try {
        setAiLoading(true)
        const context = buildAiContext(d)
        context.firstName = session.user.name?.split(' ')[0] || 'there'
        const aiRes = await fetch('/api/ai/dashboard-insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context }),
        })
        if (aiRes.ok) {
          const insights: AiInsights = await aiRes.json()
          setAiInsights(insights)
        }
      } catch {
        // Graceful degradation: AI insights stay null
      } finally {
        setAiLoading(false)
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err)
      setLoading(false)
      setAiLoading(false)
    }
  }, [session])

  useEffect(() => {
    if (session) fetchData()
  }, [session, fetchData])

  // ── Lightweight poll: refresh if a new PENDING booking arrives (30s interval) ──
  useEffect(() => {
    if (status !== 'authenticated') return
    const poll = async () => {
      try {
        const res = await fetch('/api/bookings?role=provider&status=PENDING&limit=1')
        if (!res.ok) return
        const d = await res.json()
        const latestCount: number = d.count ?? 0
        setData(prev => {
          if (!prev) return prev
          if (latestCount !== prev.pendingBookings.length) {
            // New booking detected — trigger full refresh (non-blocking)
            fetchData()
          }
          return prev
        })
      } catch {
        // Non-critical poll — silent fail
      }
    }
    const interval = setInterval(poll, 30_000)
    return () => clearInterval(interval)
  }, [status, fetchData])

  const handleBookingAction = useCallback(async (bookingId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Action failed')
      toast.success(`Booking ${newStatus.toLowerCase()}!`)
      fetchData()
    } catch {
      toast.error('Action failed')
    }
  }, [fetchData])

  return {
    data,
    aiInsights,
    loading,
    aiLoading,
    session,
    status,
    handleBookingAction,
    refreshData: fetchData,
  }
}
