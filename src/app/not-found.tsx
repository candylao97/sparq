import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-6xl font-bold text-[#e8e1de]">404</h1>
      <h2 className="mt-4 text-xl font-bold text-[#1A1A1A]">Page not found</h2>
      <p className="mt-3 max-w-md text-sm text-[#717171]">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link
          href="/"
          className="rounded-xl bg-[#1A1A1A] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1A1A1A]"
        >
          Back to home
        </Link>
        <Link
          href="/search"
          className="rounded-xl border border-[#e8e1de] px-5 py-2.5 text-sm font-semibold text-[#1A1A1A] transition-colors hover:bg-[#f9f2ef]"
        >
          Browse artists
        </Link>
      </div>
    </div>
  )
}
