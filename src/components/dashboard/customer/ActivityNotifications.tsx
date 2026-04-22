'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { AiText } from '../AiText'
import type { CustomerNotification } from '@/types/dashboard'
import { NotificationItem } from '@/components/notifications/NotificationItem'

interface Props {
  notifications: CustomerNotification[]
  unreadMessageCount: number
  engagementNudge: string | null | undefined
  aiLoading: boolean
}

export function ActivityNotifications({ notifications, unreadMessageCount, engagementNudge, aiLoading }: Props) {
  const [localNotifications, setLocalNotifications] = useState(notifications)
  const [markingRead, setMarkingRead] = useState(false)
  const hasUnread = localNotifications.some(n => !n.read)

  async function handleMarkAllRead() {
    if (markingRead || !hasUnread) return
    setMarkingRead(true)
    try {
      await fetch('/api/notifications', { method: 'PATCH' })
      setLocalNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch {
      // Non-critical — ignore
    } finally {
      setMarkingRead(false)
    }
  }

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
        {/* UX-M4: Mark all as read */}
        {hasUnread && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingRead}
            className="text-xs font-semibold text-[#E96B56] hover:text-[#a63a29] transition-colors disabled:opacity-50"
          >
            {markingRead ? 'Marking…' : 'Mark all read'}
          </button>
        )}
      </div>

      {/* AI engagement nudge */}
      <AiText text={engagementNudge} loading={aiLoading} className="mb-4 text-body-compact text-[#717171]" skeletonWidth="w-full" />

      {localNotifications.length > 0 ? (
        <div className="space-y-0 divide-y divide-[#e8e1de]">
          {localNotifications.slice(0, 10).map(notification => (
            <NotificationItem
              key={notification.id}
              notification={{
                id: notification.id,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                link: notification.link ?? null,
                read: notification.read,
                createdAt: notification.createdAt,
              }}
              role="CUSTOMER"
              onRead={(id) =>
                setLocalNotifications(prev =>
                  prev.map(n => n.id === id ? { ...n, read: true } : n)
                )
              }
              compact
            />
          ))}
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
