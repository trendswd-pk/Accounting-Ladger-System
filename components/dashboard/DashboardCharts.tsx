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
}

type DashboardChartsProps = {
  currency: string
  ready: boolean
  summaryReady: boolean
  cashInPocket: number
  cashSavings: number
  payable: number
  receivable: number
  summary: DashboardExpenseSummary | null
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
    <section className="flex min-h-[16rem] flex-col rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
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
      <div className="min-h-[14rem] flex-1">{children}</div>
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
    // Fixed order: Pocket → Savings → Receivable → Payable
    return [
      {
        key: 'pocket',
        name: 'Cash in Pocket',
        value: Math.max(0, cashInPocket),
        href: '/',
      },
      {
        key: 'cash',
        name: 'Cash & Savings',
        value: Math.max(0, cashSavings),
        href: '/cash-savings',
      },
      {
        key: 'recv',
        name: 'Receivable',
        value: Math.max(0, receivable),
        href: '/receivable',
      },
      {
        key: 'pay',
        name: 'Payable',
        value: Math.abs(payable),
        href: '/payable',
      },
    ].map((s) => ({
      ...s,
      pct: mixTotal > 0 ? Math.round((s.value / mixTotal) * 1000) / 10 : 0,
    }))
  }, [cashInPocket, cashSavings, payable, receivable, mixTotal])

  const monthlyExpenseData = summary?.monthly ?? []
  const monthlySeries = summary?.monthlySeries ?? []
  const dailyExpenseData = summary?.daily ?? []
  const dailySeries = summary?.dailySeries ?? []
  const topExpenseAccounts = summary?.topAccounts ?? []

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
          <BalanceMixRibbons items={mixData} currency={currency} total={mixTotal} />
        </ChartCard>

        <ChartCard
          title="Monthly expenses"
          subtitle="Last 6 months · accounts + total"
          href="/expenses/monthly"
        >
          {!summaryReady ? (
            <div className="h-full min-h-[14rem] animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700/50" />
          ) : (
            <ResponsiveContainer width="100%" height="100%" minHeight={240}>
              <ComposedChart
                data={monthlyExpenseData}
                margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-gray-200 dark:stroke-gray-700"
                />
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
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
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
                        i === monthlySeries.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]
                      }
                      maxBarSize={36}
                      isAnimationActive={false}
                    />
                  ))
                ) : (
                  <Bar
                    dataKey="expense"
                    name="Total"
                    fill="#f59e0b"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                    isAnimationActive={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Daily expenses"
          subtitle={`${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][new Date().getMonth()]} · this month · accounts + total`}
          href="/expenses/daily"
        >
          {!summaryReady ? (
            <div className="h-full min-h-[14rem] animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700/50" />
          ) : (
            <ResponsiveContainer width="100%" height="100%" minHeight={240}>
              <ComposedChart
                data={dailyExpenseData}
                margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
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
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
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
                    stroke={ACCOUNT_SERIES_COLORS[i % ACCOUNT_SERIES_COLORS.length]}
                    strokeWidth={1.75}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Top expense accounts"
          subtitle="This month"
          href="/expenses"
        >
          {!summaryReady ? (
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
                  cursor="pointer"
                  onClick={(data) => {
                    const point = data as { payload?: { id?: string }; id?: string }
                    const id = point?.payload?.id ?? point?.id
                    if (id) openAccountTransactions(id)
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  )
}
