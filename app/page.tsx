import { redirect } from 'next/navigation'

// Root route — redirect all authenticated traffic to /dashboard.
// Unauthenticated users are redirected to /login by middleware before reaching here.
export default function Home() {
  redirect('/dashboard')
}
