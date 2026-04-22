'use client'

import { useState } from 'react'
import { Gift, Mail, CreditCard, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'

const PRESET_AMOUNTS = [25, 50, 75, 100]

export default function GiftCardsPage() {
  const [selectedAmount, setSelectedAmount] = useState<number>(50)
  const [customAmount, setCustomAmount] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [personalMessage, setPersonalMessage] = useState('')
  const [redeemCode, setRedeemCode] = useState('')
  const [purchasing, setPurchasing] = useState(false)

  const displayAmount = customAmount ? Number(customAmount) : selectedAmount

  function handlePresetClick(amount: number) {
    setSelectedAmount(amount)
    setCustomAmount('')
  }

  function handleCustomAmountChange(value: string) {
    const num = value.replace(/[^0-9]/g, '')
    setCustomAmount(num)
    if (num) {
      setSelectedAmount(0)
    }
  }

  async function handlePurchase() {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      toast.error('Please enter a valid recipient email address.')
      return
    }
    if (!displayAmount || displayAmount < 10) {
      toast.error('Minimum gift card amount is $10.')
      return
    }
    setPurchasing(true)
    try {
      const res = await fetch('/api/gift-cards/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: displayAmount,
          recipientName,
          recipientEmail,
          personalMessage,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Purchase failed')
      }
      const { url } = await res.json()
      window.location.href = url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Purchase failed')
    } finally {
      setPurchasing(false)
    }
  }

  function handleRedeem() {
    if (!redeemCode.trim()) {
      toast.error('Please enter a gift card code.')
      return
    }
    toast.success('Add this code at checkout to apply your gift card balance!', { duration: 5000 })
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-[linear-gradient(180deg,#ffffff_0%,#FDFBF7_100%)] py-16">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-8 lg:px-12 xl:px-20 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#1A1A1A]">
            <Gift className="h-7 w-7 text-[#E96B56]" />
          </div>
          <h1 className="mb-3 text-3xl font-bold text-[#1A1A1A] md:text-4xl">Gift a Sparq</h1>
          <p className="text-base text-[#717171]">
            Give the gift of personal sessions. Perfect for birthdays, holidays, or just because.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-4 sm:px-8 lg:px-12 xl:px-20 py-12">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Left column */}
          <div className="space-y-8">
            {/* Amount selection */}
            <div>
              <h2 className="mb-4 text-lg font-semibold text-[#1A1A1A]">Select amount</h2>
              <div className="grid grid-cols-2 gap-3">
                {PRESET_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => handlePresetClick(amount)}
                    className={`rounded-2xl border p-5 text-center transition-all ${
                      selectedAmount === amount && !customAmount
                        ? 'border-[#E96B56] bg-amber-50 shadow-sm'
                        : 'border-[#e8e1de] bg-white hover:border-[#1A1A1A]/15'
                    }`}
                  >
                    <span className="text-2xl font-bold text-[#1A1A1A]">
                      {formatCurrency(amount)}
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Custom amount (AUD)"
                  value={customAmount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  className="w-full rounded-xl border border-[#e8e1de] bg-white px-4 py-3 text-sm text-[#1A1A1A] placeholder-[#717171] outline-none focus:border-[#E96B56] focus:ring-1 focus:ring-[#E96B56]/30"
                />
              </div>
            </div>

            {/* Recipient details */}
            <div className="rounded-2xl border border-[#e8e1de] bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Mail className="h-5 w-5 text-[#E96B56]" />
                <h2 className="text-lg font-semibold text-[#1A1A1A]">Recipient details</h2>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Recipient name"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full rounded-xl border border-[#e8e1de] bg-white px-4 py-3 text-sm text-[#1A1A1A] placeholder-[#717171] outline-none focus:border-[#E96B56] focus:ring-1 focus:ring-[#E96B56]/30"
                />
                <input
                  type="email"
                  placeholder="Recipient email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full rounded-xl border border-[#e8e1de] bg-white px-4 py-3 text-sm text-[#1A1A1A] placeholder-[#717171] outline-none focus:border-[#E96B56] focus:ring-1 focus:ring-[#E96B56]/30"
                />
                <textarea
                  placeholder="Add a personal message (optional)"
                  rows={3}
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value)}
                  className="w-full resize-none rounded-xl border border-[#e8e1de] bg-white px-4 py-3 text-sm text-[#1A1A1A] placeholder-[#717171] outline-none focus:border-[#E96B56] focus:ring-1 focus:ring-[#E96B56]/30"
                />
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-8">
            {/* Gift card preview */}
            <div>
              <h2 className="mb-4 text-lg font-semibold text-[#1A1A1A]">Preview</h2>
              <div className="relative overflow-hidden rounded-2xl bg-[#1A1A1A] p-6 shadow-lg">
                {/* Gold gradient accent */}
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-[#E96B56]/30 to-[#E96B56]/5 blur-2xl" />
                <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-gradient-to-tr from-[#E96B56]/20 to-transparent blur-xl" />

                <div className="relative">
                  <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-[#E96B56]" />
                      <span className="text-sm font-bold tracking-wide text-white">SPARQ</span>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-[#717171]">
                      Gift Card
                    </span>
                  </div>
                  <div className="mb-2">
                    <span className="text-4xl font-bold text-white">
                      {displayAmount > 0 ? formatCurrency(displayAmount) : '$0.00'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-px flex-1 bg-gradient-to-r from-[#E96B56]/40 to-transparent" />
                  </div>
                  {recipientName && (
                    <p className="mt-3 text-sm text-[#717171]">
                      For {recipientName}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Purchase button */}
            <div>
              <button
                type="button"
                onClick={handlePurchase}
                disabled={purchasing}
                className="w-full rounded-xl bg-[#E96B56] py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#a63a29] hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {purchasing ? 'Redirecting…' : 'Purchase Gift Card'}
              </button>
              <p className="mt-2 text-center text-xs text-[#717171]">
                Gift cards are delivered instantly via email
              </p>
            </div>

            {/* Redeem section */}
            <div className="rounded-2xl border border-[#e8e1de] bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#E96B56]" />
                <h2 className="text-lg font-semibold text-[#1A1A1A]">Have a gift card?</h2>
              </div>
              <p className="mb-3 text-xs text-[#717171]">
                Enter your gift card code to apply credit to your account
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter code"
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                  className="flex-1 rounded-xl border border-[#e8e1de] bg-white px-4 py-3 text-sm font-mono tracking-wider text-[#1A1A1A] placeholder-[#717171] outline-none focus:border-[#E96B56] focus:ring-1 focus:ring-[#E96B56]/30"
                />
                <button
                  type="button"
                  onClick={handleRedeem}
                  className="rounded-xl bg-[#1A1A1A] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1C1608]"
                >
                  Redeem
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
