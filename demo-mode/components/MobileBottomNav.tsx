'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowLeftRight,
  LayoutDashboard,
  Menu,
  Receipt,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'

type NavTab = {
  id: string
  label: string
  href?: string
  icon: LucideIcon
  opensMenu?: boolean
}

const TABS: NavTab[] = [
  { id: 'home', label: 'Home', href: '/', icon: LayoutDashboard },
  { id: 'accounts', label: 'Account', href: '/accounts', icon: WalletCards },
  { id: 'transactions', label: 'Trans.', href: '/transactions', icon: ArrowLeftRight },
  { id: 'expenses', label: 'Expenses', href: '/expenses', icon: Receipt },
  { id: 'menu', label: 'Menu', icon: Menu, opensMenu: true },
]

/** Height of the tab row (excluding safe-area). Keep in sync with LayoutContent pb. */
export const MOBILE_BOTTOM_NAV_HEIGHT_PX = 64

function activeTabIndex(pathname: string): number {
  if (pathname === '/') return 0
  if (pathname.startsWith('/accounts')) return 1
  if (pathname.startsWith('/transactions')) return 2
  if (pathname.startsWith('/expenses')) return 3
  return 4
}

type MobileBottomNavProps = {
  onOpenMenu: () => void
}

/**
 * Fixed mobile tab bar — full screen width, safe-area aware, soft active chip.
 * Brand greens (color-scheme.mdc). Hidden from lg+.
 */
export default function MobileBottomNav({ onOpenMenu }: MobileBottomNavProps) {
  const pathname = usePathname()
  const active = activeTabIndex(pathname)

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 w-full border-t border-gray-200 bg-white/95 shadow-[0_-6px_24px_rgba(2,15,17,0.08)] backdrop-blur-md dark:border-gray-700 dark:bg-gray-800/95 dark:shadow-[0_-6px_24px_rgba(0,0,0,0.35)] lg:hidden"
      aria-label="Primary"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <ul
        className="mx-auto grid w-full max-w-screen-sm grid-cols-5 px-1"
        style={{ height: MOBILE_BOTTOM_NAV_HEIGHT_PX }}
      >
        {TABS.map((tab, i) => {
          const Icon = tab.icon
          const isActive = i === active
          const itemClass = [
            'relative flex h-full min-w-0 items-center justify-center px-0.5 outline-none transition-colors',
            'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500',
            isActive
              ? 'text-primary-700 dark:text-primary-400'
              : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300',
          ].join(' ')

          const inner = (
            <span
              className={[
                'flex h-11 w-11 items-center justify-center rounded-xl transition-colors',
                isActive
                  ? 'bg-primary-50 dark:bg-primary-950/55'
                  : 'bg-transparent',
              ].join(' ')}
            >
              <Icon
                className="h-6 w-6"
                strokeWidth={isActive ? 2.35 : 1.85}
                aria-hidden
              />
            </span>
          )

          return (
            <li key={tab.id} className="min-w-0">
              {tab.opensMenu ? (
                <button
                  type="button"
                  onClick={onOpenMenu}
                  className={`${itemClass} w-full`}
                  aria-label="Open menu"
                  aria-current={isActive ? 'true' : undefined}
                >
                  {inner}
                </button>
              ) : (
                <Link
                  href={tab.href!}
                  className={itemClass}
                  aria-label={tab.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {inner}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
