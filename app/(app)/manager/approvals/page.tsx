import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPendingApprovals } from '@/lib/actions/approvals'
import { ApprovalQueue } from '@/components/approvals/ApprovalQueue'
import type { UserRole } from '@/lib/types/app'

export default async function ApprovalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Only Manager and Admin can access this page
  const { data: profile } = await supabase
    .from('users')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const userRole = profile.role as UserRole

  if (userRole !== 'Manager' && userRole !== 'Admin') {
    redirect('/dashboard')
  }

  const result = await getPendingApprovals(user.id, userRole)
  const requests = result.data?.requests ?? []
  const slaLimitDays = result.data?.slaLimitDays ?? 5

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">
          Team Approvals
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {userRole === 'Admin'
            ? 'All pending leave requests across the organisation'
            : 'Pending leave requests from your team'}
          {' '}· SLA: {slaLimitDays} working days
        </p>
      </div>

      <ApprovalQueue
        initialRequests={requests}
        slaLimitDays={slaLimitDays}
        viewerRole={userRole}
      />
    </div>
  )
}
