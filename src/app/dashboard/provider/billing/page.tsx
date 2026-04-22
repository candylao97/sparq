'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Check, Zap, Crown, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Subscription {
  subscriptionPlan: string
  stripeSubscriptionId: string | null
  stripeSubscriptionStatus: string | null
}

interface CommissionRates {
  standard: number
  pro: number
  elite: number
}

function buildPlans(rates: CommissionRates) {
  return [
    {
      key: 'FREE',
      name: 'Free',
      price: '$0',
      period: '',
      icon: null,
      color: 'border-[#e8e1de]',
      features: ['List up to 3 services', 'Standard search placement', 'Basic analytics', `${rates.standard}% platform commission`],
    },
    {
      key: 'PRO',
      name: 'Pro',
      price: '$29',
      period: '/month',
      icon: Zap,
      color: 'border-[#E96B56]',
      features: ['Unlimited services', 'Priority search placement', 'Advanced analytics', `${rates.pro}% platform commission`, 'Pro badge on profile'],
    },
    {
      key: 'ELITE',
      name: 'Elite',
      price: '$79',
      period: '/month',
      icon: Crown,
      color: 'border-amber-400',
      features: ['Everything in Pro', 'Featured on homepage', 'Dedicated support', `${rates.elite}% platform commission`, 'Elite badge + verification priority'],
    },
  ]
}

function BillingContent() {
  const searchParams = useSearchParams()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [rates, setRates] = useState<CommissionRates>({ standard: 15, pro: 12, elite: 10 })

  useEffect(() => {
    fetch('/api/dashboard/provider/commission-rate')
      .then(r => r.json())
      .then(d => {
        if (d.standardRate != null) {
          setRates({ standard: d.standardRate, pro: d.proRate, elite: d.eliteRate })
        }
      })
      .catch(() => {/* keep defaults */})
  }, [])

  useEffect(() => {
    const isSuccess = searchParams.get('success') === '1'
    if (isSuccess) {
      toast.success('Subscription activated! Your plan has been upgraded.')
    }
    if (searchParams.get('cancelled') === '1') {
      toast('Subscription upgrade cancelled.')
    }

    // On success, poll until the plan reflects the upgrade (Stripe webhook may lag)
    let attempts = 0
    const maxAttempts = 8

    const poll = (previousPlan?: string) => {
      fetch('/api/subscriptions')
        .then(r => r.json())
        .then(d => {
          const sub = d.subscription
          setSubscription(sub)
          setLoading(false)
          // Keep polling if plan hasn't changed yet (up to maxAttempts)
          if (
            isSuccess &&
            previousPlan &&
            sub?.subscriptionPlan === previousPlan &&
            attempts < maxAttempts
          ) {
            attempts++
            setTimeout(() => poll(previousPlan), 2000)
          }
        })
        .catch(() => setLoading(false))
    }

    // Initial fetch — capture plan before polling starts
    if (isSuccess) {
      fetch('/api/subscriptions')
        .then(r => r.json())
        .then(d => {
          const initialPlan = d.subscription?.subscriptionPlan ?? 'FREE'
          setSubscription(d.subscription)
          setLoading(false)
          setTimeout(() => poll(initialPlan), 2000)
        })
        .catch(() => setLoading(false))
    } else {
      poll()
    }
  }, [searchParams])

  const handleUpgrade = async (plan: string) => {
    setUpgrading(plan)
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || 'Failed to start upgrade. Please try again.')
      }
    } finally {
      setUpgrading(null)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Cancel your subscription? You will keep access until the end of your billing period.')) return
    const res = await fetch('/api/subscriptions', { method: 'DELETE' })
    const data = await res.json()
    if (res.ok) {
      toast.success(data.message)
      setSubscription(s => s ? { ...s, stripeSubscriptionStatus: 'canceling' } : s)
    } else {
      toast.error(data.error)
    }
  }

  const currentPlan = subscription?.subscriptionPlan ?? 'FREE'

  return (
    <div className="max-w-4xl">
      <div className="mb-8 flex items-center gap-3">
        <Link href="/dashboard/provider" className="text-[#717171] hover:text-[#1A1A1A] transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Billing & Plan</h1>
          <p className="text-sm text-[#717171]">Manage your Sparq subscription</p>
        </div>
      </div>

      {subscription?.stripeSubscriptionStatus === 'canceling' && (
        <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
          Your subscription is set to cancel at the end of the current billing period. You will be moved to the Free plan automatically.
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-64 rounded-2xl bg-[#f3ece9] animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {buildPlans(rates).map(plan => {
            const isCurrentPlan = currentPlan === plan.key
            const Icon = plan.icon
            return (
              <div
                key={plan.key}
                className={`relative rounded-2xl border-2 bg-white p-6 flex flex-col ${
                  isCurrentPlan ? plan.color : 'border-[#e8e1de]'
                }`}
              >
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#1A1A1A] text-white text-xs font-semibold">
                    Current Plan
                  </div>
                )}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    {Icon && <Icon className="h-4 w-4 text-[#E96B56]" />}
                    <h3 className="font-bold text-[#1A1A1A]">{plan.name}</h3>
                  </div>
                  <div className="text-2xl font-bold text-[#1A1A1A]">
                    {plan.price}<span className="text-sm font-normal text-[#717171]">{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-[#717171]">
                      <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {plan.key !== 'FREE' && !isCurrentPlan && (
                  <button
                    onClick={() => handleUpgrade(plan.key)}
                    disabled={upgrading === plan.key}
                    className="w-full py-2.5 rounded-xl bg-[#E96B56] hover:bg-[#a63a29] text-white text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {upgrading === plan.key ? 'Redirecting…' : `Upgrade to ${plan.name}`}
                  </button>
                )}
                {isCurrentPlan && plan.key !== 'FREE' && subscription?.stripeSubscriptionStatus !== 'canceling' && (
                  <button
                    onClick={handleCancel}
                    className="w-full py-2.5 rounded-xl border border-[#e8e1de] text-sm font-medium text-[#717171] hover:border-red-300 hover:text-red-500 transition-colors"
                  >
                    Cancel subscription
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={null}>
      <BillingContent />
    </Suspense>
  )
}
