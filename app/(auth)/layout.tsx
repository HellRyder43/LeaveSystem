import type { Metadata } from 'next'
import { CalendarDays } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Leave Management System',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* ── Left branding panel (desktop only) ──────────────── */}
      <div className="hidden lg:flex lg:w-[52%] bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-500 flex-col items-center justify-center p-12 text-white relative overflow-hidden select-none">
        {/* Background blobs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-indigo-300/20 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-violet-400/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-md text-center space-y-8">
          {/* Logo */}
          <div className="flex items-center justify-center">
            <div className="w-20 h-20 bg-white/15 rounded-3xl flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-xl">
              <CalendarDays className="w-10 h-10 text-white" strokeWidth={1.5} />
            </div>
          </div>

          {/* Headline */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight leading-tight">
              Leave Management
              <br />
              <span className="text-indigo-200">System</span>
            </h1>
            <p className="text-indigo-100 text-lg leading-relaxed mt-4">
              Effortless time-off management for your entire organisation — from application to approval.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {[
              { label: 'Smart Approvals' },
              { label: 'Balance Tracking' },
              { label: 'Team Calendar' },
              { label: 'Real-time Alerts' },
            ].map(({ label }) => (
              <span
                key={label}
                className="px-3 py-1.5 text-sm font-medium bg-white/15 rounded-full border border-white/20 text-indigo-50 backdrop-blur-sm"
              >
                {label}
              </span>
            ))}
          </div>

          {/* Decorative stat strip */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/20">
            {[
              { value: '3 Roles', label: 'Employee · Manager · Admin' },
              { value: '8+ Types', label: 'Leave categories' },
              { value: 'Real-time', label: 'Balance updates' },
            ].map(({ value, label }) => (
              <div key={value} className="text-center">
                <p className="text-xl font-bold text-white">{value}</p>
                <p className="text-xs text-indigo-200 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 px-6 py-12 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
