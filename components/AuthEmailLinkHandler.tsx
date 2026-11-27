'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isEmailVerificationAuthType, isRecoveryAuthType } from '@/lib/authCallback'

/**
 * Handles Supabase implicit/hash email links when the Site URL lands on /login
 * (or another public auth shell) with `#access_token=…&type=…` — the server
 * never sees the hash, so middleware cannot exchange it.
 *
 * Recovery → /reset-password. Magic link / signup / invite → /auth/continue.
 */
export default function AuthEmailLinkHandler() {
  const pathname = usePathname()
  const router = useRouter()
  const handled = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || handled.current) return
    if (
      pathname !== '/login' &&
      pathname !== '/forgot-password' &&
      pathname !== '/reset-password'
    ) {
      return
    }

    const hash = window.location.hash
    if (!hash || hash.length < 2) return
    if (!hash.includes('access_token') && !hash.includes('refresh_token')) return

    handled.current = true
    const params = new URLSearchParams(hash.replace(/^#/, ''))
    const type = params.get('type')
    const supabase = createClient()

    void (async () => {
      // Browser client parses the hash and persists the session to cookies.
      const {
        data: { session },
      } = await supabase.auth.getSession()

      // Clear hash so refresh does not re-process tokens.
      const cleanUrl = `${window.location.pathname}${window.location.search}`
      window.history.replaceState(null, '', cleanUrl)

      if (!session) {
        handled.current = false
        return
      }

      if (isRecoveryAuthType(type) || pathname === '/reset-password') {
        router.replace('/reset-password')
        return
      }

      if (isEmailVerificationAuthType(type)) {
        router.replace('/auth/continue?flow=verify')
        return
      }

      router.replace('/auth/continue')
    })()
  }, [pathname, router])

  return null
}
