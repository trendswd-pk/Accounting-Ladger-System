'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Info } from 'lucide-react'
import AccountMobileCard from '@/components/AccountMobileCard'
import {
  fetchAccounts,
  getCachedAccounts,
  type AccountRecord,
} from '@/lib/accounts'
import { isExpenseAccount } from '@/lib/accountFilters'
import {
  DEFAULT_APP_SETTINGS,
  getCachedAppSettings,
  watchAppSettings,
} from '@/lib/appSettings'
import { periodChange } from '@/lib/accountDayMovement'
import { formatMoney } from '@/lib/money'
import {
  expenseSpendAmount,
  fetchTransactions,
  getCachedTransactions,
  type TransactionRecord,
} from '@/lib/transactions'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

type MonthAccountRow = {
  id: string
  name: string
  phone: string
  accountTypeName: string
  cashTypeName: string
  total: number
}

function parseYearMonthParam(raw: string): {
  year: number
  monthIndex: number
  prefix: string
} | null {
  const m = /^(\d{4})-(\d{2})$/.exec(raw.trim())
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  if (!Number.isFinite(year) || month < 1 || month > 12) return null
  return {
    year,
    monthIndex: month - 1,
    prefix: `${m[1]}-${m[2]}`,
  }
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function monthDateRange(year: number, monthIndex: number): {
  dateFrom: string
  dateTo: string
} {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  const mm = pad2(monthIndex + 1)
  return {
    dateFrom: `${year}-${mm}-01`,
    dateTo: `${year}-${mm}-${pad2(lastDay)}`,
  }
}

/**
 * Month expense accounts — replaces the monthly list popup.
 * URL: /expenses/monthly/YYYY-MM
 */
export default function MonthlyExpenseMonthPage() {
  const params = useParams()
  const router = useRouter()
  const raw = String(params?.yearMonth ?? '').trim()
  const parsed = useMemo(() => parseYearMonthParam(raw), [raw])

  const [expenseAccounts, setExpenseAccounts] = useState<AccountRecord[]>(() => {
    const cached = getCachedAccounts()
    return cached ? cached.filter(isExpenseAccount) : []
  })
  const [transactions, setTransactions] = useState<TransactionRecord[]>(
    () => getCachedTransactions() ?? []
  )
  const [ready, setReady] = useState(
    () => getCachedAccounts() != null && getCachedTransactions() != null
  )
  const [error, setError] = useState<string | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)
  const [currency, setCurrency] = useState(
    () => getCachedAppSettings()?.currency ?? DEFAULT_APP_SETTINGS.currency
  )

  useEffect(() => {
    return watchAppSettings((s) => setCurrency(s.currency))
  }, [])

  const load = useCallback(async () => {
    setError(null)
    try {
      const [accounts, txs] = await Promise.all([
        fetchAccounts(),
        fetchTransactions(),
      ])
      setExpenseAccounts(accounts.filter(isExpenseAccount))
      setTransactions(txs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load expenses')
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const expenseAccountIds = useMemo(
    () => new Set(expenseAccounts.map((a) => a.id)),
    [expenseAccounts]
  )

  const prevMonthPrefix = useMemo(() => {
    if (!parsed) return null
    const prev = new Date(parsed.year, parsed.monthIndex, 0)
    return `${prev.getFullYear()}-${pad2(prev.getMonth() + 1)}`
  }, [parsed])

  const prevMonthLabel = useMemo(() => {
    if (!parsed) return 'last month'
    const prev = new Date(parsed.year, parsed.monthIndex, 0)
    return `${MONTH_NAMES[prev.getMonth()]} ${prev.getFullYear()}`
  }, [parsed])

  /** Per-account spend in the previous calendar month (for % vs last month). */
  const prevMonthTotalsByAccount = useMemo(() => {
    const byAccount = new Map<string, number>()
    if (!prevMonthPrefix) return byAccount
    for (const tx of transactions) {
      if (!expenseAccountIds.has(tx.accountId)) continue
      if (!tx.transactionDate.slice(0, 10).startsWith(prevMonthPrefix)) continue
      byAccount.set(
        tx.accountId,
        (byAccount.get(tx.accountId) ?? 0) + expenseSpendAmount(tx)
      )
    }
    return byAccount
  }, [transactions, expenseAccountIds, prevMonthPrefix])

  const monthAccountRows = useMemo((): MonthAccountRow[] => {
    if (!parsed) return []
    const byAccount = new Map<string, number>()
    for (const tx of transactions) {
      if (!expenseAccountIds.has(tx.accountId)) continue
      if (!tx.transactionDate.slice(0, 10).startsWith(parsed.prefix)) continue
      byAccount.set(
        tx.accountId,
        (byAccount.get(tx.accountId) ?? 0) + expenseSpendAmount(tx)
      )
    }
    return expenseAccounts
      .map((a) => ({
        id: a.id,
        name: a.name,
        phone: a.phone,
        accountTypeName: a.accountTypeName,
        cashTypeName: a.cashTypeName,
        total: byAccount.get(a.id) ?? 0,
      }))
      .filter((row) => row.total !== 0)
      .sort(
        (a, b) =>
          Math.abs(b.total) - Math.abs(a.total) || a.name.localeCompare(b.name)
      )
  }, [parsed, transactions, expenseAccountIds, expenseAccounts])

  const monthTotal = useMemo(
    () => monthAccountRows.reduce((sum, row) => sum + row.total, 0),
    [monthAccountRows]
  )

  const formatBalance = (n: number) => formatMoney(n, currency)
  const balanceColorClass = (balance: number) =>
    balance > 0
      ? 'text-red-700 dark:text-red-400'
      : balance < 0
        ? 'text-primary-700 dark:text-primary-400'
        : 'text-gray-800 dark:text-gray-200'

  const openAccountMonth = (accountId: string) => {
    if (!parsed) return
    const { dateFrom, dateTo } = monthDateRange(parsed.year, parsed.monthIndex)
    router.push(
      `/transactions?accountId=${encodeURIComponent(accountId)}&dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}&from=${encodeURIComponent(`/expenses/monthly/${parsed.prefix}`)}`
    )
  }

  const backHref = parsed
    ? `/expenses/monthly?year=${parsed.year}`
    : '/expenses/monthly'

  if (!parsed) {
    return (
      <div className="w-full p-4 lg:p-8">
        <div className="mb-4 flex items-center gap-2">
          <Link
            href="/expenses/monthly"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label="Back to monthly expenses"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Month expenses
          </h1>
        </div>
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          Invalid month.
        </p>
      </div>
    )
  }

  const title = `${MONTH_NAMES[parsed.monthIndex]} ${parsed.year}`

  return (
    <div className="w-full p-4 lg:p-8">
      <div className="mb-4 flex min-w-0 items-center gap-2 lg:mb-6">
        <Link
          href={backHref}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-300 dark:hover:bg-gray-700"
          aria-label="Back to monthly expenses"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </Link>
        <h1 className="truncate text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 lg:text-3xl">
          {title}
        </h1>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setInfoOpen((v) => !v)}
            className={`rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              infoOpen
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400'
            }`}
            aria-label="About month expenses"
            aria-expanded={infoOpen}
          >
            <Info className="h-5 w-5" aria-hidden />
          </button>
          {infoOpen ? (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setInfoOpen(false)}
                aria-hidden
              />
              <div
                role="dialog"
                className="absolute left-0 top-full z-50 mt-2 w-72 max-w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              >
                Expense accounts with activity in this month. Tap a card to open
                that account’s transactions for the month.
              </div>
            </>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {/* Mobile — same brand-sky cards as Expenses / Daily day page */}
      <div className="space-y-3.5 lg:hidden">
        {!ready ? (
          Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="animate-pulse overflow-hidden rounded-[1.75rem] bg-brand-sky/80 p-4"
            >
              <div className="mb-3 h-4 w-20 rounded bg-white/40" />
              <div className="mb-2 h-5 w-2/3 rounded bg-brand-ink/20" />
              <div className="mb-3 h-3 w-1/2 rounded bg-brand-ink/15" />
              <div className="flex gap-2">
                <div className="h-6 w-16 rounded-full bg-white/50" />
                <div className="h-6 w-28 rounded-full bg-white/30" />
              </div>
            </div>
          ))
        ) : monthAccountRows.length === 0 ? (
          <div className="rounded-[1.75rem] border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500 shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            No expense account activity this month.
          </div>
        ) : (
          <>
            {monthAccountRows.map((row, index) => {
              const prevTotal = prevMonthTotalsByAccount.get(row.id) ?? 0
              const { delta, deltaPct } = periodChange(row.total, prevTotal)
              return (
                <AccountMobileCard
                  key={row.id}
                  row={{
                    id: row.id,
                    serialNumber: index + 1,
                    name: row.name,
                    phone: row.phone,
                    accountTypeName: row.accountTypeName,
                    cashTypeName: row.cashTypeName,
                    balance: row.total,
                    monthDelta: delta,
                    monthDeltaPct: deltaPct,
                  }}
                  formatBalance={formatBalance}
                  currency={currency}
                  deltaVersusLabel={prevMonthLabel}
                  trendMode="expense"
                  onOpen={() => openAccountMonth(row.id)}
                />
              )
            })}
            <div className="flex items-center justify-between gap-3 rounded-[1.65rem] border border-gray-200 bg-white px-4 py-3 shadow-md dark:border-gray-700 dark:bg-gray-800">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Total
              </span>
              <span
                className={`text-sm font-semibold tabular-nums ${balanceColorClass(monthTotal)}`}
              >
                {formatBalance(monthTotal)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  SR.
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  ACC Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Phone Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  ACC Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Cash Type
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Expense
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {!ready ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : monthAccountRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No expense account activity this month.
                  </td>
                </tr>
              ) : (
                monthAccountRows.map((row, index) => (
                  <tr
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openAccountMonth(row.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openAccountMonth(row.id)
                      }
                    }}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-gray-500 dark:text-gray-400">
                      {index + 1}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-primary-700 dark:text-primary-300">
                      {row.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-gray-600 dark:text-gray-300">
                      {row.phone.trim() || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {row.accountTypeName.trim() || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {row.cashTypeName.trim() || '—'}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-3 text-right text-sm font-medium tabular-nums ${balanceColorClass(row.total)}`}
                    >
                      {formatBalance(row.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {ready && monthAccountRows.length > 0 ? (
              <tfoot className="border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40">
                <tr>
                  <td className="px-4 py-3" colSpan={5}>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Total
                    </span>
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-3 text-right text-sm font-semibold tabular-nums ${balanceColorClass(monthTotal)}`}
                  >
                    {formatBalance(monthTotal)}
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </div>
    </div>
  )
}
