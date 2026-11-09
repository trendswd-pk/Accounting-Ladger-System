'use client'

import { useEffect, useState } from 'react'
import { Menu, X, type LucideIcon } from 'lucide-react'
import ActionsDropdown from '@/components/ActionsDropdown'
import {
  DEFAULT_APP_SETTINGS,
  getCachedAppSettings,
  watchAppSettings,
} from '@/lib/appSettings'

/** Up to this many actions render as a desktop header row; above → dropdown. */
export const FLOATING_ACTIONS_INLINE_LIMIT = 5

export type FloatingActionItem = {
  key: string
  label: string
  icon: LucideIcon
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  /** Primary filled style (e.g. Edit). */
  primary?: boolean
}

type FloatingActionsButtonProps = {
  items: FloatingActionItem[]
  ariaLabel?: string
  /**
   * `app` clears the mobile bottom nav (same dock band as ScrollToTop).
   * `page` sits near the corner (share / full-page views without bottom nav).
   */
  dock?: 'app' | 'page'
}

const headerBtnClass =
  'inline-flex h-10 w-10 items-center justify-center rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50'

/**
 * Place in a page title row.
 * - Mobile: fixed FAB speed-dial (above bottom nav).
 * - Desktop (lg+): header toolbar — icons in a row up to
 *   `FLOATING_ACTIONS_INLINE_LIMIT`, otherwise an actions dropdown.
 * Label text on the FAB follows Settings → General → Floating action labels.
 */
export default function FloatingActionsButton({
  items,
  ariaLabel = 'Actions',
  dock = 'app',
}: FloatingActionsButtonProps) {
  const [open, setOpen] = useState(false)
  const [showLabels, setShowLabels] = useState(
    () =>
      getCachedAppSettings()?.floatingActionsShowLabels ??
      DEFAULT_APP_SETTINGS.floatingActionsShowLabels
  )

  useEffect(() => {
    return watchAppSettings((s) => {
      setShowLabels(s.floatingActionsShowLabels === true)
    })
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (items.length === 0) return null

  // App dock: sit just above the 64px mobile bottom nav (+ safe area).
  const dockClass =
    dock === 'page'
      ? 'bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-4 sm:bottom-6 sm:right-6'
      : 'bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-4'

  const fabShell =
    'flex h-12 w-12 items-center justify-center rounded-full shadow-lg ring-1 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900'

  const desktopToolbar =
    items.length <= FLOATING_ACTIONS_INLINE_LIMIT ? (
      <div className="flex shrink-0 items-center gap-2" role="toolbar" aria-label={ariaLabel}>
        {items.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.key}
              type="button"
              disabled={item.disabled}
              title={item.label}
              aria-label={item.label}
              onClick={() => {
                if (item.disabled) return
                item.onClick()
              }}
              className={`${headerBtnClass} ${
                item.primary
                  ? 'border-primary-600 bg-primary-600 text-white hover:border-primary-700 hover:bg-primary-700'
                  : item.danger
                    ? 'border-gray-300 bg-white text-red-700 hover:bg-red-50 dark:border-gray-600 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-950/40'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden />
            </button>
          )
        })}
      </div>
    ) : (
      <ActionsDropdown
        ariaLabel={ariaLabel}
        items={items.map((item) => ({
          key: item.key,
          label: item.label,
          onClick: item.onClick,
          disabled: item.disabled,
          danger: item.danger,
          icon: item.icon,
        }))}
      />
    )

  return (
    <>
      <div className="hidden lg:block">{desktopToolbar}</div>

      <div className={`fixed z-40 lg:hidden ${dockClass}`} data-floating-actions>
        {open ? (
          <div
            className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
        ) : null}

        <div className="relative z-50 flex flex-col items-end gap-3">
          {open ? (
            <ul className="flex flex-col items-end gap-2.5" role="menu" aria-label={ariaLabel}>
              {items.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.key} className="flex items-center gap-2">
                    {showLabels ? (
                      <span className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-gray-800 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-600">
                        {item.label}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      role="menuitem"
                      disabled={item.disabled}
                      title={item.label}
                      aria-label={item.label}
                      onClick={() => {
                        if (item.disabled) return
                        setOpen(false)
                        item.onClick()
                      }}
                      className={`${fabShell} disabled:opacity-50 ${
                        item.primary
                          ? 'bg-primary-600 text-white ring-primary-600 hover:bg-primary-700'
                          : item.danger
                            ? 'bg-white text-red-700 ring-gray-200 hover:bg-red-50 dark:bg-gray-800 dark:text-red-400 dark:ring-gray-600 dark:hover:bg-red-950/40'
                            : 'bg-white text-gray-700 ring-gray-200 hover:bg-primary-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : null}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close actions' : ariaLabel}
            aria-expanded={open}
            aria-haspopup="menu"
            title={open ? 'Close' : ariaLabel}
            className={`${fabShell} ${
              open
                ? 'bg-primary-600 text-white ring-primary-600 hover:bg-primary-700'
                : 'bg-white text-primary-600 ring-gray-200 hover:bg-primary-50 dark:bg-gray-800 dark:text-primary-400 dark:ring-gray-600 dark:hover:bg-gray-700'
            }`}
          >
            {open ? (
              <X className="h-5 w-5" aria-hidden />
            ) : (
              <Menu className="h-5 w-5" aria-hidden />
            )}
          </button>
        </div>
      </div>
    </>
  )
}
