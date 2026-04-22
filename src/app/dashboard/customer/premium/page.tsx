'use client'
import { useState, useEffect } from 'react'
import { Star, Check, Zap, AlertCircle, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'

// M-1: Updated premium perks to show more compelling value beyond 0% fee
const PREMIUM_PERKS = [
  { icon: '✦', title: 'Zero booking fees', desc: 'Save 15% on every booking' },
  { icon: '⚡', title: 'Priority booking queue', desc: 'Your requests jump the queue with instant-book artists' },
  { icon: '★', title: 'Premium member badge', desc: 'Artists love Premium members — get better response rates' },
  { icon: '🎁', title: '15% off all add-ons', desc: 'Discounts on lash lifts, nail art, and more' },
  { icon: '💬', title: 'Priority support', desc: 'Skip the queue with dedicated chat support' },
]

// Keep BENEFITS for backward-compat (used in both the upgrade and active-member views)
const BENEFITS = PREMIUM_PERKS.map(p => `${p.title} — ${p.desc}`)

export default function PremiumPage() {
  const [loading, setLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const router = useRouter()
  const { data: sessionData } = useSession()

  useEffect(() => {
    async function checkMembership() {
      try {
        const res = await fetch('/api/dashboard/customer')
        const data = await res.json()
        if (data?.customer?.membership === 'PREMIUM') setIsPremium(true)
      } catch {
        // ignore
      }
    }
    if (sessionData?.user) checkMembership()
  }, [sessionData])

  async function handleUpgrade() {
    setLoading(true)
    const res = await fetch('/api/membership/upgrade', { method: 'POST' })
    const data = await res.json()
    if (data.url) router.push(data.url)
    else { toast.error(data.error || 'Something went wrong'); setLoading(false) }
  }

  async function handleCancel() {
    setCancelLoading(true)
    const res = await fetch('/api/membership/cancel', { method: 'POST' })
    const data = await res.json()
    if (data.cancelled) {
      setIsPremium(false)
      setShowCancelConfirm(false)
      setCancelled(true)
    } else {
      toast.error(data.error || 'Something went wrong')
    }
    setCancelLoading(false)
  }

  if (cancelled) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#f9f2ef] mb-6">
          <CheckCircle className="h-7 w-7 text-[#E96B56]" />
        </div>
        <h1 className="font-headline text-2xl text-[#1A1A1A] mb-3">Membership cancelled</h1>
        <p className="text-[#717171] text-sm leading-relaxed">
          Your membership has been cancelled. You won&apos;t be charged again.
        </p>
      </div>
    )
  }

  if (isPremium) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12 text-center">
        <div className="inline-flex items-center gap-2 bg-[#f3ece9] rounded-full px-4 py-2 mb-6">
          <Star className="h-4 w-4 text-[#E96B56] fill-[#E96B56]" />
          <span className="text-sm font-semibold text-[#E96B56]">Sparq Premium</span>
        </div>
        <h1 className="font-headline text-3xl text-[#1A1A1A] mb-3">You&apos;re a Premium member.</h1>
        <p className="text-[#717171] mb-8">You enjoy zero booking fees on every appointment.</p>

        <div className="bg-[#f9f2ef] rounded-2xl p-6 mb-8 text-left space-y-4">
          {PREMIUM_PERKS.map(p => (
            <div key={p.title} className="flex items-start gap-3">
              <span className="text-[#E96B56] text-base flex-shrink-0 mt-0.5">{p.icon}</span>
              <div>
                <p className="text-sm font-semibold text-[#1A1A1A]">{p.title}</p>
                <p className="text-xs text-[#717171]">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {!showCancelConfirm ? (
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="text-sm text-[#717171] underline underline-offset-2 hover:text-[#1A1A1A] transition-colors"
          >
            Cancel membership
          </button>
        ) : (
          <div className="bg-[#fff5f3] border border-[#f3ece9] rounded-2xl p-5 text-left">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="h-5 w-5 text-[#E96B56] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[#1A1A1A] mb-1">Cancel your membership?</p>
                <p className="text-sm text-[#717171]">Your Premium membership will end immediately. You&apos;ll lose zero-fee booking on all future appointments.</p>
              </div>
            </div>
            <p className="text-sm mb-4" style={{ color: '#717171' }}>
              Your Sparq Premium membership will remain active until the end of your current billing period. You&apos;ll keep all benefits until then.
            </p>
            <button
              onClick={() => setShowCancelConfirm(false)}
              className="w-full bg-[#E96B56] hover:bg-[#a63a29] text-white font-semibold py-3 rounded-full transition-colors text-sm mb-2"
            >
              Keep my membership
            </button>
            <button
              onClick={handleCancel}
              disabled={cancelLoading}
              className="w-full border border-[#e8e1de] hover:bg-[#f9f2ef] text-[#717171] hover:text-[#1A1A1A] font-medium py-3 rounded-full transition-colors disabled:opacity-50 text-sm"
            >
              {cancelLoading ? 'Cancelling…' : 'Yes, cancel'}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-12 text-center">
      <div className="inline-flex items-center gap-2 bg-[#f3ece9] rounded-full px-4 py-2 mb-6">
        <Star className="h-4 w-4 text-[#E96B56] fill-[#E96B56]" />
        <span className="text-sm font-semibold text-[#E96B56]">Sparq Premium</span>
      </div>
      <h1 className="font-headline text-3xl text-[#1A1A1A] mb-3">Beauty, without the fees.</h1>
      <p className="text-[#717171] mb-8">Pay zero booking fees on every appointment. Cancel anytime.</p>

      <div className="bg-[#f9f2ef] rounded-2xl p-6 mb-8 text-left space-y-4">
        {PREMIUM_PERKS.map(p => (
          <div key={p.title} className="flex items-start gap-3">
            <span className="text-[#E96B56] text-base flex-shrink-0 mt-0.5">{p.icon}</span>
            <div>
              <p className="text-sm font-semibold text-[#1A1A1A]">{p.title}</p>
              <p className="text-xs text-[#717171]">{p.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <span className="font-headline text-4xl text-[#1A1A1A]">$14.99</span>
        <span className="text-[#717171] text-sm"> / month</span>
      </div>

      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="w-full bg-[#E96B56] hover:bg-[#a63a29] text-white font-semibold py-4 rounded-full transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Zap className="h-4 w-4" />
        {loading ? 'Redirecting…' : 'Start Premium — $14.99/mo'}
      </button>
      <p className="text-xs text-[#717171] mt-3">Cancel anytime. No lock-in contract.</p>
    </div>
  )
}
