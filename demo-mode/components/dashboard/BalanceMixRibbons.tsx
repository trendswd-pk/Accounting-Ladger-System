'use client'

import Link from 'next/link'
import {
  ArrowDown,
  ArrowUp,
  Banknote,
  Minus,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { formatMoney } from '@/lib/money'

export type BalanceMixRibbonItem = {
  key: string
  name: string
  value: number
  href: string
  pct: number
  /** Absolute change in displayed mix amount vs end of yesterday */
  dayDelta?: number
  /** Percent change vs yesterday's displayed amount */
  dayDeltaPct?: number
}

/**
 * One brand scheme for every row (sample pill structure):
 * circular icon cap + light body, official primary greens only.
 */
const PILL = {
  badgeFrom: '#03624C', // primary-600
  badgeTo: '#2CC295', // primary-400 / brand-sky
  body: '#E3F5EF', // primary-50
  title: '#0B453A', // primary-800
  muted: '#095544', // primary-700
} as const

const ICONS_BY_KEY: Record<string, LucideIcon> = {
  pocket: Wallet,
  cash: Banknote,
  recv: TrendingUp,
  pay: TrendingDown,
}

const ICONS_BY_INDEX: LucideIcon[] = [Wallet, Banknote, TrendingUp, TrendingDown]

function iconForItem(key: string, index: number): LucideIcon {
  return ICONS_BY_KEY[key] ?? ICONS_BY_INDEX[index % ICONS_BY_INDEX.length]!
}

type BalanceMixRibbonsProps = {
  items: BalanceMixRibbonItem[]
  currency: string
  total: number
}

function formatPct(pct: number): string {
  const n = Math.max(0, pct)
  return `${n.toFixed(2)}%`
}

function formatDayDeltaPct(pct: number): string {
  const abs = Math.abs(pct)
  const body = abs >= 10 ? abs.toFixed(1) : abs.toFixed(2)
  if (pct > 0) return `+${body}%`
  if (pct < 0) return `-${body}%`
  return '0%'
}

export default function BalanceMixRibbons({
  items,
  currency,
  total,
}: BalanceMixRibbonsProps) {
  if (items.length === 0) return null

  return (
    <div className="min-w-0 space-y-3 sm:space-y-4">
      <ul className="min-w-0 space-y-2.5 sm:space-y-3">
        {items.map((item, index) => {
          const Icon = iconForItem(item.key, index)
          const dayDelta = item.dayDelta ?? 0
          const dayDeltaPct = item.dayDeltaPct ?? 0
          const trend = dayDelta > 0 ? 'up' : dayDelta < 0 ? 'down' : 'flat'
          const trendTitle =
            trend === 'flat'
              ? 'No change vs yesterday'
              : `${formatMoney(Math.abs(dayDelta), currency)} ${
                  trend === 'up' ? 'up' : 'down'
                } vs yesterday`
          const trendClass =
            trend === 'up'
              ? 'text-primary-700'
              : trend === 'down'
                ? 'text-red-600'
                : 'text-gray-400'

          return (
            <li key={item.key} className="min-w-0">
              <Link
                href={item.href}
                className="group relative flex h-14 w-full min-w-0 max-w-full items-center outline-none transition-transform active:scale-[0.995] focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800 sm:h-[3.75rem]"
              >
                {/* Continuous pill body (sample) */}
                <span
                  className="absolute inset-0 rounded-full shadow-sm transition-shadow group-hover:shadow-md"
                  style={{ backgroundColor: PILL.body }}
                  aria-hidden
                />

                {/* Circular icon cap — same height as pill, flush left */}
                <span
                  className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white sm:h-[3.75rem] sm:w-[3.75rem]"
                  style={{
                    background: `linear-gradient(145deg, ${PILL.badgeFrom} 0%, ${PILL.badgeTo} 100%)`,
                    boxShadow: '3px 0 8px rgba(3, 98, 76, 0.22)',
                  }}
                  aria-hidden
                >
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.9} />
                </span>

                {/* Title + meta + day delta */}
                <span className="relative z-10 flex min-w-0 flex-1 items-center gap-2 py-2 pl-3 pr-3 sm:pl-3.5 sm:pr-4">
                  <span className="min-w-0 flex-1 overflow-hidden">
                    <span
                      className="block truncate text-[12px] font-bold leading-snug tracking-tight sm:text-[13px]"
                      style={{ color: PILL.title }}
                    >
                      {item.name}
                    </span>
                    <span
                      className="mt-0.5 block truncate text-[10px] leading-snug sm:text-[11px]"
                      style={{ color: PILL.muted }}
                    >
                      <span className="sm:hidden">{formatPct(item.pct)}</span>
                      <span className="hidden sm:inline">
                        {formatPct(item.pct)} of mix
                      </span>
                      {' · '}
                      <span className="tabular-nums font-semibold">
                        {formatMoney(item.value, currency)}
                      </span>
                    </span>
                  </span>

                  <span
                    className={`flex shrink-0 flex-col items-center justify-center gap-0.5 ${trendClass}`}
                    title={trendTitle}
                    aria-label={trendTitle}
                  >
                    {trend === 'up' ? (
                      <ArrowUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2.4} aria-hidden />
                    ) : trend === 'down' ? (
                      <ArrowDown className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2.4} aria-hidden />
                    ) : (
                      <Minus className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2.4} aria-hidden />
                    )}
                    <span className="text-[9px] font-semibold leading-none tabular-nums tracking-tight sm:text-[10px]">
                      {formatDayDeltaPct(dayDeltaPct)}
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>

      <p className="flex min-w-0 items-baseline justify-end gap-1.5 overflow-hidden border-t border-gray-200 pt-2.5 text-[10px] uppercase tracking-wider text-gray-400 dark:border-gray-700 dark:text-gray-500 sm:pt-3">
        Total
        <span className="truncate text-sm font-semibold normal-case tracking-normal tabular-nums text-gray-900 dark:text-gray-100">
          {formatMoney(total, currency)}
        </span>
      </p>
    </div>
  )
}
