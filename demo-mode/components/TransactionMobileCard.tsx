'use client'

import { Calendar, Clock, TrendingDown, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'
import type { TransactionEntryType } from '@/lib/transactions'

export type TransactionMobileCardRow = {
  id: string
  entryNumber: number
  transactionDate: string
  accountName: string
  narration: string
  entryType: TransactionEntryType
  balance: number
  runningBalance: number
  createdAt?: string
}

type TransactionMobileCardProps = {
  row: TransactionMobileCardRow
  formatBalance: (n: number) => string
  formatDisplayDate: (iso: string) => string
  actions?: ReactNode
  onOpen: () => void
}

function formatTime(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

/**
 * Mobile transaction card — brand-sky body + brand-ink curved date tab
 * (see .cursor/rules/color-scheme.mdc).
 */
export default function TransactionMobileCard({
  row,
  formatBalance,
  formatDisplayDate,
  actions,
  onOpen,
}: TransactionMobileCardProps) {
  const isCredit = row.entryType === 'credit'
  const signedLabel = `${isCredit ? '+' : '−'}${formatBalance(Math.abs(row.balance))}`
  const typeLabel = isCredit ? 'Credit' : 'Debit'
  const narration = row.narration.trim() || '—'

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className="relative cursor-pointer overflow-hidden rounded-[1.65rem] bg-brand-sky text-left shadow-[0_8px_24px_rgba(11,27,51,0.18)] outline-none ring-1 ring-white/35 transition-transform active:scale-[0.995] focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
    >
      <div className="relative h-11 w-full shadow-[inset_0_1px_0_0_rgba(255,255,255,0.28)]">
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 360 44"
          preserveAspectRatio="none"
          aria-hidden
        >
          <rect width="360" height="44" className="fill-brand-ink" />
          <path
            d="M0 0 H118 C152 0 158 44 198 44 H0 Z"
            className="fill-brand-sky"
          />
        </svg>

        <div className="relative z-10 flex h-full items-center justify-between gap-2 px-4">
          <p className="min-w-0 truncate text-[12px] font-semibold tracking-wide text-white">
            {typeLabel}
            <span className="font-medium text-white/85"> · SR {row.entryNumber}</span>
          </p>
          <div className="flex shrink-0 items-center gap-3 text-[11px] font-medium text-white/85">
            {row.createdAt ? (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Clock
                  className="h-3 w-3 opacity-80"
                  strokeWidth={2.25}
                  aria-hidden
                />
                {formatTime(row.createdAt)}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Calendar className="h-3 w-3 opacity-80" strokeWidth={2.25} aria-hidden />
              {formatDisplayDate(row.transactionDate)}
            </span>
          </div>
        </div>
      </div>

      <div className="relative px-4 pb-3.5 pt-1.5">
        {row.accountName.trim() || actions ? (
          <div className="flex min-w-0 items-center justify-between gap-2">
            {row.accountName.trim() ? (
              <div className="min-w-0 flex-1 overflow-hidden">
                <h2 className="truncate text-[1.125rem] font-bold leading-snug tracking-tight text-brand-ink">
                  {row.accountName}
                </h2>
              </div>
            ) : (
              <div className="min-w-0 flex-1" />
            )}
            {actions ? (
              <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                {actions}
              </div>
            ) : null}
          </div>
        ) : null}

        <div
          className={`flex flex-wrap items-center gap-2 ${
            row.accountName.trim() || actions ? 'mt-2' : 'mt-0.5'
          }`}
        >
          <span
            className={`inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold shadow-sm ${
              isCredit ? 'text-primary-800' : 'text-red-700'
            }`}
          >
            {isCredit ? (
              <TrendingUp className="h-3 w-3" strokeWidth={2.5} aria-hidden />
            ) : (
              <TrendingDown className="h-3 w-3" strokeWidth={2.5} aria-hidden />
            )}
            {typeLabel}
          </span>
          <span className="inline-flex items-center rounded-full border border-brand-ink bg-white/18 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-brand-ink">
            {signedLabel}
          </span>
        </div>

        <p className="mt-2 truncate text-[12px] text-brand-ink/65">{narration}</p>

        <div className="mt-3 border-t border-brand-ink/10 pt-2.5 text-right text-[12px] font-medium text-brand-ink">
          <p className="min-w-0 truncate">
            <span className="opacity-70">Running :</span>{' '}
            <span className="font-semibold tabular-nums">
              {formatBalance(row.runningBalance)}
            </span>
          </p>
        </div>
      </div>
    </article>
  )
}
