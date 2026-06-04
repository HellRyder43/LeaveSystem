import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PolicySettingsForm } from '@/components/admin/PolicySettingsForm'
import { getSystemSettings } from '@/lib/actions/admin'

export default async function PoliciesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'Admin') redirect('/dashboard')

  const settingsResult = await getSystemSettings()

  if (!settingsResult.success || !settingsResult.data) {
    return (
      <div className="p-6 text-sm text-slate-500">
        Failed to load system settings: {settingsResult.error}
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Leave Policies</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-0.5">
          Entitlement tiers, approval SLA, carry-forward rules, and system-wide settings.
        </p>
      </div>
      <PolicySettingsForm settings={settingsResult.data} />
    </div>
  )
}
