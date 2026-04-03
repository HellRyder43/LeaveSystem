'use client'

import { usePathname } from 'next/navigation'
import { Bell, Menu, Sun } from 'lucide-react'
import { useSession } from '@/components/providers/SessionProvider'
import { ThemeToggle } from './ThemeToggle'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':               'Dashboard',
  '/leaves':                  'My Leaves',
  '/leaves/apply':            'Request Leave',
  '/calendar':                'Team Calendar',
  '/whos-out':                "Who's Out Today",
  '/notifications':           'Notifications',
  '/manager':                 'Manager Dashboard',
  '/manager/approvals':       'Team Approvals',
  '/admin':                   'Admin Dashboard',
  '/admin/employees':         'Manage Employees',
  '/admin/leave-types':       'Leave Types',
  '/admin/holidays':          'Holiday Calendar',
  '/admin/policies':          'Leave Policies',
  '/admin/reports':           'Reports',
  '/admin/audit-log':         'Audit Log',
  '/admin/balance-adjustment':'Balance Adjustment',
}

interface NavbarProps {
  onMenuClick: () => void
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const pathname = usePathname()
  const user = useSession()

  const pageTitle = PAGE_TITLES[pathname] ?? 'Leave Management'

  return (
    <header className="h-16 shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 sticky top-0 z-20 flex items-center px-4 sm:px-6 gap-4">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        aria-label="Open navigation"
        className="md:hidden p-2 -ml-1 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Logo — mobile only (sidebar is hidden) */}
      <div className="md:hidden flex items-center gap-2">
        <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center rotate-3">
          <Sun className="w-4 h-4 text-white" />
        </div>
        <span className="text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
          Oasis
        </span>
      </div>

      {/* Page title — desktop only */}
      <h1 className="hidden md:block text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">
        {pageTitle}
      </h1>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <ThemeToggle />

        {/* Notification bell — badge added in Phase 10 */}
        <button
          aria-label="Notifications"
          className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Bell className="w-5 h-5" />
        </button>

        {/* User chip — desktop only (mobile: shown in sidebar) */}
        <div className="hidden sm:flex items-center gap-2.5 pl-3 ml-1 border-l border-slate-200 dark:border-slate-700">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{user.full_name}</p>
            <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">{user.role}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
