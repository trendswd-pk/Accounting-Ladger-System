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

const RIBBON_THEMES = [
  {
    from: '#e53935',
    to: '#fb8c00',
    fold: '#b71c1c',
    foldDark: '#7f1212',
    iconLight: '#e53935',
    iconDark: '#fb7185',
    icon: Wallet,
  },
  {
    from: '#ef6c00',
    to: '#fbc02d',
    fold: '#e65100',
    foldDark: '#9a3412',
    iconLight: '#ef6c00',
    iconDark: '#fdba74',
    icon: Banknote,
  },
  {
    from: '#7cb342',
    to: '#d4e157',
    fold: '#558b2f',
    foldDark: '#3f6212',
    iconLight: '#689f38',
    iconDark: '#a3e635',
    icon: TrendingUp,
  },
  {
    from: '#00897b',
    to: '#26c6da',
    fold: '#00695c',
    foldDark: '#115e59',
    iconLight: '#00897b',
    iconDark: '#2dd4bf',
    icon: TrendingDown,
  },
] as const

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
      <ul className="min-w-0 space-y-3 sm:space-y-3.5">
        {items.map((item, index) => {
          const theme = RIBBON_THEMES[index % RIBBON_THEMES.length]!
          const Icon: LucideIcon = theme.icon
          const dayDelta = item.dayDelta ?? 0
          const dayDeltaPct = item.dayDeltaPct ?? 0
          const trend =
            dayDelta > 0 ? 'up' : dayDelta < 0 ? 'down' : 'flat'
          const trendTitle =
            trend === 'flat'
              ? 'No change vs yesterday'
              : `${formatMoney(Math.abs(dayDelta), currency)} ${
                  trend === 'up' ? 'up' : 'down'
                } vs yesterday`

          return (
            <li key={item.key} className="min-w-0">
              <Link
                href={item.href}
                className="group relative flex min-h-[3.5rem] w-full min-w-0 max-w-full items-stretch overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800 sm:min-h-[4rem]"
              >
                {/* Fold under ribbon */}
                <span
                  className="pointer-events-none absolute bottom-[-3px] left-[10px] z-0 h-3 w-8 -skew-x-[18deg] rounded-[2px] dark:hidden"
                  style={{ backgroundColor: theme.fold }}
                  aria-hidden
                />
                <span
                  className="pointer-events-none absolute bottom-[-3px] left-[10px] z-0 hidden h-3 w-8 -skew-x-[18deg] rounded-[2px] dark:block"
                  style={{ backgroundColor: theme.foldDark }}
                  aria-hidden
                />

                {/* Category icon ribbon (replaces 01/02/…) */}
                <span
                  className="relative z-20 flex w-10 shrink-0 items-center justify-center self-stretch rounded-l-md sm:w-[3.25rem]"
                  style={{
                    background: `linear-gradient(160deg, ${theme.from} 0%, ${theme.to} 100%)`,
                    clipPath: 'polygon(0 0, 100% 0, 78% 100%, 0 100%)',
                    boxShadow:
                      'inset 0 1px 0 rgba(255,255,255,0.22), 1px 2px 6px rgba(0,0,0,0.25)',
                  }}
                  aria-hidden
                >
                  <Icon
                    className="mr-1 h-4 w-4 text-white sm:h-[1.15rem] sm:w-[1.15rem]"
                    strokeWidth={1.85}
                  />
                </span>

                {/* Body */}
                <div
                  className="relative z-10 -ml-3 flex min-w-0 flex-1 items-center gap-2 bg-white py-2 pl-4 pr-6 shadow-[0_3px_12px_rgba(15,23,42,0.12),0_1px_2px_rgba(15,23,42,0.06)] transition-shadow group-hover:shadow-lg dark:bg-gray-700 dark:shadow-[0_4px_16px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(255,255,255,0.06)] dark:group-hover:shadow-[0_6px_20px_rgba(0,0,0,0.55),inset_0_0_0_1px_rgba(255,255,255,0.1)] sm:-ml-5 sm:gap-2.5 sm:py-2.5 sm:pl-7 sm:pr-10"
                  style={{
                    clipPath:
                      'polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)',
                  }}
                >
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="truncate text-[11px] font-bold uppercase tracking-[0.04em] text-slate-800 dark:text-gray-100 sm:text-[13px]">
                      {item.name}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] leading-snug text-slate-500 dark:text-gray-400 sm:text-xs">
                      <span className="sm:hidden">{formatPct(item.pct)}</span>
                      <span className="hidden sm:inline">
                        {formatPct(item.pct)} of mix
                      </span>
                      {' · '}
                      <span className="tabular-nums font-medium text-slate-600 dark:text-gray-300">
                        {formatMoney(item.value, currency)}
                      </span>
                    </p>
                  </div>

                  {/* Day-over-day vs yesterday */}
                  <span
                    className={[
                      'mr-0.5 flex shrink-0 flex-col items-center justify-center gap-0.5 sm:mr-1',
                      trend === 'up'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : trend === 'down'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-slate-400 dark:text-gray-500',
                    ].join(' ')}
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
                    <span className="text-[9px] font-semibold leading-none tabular-nums tracking-tight sm:text-[11px]">
                      {formatDayDeltaPct(dayDeltaPct)}
                    </span>
                  </span>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>

      <p className="flex min-w-0 items-baseline justify-end gap-1.5 overflow-hidden border-t border-gray-100 pt-2.5 text-[10px] uppercase tracking-wider text-gray-400 dark:border-gray-700 dark:text-gray-500 sm:pt-3">
        Total
        <span className="truncate text-sm font-semibold normal-case tracking-normal tabular-nums text-gray-900 dark:text-gray-100">
          {formatMoney(total, currency)}
        </span>
      </p>
    </div>
  )
}
