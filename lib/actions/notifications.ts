'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import type { NotificationType, ActionResult, Notification } from '@/lib/types/app'

// ─── Templates ───────────────────────────────────────────────────────────────

const TEMPLATES: Record<NotificationType, { title: string; body: string }> = {
  LeaveSubmitted: {
    title: 'Leave Request Submitted',
    body: 'A leave request has been submitted and is awaiting approval.',
  },
  LeaveApproved: {
    title: 'Leave Approved',
    body: 'Your leave request has been approved.',
  },
  LeaveRejected: {
    title: 'Leave Rejected',
    body: 'Your leave request has been rejected. See the approver comment for details.',
  },
  LeaveCancelled: {
    title: 'Leave Cancelled',
    body: 'A leave request has been cancelled.',
  },
  ApprovalReminder: {
    title: 'Approval Reminder',
    body: 'You have a pending leave request that has been awaiting approval for 3 working days.',
  },
  EscalationAlert: {
    title: 'Leave Approval Escalated',
    body: 'A leave request has exceeded the SLA and has been escalated for your attention.',
  },
  DelegateAssigned: {
    title: 'Delegate Approver Assigned',
    body: 'You have been assigned as a delegate approver to handle your team\'s leave requests.',
  },
  YearEndSummary: {
    title: 'Year-End Leave Processing Complete',
    body: 'Year-end carry-forward processing has completed. Check your updated leave balances.',
  },
}

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Send a notification to a user.
 * Non-blocking — catches all errors internally; call with .catch(() => {}) from parent actions.
 */
export async function sendNotification(
  userId: string,
  type: NotificationType,
  relatedRequestId?: string
): Promise<void> {
  try {
    const serviceClient = createServiceClient()
    const template = TEMPLATES[type]

    await serviceClient.from('notifications').insert({
      user_id: userId,
      type,
      title: template.title,
      body: template.body,
      related_request_id: relatedRequestId ?? null,
      is_read: false,
    })
  } catch (err) {
    console.error('[sendNotification] Failed to send notification:', err)
  }
}

/**
 * Fetch recent notifications + unread count for a user.
 * Used by the bell dropdown (limit 10) and the full notifications page (limit 100).
 */
export async function getNotificationsPreview(
  userId: string,
  limit = 10
): Promise<ActionResult<{ notifications: Notification[]; unreadCount: number }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== userId) return { success: false, error: 'Not authenticated.' }

  const [notifResult, countResult] = await Promise.all([
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false),
  ])

  if (notifResult.error) return { success: false, error: notifResult.error.message }

  return {
    success: true,
    data: {
      notifications: notifResult.data ?? [],
      unreadCount: countResult.count ?? 0,
    },
  }
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(notificationId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/notifications')
  return { success: true }
}

/**
 * Mark all of a user's notifications as read.
 */
export async function markAllNotificationsRead(userId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== userId) return { success: false, error: 'Not authenticated.' }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) return { success: false, error: error.message }

  revalidatePath('/notifications')
  return { success: true }
}
