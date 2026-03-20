'use client'

import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

interface AiTextProps {
  text: string | null | undefined
  loading: boolean
  className?: string
  skeletonWidth?: string
}

export function AiText({ text, loading, className, skeletonWidth = 'w-64' }: AiTextProps) {
  if (loading) return <Skeleton className={`h-4 ${skeletonWidth} rounded-full`} />
  if (!text) return null
  return (
    <p className={cn('text-xs text-[#717171] transition-opacity duration-500', className)}>
      {text}
    </p>
  )
}
