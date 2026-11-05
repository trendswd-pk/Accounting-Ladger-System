'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Eye,
  FileDown,
  MessageCircle,
  MoreVertical,
  Pencil,
  Printer,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react'

export type ActionDropdownItem = {
  key: string
  label: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
  icon?: LucideIcon
}

type ActionsDropdownProps = {
  items: ActionDropdownItem[]
  ariaLabel?: string
  /** Approx menu height for flip-above logic (default ~ item count). */
  estimatedItemHeight?: number
  /** Optional trigger button classes (e.g. on colored cards). */
  buttonClassName?: string
  iconClassName?: string
  /**
   * `menu` — portal list (desktop tables).
   * `inline` — expand action icons in the same row (mobile cards).
   */
  variant?: 'menu' | 'inline'
}

const defaultButtonClass =
  'rounded p-1.5 text-gray-600 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-gray-400 dark:hover:bg-gray-600'

const DEFAULT_ICONS: Record<string, LucideIcon> = {
  details: Eye,
  edit: Pencil,
  export: FileDown,
  pdf: Printer,
  preview: Printer,
  send: MessageCircle,
  delete: Trash2,
}

function resolveIcon(item: ActionDropdownItem): LucideIcon {
  return item.icon ?? DEFAULT_ICONS[item.key] ?? MoreVertical
}

/**
 * 3-dot actions — portal menu, or inline icon strip for mobile cards.
 */
export default function ActionsDropdown({
  items,
  ariaLabel = 'Actions',
  estimatedItemHeight = 40,
  buttonClassName,
  iconClassName,
  variant = 'menu',
}: ActionsDropdownProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const inlineRef = useRef<HTMLDivElement | null>(null)

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
    if (!open || variant !== 'menu') return
    const onScroll = () => close()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open, variant])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!open || variant !== 'inline') return
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const root = inlineRef.current
      if (!root) return
      const target = e.target
      if (target instanceof Node && !root.contains(target)) close()
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
    }
  }, [open, variant])

  if (items.length === 0) return null

  const triggerClass = buttonClassName ?? defaultButtonClass
  const triggerIconClass =
    iconClassName ?? 'h-5 w-5 text-gray-600 dark:text-gray-400'

  if (variant === 'inline') {
    const actionBtnClass =
      buttonClassName ??
      'inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/55 text-brand-ink shadow-sm transition-colors hover:bg-white/90 focus:outline-none disabled:opacity-50'

    return (
      <div ref={inlineRef} className="flex max-w-full items-center justify-end gap-1">
        {open ? (
          <>
            {items.map((item) => {
              const Icon = resolveIcon(item)
              return (
                <button
                  key={item.key}
                  type="button"
                  disabled={item.disabled}
                  title={item.label}
                  aria-label={item.label}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (item.disabled) return
                    close()
                    item.onClick()
                  }}
                  className={`${actionBtnClass} ${
                    item.danger ? 'text-red-700 hover:bg-red-50/90' : ''
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={2.1} aria-hidden />
                </button>
              )
            })}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                close()
              }}
              className={actionBtnClass}
              aria-label="Close actions"
            >
              <X className="h-4 w-4" strokeWidth={2.2} aria-hidden />
            </button>
          </>
        ) : (
          <button
            ref={buttonRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setOpen(true)
            }}
            className={triggerClass}
            aria-label={ariaLabel}
            aria-expanded={false}
            aria-haspopup="true"
          >
            <MoreVertical className={triggerIconClass} />
          </button>
        )}
      </div>
    )
  }

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
        className={triggerClass}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVertical className={triggerIconClass} />
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
                {items.map((item) => {
                  const Icon = resolveIcon(item)
                  return (
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
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        item.danger
                          ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0 opacity-80" strokeWidth={2} aria-hidden />
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </>,
            document.body
          )
        : null}
    </>
  )
}
