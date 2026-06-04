'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body className="font-sans bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 antialiased">
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="text-center max-w-md space-y-4">
            <div className="text-5xl">⚠️</div>
            <h2 className="text-2xl font-black text-slate-800">Something went wrong</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              {error.message || 'An unexpected error occurred. Please try again.'}
            </p>
            {error.digest && (
              <p className="text-xs text-slate-400 font-mono">Error ID: {error.digest}</p>
            )}
            <Button onClick={reset} className="mt-2">Try again</Button>
          </div>
        </div>
      </body>
    </html>
  )
}
