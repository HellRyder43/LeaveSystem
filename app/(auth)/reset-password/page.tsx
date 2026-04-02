'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft, Mail } from 'lucide-react'

import { sendPasswordReset } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ActionResult } from '@/lib/types/app'

const initialState: ActionResult = { success: false }

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState(sendPasswordReset, initialState)

  if (state.success) {
    return (
      <div className="w-full max-w-md space-y-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6 text-center">
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">Check your inbox</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              If an account exists for that email address, we&apos;ve sent a password reset link.
              The link expires in 24 hours.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 text-left">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Don&apos;t forget to check your spam or junk folder.</span>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-700 hover:underline underline-offset-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-900">Reset password</h2>
          <p className="text-sm text-slate-500">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        {!state.success && state.error && (
          <div className="flex items-start gap-3 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        <form action={action} className="space-y-5">
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

          <Button
            type="submit"
            disabled={pending}
            className="w-full h-10 bg-violet-600 hover:bg-violet-700 text-white font-semibold transition-colors"
          >
            {pending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending…
              </>
            ) : (
              'Send reset link'
            )}
          </Button>
        </form>

        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 hover:text-violet-700 hover:underline underline-offset-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
