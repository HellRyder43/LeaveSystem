import { formatDistanceToNow } from 'date-fns'
import {
  FileText, CheckCircle, XCircle, Ban,
  Clock, AlertTriangle, UserCheck, BarChart2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Notification, NotificationType } from '@/lib/types/app'

// ─── Icon + colour config per notification type ───────────────────────────────

const TYPE_META: Record<
  NotificationType,
  { icon: React.ElementType; iconColor: string; iconBg: string }
> = {
  LeaveSubmitted:   { icon: FileText,       iconColor: 'text-purple-600 dark:text-purple-400',  iconBg: 'bg-purple-100 dark:bg-purple-900/30'  },
  LeaveApproved:    { icon: CheckCircle,    iconColor: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  LeaveRejected:    { icon: XCircle,        iconColor: 'text-rose-600 dark:text-rose-400',       iconBg: 'bg-rose-100 dark:bg-rose-900/30'       },
  LeaveCancelled:   { icon: Ban,            iconColor: 'text-slate-500 dark:text-slate-400',     iconBg: 'bg-slate-100 dark:bg-slate-800'        },
  ApprovalReminder: { icon: Clock,          iconColor: 'text-amber-600 dark:text-amber-400',     iconBg: 'bg-amber-100 dark:bg-amber-900/30'     },
  EscalationAlert:  { icon: AlertTriangle,  iconColor: 'text-orange-600 dark:text-orange-400',   iconBg: 'bg-orange-100 dark:bg-orange-900/30'   },
  DelegateAssigned: { icon: UserCheck,      iconColor: 'text-blue-600 dark:text-blue-400',       iconBg: 'bg-blue-100 dark:bg-blue-900/30'       },
  YearEndSummary:   { icon: BarChart2,      iconColor: 'text-purple-600 dark:text-purple-400',   iconBg: 'bg-purple-100 dark:bg-purple-900/30'   },
}

// ─── Component ────────────────────────────────────────────────────────────────

interface NotificationItemProps {
  notification: Notification
  /** When true, hides the body text. Used in the bell dropdown. */
  compact?: boolean
}

export function NotificationItem({ notification, compact = false }: NotificationItemProps) {
  const meta = TYPE_META[notification.type]
  const Icon = meta.icon
  const isUnread = !notification.is_read

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 transition-colors',
        isUnread
          ? 'bg-purple-50/70 dark:bg-purple-900/10 hover:bg-purple-50 dark:hover:bg-purple-900/20'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
      )}
    >
      {/* Unread dot */}
      <div className="shrink-0 pt-1.5 w-2">
        {isUnread && <span className="block w-2 h-2 rounded-full bg-rose-500" />}
      </div>

      {/* Icon circle */}
      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', meta.iconBg)}>
        <Icon className={cn('w-4 h-4', meta.iconColor)} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm leading-snug',
            isUnread
              ? 'font-semibold text-slate-900 dark:text-slate-100'
              : 'font-medium text-slate-700 dark:text-slate-300',
          )}
        >
          {notification.title}
        </p>
        {!compact && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
            {notification.body}
          </p>
        )}
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{timeAgo}</p>
      </div>
    </div>
  )
}
