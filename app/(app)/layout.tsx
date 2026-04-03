import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SessionProvider } from '@/components/providers/SessionProvider'
import AppShell from '@/components/layout/AppShell'
import type { SessionUser } from '@/lib/types/app'

/**
 * Authenticated app layout.
 * Fetches the session server-side, validates the user, and injects it into
 * SessionProvider so all child client components can call useSession().
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('id, email, full_name, role, department_id, is_active, join_date')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.is_active) {
    redirect('/login?error=deactivated')
  }

  return (
    <SessionProvider user={profile as SessionUser}>
      <AppShell>
        {children}
      </AppShell>
    </SessionProvider>
  )
}
