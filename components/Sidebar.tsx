'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Settings,
  BookOpen,
  WalletCards,
  ArrowLeftRight,
  Banknote,
  Briefcase,
  Receipt,
  TrendingDown,
  TrendingUp,
  Sun,
  Moon,
  X,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react'
import {
  DEFAULT_APP_SETTINGS,
  fetchAppSettings,
  getCachedAppSettings,
  saveAppSettings,
  subscribeAppSettings,
} from '@/lib/appSettings'
import {
  applyThemePreference,
  getActiveThemePreference,
  getDefaultTheme,
  type ThemePreference,
} from '@/lib/theme'

interface SubItem {
  name: string
  path: string
}

interface MenuItem {
  name: string
  path: string
  icon: LucideIcon
  subItems?: SubItem[]
}

const menuItems: MenuItem[] = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Transactions', path: '/transactions', icon: ArrowLeftRight },
  { name: 'Accounts', path: '/accounts', icon: WalletCards },
  { name: 'Cash & Savings', path: '/cash-savings', icon: Banknote },
  { name: 'Payable', path: '/payable', icon: TrendingDown },
  { name: 'Receivable', path: '/receivable', icon: TrendingUp },
  {
    name: 'Expenses',
    path: '/expenses',
    icon: Receipt,
    subItems: [
      { name: 'Expenses', path: '/expenses' },
      { name: 'Daily Expense', path: '/expenses/daily' },
      { name: 'Monthly Expense', path: '/expenses/monthly' },
    ],
  },
  { name: 'Investment', path: '/investment', icon: Briefcase },
  {
    name: 'Settings',
    path: '/settings',
    icon: Settings,
    subItems: [
      { name: 'Account Type', path: '/settings/account-type' },
      { name: 'Cash Type', path: '/settings/cash-type' },
      { name: 'General', path: '/settings' },
    ],
  },
]

function isSubPathActive(pathname: string, sub: SubItem): boolean {
  if (sub.path === '/settings') return pathname === '/settings'
  if (sub.path === '/expenses') return pathname === '/expenses'
  return pathname === sub.path || pathname.startsWith(sub.path + '/')
}

type SidebarProps = {
  open?: boolean
  onClose?: () => void
}

/** Off-canvas navigation drawer — same interaction model as Courier-Dashboard. */
export default function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const [theme, setTheme] = useState<ThemePreference>(getDefaultTheme())
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [businessName, setBusinessName] = useState(
    () => getCachedAppSettings()?.businessName ?? DEFAULT_APP_SETTINGS.businessName
  )

  useEffect(() => {
    let cancelled = false
    void fetchAppSettings()
      .then((s) => {
        if (!cancelled) setBusinessName(s.businessName)
      })
      .catch(() => {})
    const unsub = subscribeAppSettings((s) => setBusinessName(s.businessName))
    return () => {
      cancelled = true
      unsub()
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setTheme(getActiveThemePreference())
    const cached = getCachedAppSettings()
    if (cached?.businessName) setBusinessName(cached.businessName)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  useLayoutEffect(() => {
    const match = menuItems.find(
      (item) =>
        !!item.subItems?.length &&
        (pathname === item.path || item.subItems.some((sub) => isSubPathActive(pathname, sub)))
    )
    setOpenMenu(match?.path ?? null)
  }, [pathname])

  const toggleTheme = () => {
    const next: ThemePreference = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    applyThemePreference(next)
    void saveAppSettings({ theme: next }).catch(() => {
      // UI already updated; settings API may be unavailable during setup
    })
  }

  const toggleExpand = (path: string) => {
    setOpenMenu((prev) => (prev === path ? null : path))
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] transform flex-col bg-white shadow-xl transition-transform duration-200 ease-out dark:bg-gray-800 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Main navigation"
        aria-hidden={!open}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-100 px-4 py-4 dark:border-gray-700">
          <Link
            href="/"
            onClick={onClose}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="Go to home"
            title={businessName}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white">
              <BookOpen className="h-5 w-5" aria-hidden />
            </span>
            <span className="truncate text-lg font-bold tracking-tight text-primary-600 dark:text-primary-400">
              {businessName}
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1.5 text-gray-600 hover:bg-primary-50 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-2 min-h-0 flex-1 overflow-y-auto overflow-x-hidden" aria-label="Sidebar menu">
          <ul className="space-y-0">
            {menuItems.map((item) => {
              const Icon = item.icon
              const hasSubItems = Boolean(item.subItems?.length)
              const isExpanded = openMenu === item.path
              const isParentActive =
                pathname === item.path ||
                (hasSubItems
                  ? item.subItems!.some((sub) => isSubPathActive(pathname, sub))
                  : pathname.startsWith(item.path + '/'))
              const isActive = hasSubItems
                ? isParentActive
                : pathname === item.path || pathname.startsWith(item.path + '/')

              return (
                <li key={item.path}>
                  <div
                    className={`flex items-center justify-between px-6 py-3 text-gray-700 transition-colors hover:bg-primary-50 hover:text-primary-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-primary-400 ${
                      isActive && !hasSubItems
                        ? 'border-r-4 border-primary-600 bg-primary-50 text-primary-600 dark:bg-gray-700 dark:text-primary-400'
                        : ''
                    } ${
                      isActive && hasSubItems
                        ? 'border-r-4 border-primary-600 bg-primary-50/70 text-primary-600 dark:bg-gray-700/70 dark:text-primary-400'
                        : ''
                    }`}
                  >
                    <Link
                      href={hasSubItems ? item.subItems![0].path : item.path}
                      prefetch={false}
                      onClick={onClose}
                      className="flex min-w-0 flex-1 items-center"
                      aria-current={pathname === item.path ? 'page' : undefined}
                    >
                      <Icon className="mr-3 h-5 w-5 shrink-0" aria-hidden />
                      <span className="truncate font-medium">{item.name}</span>
                    </Link>
                    {hasSubItems ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggleExpand(item.path)
                        }}
                        className="ml-2 shrink-0 rounded p-1 hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:hover:bg-gray-600"
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? 'Collapse submenu' : 'Expand submenu'}
                      >
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    ) : null}
                  </div>

                  {hasSubItems && item.subItems ? (
                    <div
                      className="grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none"
                      style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
                      aria-hidden={!isExpanded}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <ul className="bg-gray-50 dark:bg-gray-700/50">
                          {item.subItems.map((sub) => {
                            const isSubActive = isSubPathActive(pathname, sub)
                            return (
                              <li key={sub.path}>
                                <Link
                                  href={sub.path}
                                  prefetch={false}
                                  onClick={onClose}
                                  className={`flex px-6 py-2 pl-14 text-xs text-gray-600 transition-colors hover:bg-primary-50 hover:text-primary-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-primary-400 ${
                                    isSubActive
                                      ? 'bg-primary-50 font-medium text-primary-600 dark:bg-gray-700 dark:text-primary-400'
                                      : ''
                                  }`}
                                  aria-current={isSubActive ? 'page' : undefined}
                                >
                                  {sub.name}
                                </Link>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-gray-100 p-3 dark:border-gray-700">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-primary-50 hover:text-primary-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-primary-400"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <Sun className="h-4 w-4 shrink-0" aria-hidden />
            )}
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
        </div>
      </aside>
    </>
  )
}
