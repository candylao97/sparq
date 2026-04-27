'use client'
import { useState } from 'react'
import { Star, TrendingUp } from 'lucide-react'
import { useRouter } from 'next/navigation'

const PLANS = [
  { id: '7days', label: '7 Days', price: '$29', highlight: false, desc: 'Try featured placement for a week' },
  { id: '30days', label: '30 Days', price: '$79', highlight: true, desc: 'Best value — top search placement for a month' },
  { id: '90days', label: '90 Days', price: '$199', highlight: false, desc: '3 months of premium visibility' },
] as const

export default function FeaturedListingPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  async function handlePurchase(plan: string) {
    setLoading(plan)
    const res = await fetch('/api/featured/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    const data = await res.json()
    if (data.url) {
      router.push(data.url)
    } else {
      alert(data.error || 'Something went wrong')
      setLoading(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="flex items-center gap-3 mb-2">
        <Star className="h-6 w-6 text-[#E96B56] fill-[#E96B56]" />
        <h1 className="font-headline text-2xl text-[#1A1A1A]">Featured listing</h1>
      </div>
      <p className="text-[#717171] mb-10 text-sm leading-relaxed">
        Featured artists appear at the top of search results with a ⭐ badge — get more visibility and more bookings.
      </p>

      <div className="flex items-center gap-2 bg-[#f3ece9] rounded-xl p-4 mb-8">
        <TrendingUp className="h-5 w-5 text-[#E96B56] flex-shrink-0" />
        <p className="text-sm text-[#1A1A1A]">Featured artists typically see <strong>3–5×</strong> more profile views and <strong>2×</strong> more bookings.</p>
      </div>

      <div className="space-y-3">
        {PLANS.map(plan => (
          <div key={plan.id} className={`border-2 rounded-2xl p-5 relative ${plan.highlight ? 'border-[#E96B56] bg-[#fff8f7]' : 'border-[#e8e1de] bg-white'}`}>
            {plan.highlight && (
              <span className="absolute -top-3 left-5 bg-[#E96B56] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Most popular</span>
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-[#1A1A1A]">{plan.label}</p>
                <p className="text-xs text-[#717171] mt-0.5">{plan.desc}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-headline text-2xl text-[#1A1A1A]">{plan.price}</span>
                <button
                  onClick={() => handlePurchase(plan.id)}
                  disabled={loading !== null}
                  className={`px-5 py-2.5 rounded-full font-semibold text-sm transition-colors disabled:opacity-50 ${plan.highlight ? 'bg-[#E96B56] text-white hover:bg-[#a63a29]' : 'bg-[#1A1A1A] text-white hover:bg-[#333]'}`}
                >
                  {loading === plan.id ? 'Loading…' : 'Get featured'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
