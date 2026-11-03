'use client'

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
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

/**
 * Combobox-style select: type to filter, click or keyboard to pick.
 * ArrowUp / ArrowDown move highlight; Enter selects; Escape closes.
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
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  const close = () => {
    setOpen(false)
    setQuery('')
    setHighlight(0)
  }

  // Keep highlight in range when the filtered list changes.
  useEffect(() => {
    if (!open) return
    setHighlight((h) => {
      if (filtered.length === 0) return 0
      return Math.min(h, filtered.length - 1)
    })
  }, [filtered, open])

  // Scroll the highlighted option into view.
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
      if (!rootRef.current?.contains(e.target as Node)) close()
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
    setQuery('')
    const selectedIndex = value
      ? options.findIndex((o) => o.value === value)
      : 0
    setHighlight(selectedIndex >= 0 ? selectedIndex : 0)
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

  return (
    <div ref={rootRef} className="relative">
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
            if (value) onChange('')
          }}
          onFocus={openWithHighlight}
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

      {open && !disabled ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-700"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</li>
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
      ) : null}
    </div>
  )
}
