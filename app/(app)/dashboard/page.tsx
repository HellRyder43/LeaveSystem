import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CalendarDays, Clock, TrendingUp, Users } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  const balancePlaceholders = [
    {
      label: 'Annual Leave',
      sub: 'days remaining',
      icon: CalendarDays,
      bgLight: 'bg-purple-50',
      bgDark: 'dark:bg-purple-900/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      barColor: 'bg-purple-500',
      value: '—',
      pct: 60,
    },
    {
      label: 'Sick Leave',
      sub: 'days remaining',
      icon: Clock,
      bgLight: 'bg-blue-50',
      bgDark: 'dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      barColor: 'bg-blue-500',
      value: '—',
      pct: 80,
    },
    {
      label: 'Leave Taken',
      sub: 'days this year',
      icon: TrendingUp,
      bgLight: 'bg-emerald-50',
      bgDark: 'dark:bg-emerald-900/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      barColor: 'bg-emerald-500',
      value: '—',
      pct: 35,
    },
    {
      label: 'Team On Leave',
      sub: 'colleagues out today',
      icon: Users,
      bgLight: 'bg-amber-50',
      bgDark: 'dark:bg-amber-900/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
      barColor: 'bg-amber-500',
      value: '—',
      pct: 20,
    },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">
            Welcome back, {firstName}!
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-0.5">
            Here&apos;s your leave overview for this year.
          </p>
        </div>
        <Link
          href="/leaves/apply"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-bold shadow-md shadow-purple-500/20 hover:shadow-purple-500/30 hover:brightness-110 transition-all duration-150"
        >
          + Request Time Off
        </Link>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {balancePlaceholders.map(({ label, sub, icon: Icon, bgLight, bgDark, iconColor, barColor, value, pct }) => (
          <div
            key={label}
            className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm"
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-tight">
                {label}
              </p>
              <div className={`w-8 h-8 rounded-xl ${bgLight} ${bgDark} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-0.5">{value}</p>
            <p className="text-xs text-slate-400 mb-3">{sub}</p>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${barColor} rounded-full opacity-40`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Placeholder notice */}
      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 px-6 py-10 text-center">
        <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">
          Balance data, recent leave history, and the &quot;Who&apos;s Out Today&quot; widget will be connected in
          <span className="text-purple-600 dark:text-purple-400"> Phase 6 — UC002 Employee Dashboard</span>.
        </p>
      </div>
    </div>
  )
}
