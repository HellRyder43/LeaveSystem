import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UserCog, Settings, Calendar, FileText, BarChart2, ClipboardList, Sliders } from 'lucide-react'
import Link from 'next/link'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'Admin') redirect('/dashboard')

  const sections = [
    {
      label: 'Manage Employees',
      desc: 'Onboard, deactivate, and transfer employees',
      href: '/admin/employees',
      icon: UserCog,
      bgLight: 'bg-purple-50',
      bgDark: 'dark:bg-purple-900/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      label: 'Leave Types',
      desc: 'Configure leave type policies and quotas',
      href: '/admin/leave-types',
      icon: Settings,
      bgLight: 'bg-blue-50',
      bgDark: 'dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Holiday Calendar',
      desc: 'Add and manage public holidays',
      href: '/admin/holidays',
      icon: Calendar,
      bgLight: 'bg-emerald-50',
      bgDark: 'dark:bg-emerald-900/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Leave Policies',
      desc: 'Entitlement tiers, SLA, carry-forward settings',
      href: '/admin/policies',
      icon: FileText,
      bgLight: 'bg-amber-50',
      bgDark: 'dark:bg-amber-900/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Reports & Analytics',
      desc: 'Utilization, liability, and payroll exports',
      href: '/admin/reports',
      icon: BarChart2,
      bgLight: 'bg-rose-50',
      bgDark: 'dark:bg-rose-900/20',
      iconColor: 'text-rose-600 dark:text-rose-400',
    },
    {
      label: 'Audit Log',
      desc: 'Full history of all system actions',
      href: '/admin/audit-log',
      icon: ClipboardList,
      bgLight: 'bg-slate-50',
      bgDark: 'dark:bg-slate-800/40',
      iconColor: 'text-slate-600 dark:text-slate-400',
    },
    {
      label: 'Balance Adjustment',
      desc: 'Manually adjust any employee leave balance',
      href: '/admin/balance-adjustment',
      icon: Sliders,
      bgLight: 'bg-indigo-50',
      bgDark: 'dark:bg-indigo-900/20',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
    },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">
          Admin Dashboard
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-0.5">
          Configure the system, manage employees, and generate reports.
        </p>
      </div>

      {/* Admin sections grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map(({ label, desc, href, icon: Icon, bgLight, bgDark, iconColor }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-start gap-4 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-150"
          >
            <div className={`w-10 h-10 rounded-xl ${bgLight} ${bgDark} flex items-center justify-center shrink-0 mt-0.5`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                {label}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
