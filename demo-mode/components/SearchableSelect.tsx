'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
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
 * Combobox-style select: type to filter, click to pick. Starts empty unless value is set.
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
  const rootRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const listId = useId()

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
  }

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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
          autoComplete="off"
          disabled={disabled}
          required={required && !value}
          value={displayValue}
          placeholder={placeholder}
          onChange={(e) => {
            const next = e.target.value
            setQuery(next)
            setOpen(true)
            if (value) onChange('')
          }}
          onFocus={() => {
            setOpen(true)
            setQuery('')
          }}
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
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-700"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</li>
          ) : (
            filtered.map((opt) => {
              const active = opt.value === value
              return (
                <li key={opt.value} role="option" aria-selected={active}>
                  <button
                    type="button"
                    className={`flex w-full px-3 py-2 text-left text-sm ${
                      active
                        ? 'bg-primary-50 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200'
                        : 'text-gray-900 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-600'
                    }`}
                    onMouseDown={(e) => e.preventDefault()}
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
