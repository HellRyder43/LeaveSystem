import { redirect } from 'next/navigation'
import { isToday, isYesterday } from 'date-fns'
import { Bell, CheckCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getNotificationsPreview, markAllNotificationsRead } from '@/lib/actions/notifications'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import type { Notification } from '@/lib/types/app'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const userId = user.id  // narrowed string for closure use

  const result = await getNotificationsPreview(userId, 100)
  const notifications: Notification[] =
    result.success && result.data ? result.data.notifications : []

  const hasUnread = notifications.some((n) => !n.is_read)

  // Group by recency
  const today: Notification[] = []
  const yesterday: Notification[] = []
  const earlier: Notification[] = []

  for (const n of notifications) {
    const d = new Date(n.created_at)
    if (isToday(d)) today.push(n)
    else if (isYesterday(d)) yesterday.push(n)
    else earlier.push(n)
  }

  async function markAllRead() {
    'use server'
    await markAllNotificationsRead(userId)
  }

  return (
    <div className="p-6 sm:p-8 max-w-2xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            Notifications
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Your activity and updates
          </p>
        </div>
        {hasUnread && (
          <form action={markAllRead}>
            <button
              type="submit"
              className="flex items-center gap-1.5 text-sm font-semibold text-purple-600 dark:text-purple-400 hover:underline shrink-0 mt-1"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          </form>
        )}
      </div>

      {/* ── Empty state ── */}
      {notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-28 gap-3">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Bell className="w-8 h-8 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-lg font-bold text-slate-600 dark:text-slate-300">You&apos;re all caught up!</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center max-w-xs leading-relaxed">
            No notifications yet. When something happens you&apos;ll see it here.
          </p>
        </div>
      )}

      {/* ── Grouped lists ── */}
      <div className="space-y-6">
        {today.length > 0 && <NotificationGroup label="Today" items={today} />}
        {yesterday.length > 0 && <NotificationGroup label="Yesterday" items={yesterday} />}
        {earlier.length > 0 && <NotificationGroup label="Earlier" items={earlier} />}
      </div>
    </div>
  )
}

function NotificationGroup({ label, items }: { label: string; items: Notification[] }) {
  return (
    <section>
      <h2 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">
        {label}
      </h2>
      <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">
        {items.map((n) => (
          <NotificationItem key={n.id} notification={n} />
        ))}
      </div>
    </section>
  )
}
