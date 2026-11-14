'use client'

import { ArrowDown, ArrowUp, Phone, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatDayDeltaPct } from '@/lib/accountDayMovement'
import { formatMoney } from '@/lib/money'
import { toWhatsAppDigits } from '@/lib/phone'

export type AccountMobileCardRow = {
  id: string
  serialNumber: number
  name: string
  phone: string
  accountTypeName: string
  cashTypeName: string
  balance: number
  /** Signed change vs prior period (month / day — see `deltaVersusLabel`) */
  monthDelta?: number
  /** Percent change vs prior period */
  monthDeltaPct?: number
}

type AccountMobileCardProps = {
  row: AccountMobileCardRow
  formatBalance: (n: number) => string
  currency?: string
  actions?: ReactNode
  onOpen: () => void
  /** e.g. "last month" or "yesterday" — used in tooltip / aria */
  deltaVersusLabel?: string
  /**
   * `balance` (default): up = green, down = red.
   * `expense`: more spend = red, less = green.
   */
  trendMode?: 'balance' | 'expense'
}

/**
 * Mobile account card — brand-sky body + brand-ink curved tab
 * (parity with TransactionMobileCard / color-scheme.mdc).
 */
export default function AccountMobileCard({
  row,
  formatBalance,
  currency,
  actions,
  onOpen,
  deltaVersusLabel = 'last month',
  trendMode = 'balance',
}: AccountMobileCardProps) {
  const typeLabel = row.accountTypeName.trim() || 'Account'
  const cashLabel = row.cashTypeName.trim() || '—'
  const phone = row.phone.trim()
  const waDigits = toWhatsAppDigits(phone)
  const phoneDigits = waDigits ? `+${waDigits}` : ''
  const balanceLabel = formatBalance(row.balance)
  const balanceTone =
    trendMode === 'expense'
      ? row.balance > 0
        ? 'text-red-700'
        : row.balance < 0
          ? 'text-primary-800'
          : 'text-brand-ink'
      : row.balance > 0
        ? 'text-primary-800'
        : row.balance < 0
          ? 'text-red-700'
          : 'text-brand-ink'

  const monthDelta = row.monthDelta ?? 0
  const monthDeltaPct = row.monthDeltaPct ?? 0
  const trend = monthDelta > 0 ? 'up' : monthDelta < 0 ? 'down' : 'flat'
  const trendClass =
    trend === 'flat'
      ? 'text-brand-ink/45'
      : trendMode === 'expense'
        ? trend === 'up'
          ? 'text-red-700'
          : 'text-primary-800'
        : trend === 'up'
          ? 'text-primary-800'
          : 'text-red-700'
  const trendWord =
    trendMode === 'expense'
      ? trend === 'up'
        ? 'more'
        : 'less'
      : trend === 'up'
        ? 'up'
        : 'down'
  const trendTitle =
    trend === 'flat'
      ? `No change vs ${deltaVersusLabel}`
      : `${currency ? formatMoney(Math.abs(monthDelta), currency) : formatBalance(Math.abs(monthDelta))} ${trendWord} vs ${deltaVersusLabel}`

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
            {cashLabel}
          </p>
          {phone ? (
            <a
              href={`tel:${phoneDigits}`}
              onClick={(e) => e.stopPropagation()}
              className="flex min-w-0 shrink-0 items-center gap-1.5 text-[11px] font-medium text-white/85 hover:text-white hover:underline"
            >
              <Phone className="h-3 w-3 shrink-0 opacity-80" strokeWidth={2.25} aria-hidden />
              <span className="max-w-[7.5rem] truncate tabular-nums">{phone}</span>
            </a>
          ) : (
            <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-white/55">
              <Phone className="h-3 w-3 opacity-80" strokeWidth={2.25} aria-hidden />
              —
            </span>
          )}
        </div>
      </div>

      <div className="relative px-4 pb-3.5 pt-1.5">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="min-w-0 flex-1 overflow-hidden">
            <h2 className="truncate text-[1.125rem] font-bold leading-snug tracking-tight text-brand-ink">
              {row.name}
            </h2>
          </div>
          {actions ? (
            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
              {actions}
            </div>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-800 shadow-sm">
            <Wallet className="h-3 w-3" strokeWidth={2.5} aria-hidden />
            {typeLabel}
          </span>
          <span
            className={`inline-flex items-center rounded-full border border-white/75 bg-white/18 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white`}
          >
            {balanceLabel}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-brand-ink/10 pt-2.5 text-[12px] font-medium text-brand-ink">
          <p
            className={`inline-flex min-w-0 items-center gap-1 truncate font-semibold tabular-nums ${trendClass}`}
            title={trendTitle}
            aria-label={trendTitle}
          >
            {trend === 'up' ? (
              <ArrowUp className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
            ) : trend === 'down' ? (
              <ArrowDown className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
            ) : null}
            <span>{formatDayDeltaPct(monthDeltaPct)}</span>
          </p>
          <p className={`min-w-0 shrink-0 text-right ${balanceTone}`}>
            <span className="opacity-70 text-brand-ink">Balance :</span>{' '}
            <span className="font-semibold tabular-nums">{balanceLabel}</span>
          </p>
        </div>
      </div>
    </article>
  )
}
