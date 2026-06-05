import type { Metadata } from 'next'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'Leave Management System',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* ── Left branding panel (desktop only) ──────────────── */}
      <div
        className="hidden lg:flex lg:w-[52%] flex-col items-center justify-center p-12 text-white relative overflow-hidden select-none"
        style={{
          backgroundImage: 'url(/images/background-login.jpeg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-violet-900/60 backdrop-blur-[0px] pointer-events-none" />

        <div className="relative z-10 max-w-md text-center space-y-8">
          {/* Logo */}
          <div className="flex items-center justify-center">
            <div className="w-24 h-24 flex items-center justify-center">
              <Image src="/images/scs_logo.png" alt="SCS Logo" width={96} height={96} className="object-contain" />
            </div>
          </div>

          {/* Headline */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight leading-tight whitespace-nowrap">
              Leave Management <span className="text-indigo-200">System</span>
            </h1>
            <p className="text-indigo-100 text-lg leading-relaxed mt-4">
              Effortless time-off management for your entire organisation from application to approval.
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
