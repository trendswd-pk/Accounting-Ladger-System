'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { exitEmbeddedDemoMode, isEmbeddedDemoActive } from '@/lib/embeddedDemo'

/**
 * Subtle strip while browsing with localStorage Demo Mode (no Supabase session).
 */
export default function DemoModeBanner() {
  const pathname = usePathname()
  const router = useRouter()
  const [active, setActive] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const isAuthShell =
      pathname === '/login' ||
      pathname === '/forgot-password' ||
      pathname === '/reset-password' ||
      pathname === '/auth/continue'
    setActive(isEmbeddedDemoActive() && !isAuthShell)
  }, [pathname])

  if (!active) return null

  const onExit = () => {
    if (exiting) return
    setExiting(true)
    exitEmbeddedDemoMode({ wipeData: false })
    setActive(false)
    router.replace('/login')
    router.refresh()
  }

  return (
    <div
      role="status"
      className="sticky top-0 z-[60] border-b border-primary-200 bg-primary-50 px-3 py-1.5 text-center text-xs text-primary-800 dark:border-primary-800/60 dark:bg-primary-900/40 dark:text-primary-400"
    >
      <span className="font-medium">Demo Mode</span>
      <span className="mx-1.5 text-primary-700/80 dark:text-primary-400/80">—</span>
      <span>Sample data stays in this browser only. Nothing is saved to the real database.</span>
      <button
        type="button"
        onClick={onExit}
        disabled={exiting}
        className="ml-2 font-semibold underline decoration-primary-700/40 underline-offset-2 hover:decoration-primary-700 disabled:opacity-50 dark:decoration-primary-400/50 dark:hover:decoration-primary-400"
      >
        {exiting ? 'Leaving…' : 'Exit Demo Mode'}
      </button>
    </div>
  )
}
