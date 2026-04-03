import { CheckSquare, Clock, Users, BarChart2 } from 'lucide-react'
import Link from 'next/link'

export default function ManagerDashboardPage() {
  const quickLinks = [
    {
      label: 'Team Approvals',
      desc: 'Review and act on pending leave requests',
      href: '/manager/approvals',
      icon: CheckSquare,
      bgLight: 'bg-purple-50',
      bgDark: 'dark:bg-purple-900/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      label: 'Team Calendar',
      desc: 'View department leave calendar',
      href: '/calendar',
      icon: Clock,
      bgLight: 'bg-blue-50',
      bgDark: 'dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: "Who\u2019s Out Today",
      desc: 'See which team members are on leave',
      href: '/whos-out',
      icon: Users,
      bgLight: 'bg-emerald-50',
      bgDark: 'dark:bg-emerald-900/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'My Dashboard',
      desc: 'View your own leave balances',
      href: '/dashboard',
      icon: BarChart2,
      bgLight: 'bg-amber-50',
      bgDark: 'dark:bg-amber-900/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">
          Manager Dashboard
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-0.5">
          Manage your team&apos;s leave requests and coverage.
        </p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quickLinks.map(({ label, desc, href, icon: Icon, bgLight, bgDark, iconColor }) => (
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

      {/* SLA summary placeholder */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">Pending Approvals</h3>
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 px-6 py-8 text-center">
          <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">
            Approval queue with SLA countdowns will be available in
            <span className="text-purple-600 dark:text-purple-400"> Phase 9 — UC005 Approvals Dashboard</span>.
          </p>
        </div>
      </div>
    </div>
  )
}
