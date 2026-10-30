'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Info } from 'lucide-react'
import {
  FormModalBody,
  FormModalFooter,
  FormModalHeader,
  formModalOverlayClass,
  formModalPanelClass,
  formModalSecondaryButtonClass,
} from '@/components/FormModal'
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
  total: number
}

export default function MonthlyExpensePage() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const [year, setYear] = useState(currentYear)
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
  const [listError, setListError] = useState<string | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null)
  const [currency, setCurrency] = useState(
    () => getCachedAppSettings()?.currency ?? DEFAULT_APP_SETTINGS.currency
  )

  const expenseAccountIds = useMemo(
    () => new Set(expenseAccounts.map((a) => a.id)),
    [expenseAccounts]
  )

  const load = useCallback(async () => {
    setListError(null)
    try {
      const [accounts, txs] = await Promise.all([
        fetchAccounts(),
        fetchTransactions(),
      ])
      setExpenseAccounts(accounts.filter(isExpenseAccount))
      setTransactions(txs)
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to load expenses')
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    void load()
    return watchAppSettings((s) => setCurrency(s.currency))
  }, [load])

  const availableYears = useMemo(() => {
    const years = new Set<number>()
    for (const tx of transactions) {
      if (!expenseAccountIds.has(tx.accountId)) continue
      const y = Number(tx.transactionDate.slice(0, 4))
      if (Number.isFinite(y)) years.add(y)
    }
    years.add(currentYear)
    return Array.from(years).sort((a, b) => b - a)
  }, [transactions, expenseAccountIds, currentYear])

  useEffect(() => {
    if (availableYears.length === 0) return
    if (!availableYears.includes(year)) {
      setYear(availableYears[0])
    }
  }, [availableYears, year])

  const monthlyTotals = useMemo(() => {
    const totals = Array.from({ length: 12 }, () => 0)
    const prefix = `${year}-`
    for (const tx of transactions) {
      if (!expenseAccountIds.has(tx.accountId)) continue
      const date = tx.transactionDate.slice(0, 10)
      if (!date.startsWith(prefix)) continue
      const month = Number(date.slice(5, 7))
      if (month < 1 || month > 12) continue
      totals[month - 1] += expenseSpendAmount(tx)
    }
    return totals
  }, [transactions, expenseAccountIds, year])

  const yearTotal = useMemo(
    () => monthlyTotals.reduce((sum, n) => sum + n, 0),
    [monthlyTotals]
  )

  const monthAccountRows = useMemo((): MonthAccountRow[] => {
    if (selectedMonthIndex == null) return []
    const monthPrefix = `${year}-${String(selectedMonthIndex + 1).padStart(2, '0')}`
    const byAccount = new Map<string, number>()
    for (const tx of transactions) {
      if (!expenseAccountIds.has(tx.accountId)) continue
      if (!tx.transactionDate.slice(0, 10).startsWith(monthPrefix)) continue
      byAccount.set(
        tx.accountId,
        (byAccount.get(tx.accountId) ?? 0) + expenseSpendAmount(tx)
      )
    }
    return expenseAccounts
      .map((a) => ({
        id: a.id,
        name: a.name,
        total: byAccount.get(a.id) ?? 0,
      }))
      .filter((row) => row.total !== 0)
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total) || a.name.localeCompare(b.name))
  }, [selectedMonthIndex, year, transactions, expenseAccountIds, expenseAccounts])

  const monthPopupTotal = useMemo(
    () => monthAccountRows.reduce((sum, row) => sum + row.total, 0),
    [monthAccountRows]
  )

  const formatBalance = (n: number) => formatMoney(n, currency)

  const balanceColorClass = (balance: number) =>
    balance > 0
      ? 'text-red-700 dark:text-red-400'
      : balance < 0
        ? 'text-green-700 dark:text-green-400'
        : 'text-gray-800 dark:text-gray-200'

  const isCurrentYear = year === now.getFullYear()
  const currentMonthIndex = now.getMonth()
  const selectedMonthName =
    selectedMonthIndex != null ? MONTH_NAMES[selectedMonthIndex] : null

  const openMonth = (index: number) => setSelectedMonthIndex(index)
  const closeMonth = () => setSelectedMonthIndex(null)

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-4 space-y-3 lg:mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-2xl font-bold text-gray-800 dark:text-gray-100 lg:text-3xl">
              Expenses
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
                aria-label="About Expenses"
                aria-expanded={infoOpen}
                aria-controls="monthly-expense-info-popover"
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
                    id="monthly-expense-info-popover"
                    role="dialog"
                    className="absolute left-0 top-full z-50 mt-2 w-72 max-w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                  >
                    Tap a month to see Expense accounts for that month. Amounts you add
                    (credit) count as kharcha; debit reverses.
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-10 shrink-0 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold tabular-nums text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            aria-label="Select year"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {listError ? (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {listError}
        </div>
      ) : null}

      {/* Mobile cards */}
      <div className="space-y-2 lg:hidden">
        {!ready ? (
          Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-gray-100 bg-white p-4 shadow-md dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="h-5 w-28 rounded bg-gray-200 dark:bg-gray-600" />
            </div>
          ))
        ) : (
          <>
            {MONTH_NAMES.map((name, index) => {
              const total = monthlyTotals[index]
              const isCurrent = isCurrentYear && index === currentMonthIndex
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => openMonth(index)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left shadow-md transition-colors ${
                    isCurrent
                      ? 'border-primary-300 bg-primary-50 dark:border-primary-700 dark:bg-primary-900/30'
                      : 'border-gray-100 bg-white hover:border-primary-200 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-primary-700'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{name}</p>
                    {isCurrent ? (
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                        Current month
                      </p>
                    ) : null}
                  </div>
                  <p className={`shrink-0 text-sm font-semibold tabular-nums ${balanceColorClass(total)}`}>
                    {formatBalance(total)}
                  </p>
                </button>
              )
            })}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 shadow-md dark:border-gray-700 dark:bg-gray-900/40">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Total Year Expenses
              </span>
              <span className={`text-sm font-semibold tabular-nums ${balanceColorClass(yearTotal)}`}>
                {formatBalance(yearTotal)}
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
                  Month
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Expense
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {!ready ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : (
                MONTH_NAMES.map((name, index) => {
                  const total = monthlyTotals[index]
                  const isCurrent = isCurrentYear && index === currentMonthIndex
                  return (
                    <tr
                      key={name}
                      role="button"
                      tabIndex={0}
                      onClick={() => openMonth(index)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          openMonth(index)
                        }
                      }}
                      className={`cursor-pointer ${
                        isCurrent
                          ? 'bg-primary-50/80 dark:bg-primary-900/25'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'
                      }`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-gray-500 dark:text-gray-400">
                        {index + 1}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {name}
                        {isCurrent ? (
                          <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                            Current
                          </span>
                        ) : null}
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums font-medium ${balanceColorClass(total)}`}
                      >
                        {formatBalance(total)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
            {ready ? (
              <tfoot className="border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40">
                <tr>
                  <td className="px-4 py-3" colSpan={1} aria-hidden />
                  <td className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Total Year Expenses
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums font-semibold ${balanceColorClass(yearTotal)}`}
                  >
                    {formatBalance(yearTotal)}
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </div>

      {selectedMonthIndex != null && selectedMonthName ? (
        <div
          className={formModalOverlayClass}
          onClick={closeMonth}
          role="dialog"
          aria-modal="true"
          aria-labelledby="month-expense-accounts-title"
        >
          <div className={`${formModalPanelClass} max-w-md`} onClick={(e) => e.stopPropagation()}>
            <FormModalHeader
              titleId="month-expense-accounts-title"
              title={`${selectedMonthName} ${year}`}
              onClose={closeMonth}
            />
            <FormModalBody>
              {monthAccountRows.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  No expense account activity this month.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {monthAccountRows.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <Link
                        href={`/transactions?accountId=${encodeURIComponent(row.id)}&dateFrom=${encodeURIComponent(`${year}-${String(selectedMonthIndex + 1).padStart(2, '0')}-01`)}&dateTo=${encodeURIComponent(`${year}-${String(selectedMonthIndex + 1).padStart(2, '0')}-${String(new Date(year, selectedMonthIndex + 1, 0).getDate()).padStart(2, '0')}`)}&from=${encodeURIComponent('/expenses/monthly')}`}
                        className="min-w-0 truncate text-sm font-medium text-primary-700 hover:underline dark:text-primary-300"
                        onClick={closeMonth}
                      >
                        {row.name}
                      </Link>
                      <span
                        className={`shrink-0 text-sm font-semibold tabular-nums ${balanceColorClass(row.total)}`}
                      >
                        {formatBalance(row.total)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {monthAccountRows.length > 0 ? (
                <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Total
                  </span>
                  <span
                    className={`text-sm font-semibold tabular-nums ${balanceColorClass(monthPopupTotal)}`}
                  >
                    {formatBalance(monthPopupTotal)}
                  </span>
                </div>
              ) : null}
            </FormModalBody>
            <FormModalFooter className="justify-center sm:justify-end">
              <button
                type="button"
                onClick={closeMonth}
                className={formModalSecondaryButtonClass}
              >
                Close
              </button>
            </FormModalFooter>
          </div>
        </div>
      ) : null}
    </div>
  )
}
