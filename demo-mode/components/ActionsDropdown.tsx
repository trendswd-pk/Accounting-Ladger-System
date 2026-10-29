'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'

export type ActionDropdownItem = {
  key: string
  label: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}

type ActionsDropdownProps = {
  items: ActionDropdownItem[]
  ariaLabel?: string
  /** Approx menu height for flip-above logic (default ~ item count). */
  estimatedItemHeight?: number
}

/**
 * 3-dot actions menu (portal) — same pattern as Courier-Dashboard Due COD / payments.
 */
export default function ActionsDropdown({
  items,
  ariaLabel = 'Actions',
  estimatedItemHeight = 40,
}: ActionsDropdownProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  const close = () => {
    setOpen(false)
    setPos(null)
  }

  const openMenu = () => {
    const btn = buttonRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const menuW = 180
    const menuH = items.length * estimatedItemHeight + 12
    const spaceBelow = window.innerHeight - rect.bottom
    const above = spaceBelow < menuH + 16
    const left = Math.min(rect.right - menuW, window.innerWidth - menuW - 8)
    const top = above ? Math.max(8, rect.top - menuH - 4) : rect.bottom + 4
    setPos({ left: Math.max(8, left), top })
    setOpen(true)
  }

  useLayoutEffect(() => {
    if (!open) return
    const onScroll = () => close()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (items.length === 0) return null

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (open) close()
          else openMenu()
        }}
        className="rounded p-1.5 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:hover:bg-gray-600"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVertical className="h-5 w-5 text-gray-600 dark:text-gray-400" />
      </button>

      {open && pos && typeof document !== 'undefined'
        ? createPortal(
            <>
              <div className="fixed inset-0 z-[100]" onClick={close} aria-hidden />
              <div
                role="menu"
                className="fixed z-[101] min-w-[160px] rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800"
                style={{ left: pos.left, top: pos.top }}
              >
                {items.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={() => {
                      if (item.disabled) return
                      close()
                      item.onClick()
                    }}
                    className={`flex w-full items-center px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      item.danger
                        ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </>,
            document.body
          )
        : null}
    </>
  )
}
