'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { clearClientSessionCaches } from '@/lib/clearClientSessionCaches'
import { fetchAppSettings, invalidateAppSettingsCache } from '@/lib/appSettings'
import { enableBiometricUnlockAfterLogin } from '@/lib/biometricUnlock'
import { safeAuthNextPath } from '@/lib/authCallback'

async function bootstrapLedger() {
  const res = await fetch('/api/auth/bootstrap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      typeof data.error === 'string' ? data.error : 'Could not set up your ledger.'
    )
  }
}

function AuthContinueInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = safeAuthNextPath(searchParams.get('next'), '/')
  const flow = searchParams.get('flow')
  const isVerify = flow === 'verify' || flow === 'email'
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState(
    isVerify ? 'Confirming your email…' : 'Completing sign-in…'
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const supabase = createClient()
        // Prefer getUser() so we hit Auth and refresh email_confirmed_at after verify.
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()
        if (cancelled) return

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (userError || !session || !user) {
          setError(
            isVerify
              ? 'Email verification did not complete. Open the link from your email again, or sign in after confirming.'
              : 'Sign-in session missing. Open the email link again, or sign in manually.'
          )
          return
        }

        if (nextPath === '/reset-password') {
          router.replace('/reset-password')
          return
        }

        if (isVerify) {
          setStatus('Email confirmed. Setting up your ledger…')
        }

        clearClientSessionCaches()
        await bootstrapLedger().catch(() => undefined)
        invalidateAppSettingsCache()
        await fetchAppSettings().catch(() => null)
        await enableBiometricUnlockAfterLogin().catch(() => undefined)
        if (cancelled) return
        router.replace(nextPath === '/auth/continue' ? '/' : nextPath)
        router.refresh()
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not complete sign-in.')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isVerify, nextPath, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4 dark:from-gray-950 dark:to-gray-900">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-lg dark:border-gray-700 dark:bg-gray-800">
        {error ? (
          <>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            <Link
              href="/login"
              className="mt-4 inline-flex text-sm font-medium text-primary-700 hover:underline dark:text-primary-400"
            >
              Back to sign in
            </Link>
          </>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-300">{status}</p>
        )}
      </div>
    </div>
  )
}

/** Post-callback landing for email verify / magic link — bootstraps ledger then enters the app. */
export default function AuthContinuePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      }
    >
      <AuthContinueInner />
    </Suspense>
  )
}
