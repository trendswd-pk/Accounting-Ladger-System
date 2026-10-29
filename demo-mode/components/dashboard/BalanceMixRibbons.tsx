'use client'

import Link from 'next/link'
import {
  Banknote,
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
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}%`
}

export default function BalanceMixRibbons({
  items,
  currency,
  total,
}: BalanceMixRibbonsProps) {
  if (items.length === 0) return null

  return (
    <div className="space-y-4">
      <ul className="space-y-3.5">
        {items.map((item, index) => {
          const theme = RIBBON_THEMES[index % RIBBON_THEMES.length]!
          const Icon: LucideIcon = theme.icon
          const num = String(index + 1).padStart(2, '0')

          return (
            <li key={item.key}>
              <Link
                href={item.href}
                prefetch={false}
                className="group relative flex min-h-[3.75rem] items-stretch outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800 sm:min-h-[4rem]"
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

                {/* Number ribbon */}
                <span
                  className="relative z-20 flex w-12 shrink-0 items-center justify-center self-stretch rounded-l-md sm:w-[3.25rem]"
                  style={{
                    background: `linear-gradient(160deg, ${theme.from} 0%, ${theme.to} 100%)`,
                    clipPath: 'polygon(0 0, 100% 0, 78% 100%, 0 100%)',
                    boxShadow:
                      'inset 0 1px 0 rgba(255,255,255,0.22), 1px 2px 6px rgba(0,0,0,0.25)',
                  }}
                  aria-hidden
                >
                  <span className="pr-1 text-[15px] font-light tracking-wide text-white sm:text-lg">
                    {num}
                  </span>
                </span>

                {/* Body */}
                <div
                  className="relative z-10 -ml-4 flex min-w-0 flex-1 items-center gap-2.5 bg-white py-2.5 pl-6 pr-8 shadow-[0_3px_12px_rgba(15,23,42,0.12),0_1px_2px_rgba(15,23,42,0.06)] transition-shadow group-hover:shadow-lg dark:bg-gray-700 dark:shadow-[0_4px_16px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(255,255,255,0.06)] dark:group-hover:shadow-[0_6px_20px_rgba(0,0,0,0.55),inset_0_0_0_1px_rgba(255,255,255,0.1)] sm:-ml-5 sm:pl-7 sm:pr-10"
                  style={{
                    clipPath:
                      'polygon(0 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 0 100%)',
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold uppercase tracking-[0.04em] text-slate-800 dark:text-gray-100 sm:text-[13px]">
                      {item.name}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] leading-snug text-slate-500 dark:text-gray-400 sm:text-xs">
                      {formatPct(item.pct)} of mix ·{' '}
                      <span className="tabular-nums font-medium text-slate-600 dark:text-gray-300">
                        {formatMoney(item.value, currency)}
                      </span>
                    </p>
                  </div>

                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.05] dark:bg-white/10 sm:h-9 sm:w-9"
                    aria-hidden
                  >
                    <Icon
                      className="h-4 w-4 dark:hidden sm:h-[1.15rem] sm:w-[1.15rem]"
                      style={{ color: theme.iconLight }}
                      strokeWidth={1.6}
                    />
                    <Icon
                      className="hidden h-4 w-4 dark:block sm:h-[1.15rem] sm:w-[1.15rem]"
                      style={{ color: theme.iconDark }}
                      strokeWidth={1.6}
                    />
                  </span>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>

      <p className="flex items-baseline justify-end gap-1.5 border-t border-gray-100 pt-3 text-[10px] uppercase tracking-wider text-gray-400 dark:border-gray-700 dark:text-gray-500">
        Total
        <span className="text-sm font-semibold normal-case tracking-normal tabular-nums text-gray-900 dark:text-gray-100">
          {formatMoney(total, currency)}
        </span>
      </p>
    </div>
  )
}
