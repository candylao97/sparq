'use client'

import { useRouter } from 'next/navigation'
import {
  Bell, Calendar, CheckCircle, XCircle, MessageSquare,
  Star, DollarSign, AlertCircle, ChevronRight,
} from 'lucide-react'
import { relativeTime } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

const NOTIFICATION_ICONS: Record<string, LucideIcon> = {
  NEW_BOOKING: Calendar,
  BOOKING_ACCEPTED: CheckCircle,
  BOOKING_DECLINED: XCircle,
  BOOKING_COMPLETED: CheckCircle,
  BOOKING_CANCELLED: AlertCircle,
  BOOKING_EXPIRED: AlertCircle,
  BOOKING_DISPUTED: AlertCircle,
  NEW_MESSAGE: MessageSquare,
  NEW_REVIEW: Star,
  REVIEW_REMINDER: Star,
  REVIEW_REPLY: Star,
  PAYMENT_RECEIVED: DollarSign,
  PAYOUT_SENT: DollarSign,
  REFUND_PROCESSED: DollarSign,
  RESCHEDULE_REQUESTED: Calendar,
  DISPUTE_RESOLVED: CheckCircle,
}

const NOTIFICATION_COLORS: Record<string, string> = {
  NEW_BOOKING: 'bg-amber-50 text-amber-600',
  BOOKING_ACCEPTED: 'bg-blue-50 text-blue-600',
  BOOKING_DECLINED: 'bg-[#f3ece9] text-[#717171]',
  BOOKING_COMPLETED: 'bg-emerald-50 text-emerald-600',
  BOOKING_CANCELLED: 'bg-red-50 text-red-500',
  BOOKING_EXPIRED: 'bg-[#f3ece9] text-[#717171]',
  BOOKING_DISPUTED: 'bg-red-50 text-red-500',
  NEW_MESSAGE: 'bg-blue-50 text-blue-600',
  NEW_REVIEW: 'bg-amber-50 text-amber-600',
  REVIEW_REMINDER: 'bg-amber-50 text-amber-600',
  REVIEW_REPLY: 'bg-amber-50 text-amber-600',
  PAYMENT_RECEIVED: 'bg-emerald-50 text-emerald-600',
  PAYOUT_SENT: 'bg-emerald-50 text-emerald-600',
  REFUND_PROCESSED: 'bg-[#f3ece9] text-[#717171]',
  RESCHEDULE_REQUESTED: 'bg-blue-50 text-blue-600',
  DISPUTE_RESOLVED: 'bg-emerald-50 text-emerald-600',
}

export type NotificationItemData = {
  id: string
  type: string
  title: string
  message: string
  link?: string | null
  read: boolean
  createdAt: string
  resourceId?: string | null
  resourceType?: string | null
}

/**
 * Derive the deep-link destination from notification type and optional resourceId.
 * The `role` parameter controls whether to use customer or provider routes.
 */
export function getNotificationHref(
  notification: Pick<NotificationItemData, 'type' | 'link' | 'resourceId' | 'resourceType'>,
  role: 'CUSTOMER' | 'PROVIDER' | 'BOTH' = 'CUSTOMER'
): string | null {
  // If the notification already carries a link field, prefer it
  if (notification.link) return notification.link

  const isProvider = role === 'PROVIDER' || role === 'BOTH'
  const { type, resourceId } = notification

  switch (type) {
    case 'NEW_BOOKING':
    case 'BOOKING_ACCEPTED':
    case 'BOOKING_DECLINED':
    case 'BOOKING_COMPLETED':
    case 'BOOKING_CANCELLED':
    case 'BOOKING_EXPIRED':
    case 'RESCHEDULE_REQUESTED':
      return isProvider ? '/dashboard/provider/bookings' : '/bookings'

    case 'BOOKING_DISPUTED':
    case 'DISPUTE_RESOLVED':
      return resourceId ? `/bookings/${resourceId}` : (isProvider ? '/dashboard/provider/bookings' : '/bookings')

    case 'NEW_REVIEW':
    case 'REVIEW_REMINDER':
      return resourceId ? `/providers/${resourceId}` : (isProvider ? '/dashboard/provider' : null)

    case 'REVIEW_REPLY':
      return resourceId ? `/providers/${resourceId}` : '/bookings'

    case 'PAYMENT_RECEIVED':
    case 'PAYOUT_SENT':
    case 'REFUND_PROCESSED':
      return isProvider ? '/dashboard/provider/payments' : '/bookings'

    case 'NEW_MESSAGE':
      return role === 'PROVIDER' ? '/dashboard/provider/messages' : '/messages'

    default:
      return null
  }
}

interface NotificationItemProps {
  notification: NotificationItemData
  role?: 'CUSTOMER' | 'PROVIDER' | 'BOTH'
  onRead?: (id: string) => void
  /** compact: used in activity feed / sidebar. Default renders full row. */
  compact?: boolean
}

export function NotificationItem({ notification, role = 'CUSTOMER', onRead, compact = false }: NotificationItemProps) {
  const router = useRouter()
  const Icon = NOTIFICATION_ICONS[notification.type] || Bell
  const colorClass = NOTIFICATION_COLORS[notification.type] || 'bg-[#f3ece9] text-[#717171]'
  const href = getNotificationHref(notification, role)
  const isClickable = Boolean(href)

  function handleClick() {
    if (!isClickable) return
    if (onRead) onRead(notification.id)
    router.push(href!)
  }

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? handleClick : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter') handleClick() } : undefined}
      className={`flex items-start gap-3 py-3 first:pt-0 last:pb-0 rounded-lg transition-colors ${
        isClickable
          ? 'cursor-pointer hover:bg-[#f9f2ef] -mx-2 px-2'
          : ''
      }`}
    >
      <div className={`flex ${compact ? 'h-7 w-7' : 'h-8 w-8'} flex-shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
        <Icon className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`truncate font-semibold text-[#1A1A1A] ${compact ? 'text-xs' : 'text-sm'}`}>
            {notification.title}
          </p>
          {!notification.read && (
            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#E96B56]" />
          )}
        </div>
        <p className={`line-clamp-1 text-[#717171] ${compact ? 'text-[11px]' : 'text-xs'}`}>
          {notification.message}
        </p>
        <p className={`mt-0.5 text-[#717171] ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
          {relativeTime(notification.createdAt)}
        </p>
      </div>
      {isClickable && (
        <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 self-center text-[#bbb]" />
      )}
    </div>
  )
}
