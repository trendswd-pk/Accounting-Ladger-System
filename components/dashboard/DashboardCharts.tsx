'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AccountRecord } from '@/lib/accounts'
import { formatMoney } from '@/lib/money'
import {
  expenseSpendAmount,
  type TransactionRecord,
} from '@/lib/transactions'

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

const MIX_COLORS = [
  '#38bdf8', // cash in pocket
  '#0ea5e9', // cash & savings
  '#22c55e', // receivable
  '#ef4444', // payable
]

type MixSlice = {
  key: string
  name: string
  value: number
  href: string
  color: string
}

type DashboardChartsProps = {
  currency: string
  ready: boolean
  /** Accounts-only charts (balance mix) can render before this is true */
  txReady: boolean
  cashInPocket: number
  cashSavings: number
  payable: number
  receivable: number
  expenseAccountIds: Set<string>
  transactions: TransactionRecord[]
  expenseAccounts: AccountRecord[]
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
    <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/90">
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-700 sm:px-5">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
          ) : null}
        </div>
        {href ? (
          <Link
            href={href}
            prefetch={false}
            className="shrink-0 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            View
          </Link>
        ) : null}
      </div>
      <div className="min-h-[14rem] flex-1 p-3 sm:p-4">{children}</div>
    </section>
  )
}

function ChartTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string }>
  label?: string
  currency: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-gray-600 dark:bg-gray-800">
      {label ? (
        <p className="mb-1 font-medium text-gray-700 dark:text-gray-200">{label}</p>
      ) : null}
      {payload.map((p, i) => (
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
  txReady,
  cashInPocket,
  cashSavings,
  payable,
  receivable,
  expenseAccountIds,
  transactions,
  expenseAccounts,
}: DashboardChartsProps) {
  const mixData = useMemo((): MixSlice[] => {
    const slices: MixSlice[] = [
      {
        key: 'pocket',
        name: 'Cash in Pocket',
        value: Math.max(0, cashInPocket),
        href: '/',
        color: MIX_COLORS[0],
      },
      {
        key: 'cash',
        name: 'Cash & Savings',
        value: Math.max(0, cashSavings),
        href: '/cash-savings',
        color: MIX_COLORS[1],
      },
      {
        key: 'recv',
        name: 'Receivable',
        value: Math.max(0, receivable),
        href: '/receivable',
        color: MIX_COLORS[2],
      },
      {
        key: 'pay',
        name: 'Payable',
        value: Math.abs(payable),
        href: '/payable',
        color: MIX_COLORS[3],
      },
    ]
    return slices.filter((s) => s.value > 0)
  }, [cashInPocket, cashSavings, payable, receivable])

  const mixTotal = useMemo(
    () => mixData.reduce((sum, s) => sum + s.value, 0),
    [mixData]
  )

  const monthlyExpenseData = useMemo(() => {
    const now = new Date()
    const points: Array<{ key: string; label: string; expense: number }> = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const y = d.getFullYear()
      const m = d.getMonth()
      const prefix = `${y}-${String(m + 1).padStart(2, '0')}`
      let expense = 0
      for (const tx of transactions) {
        if (!expenseAccountIds.has(tx.accountId)) continue
        if (!tx.transactionDate.slice(0, 10).startsWith(prefix)) continue
        expense += expenseSpendAmount(tx)
      }
      points.push({
        key: prefix,
        label: `${MONTH_SHORT[m]} ${String(y).slice(2)}`,
        expense: Math.max(0, expense),
      })
    }
    return points
  }, [transactions, expenseAccountIds])

  const dailyExpenseData = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    const days = now.getDate()
    const prefix = `${y}-${String(m + 1).padStart(2, '0')}`
    const points: Array<{ day: string; expense: number }> = []
    for (let day = 1; day <= days; day++) {
      const date = `${prefix}-${String(day).padStart(2, '0')}`
      let expense = 0
      for (const tx of transactions) {
        if (!expenseAccountIds.has(tx.accountId)) continue
        if (tx.transactionDate.slice(0, 10) !== date) continue
        expense += expenseSpendAmount(tx)
      }
      points.push({
        day: String(day),
        expense: Math.max(0, expense),
      })
    }
    return points
  }, [transactions, expenseAccountIds])

  const topExpenseAccounts = useMemo(() => {
    const byId = new Map<string, number>()
    const now = new Date()
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    for (const tx of transactions) {
      if (!expenseAccountIds.has(tx.accountId)) continue
      if (!tx.transactionDate.slice(0, 10).startsWith(prefix)) continue
      byId.set(
        tx.accountId,
        (byId.get(tx.accountId) ?? 0) + expenseSpendAmount(tx)
      )
    }
    return expenseAccounts
      .map((a) => ({
        id: a.id,
        name: a.name,
        total: Math.max(0, byId.get(a.id) ?? 0),
      }))
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
  }, [transactions, expenseAccountIds, expenseAccounts])

  if (!ready) {
    return (
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-xl border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Balance mix"
          subtitle="Cash in Pocket, Cash & Savings, Receivable and Payable"
        >
          {mixData.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
              No balances to chart yet.
            </p>
          ) : (
            <div className="flex h-full min-h-[14rem] flex-col gap-3 sm:flex-row sm:items-center">
              <div className="mx-auto flex w-44 shrink-0 flex-col items-center sm:mx-0">
                {/* Decorative: legend below is the accessible summary */}
                <div className="h-44 w-44" aria-hidden="true">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={mixData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="58%"
                        outerRadius="88%"
                        paddingAngle={2}
                        stroke="transparent"
                        isAnimationActive={false}
                      >
                        {mixData.map((s) => (
                          <Cell
                            key={s.key}
                            fill={s.color}
                            aria-label={`${s.name}: ${formatMoney(s.value, currency)}`}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={<ChartTooltip currency={currency} />}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400">
                    Total
                  </p>
                  <p className="max-w-[11rem] break-all text-sm font-semibold tabular-nums text-gray-800 dark:text-gray-100">
                    {formatMoney(mixTotal, currency)}
                  </p>
                </div>
              </div>
              <ul className="min-w-0 flex-1 space-y-2">
                {mixData.map((s) => {
                  const pct =
                    mixTotal > 0 ? (s.value / mixTotal) * 100 : 0
                  return (
                    <li key={s.key}>
                      <Link
                        href={s.href}
                        prefetch={false}
                        className="flex items-center justify-between gap-2 rounded-md px-1 py-0.5 hover:bg-gray-50 dark:hover:bg-gray-700/40"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: s.color }}
                            aria-hidden
                          />
                          <span className="truncate text-xs text-gray-600 dark:text-gray-300">
                            {s.name}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-gray-800 dark:text-gray-100">
                          {pct.toFixed(2)}%
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Monthly expenses"
          subtitle="Last 6 months"
          href="/expenses/monthly"
        >
          {!txReady ? (
            <div className="h-full min-h-[14rem] animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700/50" />
          ) : (
            <ResponsiveContainer width="100%" height="100%" minHeight={220}>
              <BarChart data={monthlyExpenseData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tickFormatter={(v) =>
                    Math.abs(Number(v)) >= 1000
                      ? `${Math.round(Number(v) / 1000)}k`
                      : String(v)
                  }
                />
                <Tooltip content={<ChartTooltip currency={currency} />} />
                <Bar
                  dataKey="expense"
                  name="Expense"
                  fill="#f59e0b"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={36}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Daily expenses"
          subtitle={`${MONTH_SHORT[new Date().getMonth()]} · this month`}
          href="/expenses/daily"
        >
          {!txReady ? (
            <div className="h-full min-h-[14rem] animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700/50" />
          ) : (
            <ResponsiveContainer width="100%" height="100%" minHeight={220}>
              <AreaChart data={dailyExpenseData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="expenseArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tickFormatter={(v) =>
                    Math.abs(Number(v)) >= 1000
                      ? `${Math.round(Number(v) / 1000)}k`
                      : String(v)
                  }
                />
                <Tooltip content={<ChartTooltip currency={currency} />} />
                <Area
                  type="monotone"
                  dataKey="expense"
                  name="Expense"
                  stroke="#ef4444"
                  fill="url(#expenseArea)"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Top expense accounts"
          subtitle="This month"
          href="/expenses"
        >
          {!txReady ? (
            <div className="h-full min-h-[14rem] animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700/50" />
          ) : topExpenseAccounts.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
              No expense activity this month.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minHeight={220}>
              <BarChart
                data={topExpenseAccounts}
                layout="vertical"
                margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  className="stroke-gray-200 dark:stroke-gray-700"
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    Math.abs(Number(v)) >= 1000
                      ? `${Math.round(Number(v) / 1000)}k`
                      : String(v)
                  }
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={88}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip currency={currency} />} />
                <Bar
                  dataKey="total"
                  name="Expense"
                  fill="#0ea5e9"
                  radius={[0, 6, 6, 0]}
                  maxBarSize={22}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  )
}
