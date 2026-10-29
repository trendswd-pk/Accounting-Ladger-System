'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

/** Matched height/width for Prev/Next and page-number buttons. */
export const paginationNavBtnClass =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'

export const paginationNavBtnClassSm =
  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'

export const paginationIconClass = 'h-4 w-4'
export const paginationIconClassSm = 'h-3.5 w-3.5'

export function paginationPageBtnClass(active: boolean, size: 'md' | 'sm' = 'md'): string {
  const box =
    size === 'sm'
      ? 'inline-flex h-7 min-w-7 shrink-0 items-center justify-center px-1.5 rounded-md text-xs font-medium tabular-nums transition-colors'
      : 'inline-flex h-9 min-w-9 shrink-0 items-center justify-center px-2 rounded-md text-sm font-medium tabular-nums transition-colors'
  return [
    box,
    active
      ? 'bg-primary-600 text-white'
      : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700',
  ].join(' ')
}

/** Page numbers with `-1` markers for ellipsis gaps. */
export function buildPaginationPages(current: number, total: number): number[] {
  const t = Math.max(1, total)
  const c = Math.min(Math.max(1, current), t)
  return Array.from({ length: t }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === t || (p >= c - 2 && p <= c + 2))
    .reduce<number[]>((acc, p, i, arr) => {
      if (i > 0 && p - arr[i - 1]! > 1) acc.push(-1)
      acc.push(p)
      return acc
    }, [])
}

type TablePaginationNavProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  size?: 'md' | 'sm'
}

/** Prev / page numbers / Next — same as Courier-Dashboard Due COD. */
export function TablePaginationNav({
  page,
  totalPages,
  onPageChange,
  size = 'md',
}: TablePaginationNavProps) {
  const pages = buildPaginationPages(page, totalPages)
  const navBtn = size === 'sm' ? paginationNavBtnClassSm : paginationNavBtnClass
  const icon = size === 'sm' ? paginationIconClassSm : paginationIconClass
  const ellipsis =
    size === 'sm'
      ? 'inline-flex h-7 min-w-7 items-center justify-center px-0.5 text-xs text-gray-400'
      : 'inline-flex h-9 min-w-9 items-center justify-center px-1 text-gray-400'
  return (
    <>
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className={navBtn}
        aria-label="Previous page"
      >
        <ChevronLeft className={icon} />
      </button>
      {pages.map((p, idx) =>
        p === -1 ? (
          <span key={`ellip-${idx}`} className={ellipsis}>
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={paginationPageBtnClass(p === page, size)}
            aria-label={`Page ${p}`}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className={navBtn}
        aria-label="Next page"
      >
        <ChevronRight className={icon} />
      </button>
    </>
  )
}
