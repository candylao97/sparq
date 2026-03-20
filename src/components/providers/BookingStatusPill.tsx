import { cn } from '@/lib/utils'
import { Clock, CheckCircle, XCircle, AlertCircle, Check } from 'lucide-react'

interface BookingStatusPillProps {
  status: string
  size?: 'sm' | 'md'
  className?: string
}

export function BookingStatusPill({ status, size = 'sm', className }: BookingStatusPillProps) {
  const config = {
    PENDING: { label: 'Pending', icon: Clock, bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
    CONFIRMED: { label: 'Confirmed', icon: CheckCircle, bg: 'bg-blue-100 text-blue-700 dark:bg-amber-900/20 dark:text-blue-400' },
    COMPLETED: { label: 'Completed', icon: Check, bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' },
    CANCELLED: { label: 'Cancelled', icon: XCircle, bg: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' },
    DECLINED: { label: 'Declined', icon: AlertCircle, bg: 'bg-[#f3ece9] text-[#717171] dark:bg-[#1A1A1A] dark:text-[#717171]' },
  }
  const { label, icon: Icon, bg } = config[status as keyof typeof config] || config.PENDING

  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full font-semibold', bg, size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5', className)}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      {label}
    </span>
  )
}
