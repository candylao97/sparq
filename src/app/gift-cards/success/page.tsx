'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { Check, Copy, Gift } from 'lucide-react'

function SuccessContent() {
  const searchParams = useSearchParams()
  const code = searchParams.get('code') ?? ''
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback — select the text
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#1A1A1A]">
          <Gift className="h-8 w-8 text-[#E96B56]" />
        </div>

        {/* Heading */}
        <h1 className="mb-2 text-2xl font-bold text-[#1A1A1A]">Gift card sent!</h1>
        <p className="mb-8 text-sm text-[#717171]">
          We&apos;ve emailed this gift card to the recipient. They can use the code below at checkout.
        </p>

        {/* Code box */}
        {code && (
          <div className="mb-8 rounded-2xl border border-[#e8e1de] bg-white p-6 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#717171]">
              Gift card code
            </p>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-[#f9f2ef] px-4 py-3">
              <span className="flex-1 text-center font-mono text-lg font-bold tracking-widest text-[#1A1A1A]">
                {code}
              </span>
              <button
                onClick={handleCopy}
                aria-label="Copy gift card code"
                className="flex-shrink-0 rounded-lg p-1.5 transition-colors hover:bg-[#e8e1de]"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-[#E96B56]" />
                ) : (
                  <Copy className="h-4 w-4 text-[#717171]" />
                )}
              </button>
            </div>
            {copied && (
              <p className="mt-2 text-xs font-medium text-[#E96B56]">Copied to clipboard!</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/gift-cards"
            className="rounded-xl border border-[#e8e1de] bg-white px-6 py-3 text-sm font-semibold text-[#1A1A1A] transition-colors hover:border-[#1A1A1A]/30"
          >
            Buy another
          </Link>
          <Link
            href="/"
            className="rounded-xl bg-[#E96B56] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#a63a29]"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function GiftCardSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
          <div className="animate-spin w-7 h-7 border-[3px] border-[#E96B56] border-t-transparent rounded-full" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  )
}
