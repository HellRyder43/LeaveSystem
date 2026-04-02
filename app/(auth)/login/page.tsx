'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, CalendarDays } from 'lucide-react'

import { signIn } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ActionResult } from '@/lib/types/app'

const initialState: ActionResult = { success: false }

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, initialState)
  const [showPassword, setShowPassword]   = useState(false)
  const searchParams = useSearchParams()

  const errorParam   = searchParams.get('error')
  const messageParam = searchParams.get('message')

  const bannerError =
    errorParam === 'deactivated'
      ? 'Your account has been deactivated. Please contact your administrator.'
      : errorParam === 'auth_callback_error'
      ? 'The authentication link is invalid or has expired. Please try again.'
      : null

  const bannerSuccess =
    messageParam === 'password_updated'
      ? 'Password updated successfully. You can now sign in.'
      : null

  return (
    <div className="w-full max-w-md space-y-8">
      {/* Mobile logo (hidden on desktop where the left panel shows it) */}
      <div className="flex flex-col items-center gap-3 lg:hidden">
        <div className="w-14 h-14 bg-gradient-to-br from-violet-600 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
          <CalendarDays className="w-7 h-7 text-white" strokeWidth={1.5} />
        </div>
        <p className="text-xl font-bold text-slate-800">Leave Management System</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
          <p className="text-sm text-slate-500">Sign in to your account to continue</p>
        </div>

        {/* Query-param banners */}
        {bannerError && (
          <div className="flex items-start gap-3 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{bannerError}</span>
          </div>
        )}
        {bannerSuccess && (
          <div className="flex items-start gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{bannerSuccess}</span>
          </div>
        )}

        {/* Action error */}
        {!state.success && state.error && (
          <div className="flex items-start gap-3 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        <form action={action} className="space-y-5">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email address
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@company.com"
              disabled={pending}
              className="h-10"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                Password
              </Label>
              <Link
                href="/reset-password"
                className="text-xs font-medium text-violet-600 hover:text-violet-700 hover:underline underline-offset-2 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                placeholder="••••••••"
                disabled={pending}
                className="h-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                disabled={pending}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <div className="flex items-center gap-2.5">
            <input
              id="remember"
              name="remember"
              type="checkbox"
              className="w-4 h-4 rounded border-slate-300 text-violet-600 accent-violet-600 cursor-pointer"
            />
            <Label
              htmlFor="remember"
              className="text-sm text-slate-600 cursor-pointer select-none"
            >
              Keep me signed in
            </Label>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={pending}
            className="w-full h-10 bg-violet-600 hover:bg-violet-700 text-white font-semibold transition-colors"
          >
            {pending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>
      </div>

      <p className="text-center text-xs text-slate-400">
        Leave Management System &copy; {new Date().getFullYear()}
      </p>
    </div>
  )
}
