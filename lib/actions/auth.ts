'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/types/app'

/**
 * Sign in with email and password.
 * On success, redirects to the role-based home page.
 * On failure, returns { success: false, error }.
 */
export async function signIn(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()

  const email    = (formData.get('email') as string ?? '').trim()
  const password = formData.get('password') as string ?? ''

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    const msg =
      error.message === 'Invalid login credentials'
        ? 'Invalid email or password. Please try again.'
        : error.message
    return { success: false, error: msg }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Authentication failed. Please try again.' }

  const { data: profile } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (!profile) {
    await supabase.auth.signOut()
    return { success: false, error: 'User profile not found. Please contact your administrator.' }
  }

  if (!profile.is_active) {
    await supabase.auth.signOut()
    return {
      success: false,
      error: 'Your account has been deactivated. Please contact your administrator.',
    }
  }

  revalidatePath('/', 'layout')

  const dest =
    profile.role === 'Admin'   ? '/admin' :
    profile.role === 'Manager' ? '/manager' :
                                 '/dashboard'
  redirect(dest)
}

/**
 * Sign out the current user and redirect to /login.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

/**
 * Send a password reset email.
 * Returns { success: true } on success (email sent or user not found — same response to prevent enumeration).
 */
export async function sendPasswordReset(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const email = (formData.get('email') as string ?? '').trim()

  const headersList = await headers()
  const origin = headersList.get('origin') ?? 'http://localhost:3000'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password/update`,
  })

  // Always return success to prevent email enumeration
  if (error && error.message !== 'User not found') {
    return { success: false, error: 'Failed to send reset email. Please try again.' }
  }

  return { success: true }
}

/**
 * Update the authenticated user's password (called after clicking the email reset link).
 * On success, redirects to /login with a success message.
 */
export async function updatePassword(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()

  const password        = formData.get('password') as string ?? ''
  const confirmPassword = formData.get('confirm_password') as string ?? ''

  if (password !== confirmPassword) {
    return { success: false, error: 'Passwords do not match.' }
  }

  if (password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters long.' }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/login?message=password_updated')
}
