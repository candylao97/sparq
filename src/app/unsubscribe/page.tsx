import { Suspense } from 'react'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { LogoFull } from '@/components/ui/Logo'

function UnsubscribeInner({ email }: { email: string }) {
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
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <h1 className="font-headline text-xl font-semibold text-[#1A1A1A] mb-2">
              You&apos;ve been unsubscribed
            </h1>
            <p className="text-sm text-[#717171] mb-1">
              {email ? (
                <>
                  We&apos;ve removed{' '}
                  <span className="font-semibold text-[#1A1A1A]">{email}</span>
                  {' '}from our marketing list.
                </>
              ) : (
                'We\u2019ve removed your email from our marketing list.'
              )}
            </p>
            <p className="text-sm text-[#717171] mb-6">
              You&apos;ll still receive essential account emails (booking
              confirmations, payment receipts, password resets, and account
              verification) — these are required for us to operate your
              account.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 border border-[#e8e1de] hover:border-[#1A1A1A] text-[#717171] hover:text-[#1A1A1A] font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              Back to Sparq
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function UnsubscribePage({
  searchParams,
}: {
  searchParams: { email?: string }
}) {
  return (
    <Suspense fallback={null}>
      <UnsubscribeInner email={searchParams.email ?? ''} />
    </Suspense>
  )
}
