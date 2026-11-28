'use client'

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, X } from 'lucide-react'

export type SearchableSelectOption = {
  value: string
  label: string
}

type SearchableSelectProps = {
  id?: string
  value: string
  options: SearchableSelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  emptyMessage?: string
  className?: string
}

const MENU_MAX_H = 208 // max-h-52

type FixedMenuBox = {
  left: number
  width: number
  top?: number
  bottom?: number
  maxHeight: number
}

function hasClippingOverflow(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el)
  const check = (value: string) => /^(auto|scroll|hidden|clip)$/.test(value)
  return check(style.overflow) || check(style.overflowX) || check(style.overflowY)
}

/** Walk up from the field; overflow scroll/hidden ancestors clip absolute menus. */
function findClippingAncestor(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null
  while (node && node !== document.documentElement) {
    if (hasClippingOverflow(node)) return node
    node = node.parentElement
  }
  return null
}

/**
 * Combobox-style select: type to filter, click or keyboard to pick.
 * Default: absolute under/over the input (stays with the field on mobile).
 * Inside overflow tables/panels: portal + fixed coords so the list is not
 * trapped in a tiny scroll box.
 */
export default function SearchableSelect({
  id,
  value,
  options,
  onChange,
  placeholder = 'Search…',
  required = false,
  disabled = false,
  emptyMessage = 'No matches',
  className = '',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  /** When soft keyboard leaves little room below, open upward — still flush to input. */
  const [openUp, setOpenUp] = useState(false)
  const [maxHeight, setMaxHeight] = useState(MENU_MAX_H)
  /** When set, list is portaled to body with fixed position. */
  const [fixedBox, setFixedBox] = useState<FixedMenuBox | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)
  const listId = useId()
  const optionId = (index: number) => `${listId}-opt-${index}`

  const selected = options.find((o) => o.value === value) ?? null
  const displayValue = open ? query : (selected?.label ?? '')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    if (selected && query === selected.label) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query, selected])

  const close = () => {
    setOpen(false)
    setQuery('')
    setHighlight(0)
    setFixedBox(null)
  }

  const updatePlacement = () => {
    const el = inputRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const vv = window.visualViewport
    const vpTop = vv?.offsetTop ?? 0
    const vpHeight = vv?.height ?? window.innerHeight
    const visibleBottom = vpTop + vpHeight
    const spaceBelow = visibleBottom - rect.bottom - 4
    const spaceAbove = rect.top - vpTop - 4
    const shouldOpenUp = spaceBelow < 120 && spaceAbove > spaceBelow
    const nextMax = Math.min(
      MENU_MAX_H,
      Math.max(96, shouldOpenUp ? spaceAbove : spaceBelow)
    )
    setOpenUp(shouldOpenUp)
    setMaxHeight(nextMax)

    const clipped = Boolean(findClippingAncestor(rootRef.current))
    if (clipped) {
      setFixedBox({
        left: rect.left,
        width: rect.width,
        maxHeight: nextMax,
        top: shouldOpenUp ? undefined : rect.bottom + 4,
        bottom: shouldOpenUp
          ? Math.max(4, window.innerHeight - rect.top + 4)
          : undefined,
      })
    } else {
      setFixedBox(null)
    }
  }

  useLayoutEffect(() => {
    if (!open) return
    updatePlacement()
    const onReposition = () => updatePlacement()
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    const vv = window.visualViewport
    vv?.addEventListener('resize', onReposition)
    vv?.addEventListener('scroll', onReposition)
    const timers = [50, 150, 300, 500].map((ms) =>
      window.setTimeout(onReposition, ms)
    )
    return () => {
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
      vv?.removeEventListener('resize', onReposition)
      vv?.removeEventListener('scroll', onReposition)
      timers.forEach((id) => window.clearTimeout(id))
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    setHighlight((h) => {
      if (filtered.length === 0) return 0
      return Math.min(h, filtered.length - 1)
    })
  }, [filtered, open])

  useEffect(() => {
    if (!open || filtered.length === 0) return
    const el = listRef.current?.querySelector<HTMLElement>(
      `#${CSS.escape(optionId(highlight))}`
    )
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlight, open, filtered.length, listId])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node
      if (rootRef.current?.contains(target)) return
      if (listRef.current?.contains(target)) return
      close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
        inputRef.current?.blur()
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = (next: string) => {
    onChange(next)
    close()
  }

  const openWithHighlight = () => {
    setOpen(true)
    setQuery(selected?.label ?? '')
    const selectedIndex = value
      ? options.findIndex((o) => o.value === value)
      : 0
    setHighlight(selectedIndex >= 0 ? selectedIndex : 0)
    requestAnimationFrame(() => {
      inputRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      updatePlacement()
    })
  }

  const onInputKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) {
        openWithHighlight()
        return
      }
      if (filtered.length === 0) return
      setHighlight((h) => (h + 1) % filtered.length)
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) {
        openWithHighlight()
        return
      }
      if (filtered.length === 0) return
      setHighlight((h) => (h - 1 + filtered.length) % filtered.length)
      return
    }

    if (e.key === 'Home' && open && filtered.length > 0) {
      e.preventDefault()
      setHighlight(0)
      return
    }

    if (e.key === 'End' && open && filtered.length > 0) {
      e.preventDefault()
      setHighlight(filtered.length - 1)
      return
    }

    if (e.key === 'Enter' && open) {
      if (filtered.length === 0) return
      e.preventDefault()
      const opt = filtered[Math.min(highlight, filtered.length - 1)]
      if (opt) pick(opt.value)
      return
    }

    if (e.key === 'Tab' && open) {
      close()
    }
  }

  const usePortal = Boolean(fixedBox)
  const listStyle: CSSProperties = usePortal
    ? {
        position: 'fixed',
        left: fixedBox!.left,
        width: fixedBox!.width,
        top: fixedBox!.top,
        bottom: fixedBox!.bottom,
        maxHeight: fixedBox!.maxHeight,
        zIndex: 80,
      }
    : { maxHeight }

  const listClassName = [
    'z-50 overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-700',
    usePortal
      ? ''
      : [
          'absolute left-0 right-0',
          openUp ? 'bottom-full mb-1' : 'top-full mt-1',
        ].join(' '),
  ]
    .filter(Boolean)
    .join(' ')

  const listbox =
    open && !disabled ? (
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        style={listStyle}
        className={listClassName}
      >
        {filtered.length === 0 ? (
          <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
            {emptyMessage}
          </li>
        ) : (
          filtered.map((opt, index) => {
            const selectedOpt = opt.value === value
            const isHighlight = index === highlight
            return (
              <li
                key={opt.value}
                id={optionId(index)}
                role="option"
                aria-selected={selectedOpt || isHighlight}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  className={`flex w-full px-3 py-2 text-left text-sm ${
                    isHighlight
                      ? 'bg-primary-50 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200'
                      : selectedOpt
                        ? 'bg-primary-50/60 text-primary-800 dark:bg-primary-900/25 dark:text-primary-200'
                        : 'text-gray-900 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-600'
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => pick(opt.value)}
                >
                  {opt.label}
                </button>
              </li>
            )
          })
        )}
      </ul>
    ) : null

  return (
    <div
      ref={rootRef}
      className={[
        'relative scroll-mb-56',
        // Open list must stack above the next field (same z-10 siblings paint later and hide the menu).
        open ? 'z-50' : 'z-10',
      ].join(' ')}
    >
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && filtered.length > 0 ? optionId(highlight) : undefined
          }
          autoComplete="off"
          disabled={disabled}
          required={required && !value}
          value={displayValue}
          placeholder={placeholder}
          onChange={(e) => {
            const next = e.target.value
            setQuery(next)
            setOpen(true)
            setHighlight(0)
            if (value && next !== selected?.label) onChange('')
            requestAnimationFrame(() => updatePlacement())
          }}
          onFocus={() => {
            openWithHighlight()
            requestAnimationFrame(() => inputRef.current?.select())
          }}
          onKeyDown={onInputKeyDown}
          className={`${className} pr-16`}
        />
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-0.5 pr-1.5">
          {value ? (
            <button
              type="button"
              tabIndex={-1}
              disabled={disabled}
              aria-label="Clear selection"
              className="pointer-events-auto rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              onClick={(e) => {
                e.preventDefault()
                onChange('')
                setQuery('')
                setOpen(true)
                setHighlight(0)
                inputRef.current?.focus()
              }}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </div>
      </div>

      {listbox && usePortal && typeof document !== 'undefined'
        ? createPortal(listbox, document.body)
        : listbox}
    </div>
  )
}
