'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookOpen, Info } from 'lucide-react'
import { markDemoPasswordReset } from '@/lib/demoAuth'
import { AUTH_INPUT_CLASS } from '@/lib/authPassword'
import { DEMO_USERS } from '@/lib/demoUsers'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      const known = DEMO_USERS.some(
        (u) => u.email.toLowerCase() === trimmed.toLowerCase()
      )
      // Same privacy-friendly copy as production (do not reveal whether email exists).
      markDemoPasswordReset(trimmed)
      setInfo(
        known
          ? 'Demo Mode: no email is sent. Continue to choose a new password (login-card passwords stay fixed).'
          : 'If an account exists for that email, a reset link would be sent. In Demo Mode, continue to try the reset form.'
      )
      globalThis.setTimeout(() => {
        router.push('/reset-password')
      }, 1200)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4 pt-[var(--safe-area-top,0px)] dark:from-gray-950 dark:to-gray-900">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800 sm:p-8">
        <div className="mb-4 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-center text-xs text-primary-800 dark:border-primary-800/60 dark:bg-primary-900/40 dark:text-primary-400">
          Demo Mode — mirrors production Forgot Password UI (no real email)
        </div>
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
                    Production sends a secure email link. This demo walks the same screens without
                    SMTP.
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
