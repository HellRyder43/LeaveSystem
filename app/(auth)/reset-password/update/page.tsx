'use client'

import { useActionState, useState } from 'react'
import { Eye, EyeOff, Loader2, AlertCircle, ShieldCheck } from 'lucide-react'

import { updatePassword } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ActionResult } from '@/lib/types/app'

const initialState: ActionResult = { success: false }

export default function UpdatePasswordPage() {
  const [state, action, pending] = useActionState(updatePassword, initialState)
  const [showPassword, setShowPassword]        = useState(false)
  const [showConfirm,  setShowConfirm]         = useState(false)

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-violet-600" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-slate-900">Set new password</h2>
            <p className="text-sm text-slate-500">
              Choose a strong password of at least 8 characters.
            </p>
          </div>
        </div>

        {!state.success && state.error && (
          <div className="flex items-start gap-3 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        <form action={action} className="space-y-5">
          {/* New password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-slate-700">
              New password
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="Min. 8 characters"
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
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div className="space-y-2">
            <Label htmlFor="confirm_password" className="text-sm font-medium text-slate-700">
              Confirm new password
            </Label>
            <div className="relative">
              <Input
                id="confirm_password"
                name="confirm_password"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                required
                placeholder="Repeat your password"
                disabled={pending}
                className="h-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                disabled={pending}
                aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={pending}
            className="w-full h-10 bg-violet-600 hover:bg-violet-700 text-white font-semibold transition-colors"
          >
            {pending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating…
              </>
            ) : (
              'Update password'
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
