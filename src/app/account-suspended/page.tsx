'use client'

import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { ShieldOff, Mail, ArrowLeft } from 'lucide-react'

export default function AccountSuspendedPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">

        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
          <ShieldOff className="w-8 h-8 text-red-500" />
        </div>

        <h1 className="font-headline text-2xl text-[#1A1A1A] mb-3">
          Account suspended
        </h1>
        <p className="text-[#717171] leading-relaxed mb-8">
          Your artist account has been suspended and you are unable to access the
          provider dashboard at this time. If you believe this is a mistake or would
          like to appeal, please contact our support team.
        </p>

        <div className="space-y-3">
          <a
            href="mailto:support@sparq.com.au?subject=Account%20Suspension%20Appeal"
            className="w-full inline-flex items-center justify-center gap-2 bg-[#E96B56] hover:bg-[#a63a29] text-white font-semibold px-6 py-3 rounded-full transition-colors"
          >
            <Mail className="w-4 h-4" />
            Contact support
          </a>

          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full inline-flex items-center justify-center gap-2 border border-[#e8e1de] text-[#717171] hover:text-[#1A1A1A] hover:border-[#1A1A1A] font-medium px-6 py-3 rounded-full transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Sign out
          </button>

          <Link
            href="/"
            className="block text-sm text-[#717171] hover:text-[#E96B56] transition-colors mt-2"
          >
            Return to homepage
          </Link>
        </div>

      </div>
    </div>
  )
}
