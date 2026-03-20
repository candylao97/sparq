import { Home, Building2, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ServiceLocationBadgeProps {
  locationType: string
  size?: 'sm' | 'md'
  className?: string
}

export function ServiceLocationBadge({ locationType, size = 'sm', className }: ServiceLocationBadgeProps) {
  const config = {
    AT_HOME: { label: 'Comes to you', icon: Home, color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400' },
    STUDIO: { label: 'At a studio', icon: Building2, color: 'bg-blue-100 text-blue-700 dark:bg-amber-900/20 dark:text-blue-400' },
    BOTH: { label: 'Home & studio', icon: LayoutGrid, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' },
  }
  const { label, icon: Icon, color } = config[locationType as keyof typeof config] || config.BOTH
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full font-semibold', color, size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5', className)}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      {label}
    </span>
  )
}
