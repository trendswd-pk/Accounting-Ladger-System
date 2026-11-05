'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BookOpen, Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import MobileBottomNav from './MobileBottomNav'
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

const PREFETCH_ROUTES = [
  '/',
  '/transactions',
  '/accounts',
  '/cash-savings',
  '/payable',
  '/receivable',
  '/expenses',
  '/expenses/daily',
  '/expenses/monthly',
  '/investment',
  '/settings',
] as const

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [navOpen, setNavOpen] = useState(false)
  const [profilerOpen, setProfilerOpen] = useState(false)
  const [businessName, setBusinessName] = useState(
    () => getCachedAppSettings()?.businessName ?? DEFAULT_APP_SETTINGS.businessName
  )
  const [logoUrl, setLogoUrl] = useState<string | null>(
    () => getCachedAppSettings()?.logoUrl ?? null
  )
  const mainScrollRef = useRef<HTMLElement | null>(null)
  const isDev = process.env.NODE_ENV === 'development'
  const isLogin = pathname === '/login'
  /** Full-screen voucher print/preview — no app chrome. */
  const isTransactionPrint =
    !!pathname && /^\/transactions\/[^/]+\/print\/?$/.test(pathname)
  /** Public PIN-gated ledger share for WhatsApp recipients. */
  const isPublicShare = !!pathname && pathname.startsWith('/share/')

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

  // Prefetch core lists so Transactions / Accounts open without a cold full-load flash.
  useEffect(() => {
    if (isLogin) return
    void fetchTransactions().catch(() => {})
    void fetchAccounts().catch(() => {})
  }, [isLogin])

  // Warm Next.js route payloads so sidebar / dashboard clicks feel instant.
  useEffect(() => {
    if (isLogin) return
    const run = () => {
      for (const route of PREFETCH_ROUTES) {
        if (route !== pathname) router.prefetch(route)
      }
    }
    const w = window as Window &
      typeof globalThis & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
        cancelIdleCallback?: (id: number) => void
      }
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(run, { timeout: 2500 })
      return () => w.cancelIdleCallback?.(id)
    }
    const t = globalThis.setTimeout(run, 400)
    return () => globalThis.clearTimeout(t)
  }, [isLogin, pathname, router])

  if (isLogin || isTransactionPrint || isPublicShare) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-950">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <header className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <button
          type="button"
          onClick={() => setNavOpen(true)}
          className="-ml-2 hidden shrink-0 rounded-md p-2 text-gray-700 hover:bg-primary-50 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-300 dark:hover:bg-gray-700 lg:inline-flex"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <Link
          href="/"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          title={businessName}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote R2 branding URL
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
      <main
        ref={mainScrollRef}
        className="min-h-0 flex-1 overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom,0px))] lg:pb-0"
      >
        {children}
      </main>
      <MobileBottomNav onOpenMenu={() => setNavOpen(true)} />
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
