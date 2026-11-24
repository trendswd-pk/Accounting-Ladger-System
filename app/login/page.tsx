'use client'

import { FormEvent, Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BookOpen, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { enableBiometricUnlockAfterLogin } from '@/lib/biometricUnlock'
import { clearClientSessionCaches } from '@/lib/clearClientSessionCaches'
import { fetchAppSettings, invalidateAppSettingsCache } from '@/lib/appSettings'

function safeNextPath(raw: string | null): string {
  if (!raw) return '/'
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('://')) return '/'
  if (raw === '/login') return '/'
  return raw
}

async function bootstrapLedger(businessName?: string) {
  const res = await fetch('/api/auth/bootstrap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessName: businessName ?? '' }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      typeof data.error === 'string' ? data.error : 'Could not set up your ledger.'
    )
  }
}

async function prepareFreshSession(businessName?: string) {
  // Drop previous user's in-memory ledger before entering the app shell.
  clearClientSessionCaches()
  await bootstrapLedger(businessName)
  invalidateAppSettingsCache()
  const settings = await fetchAppSettings().catch(() => null)
  // Prefer the name the user typed on signup if API still returned a placeholder.
  const typed = String(businessName ?? '').trim()
  if (
    typed &&
    settings &&
    (!settings.businessName.trim() ||
      settings.businessName.trim().toLowerCase() === 'trends wd')
  ) {
    const { saveAppSettings } = await import('@/lib/appSettings')
    await saveAppSettings({ businessName: typed }).catch(() => undefined)
  }
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = safeNextPath(searchParams.get('next'))

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [headingInfoOpen, setHeadingInfoOpen] = useState(false)

  const switchMode = (next: 'signin' | 'signup') => {
    setMode(next)
    setError(null)
    setInfo(null)
    setConfirmPassword('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    const trimmedEmail = email.trim()
    const trimmedBusiness = businessName.trim()

    if (!trimmedEmail || !password) {
      setError('Email and password are required.')
      return
    }

    if (mode === 'signup') {
      if (!trimmedBusiness) {
        setError('Business name is required.')
        return
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        return
      }
    }

    setLoading(true)
    try {
      const supabase = createClient()

      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: { business_name: trimmedBusiness },
          },
        })
        if (signUpError) {
          setError(signUpError.message || 'Sign up failed.')
          return
        }
        if (!data.session) {
          setInfo(
            'Account created. Check your email to confirm, then sign in. Your private ledger will be ready on first sign-in.'
          )
          setMode('signin')
          setPassword('')
          setConfirmPassword('')
          return
        }
        await prepareFreshSession(trimmedBusiness)
        await enableBiometricUnlockAfterLogin().catch(() => false)
        router.replace(nextPath)
        router.refresh()
        return
      }

      const { error: signError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })
      if (signError) {
        setError(signError.message || 'Sign in failed.')
        return
      }
      // First login after email confirm (or older users): ensure private book exists.
      await prepareFreshSession().catch(() => undefined)
      await enableBiometricUnlockAfterLogin().catch(() => false)
      router.replace(nextPath)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.')
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
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </h1>
            <div className="relative shrink-0">
              <button
                type="button"
                aria-label={
                  mode === 'signin' ? 'About sign in' : 'About create account'
                }
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
                    {mode === 'signin'
                      ? 'Sign in to your private ledger. Each account only sees its own transactions and settings.'
                      : 'Create your own ledger with a business name. Your data stays private to this login.'}
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
            <div className="rounded-md bg-primary-50 px-3 py-2 text-sm text-primary-800 dark:bg-primary-950/40 dark:text-primary-300">
              {info}
            </div>
          ) : null}

          {mode === 'signup' ? (
            <div>
              <label
                htmlFor="signup-business"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Business name
              </label>
              <input
                id="signup-business"
                type="text"
                autoComplete="organization"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                placeholder="Your business name"
                required
              />
            </div>
          ) : null}

          <div>
            <label
              htmlFor="login-email"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label
              htmlFor="login-password"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              placeholder="••••••••"
              required
              minLength={mode === 'signup' ? 6 : undefined}
            />
          </div>
          {mode === 'signup' ? (
            <div>
              <label
                htmlFor="signup-confirm"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Confirm password
              </label>
              <input
                id="signup-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary-600 px-4 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-gray-800"
          >
            {loading
              ? mode === 'signup'
                ? 'Creating account…'
                : 'Signing in…'
              : mode === 'signup'
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-600 dark:text-gray-400">
          {mode === 'signin' ? (
            <>
              New here?{' '}
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="font-medium text-primary-700 hover:underline dark:text-primary-400"
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="font-medium text-primary-700 hover:underline dark:text-primary-400"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
