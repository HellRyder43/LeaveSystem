'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { useSession } from '@/components/providers/SessionProvider'
import { signOut } from '@/lib/actions/auth'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  CalendarDays,
  CalendarRange,
  Users,
  Bell,
  CheckSquare,
  UserCog,
  Settings,
  Calendar,
  FileText,
  BarChart2,
  ClipboardList,
  LogOut,
  X,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

const commonNav: NavItem[] = [
  { label: 'Dashboard',      href: '/dashboard',     icon: LayoutDashboard },
  { label: 'My Leaves',      href: '/leaves',        icon: CalendarDays    },
  { label: 'Team Calendar',  href: '/calendar',      icon: CalendarRange   },
  { label: "Who's Out Today", href: '/whos-out',     icon: Users           },
  { label: 'Notifications',  href: '/notifications', icon: Bell            },
]

const managerNav: NavItem[] = [
  { label: 'Team Approvals', href: '/manager/approvals', icon: CheckSquare },
]

const adminNav: NavItem[] = [
  { label: 'Manage Employees', href: '/admin/employees',         icon: UserCog     },
  { label: 'Leave Types',      href: '/admin/leave-types',       icon: Settings    },
  { label: 'Holiday Calendar', href: '/admin/holidays',          icon: Calendar    },
  { label: 'Leave Policies',   href: '/admin/policies',          icon: FileText    },
  { label: 'Reports',          href: '/admin/reports',           icon: BarChart2   },
  { label: 'Audit Log',        href: '/admin/audit-log',         icon: ClipboardList },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

function NavLink({
  item,
  pathname,
  onClose,
}: {
  item: NavItem
  pathname: string
  onClose: () => void
}) {
  const isActive =
    item.href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(item.href)

  const Icon = item.icon

  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150',
        isActive
          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
      )}
    >
      <Icon
        className={cn(
          'w-5 h-5 shrink-0',
          isActive ? 'text-purple-600 dark:text-purple-400' : ''
        )}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {isActive && (
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
      )}
    </Link>
  )
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const user = useSession()
  const [isPending, startTransition] = useTransition()

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut()
    })
  }

  const isManager = user.role === 'Manager' || user.role === 'Admin'
  const isAdmin   = user.role === 'Admin'

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <Image src="/images/scs_logo.png" alt="SCS Logo" width={36} height={36} className="object-contain" />
          <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600 tracking-tight">
            LMS
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close sidebar"
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {commonNav.map(item => (
          <NavLink key={item.href} item={item} pathname={pathname} onClose={onClose} />
        ))}

        {isManager && (
          <div className="pt-5">
            <p className="px-3 pb-2 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Management
            </p>
            <div className="space-y-0.5">
              {managerNav.map(item => (
                <NavLink key={item.href} item={item} pathname={pathname} onClose={onClose} />
              ))}
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="pt-5">
            <p className="px-3 pb-2 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Administration
            </p>
            <div className="space-y-0.5">
              {adminNav.map(item => (
                <NavLink key={item.href} item={item} pathname={pathname} onClose={onClose} />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* User profile + sign out */}
      <div className="px-3 py-4 border-t border-slate-200 dark:border-slate-800 shrink-0 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white text-sm font-bold shrink-0">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">
              {user.full_name}
            </p>
            <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 leading-tight">
              {user.role}
            </p>
          </div>
        </div>

        <form action={signOut}>
          <button
            type="submit"
            disabled={isPending}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {isPending ? 'Signing out…' : 'Sign Out'}
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar — fixed */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 md:hidden transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
