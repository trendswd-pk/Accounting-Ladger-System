'use client'

import { ArrowDown, ArrowUp, Calendar, Minus } from 'lucide-react'
import { formatDayDeltaPct } from '@/lib/accountDayMovement'

type ExpensePeriodMobileCardProps = {
  /** Curved header left label (e.g. weekday or "Expense") */
  headerLabel: string
  /** Optional secondary in header (e.g. day number) */
  headerMeta?: string
  /** Right-side header meta (date / year) */
  headerRight: string
  /** Main title */
  title: string
  /** Optional subtitle on the title row (right) */
  subtitle?: string
  amountLabel: string
  formatBalance: (n: number) => string
  amount: number
  /** Expense totals use red for spend > 0 */
  amountToneClass: string
  highlighted?: boolean
  footerLeftLabel?: string
  footerLeftValue?: string
  /** Soft pill highlight on footer left value (e.g. Current day) */
  footerLeftHighlighted?: boolean
  /** Signed change vs prior period (drives up/down icon + color) */
  footerTrendDelta?: number
  /** Percent change vs prior period */
  footerTrendPct?: number
  /** Tooltip / aria for the trend (e.g. "vs last month") */
  footerTrendTitle?: string
  onOpen: () => void
}

/**
 * Mobile expense day/month card - same brand-sky / brand-ink language as
 * TransactionMobileCard / AccountMobileCard.
 */
export default function ExpensePeriodMobileCard({
  headerLabel,
  headerMeta,
  headerRight,
  title,
  subtitle,
  amountLabel,
  formatBalance,
  amount,
  amountToneClass,
  highlighted = false,
  footerLeftLabel = 'Period',
  footerLeftValue,
  footerLeftHighlighted = false,
  footerTrendDelta,
  footerTrendPct,
  footerTrendTitle,
  onOpen,
}: ExpensePeriodMobileCardProps) {
  const amountText = formatBalance(amount)
  const showTrend = footerTrendPct != null && footerTrendDelta != null
  const trend = showTrend
    ? footerTrendDelta > 0
      ? 'up'
      : footerTrendDelta < 0
        ? 'down'
        : 'flat'
    : null
  // More expense = red; less expense = brand green
  const trendClass =
    trend === 'up'
      ? 'text-red-700'
      : trend === 'down'
        ? 'text-primary-800'
        : 'text-brand-ink/45'
  const showFooterLeft =
    showTrend || Boolean(footerLeftValue) || footerLeftHighlighted

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
      className={`relative cursor-pointer overflow-hidden rounded-[1.65rem] bg-brand-sky text-left shadow-[0_8px_24px_rgba(11,27,51,0.18)] outline-none transition-transform active:scale-[0.995] focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
        highlighted
          ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-950'
          : 'ring-1 ring-white/35'
      }`}
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
            {headerLabel}
            {headerMeta ? (
              <span className="font-medium text-white/85"> · {headerMeta}</span>
            ) : null}
          </p>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-white/85">
            <Calendar className="h-3 w-3 opacity-80" strokeWidth={2.25} aria-hidden />
            <span className="max-w-[11.5rem] truncate tabular-nums sm:max-w-[14rem]">{headerRight}</span>
          </span>
        </div>
      </div>

      <div className="relative px-4 pb-3.5 pt-1.5">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h2 className="min-w-0 truncate text-[1.125rem] font-bold leading-snug tracking-tight text-brand-ink">
              {title}
            </h2>
            {highlighted ? (
              <span className="inline-flex shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700 shadow-sm ring-1 ring-red-600/25">
                Current
              </span>
            ) : null}
          </div>
          {subtitle ? (
            <p className="shrink-0 text-[12px] font-medium tabular-nums text-brand-ink/65">
              {subtitle}
            </p>
          ) : null}
        </div>

        <div
          className={`mt-3 flex items-center gap-3 border-t border-brand-ink/10 pt-2.5 text-[12px] font-medium text-brand-ink ${
            showFooterLeft ? 'justify-between' : 'justify-end'
          }`}
        >
          {showTrend && trend ? (
            <p
              className={`inline-flex min-w-0 items-center gap-1 truncate font-semibold tabular-nums ${trendClass}`}
              title={footerTrendTitle}
              aria-label={footerTrendTitle}
            >
              {trend === 'up' ? (
                <ArrowUp className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
              ) : trend === 'down' ? (
                <ArrowDown className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
              ) : (
                <Minus className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
              )}
              <span>{formatDayDeltaPct(footerTrendPct)}</span>
            </p>
          ) : showFooterLeft ? (
            <p className="flex min-w-0 items-center gap-1.5 truncate">
              {footerLeftLabel ? (
                <span className="shrink-0 opacity-70">{footerLeftLabel} :</span>
              ) : null}
              {footerLeftHighlighted ? (
                <span className="inline-flex max-w-full truncate rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-red-700 shadow-sm ring-1 ring-red-600/25">
                  {footerLeftValue ?? headerLabel}
                </span>
              ) : (
                <span className="font-semibold">{footerLeftValue}</span>
              )}
            </p>
          ) : null}
          <p
            className={`min-w-0 shrink-0 text-right text-sm font-bold tabular-nums ${amountToneClass}`}
            aria-label={amountLabel ? `${amountLabel}: ${amountText}` : amountText}
          >
            {amountText}
          </p>
        </div>
      </div>
    </article>
  )
}
