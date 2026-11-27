'use client'

import { FormEvent, Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { BookOpen, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AUTH_INPUT_CLASS, authRedirectOrigin } from '@/lib/authPassword'

function ForgotPasswordForm() {
  const searchParams = useSearchParams()
  const linkError = searchParams.get('error') === 'reset_link_invalid'

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(
    linkError ? 'That reset link is invalid or expired. Request a new one below.' : null
  )
  const [info, setInfo] = useState<string | null>(null)
  const [headingInfoOpen, setHeadingInfoOpen] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    const trimmed = email.trim()
    if (!trimmed) {
      setError('Email is required.')
      return
    }
    setLoading(true)
    try {
      const origin = authRedirectOrigin()
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent('/reset-password')}`
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo,
      })
      if (resetError) throw resetError
      setInfo(
        'If an account exists for that email, we sent a reset link. Open it on this device to choose a new password.'
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4 pt-[var(--safe-area-top,0px)] dark:from-gray-950 dark:to-gray-900">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800 sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
            <BookOpen className="h-6 w-6" aria-hidden />
          </span>
          <div className="flex min-w-0 items-center justify-center gap-2">
            <h1 className="truncate text-xl font-bold text-gray-900 dark:text-gray-100">
              Forgot password
            </h1>
            <div className="relative shrink-0">
              <button
                type="button"
                aria-label="About forgot password"
                aria-expanded={headingInfoOpen}
                onClick={() => setHeadingInfoOpen((v) => !v)}
                className="rounded-md p-1 text-gray-500 hover:bg-primary-50 hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                <Info className="h-5 w-5" aria-hidden />
              </button>
              {headingInfoOpen ? (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setHeadingInfoOpen(false)}
                    aria-hidden
                  />
                  <div
                    role="dialog"
                    className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-3 text-left text-sm text-gray-600 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  >
                    We email a secure link to reset your password. The link works in the browser and
                    in the Android app WebView on this same site.
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {error ? (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          ) : null}
          {info ? (
            <div className="rounded-md bg-primary-50 px-3 py-2 text-sm text-primary-800 dark:bg-primary-900/40 dark:text-primary-400">
              {info}
            </div>
          ) : null}

          <div>
            <label
              htmlFor="forgot-email"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Email
            </label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={AUTH_INPUT_CLASS}
              placeholder="you@example.com"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary-600 px-4 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-gray-800"
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-600 dark:text-gray-400">
          Remembered it?{' '}
          <Link
            href="/login"
            className="font-medium text-primary-700 hover:underline dark:text-primary-400"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  )
}
