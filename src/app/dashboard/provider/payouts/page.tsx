'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  CreditCard,
  Download,
  ExternalLink,
  Loader2,
  Shield,
  Zap,
  Clock,
  AlertCircle,
} from 'lucide-react'
import type { PayoutHistoryItem } from '@/app/api/dashboard/provider/payout-history/route'

interface StripeStatus {
  connected: boolean
  payoutsEnabled: boolean
  chargesEnabled: boolean
  detailsSubmitted: boolean
  stripeAccountId?: string
}

interface EarningsSummary {
  totalEarnings: number
  completedBookings: number
  // AUDIT-011: Soonest queued payout + totals. Null when nothing is queued.
  nextPayout: {
    next: {
      id: string
      amount: number
      scheduledAt: string
      isOverdue: boolean
      status: string
    }
    totalScheduled: number
    queuedCount: number
  } | null
}

function PayoutStatusBadge({ status }: { status: string }) {
  if (status === 'COMPLETED') {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
        Paid
      </span>
    )
  }
  if (status === 'FAILED' || status === 'CANCELLED') {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
        {status === 'CANCELLED' ? 'Cancelled' : 'Failed'}
      </span>
    )
  }
  if (status === 'PROCESSING') {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
        Processing
      </span>
    )
  }
  // SCHEDULED (default)
  return (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
      Scheduled
    </span>
  )
}

function ProviderPayoutsPageInner() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null)
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    if (authStatus === 'unauthenticated') router.push('/login')
    if (authStatus === 'authenticated' && session?.user?.role === 'CUSTOMER') {
      router.push('/dashboard/customer')
    }
  }, [authStatus, session, router])

  const fetchPayoutHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch('/api/dashboard/provider/payout-history')
      if (res.ok) {
        const data = await res.json()
        setPayoutHistory(data.payouts ?? [])
      }
    } catch {
      // silently fail — table will show empty state
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  const fetchStatus = useCallback(async () => {
    try {
      const [statusRes, dashRes] = await Promise.all([
        fetch('/api/stripe/connect'),
        fetch('/api/dashboard/provider'),
      ])
      if (statusRes.ok) {
        const data = await statusRes.json()
        setStripeStatus(data)
      }
      if (dashRes.ok) {
        const dashData = await dashRes.json()
        setEarnings({
          totalEarnings: dashData.earnings?.allTime ?? 0,
          completedBookings: dashData.stats?.completedBookings ?? 0,
          nextPayout: dashData.nextPayout ?? null,
        })
      }
    } catch {
      toast.error('Failed to load payout status')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session) {
      fetchStatus()
      fetchPayoutHistory()
    }
  }, [session, fetchStatus, fetchPayoutHistory])

  // Handle return from Stripe onboarding
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Stripe account updated!')
      fetchStatus()
    }
    if (searchParams.get('error') === 'true') {
      toast.error('Something went wrong. Please try again.')
    }
  }, [searchParams, fetchStatus])

  const handleConnect = async () => {
    setConnecting(true)
    try {
      const res = await fetch('/api/stripe/connect', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to connect')
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start Stripe onboarding')
      setConnecting(false)
    }
  }

  const handleContinueSetup = async () => {
    setConnecting(true)
    try {
      const res = await fetch('/api/stripe/connect', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create link')
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to continue setup')
      setConnecting(false)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount)

  if (authStatus === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#FDFBF7_100%)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E96B56] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#FDFBF7_100%)]">
      <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-8 lg:px-12 xl:px-20">
        {/* Back link */}
        <Link
          href="/dashboard/provider"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-[#717171] transition-colors hover:text-[#1A1A1A]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <h1 className="mb-1 text-2xl font-bold text-[#1A1A1A]">Payouts</h1>
        <p className="mb-8 text-sm text-[#717171]">
          Manage how you get paid for your services on Sparq.
        </p>

        {/* Not connected */}
        {stripeStatus && !stripeStatus.connected && (
          <>
            <div className="mb-6 rounded-2xl border border-[#e8e1de] bg-white p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f3ece9]">
                  <CreditCard className="h-6 w-6 text-[#1A1A1A]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#1A1A1A]">Connect your payout account</h2>
                  <p className="text-sm text-[#717171]">Set up Stripe to receive your earnings</p>
                </div>
              </div>

              <p className="mb-6 text-sm leading-relaxed text-[#717171]">
                To receive payments from your bookings, you need to connect a bank account through Stripe.
                This is a one-time setup that takes about 2 minutes.
              </p>

              <div className="mb-8 grid gap-4 sm:grid-cols-2">
                {[
                  { icon: Banknote, title: 'Direct deposits', desc: 'Earnings go straight to your bank account' },
                  { icon: Zap, title: 'Fast payouts', desc: 'Get paid within 2 business days' },
                  { icon: Shield, title: 'Secure & trusted', desc: 'Stripe handles millions of payments worldwide' },
                  { icon: Clock, title: 'Automatic transfers', desc: 'No manual withdrawal needed' },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-3 rounded-xl bg-[#f9f2ef] p-4">
                    <Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#E96B56]" />
                    <div>
                      <p className="text-sm font-medium text-[#1A1A1A]">{title}</p>
                      <p className="text-xs text-[#717171]">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleConnect}
                disabled={connecting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#1A1A1A] disabled:opacity-60"
              >
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Connect with Stripe
                  </>
                )}
              </button>
            </div>

            <div className="rounded-2xl border border-[#e8e1de] bg-[#f9f2ef] p-5">
              <p className="text-xs leading-relaxed text-[#717171]">
                Sparq uses Stripe Connect for secure payments. Your banking details are stored
                securely by Stripe and are never shared with Sparq. By connecting, you agree to
                Stripe&apos;s terms of service.
              </p>
            </div>
          </>
        )}

        {/* Connected but incomplete */}
        {stripeStatus && stripeStatus.connected && !stripeStatus.detailsSubmitted && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#1A1A1A]">Setup incomplete</h2>
                <p className="text-sm text-amber-700">A few more details are needed</p>
              </div>
            </div>

            <p className="mb-4 text-sm text-[#717171]">
              Your Stripe account has been created, but you need to finish providing your details
              before you can receive payouts.
            </p>

            <div className="mb-6 space-y-2">
              <StatusRow
                label="Account created"
                done={true}
              />
              <StatusRow
                label="Details submitted"
                done={stripeStatus.detailsSubmitted}
              />
              <StatusRow
                label="Payouts enabled"
                done={stripeStatus.payoutsEnabled}
              />
            </div>

            <button
              onClick={handleContinueSetup}
              disabled={connecting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E96B56] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#c07609] disabled:opacity-60"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Continue setup'
              )}
            </button>
          </div>
        )}

        {/* Fully connected */}
        {stripeStatus && stripeStatus.connected && stripeStatus.detailsSubmitted && (
          <>
            {/* Success card */}
            <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#1A1A1A]">Payouts connected</h2>
                  <p className="text-sm text-emerald-700">Your account is set up and ready to receive payments</p>
                </div>
              </div>

              <div className="mb-6 space-y-2">
                <StatusRow
                  label="Account verified"
                  done={true}
                />
                <StatusRow
                  label="Payouts enabled"
                  done={stripeStatus.payoutsEnabled}
                />
                <StatusRow
                  label="Charges enabled"
                  done={stripeStatus.chargesEnabled}
                />
              </div>

              {!stripeStatus.payoutsEnabled && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs text-amber-700">
                    Payouts are temporarily disabled. This usually resolves within 24 hours as Stripe
                    verifies your information. If it persists, check your Stripe dashboard.
                  </p>
                </div>
              )}

              <a
                href="https://dashboard.stripe.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-[#e8e1de] bg-white px-5 py-2.5 text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#f9f2ef]"
              >
                Go to Stripe Dashboard
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            {/* Earnings summary */}
            {earnings && (
              <div className="mb-6 rounded-2xl border border-[#e8e1de] bg-white p-6">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#717171]">
                  Payout summary
                </h3>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {/* AUDIT-011: Next payout tile — only shown when something is queued. */}
                  {earnings.nextPayout && (
                    <div className="rounded-xl bg-[#f9f2ef] p-4 md:col-span-1">
                      <p className="mb-1 flex items-center gap-1 text-xs text-[#717171]">
                        <Banknote className="h-3 w-3" />
                        Next payout
                      </p>
                      <p className="text-2xl font-bold text-[#1A1A1A]">
                        {formatCurrency(earnings.nextPayout.next.amount)}
                      </p>
                      <p className="mt-1 text-xs text-[#717171]">
                        {earnings.nextPayout.next.isOverdue ? (
                          <span className="inline-flex items-center gap-1 text-amber-700">
                            <AlertCircle className="h-3 w-3" />
                            Processing
                          </span>
                        ) : (
                          <>
                            Arriving{' '}
                            {new Date(
                              earnings.nextPayout.next.scheduledAt,
                            ).toLocaleDateString('en-AU', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </>
                        )}
                        {earnings.nextPayout.queuedCount > 1 && (
                          <> · {earnings.nextPayout.queuedCount} queued</>
                        )}
                      </p>
                    </div>
                  )}
                  <div className="rounded-xl bg-[#f9f2ef] p-4">
                    <p className="mb-1 text-xs text-[#717171]">Total earnings</p>
                    <p className="text-2xl font-bold text-[#1A1A1A]">
                      {formatCurrency(earnings.totalEarnings)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#f9f2ef] p-4">
                    <p className="mb-1 text-xs text-[#717171]">Completed bookings</p>
                    <p className="text-2xl font-bold text-[#1A1A1A]">
                      {earnings.completedBookings}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Payout history table */}
            <PayoutHistoryTable
              payouts={payoutHistory}
              loading={historyLoading}
              formatCurrency={formatCurrency}
            />
          </>
        )}
      </div>
    </div>
  )
}

function PayoutHistoryTable({
  payouts,
  loading,
  formatCurrency,
}: {
  payouts: PayoutHistoryItem[]
  loading: boolean
  formatCurrency: (n: number) => string
}) {
  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  function handleExportCsv() {
    if (!payouts || payouts.length === 0) return
    const headers = ['Date', 'Booking', 'Service', 'Client', 'Amount', 'Platform Fee', 'Status', 'Processed At']
    const rows = payouts.map((p: PayoutHistoryItem) => [
      p.scheduledAt ? new Date(p.scheduledAt).toLocaleDateString('en-AU') : '—',
      p.bookingId ?? '—',
      p.serviceTitle ?? '—',
      p.customerName ?? '—',
      `$${(p.amount ?? 0).toFixed(2)}`,
      `$${(p.platformFee ?? 0).toFixed(2)}`,
      p.status ?? '—',
      p.processedAt ? new Date(p.processedAt).toLocaleDateString('en-AU') : '—',
    ])
    const csv = [headers, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sparq-payouts-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rounded-2xl border border-[#e8e1de] bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#717171]">
          Payout history
        </h3>
        {payouts.length > 0 && (
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#e8e1de] bg-white px-4 py-2 text-sm font-semibold text-[#1A1A1A] hover:bg-[#f9f2ef] transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#E96B56]" />
        </div>
      ) : payouts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <Banknote className="h-8 w-8 text-[#e8e1de]" />
          <p className="text-sm font-medium text-[#1A1A1A]">No payouts yet</p>
          <p className="text-xs text-[#717171]">
            Completed bookings will generate payouts that appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e8e1de]">
                <th className="pb-3 pr-4 text-left text-xs font-medium uppercase tracking-wider text-[#717171]">
                  Date
                </th>
                <th className="pb-3 pr-4 text-left text-xs font-medium uppercase tracking-wider text-[#717171]">
                  Service
                </th>
                <th className="pb-3 pr-4 text-left text-xs font-medium uppercase tracking-wider text-[#717171]">
                  Client
                </th>
                <th className="pb-3 pr-4 text-right text-xs font-medium uppercase tracking-wider text-[#717171]">
                  Amount
                </th>
                <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-[#717171]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3ece9]">
              {payouts.map((payout) => (
                <tr key={payout.id} className="group transition-colors hover:bg-[#fdfaf9]">
                  <td className="py-3.5 pr-4 text-[#717171]">
                    {fmtDate(payout.scheduledAt)}
                  </td>
                  <td className="py-3.5 pr-4 font-medium text-[#1A1A1A]">
                    {payout.serviceTitle}
                  </td>
                  <td className="py-3.5 pr-4 text-[#717171]">
                    {payout.customerName ?? '—'}
                  </td>
                  <td className="py-3.5 pr-4 text-right font-semibold text-[#1A1A1A]">
                    {formatCurrency(payout.amount)}
                  </td>
                  <td className="py-3.5">
                    <PayoutStatusBadge status={payout.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatusRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {done ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      ) : (
        <div className="h-4 w-4 rounded-full border-2 border-[#e8e1de]" />
      )}
      <span className={`text-sm ${done ? 'text-[#1A1A1A]' : 'text-[#717171]'}`}>{label}</span>
    </div>
  )
}

export default function ProviderPayoutsPage() {
  return (
    <Suspense fallback={null}>
      <ProviderPayoutsPageInner />
    </Suspense>
  )
}
