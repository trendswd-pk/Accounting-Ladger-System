'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import BalanceMixRibbons from '@/components/dashboard/BalanceMixRibbons'
import type { DashboardExpenseSummary } from '@/lib/dashboardExpenseSummary'
import { formatMoney } from '@/lib/money'

const ACCOUNT_SERIES_COLORS = [
  '#0ea5e9',
  '#8b5cf6',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#14b8a6',
  '#6366f1',
  '#84cc16',
  '#f97316',
  '#06b6d4',
] as const

type MixSlice = {
  key: string
  name: string
  value: number
  href: string
  pct: number
  dayDelta: number
  dayDeltaPct: number
}

export type BalanceMixDayNets = {
  pocket: number
  cash: number
  recv: number
  pay: number
}

type DashboardChartsProps = {
  currency: string
  ready: boolean
  summaryReady: boolean
  cashInPocket: number
  cashSavings: number
  payable: number
  receivable: number
  /** Today's signed net change per mix bucket (current − yesterday) */
  mixDayNets?: BalanceMixDayNets
  summary: DashboardExpenseSummary | null
}

/** Displayed mix amount change vs end of yesterday. */
function mixDayChange(
  rawToday: number,
  todayNet: number,
  mode: 'clamp0' | 'abs'
): { dayDelta: number; dayDeltaPct: number } {
  const rawYesterday = rawToday - todayNet
  const today = mode === 'abs' ? Math.abs(rawToday) : Math.max(0, rawToday)
  const yesterday =
    mode === 'abs' ? Math.abs(rawYesterday) : Math.max(0, rawYesterday)
  const dayDelta = today - yesterday
  const dayDeltaPct =
    yesterday === 0
      ? dayDelta === 0
        ? 0
        : dayDelta > 0
          ? 100
          : -100
      : (dayDelta / yesterday) * 100
  return { dayDelta, dayDeltaPct }
}

function ChartCard({
  title,
  subtitle,
  href,
  children,
}: {
  title: string
  subtitle?: string
  href?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex min-h-0 min-w-0 w-full flex-col overflow-hidden rounded-xl border border-gray-100 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5">
      <div className="mb-2 flex items-start justify-between gap-2 sm:mb-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 break-words text-xs leading-snug text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          ) : null}
        </div>
        {href ? (
          <Link
            href={href}
            className="shrink-0 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            View
          </Link>
        ) : null}
      </div>
      <div className="min-h-0 min-w-0 w-full flex-1 overflow-visible">
        {children}
      </div>
    </section>
  )
}

/** Fixed-height chart shell so ResponsiveContainer gets a real size on mobile. */
function ChartFrame({
  children,
  className = 'h-[15.5rem] sm:h-[16.5rem]',
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={`w-full min-w-0 ${className}`}>{children}</div>
}

function WrapLegend(props: {
  payload?: Array<{ value?: string; color?: string }>
}) {
  const payload = props.payload ?? []
  if (payload.length === 0) return null
  return (
    <ul className="flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 px-1 pt-1">
      {payload.map((entry, i) => (
        <li
          key={`${entry.value ?? 'item'}-${i}`}
          className="flex max-w-full items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400 sm:text-[11px]"
        >
          <span
            className="h-2 w-2 shrink-0 rounded-sm"
            style={{ backgroundColor: entry.color }}
            aria-hidden
          />
          <span className="truncate">{entry.value}</span>
        </li>
      ))}
    </ul>
  )
}

/** Wrap long axis labels onto multiple lines (word-aware, hard-break if needed). */
function wrapAxisLabel(text: string, maxCharsPerLine: number, maxLines = 3): string[] {
  const raw = String(text ?? '').trim()
  if (!raw) return ['']
  const words = raw.split(/\s+/)
  const lines: string[] = []
  let current = ''
  const pushHard = (word: string) => {
    let rest = word
    while (rest.length > maxCharsPerLine && lines.length < maxLines) {
      lines.push(rest.slice(0, maxCharsPerLine))
      rest = rest.slice(maxCharsPerLine)
    }
    return rest
  }
  for (const word of words) {
    if (lines.length >= maxLines) break
    const next = current ? `${current} ${word}` : word
    if (next.length <= maxCharsPerLine) {
      current = next
      continue
    }
    if (current) {
      lines.push(current)
      current = ''
      if (lines.length >= maxLines) break
    }
    if (word.length > maxCharsPerLine) {
      current = pushHard(word)
    } else {
      current = word
    }
  }
  if (current && lines.length < maxLines) lines.push(current)
  return lines.length > 0 ? lines : ['']
}

/** Y-axis tick that wraps the full account name instead of truncating. */
function WrappedYTick(props: {
  x?: number
  y?: number
  payload?: { value?: string | number }
}) {
  const x = Number(props.x) || 0
  const y = Number(props.y) || 0
  const lines = wrapAxisLabel(String(props.payload?.value ?? ''), 13, 3)
  const lineHeight = 11
  const startY = y - ((lines.length - 1) * lineHeight) / 2 + 3
  return (
    <text x={x} y={startY} textAnchor="end" fill="#9ca3af" fontSize={10}>
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  )
}

function ChartTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean
  payload?: Array<{ value?: number; name?: string; color?: string }>
  label?: string
  currency: string
}) {
  if (!active || !payload?.length) return null
  const rows = payload.filter((p) => Number(p.value) > 0)
  if (rows.length === 0) return null
  return (
    <div className="max-h-56 overflow-y-auto rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-gray-600 dark:bg-gray-800">
      {label ? (
        <p className="mb-1 font-medium text-gray-700 dark:text-gray-200">{label}</p>
      ) : null}
      {rows.map((p, i) => (
        <p key={i} className="tabular-nums text-gray-600 dark:text-gray-300">
          <span style={{ color: p.color }}>{p.name ?? 'Value'}: </span>
          {formatMoney(Number(p.value) || 0, currency)}
        </p>
      ))}
    </div>
  )
}

export default function DashboardCharts({
  currency,
  ready,
  summaryReady,
  cashInPocket,
  cashSavings,
  payable,
  receivable,
  mixDayNets,
  summary,
}: DashboardChartsProps) {
  const router = useRouter()

  const thisMonthRange = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate()
    return {
      from: `${y}-${m}-01`,
      to: `${y}-${m}-${String(lastDay).padStart(2, '0')}`,
    }
  }, [])

  const openAccountTransactions = (accountId: string) => {
    const qs = new URLSearchParams({
      accountId,
      dateFrom: thisMonthRange.from,
      dateTo: thisMonthRange.to,
      from: '/',
    })
    router.push(`/transactions?${qs.toString()}`)
  }

  const mixTotal = useMemo(
    () =>
      Math.max(0, cashInPocket) +
      Math.max(0, cashSavings) +
      Math.max(0, receivable) +
      Math.abs(payable),
    [cashInPocket, cashSavings, payable, receivable]
  )

  const mixData = useMemo((): MixSlice[] => {
    const nets = mixDayNets ?? { pocket: 0, cash: 0, recv: 0, pay: 0 }
    // Fixed order: Pocket → Savings → Receivable → Payable
    const rows: Omit<MixSlice, 'pct'>[] = [
      {
        key: 'pocket',
        name: 'Cash in Pocket',
        value: Math.max(0, cashInPocket),
        href: '/',
        ...mixDayChange(cashInPocket, nets.pocket, 'clamp0'),
      },
      {
        key: 'cash',
        name: 'Cash & Savings',
        value: Math.max(0, cashSavings),
        href: '/cash-savings',
        ...mixDayChange(cashSavings, nets.cash, 'clamp0'),
      },
      {
        key: 'recv',
        name: 'Receivable',
        value: Math.max(0, receivable),
        href: '/receivable',
        ...mixDayChange(receivable, nets.recv, 'clamp0'),
      },
      {
        key: 'pay',
        name: 'Payable',
        value: Math.abs(payable),
        href: '/payable',
        ...mixDayChange(payable, nets.pay, 'abs'),
      },
    ]
    return rows.map((s) => ({
      ...s,
      pct: mixTotal > 0 ? Math.round((s.value / mixTotal) * 10000) / 100 : 0,
    }))
  }, [cashInPocket, cashSavings, payable, receivable, mixTotal, mixDayNets])

  const monthlyExpenseData = summary?.monthly ?? []
  const monthlySeries = summary?.monthlySeries ?? []
  const dailyExpenseData = summary?.daily ?? []
  const dailySeries = summary?.dailySeries ?? []
  const topExpenseAccounts = summary?.topAccounts ?? []

  if (!ready) {
    return (
      <div className="mt-6 grid min-w-0 gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="h-64 min-w-0 animate-pulse rounded-xl border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="mt-6 min-w-0 space-y-4">
      <div className="grid min-w-0 gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <ChartCard
          title="Balance mix"
          subtitle="Pocket · Savings · Receivable · Payable · vs yesterday"
        >
          <BalanceMixRibbons items={mixData} currency={currency} total={mixTotal} />
        </ChartCard>

        <ChartCard
          title="Monthly expenses"
          subtitle="Last 6 months · accounts + total"
          href="/expenses/monthly"
        >
          {!summaryReady ? (
            <div className="h-[15.5rem] animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700/50 sm:h-[16.5rem]" />
          ) : (
            <ChartFrame className="h-[16.5rem] sm:h-[17.5rem]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={monthlyExpenseData}
                  margin={{ top: 4, right: 6, left: 2, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-gray-200 dark:stroke-gray-700"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    height={32}
                    tickMargin={6}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                    tickMargin={4}
                    tickFormatter={(v) =>
                      Math.abs(Number(v)) >= 1000
                        ? `${Math.round(Number(v) / 1000)}k`
                        : String(v)
                    }
                  />
                  <Tooltip
                    content={<ChartTooltip currency={currency} />}
                    cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    content={<WrapLegend />}
                    wrapperStyle={{ width: '100%', paddingTop: 2 }}
                  />
                  {monthlySeries.length > 0 ? (
                    monthlySeries.map((s, i) => (
                      <Bar
                        key={s.key}
                        dataKey={s.key}
                        name={s.name}
                        stackId="accounts"
                        fill={ACCOUNT_SERIES_COLORS[i % ACCOUNT_SERIES_COLORS.length]}
                        radius={
                          i === monthlySeries.length - 1
                            ? [6, 6, 0, 0]
                            : [0, 0, 0, 0]
                        }
                        maxBarSize={28}
                        isAnimationActive={false}
                      />
                    ))
                  ) : (
                    <Bar
                      dataKey="expense"
                      name="Total"
                      fill="#f59e0b"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={28}
                      isAnimationActive={false}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </ChartFrame>
          )}
        </ChartCard>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <ChartCard
          title="Daily expenses"
          subtitle={`${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][new Date().getMonth()]} · this month · accounts + total`}
          href="/expenses/daily"
        >
          {!summaryReady ? (
            <div className="h-[15.5rem] animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700/50 sm:h-[16.5rem]" />
          ) : (
            <ChartFrame className="h-[16.5rem] sm:h-[17.5rem]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={dailyExpenseData}
                  margin={{ top: 4, right: 6, left: 2, bottom: 4 }}
                >
                  <defs>
                    <linearGradient id="expenseArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-gray-200 dark:stroke-gray-700"
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    height={32}
                    tickMargin={6}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                    tickMargin={4}
                    tickFormatter={(v) =>
                      Math.abs(Number(v)) >= 1000
                        ? `${Math.round(Number(v) / 1000)}k`
                        : String(v)
                    }
                  />
                  <Tooltip
                    content={<ChartTooltip currency={currency} />}
                    cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    content={<WrapLegend />}
                    wrapperStyle={{ width: '100%', paddingTop: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    name="Total"
                    stroke="#ef4444"
                    fill="url(#expenseArea)"
                    strokeWidth={2.5}
                    isAnimationActive={false}
                  />
                  {dailySeries.map((s, i) => (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      name={s.name}
                      stroke={
                        ACCOUNT_SERIES_COLORS[i % ACCOUNT_SERIES_COLORS.length]
                      }
                      strokeWidth={1.75}
                      dot={false}
                      isAnimationActive={false}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </ChartFrame>
          )}
        </ChartCard>

        <ChartCard
          title="Top expense accounts"
          subtitle="This month"
          href="/expenses"
        >
          {!summaryReady ? (
            <div className="h-[15.5rem] animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700/50 sm:h-[16.5rem]" />
          ) : topExpenseAccounts.length === 0 ? (
            <p className="flex h-[15.5rem] items-center justify-center text-sm text-gray-500 dark:text-gray-400 sm:h-[16.5rem]">
              No expense activity this month.
            </p>
          ) : (
            <ChartFrame>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topExpenseAccounts}
                  layout="vertical"
                  margin={{ top: 4, right: 10, left: 4, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    className="stroke-gray-200 dark:stroke-gray-700"
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={4}
                    tickFormatter={(v) =>
                      Math.abs(Number(v)) >= 1000
                        ? `${Math.round(Number(v) / 1000)}k`
                        : String(v)
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={<WrappedYTick />}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={6}
                    interval={0}
                  />
                  <Tooltip
                    content={<ChartTooltip currency={currency} />}
                    cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
                  />
                  <Bar
                    dataKey="total"
                    name="Expense"
                    fill="#0ea5e9"
                    radius={[0, 6, 6, 0]}
                    maxBarSize={22}
                    isAnimationActive={false}
                    className="cursor-pointer"
                    onClick={(data) => {
                      const point = data as {
                        payload?: { id?: string }
                        id?: string
                      }
                      const id = point?.payload?.id ?? point?.id
                      if (id) openAccountTransactions(id)
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          )}
        </ChartCard>
      </div>
    </div>
  )
}
