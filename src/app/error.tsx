'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold text-[#1A1A1A]">Something went wrong</h1>
      <p className="mt-3 max-w-md text-sm text-[#717171]">
        We hit an unexpected issue. Try refreshing, or head back to the homepage.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={reset}
          className="rounded-xl bg-[#1A1A1A] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1A1A1A]"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-xl border border-[#e8e1de] px-5 py-2.5 text-sm font-semibold text-[#1A1A1A] transition-colors hover:bg-[#f9f2ef]"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
