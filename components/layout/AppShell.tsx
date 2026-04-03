'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Navbar from '@/components/Navbar'

/**
 * AppShell — client wrapper that manages mobile sidebar state.
 * Sidebar (fixed, desktop) + Navbar (sticky top header) + main content.
 * Children are server-rendered and passed as a slot — they remain server components.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-[#f8f9ff] dark:bg-slate-950">
      {/* Sidebar (fixed on desktop, overlay on mobile) */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main column — offset by sidebar width on desktop */}
      <div className="flex flex-col flex-1 min-h-screen md:pl-64">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 relative overflow-hidden">
          {/* Ambient background gradients */}
          <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-purple-300/20 dark:bg-purple-900/10 blur-[110px]" />
            <div className="absolute top-[15%] right-[-5%] w-[35%] h-[55%] rounded-full bg-blue-300/20 dark:bg-blue-900/10 blur-[130px]" />
            <div className="absolute bottom-[-10%] left-[15%] w-[55%] h-[45%] rounded-full bg-pink-300/15 dark:bg-pink-900/10 blur-[110px]" />
          </div>

          {children}
        </main>
      </div>
    </div>
  )
}
