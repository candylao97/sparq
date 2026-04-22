'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import { LogoFull } from '@/components/ui/Logo'

function Spinner() {
  return (
    <span className="h-[14px] w-[14px] animate-spin rounded-full border-[1.5px] border-white/30 border-t-white flex-shrink-0" />
  )
}

export default function ForgotPasswordPage() {
  const [email,     setEmail]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (res.ok) {
        setSubmitted(true)
        toast.success("Check your inbox — we've sent a reset link.")
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data?.error || 'Something went wrong. Please try again.')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[480px]">

        <div className="bg-white rounded-2xl border border-[#e8e1de] shadow-[0_2px_16px_rgba(0,0,0,0.06)] overflow-hidden">

          {/* Card header */}
          <div className="px-10 pt-8 pb-6 text-center border-b border-[#e8e1de]">
            <div className="flex justify-center mb-5">
              <LogoFull size="md" />
            </div>
            <h1 className="text-[1.25rem] font-semibold text-[#1A1A1A] leading-snug">
              Reset your password
            </h1>
            <p className="text-sm text-[#717171] mt-1">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          {/* Card body */}
          <div className="px-10 py-8">
            {submitted ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-[#fdf3f1] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-[#E96B56]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="font-semibold text-[#1A1A1A] mb-1">Check your inbox</p>
                <p className="text-sm text-[#717171]">
                  If an account exists for <span className="font-medium text-[#1A1A1A]">{email}</span>, you&apos;ll receive a reset link shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Email — contained label style matching login */}
                <div className="relative rounded-xl border border-[#e8e1de] transition-colors hover:border-[#b0b0b0] focus-within:border-[#1A1A1A]">
                  <label
                    htmlFor="email"
                    className="absolute top-3 left-4 text-[11px] font-semibold text-[#717171] pointer-events-none"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    required
                    className="w-full bg-transparent px-4 pt-[26px] pb-3 text-sm text-[#1A1A1A] placeholder:text-[#BEBAB6] outline-none rounded-xl"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E96B56] to-[#C95444] py-3.5 text-[15px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading && <Spinner />}
                  Send reset link
                </button>

              </form>
            )}
          </div>

          {/* Card footer */}
          <div className="border-t border-[#e8e1de] px-10 py-5 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1A1A1A] underline underline-offset-2 hover:text-[#E96B56] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to login
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
