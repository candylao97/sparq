'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  title: string
  subtitle: string
  children: React.ReactNode
  action?: React.ReactNode
}

export function SectionPageShell({ icon: Icon, title, subtitle, children, action }: Props) {
  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-8 lg:px-12 xl:px-16">

        {/* Back + breadcrumb */}
        <Link
          href="/dashboard/provider"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-[#717171] transition-colors hover:text-[#1A1A1A]"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>

        {/* Page header */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f9f2ef]">
              <Icon className="h-6 w-6 text-[#E96B56]" />
            </div>
            <div>
              <h1 className="font-headline text-2xl font-bold text-[#1A1A1A]">{title}</h1>
              <p className="text-sm text-[#717171]">{subtitle}</p>
            </div>
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>

        {/* Page content */}
        {children}
      </div>
    </div>
  )
}
