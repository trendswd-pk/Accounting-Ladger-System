'use client'

import { FormEvent, Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BookOpen, Shield, UserCheck, Eye } from 'lucide-react'
import {
  listDemoLoginCards,
  signInDemo,
  signInDemoAccount,
} from '@/lib/demoAuth'
import { ensureDemoSeeded } from '@/lib/demoSeed'
import { roleLabel, type DemoUser } from '@/lib/demoUsers'

function safeNextPath(raw: string | null): string {
  if (!raw) return '/'
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('://')) return '/'
  if (raw === '/login') return '/'
  return raw
}

function roleIcon(role: DemoUser['role']) {
  if (role === 'admin') return Shield
  if (role === 'editor') return UserCheck
  return Eye
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = safeNextPath(searchParams.get('next'))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const cards = listDemoLoginCards()

  const finishSignIn = () => {
    router.replace(nextPath)
    router.refresh()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      setError('Email and password are required.')
      return
    }
    setLoading(true)
    try {
      const signedIn = signInDemo(trimmedEmail, password)
      ensureDemoSeeded(signedIn.id)
      finishSignIn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleCardClick = (user: DemoUser) => {
    setError(null)
    setEmail(user.email)
    setPassword(user.password)
    setLoading(true)
    try {
      const signedIn = signInDemoAccount(user)
      ensureDemoSeeded(signedIn.id)
      finishSignIn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200 px-4 py-10 dark:from-gray-950 dark:to-gray-900">
      <div className="w-full max-w-lg">
        <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-center dark:border-sky-800/60 dark:bg-sky-950/40">
          <p className="text-sm font-medium text-sky-800 dark:text-sky-200">
            Demo Mode — offline sample data, no production backend
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800 sm:p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
              <BookOpen className="h-6 w-6" aria-hidden />
            </span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Accounting Ledger (Demo)
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Choose a demo account or sign in with the credentials shown below.
            </p>
          </div>

          <div className="mb-6 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Demo accounts
            </p>
            {cards.map(({ user, label, description }) => {
              const Icon = roleIcon(user.role)
              return (
                <button
                  key={user.id}
                  type="button"
                  disabled={loading}
                  onClick={() => handleCardClick(user)}
                  className="flex w-full items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-left transition-colors hover:border-primary-400 hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900/40 dark:hover:border-primary-500 dark:hover:bg-gray-700/60"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {label}
                      </span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600">
                        {roleLabel(user.role)}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-gray-600 dark:text-gray-300">
                      {user.email}
                    </span>
                    <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                      {description}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {error ? (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
                {error}
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary-600 px-4 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-gray-800"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
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
