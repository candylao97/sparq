'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, Search, CheckCircle, XCircle, AlertTriangle, ExternalLink } from 'lucide-react'

type KYCStatus = 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'REQUIRES_ACTION'

interface KYCData {
  kycStatus: KYCStatus
  kycNotes: string | null
  stripeVerificationUrl: string | null
}

export default function KYCStatusPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [kycData, setKycData] = useState<KYCData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/dashboard/provider/kyc-status')
        .then(r => r.ok ? r.json() : null)
        .then(d => setKycData(d))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [status])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E96B56] border-t-transparent" />
      </div>
    )
  }

  if (status === 'unauthenticated') return null

  const kycStatus = kycData?.kycStatus ?? 'PENDING'
  const kycNotes = kycData?.kycNotes ?? null
  const stripeVerificationUrl = kycData?.stripeVerificationUrl ?? null

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">

        {/* Back link */}
        <Link
          href="/dashboard/provider"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-[#717171] transition-colors hover:text-[#1A1A1A]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </Link>

        {/* Page heading */}
        <div className="mb-8">
          <h1 className="font-headline text-3xl font-semibold text-[#1A1A1A]">
            Identity verification
          </h1>
          <p className="mt-2 font-jakarta text-sm text-[#717171]">
            We verify every artist on Sparq to keep our platform safe for clients and artists alike.
          </p>
        </div>

        {/* Status card */}
        <div className="rounded-2xl border border-[#e8e1de] bg-white p-8">
          {kycStatus === 'PENDING' && (
            <div className="flex flex-col items-center text-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
                <Clock className="h-8 w-8 text-amber-500" />
              </div>
              <div>
                <h2 className="font-headline text-xl font-semibold text-[#1A1A1A] mb-2">
                  Verification pending
                </h2>
                <p className="font-jakarta text-sm text-[#717171] leading-relaxed">
                  Your identity verification is pending. We&apos;ll notify you within 1–2 business days.
                </p>
              </div>
            </div>
          )}

          {kycStatus === 'UNDER_REVIEW' && (
            <div className="flex flex-col items-center text-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                <Search className="h-8 w-8 text-blue-500" />
              </div>
              <div>
                <h2 className="font-headline text-xl font-semibold text-[#1A1A1A] mb-2">
                  Under review
                </h2>
                <p className="font-jakarta text-sm text-[#717171] leading-relaxed">
                  Your documents are under review by our team. We&apos;ll be in touch shortly.
                </p>
              </div>
            </div>
          )}

          {kycStatus === 'VERIFIED' && (
            <div className="flex flex-col items-center text-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h2 className="font-headline text-xl font-semibold text-[#1A1A1A] mb-2">
                  You&apos;re verified!
                </h2>
                <p className="font-jakarta text-sm text-[#717171] leading-relaxed">
                  Your profile is visible to clients and you can accept bookings on Sparq.
                </p>
              </div>
              <Link
                href={`/providers/${(session?.user as { id?: string })?.id ?? ''}`}
                className="mt-2 inline-flex items-center gap-1.5 font-jakarta text-sm font-semibold text-[#E96B56] hover:underline underline-offset-2"
              >
                View your profile →
              </Link>
            </div>
          )}

          {(kycStatus === 'REJECTED' || kycStatus === 'REQUIRES_ACTION') && (
            <div className="flex flex-col items-center text-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#fdf2f0]">
                {kycStatus === 'REJECTED'
                  ? <XCircle className="h-8 w-8 text-[#E96B56]" />
                  : <AlertTriangle className="h-8 w-8 text-amber-500" />}
              </div>
              <div>
                <h2 className="font-headline text-xl font-semibold text-[#1A1A1A] mb-2">
                  Verification unsuccessful
                </h2>
                {kycNotes && (
                  <p className="font-jakarta text-sm text-[#717171] leading-relaxed mb-2">
                    {kycNotes}
                  </p>
                )}
                <p className="font-jakarta text-sm text-[#717171] leading-relaxed">
                  Please re-submit your documents to complete verification.
                </p>
              </div>
              {stripeVerificationUrl ? (
                <a
                  href={stripeVerificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#E96B56] px-6 py-3 font-jakarta text-sm font-semibold text-white transition-colors hover:bg-[#d45a45]"
                >
                  Re-submit verification
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <Link
                  href="/dashboard/provider"
                  className="mt-2 inline-flex items-center gap-1.5 font-jakarta text-sm font-semibold text-[#E96B56] hover:underline underline-offset-2"
                >
                  Go to dashboard →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Help note */}
        <p className="mt-6 text-center font-jakarta text-xs text-[#717171]">
          Questions?{' '}
          <Link
            href="/contact"
            className="font-semibold text-[#E96B56] hover:underline underline-offset-2"
          >
            Contact our support team
          </Link>
        </p>
      </div>
    </div>
  )
}
