'use client'

import { useRef } from 'react'
import { Search } from 'lucide-react'

type SoftSearchFieldProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  'aria-label': string
  className?: string
  /** `sm` fits desktop toolbars (h-10); `md` is the mobile default (h-11). */
  size?: 'sm' | 'md'
}

/**
 * Capsule search + circular primary button.
 * Layout from soft-UI sample; brand theme colors (color-scheme.mdc).
 */
export default function SoftSearchField({
  value,
  onChange,
  placeholder = 'Search…',
  'aria-label': ariaLabel,
  className = '',
  size = 'md',
}: SoftSearchFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const compact = size === 'sm'
  const fieldH = compact ? 'h-10' : 'h-11'
  const btnIcon = compact ? 'h-4 w-4' : 'h-5 w-5'

  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${className}`}>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={`${fieldH} min-w-0 flex-1 rounded-full border border-gray-200 bg-white px-4 text-sm leading-none text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-primary-400 dark:focus:ring-primary-400`}
      />
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => inputRef.current?.focus()}
        className={`flex ${fieldH} ${compact ? 'w-10' : 'w-11'} shrink-0 items-center justify-center rounded-full bg-primary-600 text-white shadow-sm outline-none transition-colors hover:bg-primary-700 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950`}
      >
        <Search className={btnIcon} strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  )
}
