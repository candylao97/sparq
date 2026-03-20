'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Users, Sparkles, ArrowRight } from 'lucide-react'

export function RoleSwitcher() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = session?.user?.role
  const isCustomer = pathname?.startsWith('/dashboard/customer')
  const isProvider = pathname?.startsWith('/dashboard/provider')

  const canFan = role === 'CUSTOMER' || role === 'BOTH' || role === 'ADMIN'
  const canTalent = role === 'PROVIDER' || role === 'BOTH' || role === 'ADMIN'

  return (
    <div className="flex items-center gap-3">
      {/* Current role badge */}
      <div className="inline-flex items-center gap-1.5 rounded-full bg-[#1A1A1A] px-4 py-2 text-xs font-semibold text-white">
        {isCustomer ? (
          <>
            <Users className="h-3.5 w-3.5" />
            Client
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5" />
            Artist
          </>
        )}
      </div>

      {/* Switch link — only shown if user has the other role */}
      {isCustomer && canTalent && (
        <Link
          href="/dashboard/provider"
          className="flex items-center gap-1 text-xs font-medium text-[#717171] transition-colors hover:text-[#1A1A1A]"
        >
          Switch to artist view <ArrowRight className="h-3 w-3" />
        </Link>
      )}
      {isProvider && canFan && (
        <Link
          href="/dashboard/customer"
          className="flex items-center gap-1 text-xs font-medium text-[#717171] transition-colors hover:text-[#1A1A1A]"
        >
          Switch to client view <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  )
}
