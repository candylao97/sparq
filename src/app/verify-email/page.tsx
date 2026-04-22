'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, Clock, ArrowRight, RotateCcw } from 'lucide-react'
import { LogoFull } from '@/components/ui/Logo'

function VerifyEmailPageInner() {
  const searchParams = useSearchParams()
  const success = searchParams.get('success')
  const error = searchParams.get('error')
  const email = searchParams.get('email') || ''

  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleResend() {
    setResendState('sending')
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setResendState(res.ok ? 'sent' : 'error')
    } catch {
      setResendState('error')
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[480px]">
        <div className="bg-white rounded-2xl border border-[#e8e1de] shadow-[0_2px_16px_rgba(0,0,0,0.06)] overflow-hidden">

          <div className="px-10 pt-8 pb-6 text-center border-b border-[#e8e1de]">
            <div className="flex justify-center mb-5">
              <LogoFull size="md" />
            </div>
          </div>

          <div className="px-10 py-10 text-center">
            {success ? (
              <>
                <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
                  <CheckCircle className="w-7 h-7 text-green-600" />
                </div>
                <h1 className="font-headline text-xl font-semibold text-[#1A1A1A] mb-2">
                  Email verified!
                </h1>
                <p className="text-sm text-[#717171] mb-6">
                  Your account is confirmed. You can now sign in to Sparq.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 bg-[#E96B56] hover:bg-[#d45a45] text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
                >
                  Sign in <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            ) : error === 'expired' ? (
              <>
                <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-5">
                  <Clock className="w-7 h-7 text-amber-500" />
                </div>
                <h1 className="font-headline text-xl font-semibold text-[#1A1A1A] mb-2">
                  Link expired
                </h1>
                <p className="text-sm text-[#717171] mb-6">
                  This verification link has expired. Please register again to get a new one.
                </p>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 bg-[#E96B56] hover:bg-[#d45a45] text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
                >
                  Register again <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            ) : error ? (
              <>
                <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                  <XCircle className="w-7 h-7 text-red-500" />
                </div>
                <h1 className="font-headline text-xl font-semibold text-[#1A1A1A] mb-2">
                  Invalid link
                </h1>
                <p className="text-sm text-[#717171] mb-6">
                  This verification link is invalid or has already been used.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 border border-[#e8e1de] hover:border-[#1A1A1A] text-[#717171] hover:text-[#1A1A1A] font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
                >
                  Back to login
                </Link>
              </>
            ) : (
              <>
                <div className="w-14 h-14 bg-[#fdf3f1] rounded-full flex items-center justify-center mx-auto mb-5">
                  <svg className="w-7 h-7 text-[#E96B56]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h1 className="font-headline text-xl font-semibold text-[#1A1A1A] mb-2">
                  Check your inbox
                </h1>
                <p className="text-sm text-[#717171] mb-6">
                  We&apos;ve sent a verification link to your email address. Click the link to activate your account.
                </p>
                <p className="text-xs text-[#aaa] mb-4">
                  Didn&apos;t receive it? Check your spam folder or resend below.
                </p>
                {resendState === 'sent' ? (
                  <p className="text-sm text-green-600 font-medium">New email sent — check your inbox.</p>
                ) : resendState === 'error' ? (
                  <p className="text-sm text-red-500">Something went wrong. Please try again.</p>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={resendState === 'sending'}
                    className="inline-flex items-center gap-1.5 text-sm text-[#E96B56] hover:text-[#d45a45] font-medium disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {resendState === 'sending' ? 'Sending…' : 'Resend verification email'}
                  </button>
                )}
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailPageInner />
    </Suspense>
  )
}
