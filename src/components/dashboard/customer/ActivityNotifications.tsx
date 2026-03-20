'use client'

import {
  Bell, Calendar, CheckCircle, XCircle, MessageSquare,
  Star, DollarSign, AlertCircle,
} from 'lucide-react'
import { AiText } from '../AiText'
import { relativeTime } from '@/lib/utils'
import type { CustomerNotification } from '@/types/dashboard'
import type { LucideIcon } from 'lucide-react'

const NOTIFICATION_ICONS: Record<string, LucideIcon> = {
  NEW_BOOKING: Calendar,
  BOOKING_ACCEPTED: CheckCircle,
  BOOKING_DECLINED: XCircle,
  BOOKING_COMPLETED: CheckCircle,
  BOOKING_CANCELLED: AlertCircle,
  NEW_MESSAGE: MessageSquare,
  NEW_REVIEW: Star,
  PAYMENT_RECEIVED: DollarSign,
  PAYOUT_SENT: DollarSign,
}

const NOTIFICATION_COLORS: Record<string, string> = {
  NEW_BOOKING: 'bg-amber-50 text-amber-600',
  BOOKING_ACCEPTED: 'bg-blue-50 text-blue-600',
  BOOKING_DECLINED: 'bg-[#f3ece9] text-[#717171]',
  BOOKING_COMPLETED: 'bg-emerald-50 text-emerald-600',
  BOOKING_CANCELLED: 'bg-red-50 text-red-500',
  NEW_MESSAGE: 'bg-blue-50 text-blue-600',
  NEW_REVIEW: 'bg-amber-50 text-amber-600',
  PAYMENT_RECEIVED: 'bg-emerald-50 text-emerald-600',
  PAYOUT_SENT: 'bg-emerald-50 text-emerald-600',
}

interface Props {
  notifications: CustomerNotification[]
  unreadMessageCount: number
  engagementNudge: string | null | undefined
  aiLoading: boolean
}

export function ActivityNotifications({ notifications, unreadMessageCount, engagementNudge, aiLoading }: Props) {
  return (
    <div className="mb-6 rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(26,31,54,0.07)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-[#1A1A1A]">Activity</h2>
          {unreadMessageCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E96B56] px-1.5 text-micro font-bold text-white">
              {unreadMessageCount}
            </span>
          )}
        </div>
      </div>

      {/* AI engagement nudge */}
      <AiText text={engagementNudge} loading={aiLoading} className="mb-4 text-body-compact text-[#717171]" skeletonWidth="w-full" />

      {notifications.length > 0 ? (
        <div className="space-y-0 divide-y divide-[#e8e1de]">
          {notifications.slice(0, 10).map(notification => {
            const Icon = NOTIFICATION_ICONS[notification.type] || Bell
            const colorClass = NOTIFICATION_COLORS[notification.type] || 'bg-[#f3ece9] text-[#717171]'
            return (
              <div key={notification.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-body-compact font-semibold text-[#1A1A1A]">{notification.title}</p>
                    {!notification.read && (
                      <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#E96B56]" />
                    )}
                  </div>
                  <p className="line-clamp-1 text-xs text-[#717171]">{notification.message}</p>
                  <p className="mt-0.5 text-label text-[#717171]">{relativeTime(notification.createdAt)}</p>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="py-6 text-center">
          <Bell className="mx-auto mb-2 h-8 w-8 text-[#e8e1de]" />
          <p className="text-body-compact font-medium text-[#717171]">All caught up</p>
          <p className="mt-1 text-label text-[#717171]">New booking updates and messages will appear here</p>
        </div>
      )}
    </div>
  )
}
