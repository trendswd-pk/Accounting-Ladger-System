'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BookOpen, Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import RequestProfilerIcon from './RequestProfilerIcon'
import RequestProfilerPanel from './RequestProfilerPanel'
import ScrollToTopButton from './ScrollToTopButton'
import {
  DEFAULT_APP_SETTINGS,
  getCachedAppSettings,
  watchAppSettings,
} from '@/lib/appSettings'
import { fetchAccounts } from '@/lib/accounts'
import { fetchTransactions } from '@/lib/transactions'
import { getDemoSession } from '@/lib/demoAuth'
import { ensureDemoSeeded } from '@/lib/demoSeed'

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [navOpen, setNavOpen] = useState(false)
  const [profilerOpen, setProfilerOpen] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [businessName, setBusinessName] = useState(
    () => getCachedAppSettings()?.businessName ?? DEFAULT_APP_SETTINGS.businessName
  )
  const [logoUrl, setLogoUrl] = useState<string | null>(
    () => getCachedAppSettings()?.logoUrl ?? null
  )
  const mainScrollRef = useRef<HTMLElement | null>(null)
  const isDev = process.env.NODE_ENV === 'development'
  const isLogin = pathname === '/login'

  useEffect(() => {
    setNavOpen(false)
    setProfilerOpen(false)
  }, [pathname])

  useEffect(() => {
    return watchAppSettings((s) => {
      setBusinessName(s.businessName)
      setLogoUrl(s.logoUrl)
    })
  }, [])

  useEffect(() => {
    const session = getDemoSession()
    if (!isLogin && !session) {
      router.replace(`/login?next=${encodeURIComponent(pathname || '/')}`)
      return
    }
    if (isLogin && session) {
      router.replace('/')
      return
    }
    if (session) {
      ensureDemoSeeded(session.userId)
    }
    setAuthReady(true)
  }, [isLogin, pathname, router])

  // Prefetch core lists so Transactions / Accounts open without a cold full-load flash.
  useEffect(() => {
    if (isLogin || !authReady) return
    if (!getDemoSession()) return
    void fetchTransactions().catch(() => {})
    void fetchAccounts().catch(() => {})
  }, [isLogin, authReady])

  if (isLogin) {
    return <>{children}</>
  }

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading demo…</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <div className="shrink-0 border-b border-amber-200/80 bg-amber-50 px-3 py-1.5 text-center dark:border-amber-800/50 dark:bg-amber-950/40">
        <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
          Demo Mode — data is stored in this browser only
        </p>
      </div>
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <header className="flex shrink-0 items-center gap-3 bg-white px-4 py-3 shadow-sm dark:bg-gray-800">
        <button
          type="button"
          onClick={() => setNavOpen(true)}
          className="-ml-2 shrink-0 rounded-md p-2 text-gray-700 hover:bg-primary-50 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-300 dark:hover:bg-gray-700"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <Link
          href="/"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          title={`${businessName} (Demo)`}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- demo branding data URL
            <img
              src={logoUrl}
              alt={businessName}
              className="h-8 max-w-[10rem] object-contain object-left"
            />
          ) : (
            <>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white">
                <BookOpen className="h-4 w-4" aria-hidden />
              </span>
              <span className="truncate text-base font-bold text-primary-600 dark:text-primary-400">
                {businessName}
                <span className="ml-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  (Demo)
                </span>
              </span>
            </>
          )}
        </Link>
        {isDev ? (
          <button
            type="button"
            onClick={() => setProfilerOpen((v) => !v)}
            className="-mr-2 shrink-0 rounded-md p-2 text-gray-700 hover:bg-primary-50 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label={profilerOpen ? 'Close request profiler' : 'Open request profiler'}
            title="Request profiler"
            aria-pressed={profilerOpen}
          >
            <RequestProfilerIcon className="h-6 w-6" />
          </button>
        ) : null}
      </header>
      <main ref={mainScrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {children}
      </main>
      <ScrollToTopButton scrollRef={mainScrollRef} pathname={pathname} />
      {isDev ? (
        <RequestProfilerPanel
          open={profilerOpen}
          onOpenChange={setProfilerOpen}
          externalTrigger
        />
      ) : null}
    </div>
  )
}
