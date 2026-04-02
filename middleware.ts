import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/types/database'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  // Create a Supabase client for middleware — handles session token refresh
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() verifies the session server-side and refreshes the token if needed.
  // Always prefer getUser() over getSession() in middleware.
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isAuthRoute =
    pathname === '/login' ||
    pathname === '/reset-password' ||      // exact — /reset-password/update must stay accessible to authenticated users
    pathname.startsWith('/auth')

  // ── Unauthenticated ──────────────────────────────────────────────
  if (!user) {
    if (isAuthRoute) return response
    const url = new URL('/login', request.url)
    return NextResponse.redirect(url)
  }

  // ── Authenticated: fetch profile to check is_active and role ─────
  const { data: profile } = await supabase
    .from('users')
    .select('is_active, role')
    .eq('id', user.id)
    .single()

  // Deactivated users: allow only auth routes (so they can see the error + sign out)
  if (!profile || !profile.is_active) {
    if (isAuthRoute) return response
    const url = new URL('/login', request.url)
    url.searchParams.set('error', 'deactivated')
    return NextResponse.redirect(url)
  }

  // Active authenticated user: redirect away from auth pages
  if (isAuthRoute) {
    const role = profile.role
    const dest =
      role === 'Admin'   ? '/admin' :
      role === 'Manager' ? '/manager' :
                           '/dashboard'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  const role = profile.role

  // ── Route guards ─────────────────────────────────────────────────
  // /admin/* — Admin only
  if (pathname.startsWith('/admin') && role !== 'Admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // /manager/* — Manager or Admin only
  if (pathname.startsWith('/manager') && role === 'Employee') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (Next.js static files)
     * - _next/image  (Next.js image optimisation)
     * - favicon.ico
     * - Static assets with image extensions
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
