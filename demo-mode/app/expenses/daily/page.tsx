'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Filter, Info, X } from 'lucide-react'
import ExpensePeriodMobileCard from '@/components/ExpensePeriodMobileCard'
import ExpenseTotalMobileBar from '@/components/ExpenseTotalMobileBar'
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

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const WEEKDAY_FULL = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

type DayAccountRow = {
  id: string
  name: string
  total: number
}

export default function DailyExpensePage() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonthIndex = now.getMonth()
  const todayDay = now.getDate()

  const [year, setYear] = useState(currentYear)
  const [monthIndex, setMonthIndex] = useState(currentMonthIndex)
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
  const [filterOpen, setFilterOpen] = useState(false)
  const filterAsideRef = useRef<HTMLElement>(null)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
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
    if (!availableYears.includes(year)) setYear(availableYears[0])
  }, [availableYears, year])

  const dayCount = daysInMonth(year, monthIndex)
  const monthPrefix = `${year}-${pad2(monthIndex + 1)}`

  const dailyTotals = useMemo(() => {
    const totals = Array.from({ length: dayCount }, () => 0)
    for (const tx of transactions) {
      if (!expenseAccountIds.has(tx.accountId)) continue
      const date = tx.transactionDate.slice(0, 10)
      if (!date.startsWith(monthPrefix)) continue
      const day = Number(date.slice(8, 10))
      if (day < 1 || day > dayCount) continue
      totals[day - 1] += expenseSpendAmount(tx)
    }
    return totals
  }, [transactions, expenseAccountIds, monthPrefix, dayCount])

  const monthTotal = useMemo(
    () => dailyTotals.reduce((sum, n) => sum + n, 0),
    [dailyTotals]
  )

  const dayAccountRows = useMemo((): DayAccountRow[] => {
    if (selectedDay == null) return []
    const dayKey = `${monthPrefix}-${pad2(selectedDay)}`
    const byAccount = new Map<string, number>()
    for (const tx of transactions) {
      if (!expenseAccountIds.has(tx.accountId)) continue
      if (tx.transactionDate.slice(0, 10) !== dayKey) continue
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
  }, [selectedDay, monthPrefix, transactions, expenseAccountIds, expenseAccounts])

  const dayPopupTotal = useMemo(
    () => dayAccountRows.reduce((sum, row) => sum + row.total, 0),
    [dayAccountRows]
  )

  const formatBalance = (n: number) => formatMoney(n, currency)

  const balanceColorClass = (balance: number) =>
    balance > 0
      ? 'text-red-700 dark:text-red-400'
      : balance < 0
        ? 'text-primary-700 dark:text-primary-400'
        : 'text-gray-800 dark:text-gray-200'

  const cardAmountTone = (balance: number) =>
    balance > 0 ? 'text-red-700' : balance < 0 ? 'text-primary-800' : 'text-brand-ink'

  const isCurrentMonth = year === currentYear && monthIndex === currentMonthIndex
  const monthName = MONTH_NAMES[monthIndex]
  const periodFilterActive = !isCurrentMonth
  const selectedWeekday =
    selectedDay != null
      ? WEEKDAY_NAMES[new Date(year, monthIndex, selectedDay).getDay()]
      : null

  const openDay = (day: number) => setSelectedDay(day)
  const closeDay = () => setSelectedDay(null)

  const resetPeriodFilter = () => {
    setYear(currentYear)
    setMonthIndex(currentMonthIndex)
    setSelectedDay(null)
  }

  useEffect(() => {
    if (!filterOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFilterOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [filterOpen])

  useLayoutEffect(() => {
    const el = filterAsideRef.current
    if (el) el.inert = !filterOpen
  }, [filterOpen])

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-4 space-y-3 lg:mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-2xl font-bold text-gray-800 dark:text-gray-100 lg:text-3xl">
              Daily Expense
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
                aria-label="About Daily Expense"
                aria-expanded={infoOpen}
                aria-controls="daily-expense-info-popover"
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
                    id="daily-expense-info-popover"
                    role="dialog"
                    className="absolute left-0 top-full z-50 mt-2 w-72 max-w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                  >
                    Day-wise expense totals for the selected month. Tap a day to see Expense
                    accounts. Amounts you add (credit) count as kharcha; debit reverses.
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div className="flex h-10 shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                periodFilterActive
                  ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
              aria-label="Open period filters"
              aria-expanded={filterOpen}
            >
              <Filter className="h-4 w-4" aria-hidden />
              {periodFilterActive ? (
                <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-semibold leading-none text-white">
                  1
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </div>

      {listError ? (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {listError}
        </div>
      ) : null}

      {periodFilterActive ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-900 dark:border-primary-800 dark:bg-primary-900/30 dark:text-primary-100">
          <span className="min-w-0 flex-1 font-medium">
            {monthName} {year}
          </span>
          <button
            type="button"
            onClick={resetPeriodFilter}
            className="inline-flex items-center gap-1 rounded-md bg-white/80 px-2 py-0.5 text-xs font-medium text-primary-800 hover:bg-white dark:bg-gray-800 dark:text-primary-200 dark:hover:bg-gray-700"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            This month
          </button>
        </div>
      ) : null}

      {/* Right filter drawer — month / year */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-200 ${
          filterOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setFilterOpen(false)}
        aria-hidden={!filterOpen}
      />
      <aside
        ref={filterAsideRef}
        className={`fixed inset-y-0 right-0 z-50 flex w-80 max-w-[85vw] transform flex-col border-l border-gray-200 bg-white shadow-xl transition-transform duration-200 ease-out dark:border-gray-700 dark:bg-gray-800 ${
          filterOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Daily expense period filters"
        aria-hidden={!filterOpen}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-4 py-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filters</h2>
          <button
            type="button"
            onClick={() => setFilterOpen(false)}
            className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label="Close filters"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <div>
            <label
              htmlFor="daily-filter-month"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Month
            </label>
            <select
              id="daily-filter-month"
              value={monthIndex}
              onChange={(e) => {
                setMonthIndex(Number(e.target.value))
                setSelectedDay(null)
              }}
              className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              aria-label="Select month"
            >
              {MONTH_NAMES.map((name, index) => (
                <option key={name} value={index}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="daily-filter-year"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Year
            </label>
            <select
              id="daily-filter-year"
              value={year}
              onChange={(e) => {
                setYear(Number(e.target.value))
                setSelectedDay(null)
              }}
              className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold tabular-nums text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
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
        <div className="flex shrink-0 gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-700">
          <button
            type="button"
            onClick={resetPeriodFilter}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            This month
          </button>
          <button
            type="button"
            onClick={() => setFilterOpen(false)}
            className="flex-1 rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Done
          </button>
        </div>
      </aside>

      {/* Mobile cards — brand-sky curved cards (Transactions / Accounts language) */}
      <div className="space-y-3.5 lg:hidden">
        {!ready ? (
          Array.from({ length: 5 }, (_, i) => (
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
        ) : (
          <>
            {Array.from({ length: dayCount }, (_, i) => {
              const day = i + 1
              const total = dailyTotals[i]
              const weekdayShort = WEEKDAY_NAMES[new Date(year, monthIndex, day).getDay()]
              const weekdayFull = WEEKDAY_FULL[new Date(year, monthIndex, day).getDay()]
              const isToday = isCurrentMonth && day === todayDay
              return (
                <ExpensePeriodMobileCard
                  key={day}
                  headerLabel={weekdayFull}
                  headerRight={`${pad2(day)} ${monthName} ${year}`}
                  title={`${pad2(day)} ${monthName}`}
                  subtitle={`${weekdayShort} · ${year}`}
                  amountLabel="Expense"
                  formatBalance={formatBalance}
                  amount={total}
                  amountToneClass={cardAmountTone(total)}
                  highlighted={isToday}
                  footerLeftLabel=""
                  footerLeftValue={isToday ? 'Current day' : undefined}
                  footerLeftHighlighted={isToday}
                  onOpen={() => openDay(day)}
                />
              )
            })}
            <ExpenseTotalMobileBar
              label="Month Expenses"
              amount={monthTotal}
              formatBalance={formatBalance}
              amountToneClass={cardAmountTone(monthTotal)}
            />
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
                  Day
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Expense
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {!ready ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : (
                Array.from({ length: dayCount }, (_, i) => {
                  const day = i + 1
                  const total = dailyTotals[i]
                  const weekday = WEEKDAY_NAMES[new Date(year, monthIndex, day).getDay()]
                  const isToday = isCurrentMonth && day === todayDay
                  return (
                    <tr
                      key={day}
                      role="button"
                      tabIndex={0}
                      onClick={() => openDay(day)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          openDay(day)
                        }
                      }}
                      className={`cursor-pointer ${
                        isToday
                          ? 'bg-primary-50/80 dark:bg-primary-900/25'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'
                      }`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-gray-500 dark:text-gray-400">
                        {day}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {pad2(day)} {monthName} {year}
                        <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                          {weekday}
                        </span>
                        {isToday ? (
                          <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                            Today
                          </span>
                        ) : null}
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 text-right text-sm font-medium tabular-nums ${balanceColorClass(total)}`}
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
                    Total Month Expenses
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

      {selectedDay != null && selectedWeekday ? (
        <div
          className={formModalOverlayClass}
          onClick={closeDay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="day-expense-accounts-title"
        >
          <div className={`${formModalPanelClass} max-w-md`} onClick={(e) => e.stopPropagation()}>
            <FormModalHeader
              titleId="day-expense-accounts-title"
              title={`${pad2(selectedDay)} ${monthName} ${year} · ${selectedWeekday}`}
              onClose={closeDay}
            />
            <FormModalBody>
              {dayAccountRows.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  No expense account activity this day.
                </p>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {dayAccountRows.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <Link
                        href={`/transactions?accountId=${encodeURIComponent(row.id)}&dateFrom=${encodeURIComponent(`${year}-${pad2(monthIndex + 1)}-${pad2(selectedDay)}`)}&dateTo=${encodeURIComponent(`${year}-${pad2(monthIndex + 1)}-${pad2(selectedDay)}`)}&from=${encodeURIComponent('/expenses/daily')}`}
                        className="min-w-0 truncate text-sm font-medium text-primary-700 hover:underline dark:text-primary-300"
                        onClick={closeDay}
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
              {dayAccountRows.length > 0 ? (
                <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Total
                  </span>
                  <span
                    className={`text-sm font-semibold tabular-nums ${balanceColorClass(dayPopupTotal)}`}
                  >
                    {formatBalance(dayPopupTotal)}
                  </span>
                </div>
              ) : null}
            </FormModalBody>
            <FormModalFooter className="justify-center sm:justify-end">
              <button
                type="button"
                onClick={closeDay}
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
