'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookOpen, Info } from 'lucide-react'
import {
  completeDemoPasswordReset,
  consumeDemoPasswordReset,
} from '@/lib/demoAuth'
import {
  AUTH_INPUT_CLASS,
  MIN_PASSWORD_LENGTH,
  validateNewPasswordPair,
} from '@/lib/authPassword'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [headingInfoOpen, setHeadingInfoOpen] = useState(false)

  useEffect(() => {
    const pending = consumeDemoPasswordReset()
    if (pending?.email) {
      setEmail(pending.email)
      setChecking(false)
      return
    }
    setChecking(false)
    setError('Reset session missing. Request a new link from Forgot password.')
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    const validationError = validateNewPasswordPair(newPassword, confirmPassword)
    if (validationError) {
      setError(validationError)
      return
    }
    if (!email) {
      setError('Reset session is not ready. Request a new link from Forgot password.')
      return
    }
    setLoading(true)
    try {
      completeDemoPasswordReset(email, newPassword)
      setNewPassword('')
      setConfirmPassword('')
      setInfo('Password updated (demo). Sign in with the fixed login-card password.')
      globalThis.setTimeout(() => {
        router.replace('/login')
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4 pt-[var(--safe-area-top,0px)] dark:from-gray-950 dark:to-gray-900">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800 sm:p-8">
        <div className="mb-4 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-center text-xs text-primary-800 dark:border-primary-800/60 dark:bg-primary-900/40 dark:text-primary-400">
          Demo Mode — mirrors production Reset Password UI
        </div>
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
            <BookOpen className="h-6 w-6" aria-hidden />
          </span>
          <div className="flex min-w-0 items-center justify-center gap-2">
            <h1 className="truncate text-xl font-bold text-gray-900 dark:text-gray-100">
              Reset password
            </h1>
            <div className="relative shrink-0">
              <button
                type="button"
                aria-label="About reset password"
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
                    Choose a new password after the forgot-password step. Minimum{' '}
                    {MIN_PASSWORD_LENGTH} characters.
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {checking ? (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Verifying reset link…
          </p>
        ) : (
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

            {email ? (
              <>
                <div>
                  <label
                    htmlFor="reset-new-password"
                    className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    New password
                  </label>
                  <input
                    id="reset-new-password"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={AUTH_INPUT_CLASS}
                    placeholder="••••••••"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                  />
                </div>
                <div>
                  <label
                    htmlFor="reset-confirm-password"
                    className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Confirm new password
                  </label>
                  <input
                    id="reset-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={AUTH_INPUT_CLASS}
                    placeholder="••••••••"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary-600 px-4 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-gray-800"
                >
                  {loading ? 'Updating…' : 'Update password'}
                </button>
              </>
            ) : (
              <Link
                href="/forgot-password"
                className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700"
              >
                Request a new reset link
              </Link>
            )}
          </form>
        )}

        <p className="mt-5 text-center text-sm text-gray-600 dark:text-gray-400">
          <Link
            href="/login"
            className="font-medium text-primary-700 hover:underline dark:text-primary-400"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
