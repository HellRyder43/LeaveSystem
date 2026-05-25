'use client'

import { useState, useEffect, useTransition } from 'react'
import { Bell, BellRing, Check } from 'lucide-react'
import Link from 'next/link'
import { useSession } from '@/components/providers/SessionProvider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationItem } from './NotificationItem'
import { getNotificationsPreview, markAllNotificationsRead } from '@/lib/actions/notifications'
import { toast } from 'sonner'
import type { Notification } from '@/lib/types/app'

export function NotificationBell() {
  const user = useSession()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isPending, startTransition] = useTransition()

  // Fetch on mount
  useEffect(() => {
    getNotificationsPreview(user.id).then((result) => {
      if (result.success && result.data) {
        setNotifications(result.data.notifications)
        setUnreadCount(result.data.unreadCount)
      }
    })
  }, [user.id])

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    // When opening, optimistically mark all as read
    if (nextOpen && unreadCount > 0) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
      startTransition(async () => {
        await markAllNotificationsRead(user.id)
      })
    }
  }

  function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
    startTransition(async () => {
      const result = await markAllNotificationsRead(user.id)
      if (!result.success) {
        toast.error('Failed to mark notifications as read.')
      }
    })
  }

  const hasAnyUnread = notifications.some((n) => !n.is_read)

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {unreadCount > 0
            ? <BellRing className="w-5 h-5" />
            : <Bell className="w-5 h-5" />
          }
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-0.5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none pointer-events-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Notifications</h3>
          {hasAnyUnread && (
            <button
              onClick={handleMarkAllRead}
              disabled={isPending}
              className="flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline disabled:opacity-50"
            >
              <Check className="w-3 h-3" />
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[360px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-400 dark:text-slate-500">No notifications yet</p>
            </div>
          ) : (
            notifications.slice(0, 5).map((n) => (
              <NotificationItem key={n.id} notification={n} compact />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-2.5">
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center justify-center"
          >
            View all notifications →
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
