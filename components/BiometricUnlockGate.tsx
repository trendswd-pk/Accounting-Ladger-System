'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { App as CapApp } from '@capacitor/app'
import { Fingerprint } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { isCapacitorNative } from '@/lib/capacitorNative'
import {
  clearBiometricUnlock,
  isBiometricUnlockEnabled,
  isBiometricUnlocked,
  markBiometricLocked,
  promptBiometricUnlock,
} from '@/lib/biometricUnlock'

/**
 * Capacitor-only gate: when a Supabase session exists and biometric unlock is
 * enabled, require fingerprint / device credential before showing the app.
 * No-ops in the browser / PWA.
 *
 * Important: the system biometric sheet pauses the Activity (`appStateChange`
 * inactive). We must not treat that as a real background → lock → re-prompt loop.
 */
export default function BiometricUnlockGate({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [locked, setLocked] = useState(false)
  const [checking, setChecking] = useState(isCapacitorNative())
  const [prompting, setPrompting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const busyRef = useRef(false)
  /** True while the native biometric UI is up (Activity often goes inactive). */
  const biometricUiOpenRef = useRef(false)
  /** After cancel / dismiss: show gate UI but do not auto-open the sheet again. */
  const awaitManualUnlockRef = useRef(false)

  const runUnlockFlow = useCallback(async (opts?: { manual?: boolean }) => {
    const manual = opts?.manual === true

    if (!isCapacitorNative()) {
      setChecking(false)
      setLocked(false)
      return
    }
    if (busyRef.current) return
    if (biometricUiOpenRef.current) return

    busyRef.current = true
    setChecking(true)
    setError(null)

    try {
      const enabled = await isBiometricUnlockEnabled()
      if (!enabled) {
        setLocked(false)
        awaitManualUnlockRef.current = false
        return
      }

      if (isBiometricUnlocked()) {
        setLocked(false)
        awaitManualUnlockRef.current = false
        return
      }

      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        setLocked(false)
        awaitManualUnlockRef.current = false
        return
      }

      setLocked(true)

      // User cancelled earlier — keep the unlock screen until they tap the button.
      if (awaitManualUnlockRef.current && !manual) {
        return
      }

      awaitManualUnlockRef.current = false
      biometricUiOpenRef.current = true
      setPrompting(true)
      const result = await promptBiometricUnlock()
      biometricUiOpenRef.current = false
      setPrompting(false)

      if (result.ok) {
        setLocked(false)
        setError(null)
        awaitManualUnlockRef.current = false
      } else if (result.cancelled) {
        // Stay on gate; wait for an explicit tap (do not re-open the sheet).
        awaitManualUnlockRef.current = true
        setError(null)
      } else {
        awaitManualUnlockRef.current = true
        setError(result.message || 'Unlock failed. Try again or use your password.')
      }
    } catch (err) {
      biometricUiOpenRef.current = false
      setPrompting(false)
      setLocked(true)
      awaitManualUnlockRef.current = true
      setError(err instanceof Error ? err.message : 'Unlock failed.')
    } finally {
      setChecking(false)
      busyRef.current = false
    }
  }, [])

  // Cold start / first paint only — not on every route change.
  useEffect(() => {
    void runUnlockFlow()
  }, [runUnlockFlow])

  useEffect(() => {
    if (!isCapacitorNative()) return
    let handle: { remove: () => Promise<void> } | undefined
    void CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        // Biometric / credential UI pauses the app — do not clear unlock for that.
        if (biometricUiOpenRef.current) return
        markBiometricLocked()
        return
      }
      // Returning from biometric sheet or after cancel: do not force another prompt.
      if (biometricUiOpenRef.current || awaitManualUnlockRef.current) return
      void runUnlockFlow()
    }).then((h) => {
      handle = h
    })
    return () => {
      void handle?.remove()
    }
  }, [runUnlockFlow])

  const fallBackToPasswordLogin = async () => {
    biometricUiOpenRef.current = false
    awaitManualUnlockRef.current = false
    setPrompting(false)
    setError(null)
    try {
      await clearBiometricUnlock()
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch {
      // Still send user to login
    }
    setLocked(false)
    router.replace('/login')
    router.refresh()
  }

  if (!isCapacitorNative() || (!locked && !checking)) {
    return <>{children}</>
  }

  if (checking && !locked) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-sm text-gray-500 dark:text-gray-400">Opening…</p>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gray-50 px-6 pt-[var(--safe-area-top,0px)] dark:bg-gray-950">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-white">
          <Fingerprint className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Unlock Ledger</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Use your fingerprint or device screen lock to continue. Your session stays signed in until
          you log out.
        </p>
        {error ? (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          disabled={prompting}
          onClick={() => void runUnlockFlow({ manual: true })}
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-md bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {prompting ? 'Waiting for fingerprint…' : 'Unlock with fingerprint'}
        </button>
        <button
          type="button"
          disabled={prompting}
          onClick={() => void fallBackToPasswordLogin()}
          className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
        >
          Use password instead
        </button>
      </div>
    </div>
  )
}
