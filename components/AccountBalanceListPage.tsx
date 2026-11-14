'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Info } from 'lucide-react'
import AccountMobileCard from '@/components/AccountMobileCard'
import SoftSearchField from '@/components/SoftSearchField'
import { TablePaginationNav } from '@/components/TablePaginationNav'
import {
  fetchAccounts,
  getCachedAccounts,
  type AccountRecord,
} from '@/lib/accounts'
import {
  accountMonthMovement,
  monthToDateNetsByAccount,
} from '@/lib/accountDayMovement'
import {
  DEFAULT_APP_SETTINGS,
  getCachedAppSettings,
  watchAppSettings,
} from '@/lib/appSettings'
import { formatMoney } from '@/lib/money'
import {
  DEFAULT_TABLE_PAGE_SIZE,
  TABLE_PAGE_SIZE_OPTIONS,
} from '@/lib/tablePagination'
import {
  fetchTransactions,
  getCachedTransactions,
  type TransactionRecord,
} from '@/lib/transactions'

export type AccountBalanceListPageProps = {
  title: string
  infoText: string
  emptyHint: string
  returnPath: string
  filterAccounts: (account: AccountRecord) => boolean
  searchAriaLabel?: string
}

export default function AccountBalanceListPage({
  title,
  infoText,
  emptyHint,
  returnPath,
  filterAccounts,
  searchAriaLabel = 'Search accounts',
}: AccountBalanceListPageProps) {
  const router = useRouter()
  const cached = getCachedAccounts()
  const [allAccounts, setAllAccounts] = useState<AccountRecord[]>(() => cached ?? [])
  const [ready, setReady] = useState(() => cached != null)
  const [listError, setListError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [listPageSize, setListPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)
  const [searchQuery, setSearchQuery] = useState('')
  const [infoOpen, setInfoOpen] = useState(false)
  const [currency, setCurrency] = useState(
    () => getCachedAppSettings()?.currency ?? DEFAULT_APP_SETTINGS.currency
  )
  const [transactions, setTransactions] = useState<TransactionRecord[]>(
    () => getCachedTransactions() ?? []
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setListError(null)
      try {
        const items = await fetchAccounts({ force: true })
        if (!cancelled) setAllAccounts(items)
      } catch (err) {
        if (!cancelled) {
          setAllAccounts([])
          setListError(err instanceof Error ? err.message : 'Failed to load accounts')
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const hit = getCachedTransactions()
    if (hit) setTransactions(hit)
    let cancelled = false
    void fetchTransactions()
      .then((items) => {
        if (!cancelled) setTransactions(items)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => watchAppSettings((s) => setCurrency(s.currency)), [])

  const monthNetsByAccount = useMemo(
    () => monthToDateNetsByAccount(transactions),
    [transactions]
  )

  const rows = useMemo(
    () => allAccounts.filter(filterAccounts),
    [allAccounts, filterAccounts]
  )

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => {
      const haystack = [
        row.name,
        row.phone,
        row.accountTypeName,
        row.cashTypeName,
        String(row.balance),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [rows, searchQuery])

  const totalBalance = useMemo(
    () => filteredRows.reduce((sum, a) => sum + (Number(a.balance) || 0), 0),
    [filteredRows]
  )

  const totalItems = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(totalItems / listPageSize) || 1)

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  useEffect(() => {
    setPage(1)
  }, [searchQuery, filterAccounts])

  const pageRows = useMemo(() => {
    const start = (page - 1) * listPageSize
    return filteredRows.slice(start, start + listPageSize)
  }, [filteredRows, page, listPageSize])

  const pageStartIndex = (page - 1) * listPageSize

  const formatBalance = (n: number) => formatMoney(n, currency)

  const balanceColorClass = (balance: number) =>
    balance > 0
      ? 'text-green-700 dark:text-green-400'
      : balance < 0
        ? 'text-red-700 dark:text-red-400'
        : 'text-gray-800 dark:text-gray-200'

  const accountHref = (id: string) =>
    `/transactions?accountId=${encodeURIComponent(id)}&from=${encodeURIComponent(returnPath)}`

  const infoId = `${returnPath.replace(/\//g, '-')}-info-popover`

  const paginationBar =
    totalItems > DEFAULT_TABLE_PAGE_SIZE ? (
      <div className="mt-4 flex flex-nowrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-md dark:border-gray-700 dark:bg-gray-800 lg:mt-0 lg:rounded-none lg:border-0 lg:border-t lg:border-gray-200 lg:bg-transparent lg:px-4 lg:shadow-none dark:lg:border-gray-700 lg:dark:bg-transparent">
        <select
          value={listPageSize}
          onChange={(e) => {
            setListPageSize(Number(e.target.value))
            setPage(1)
          }}
          className="h-7 shrink-0 rounded-md border border-gray-300 bg-white px-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          aria-label="Records per page"
        >
          {TABLE_PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <div className="flex min-w-0 flex-nowrap items-center justify-end gap-1">
          <span className="mr-1 shrink-0 text-xs tabular-nums text-gray-600 dark:text-gray-400">
            {pageStartIndex + 1}–{Math.min(pageStartIndex + listPageSize, totalItems)} of {totalItems}
          </span>
          <TablePaginationNav page={page} totalPages={totalPages} onPageChange={setPage} size="sm" />
        </div>
      </div>
    ) : null

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-4 space-y-3 lg:mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-2xl font-bold text-gray-800 dark:text-gray-100 lg:text-3xl">
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
                aria-label={`About ${title}`}
                aria-expanded={infoOpen}
                aria-controls={infoId}
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
                    id={infoId}
                    role="dialog"
                    className="absolute left-0 top-full z-50 mt-2 w-64 max-w-[min(16rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                  >
                    {infoText}
                  </div>
                </>
              ) : null}
            </div>
          </div>
          <div className="flex h-10 shrink-0 items-center gap-2">
            <SoftSearchField
              className="hidden w-56 lg:flex lg:w-72"
              size="sm"
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search accounts…"
              aria-label={searchAriaLabel}
            />
          </div>
        </div>
        <SoftSearchField
          className="lg:hidden"
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search accounts…"
          aria-label={searchAriaLabel}
        />
      </div>

      {listError ? (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {listError}
        </div>
      ) : null}

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
        ) : rows.length === 0 ? (
          <div className="rounded-[1.75rem] border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500 shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            {emptyHint}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-[1.75rem] border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500 shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            No accounts match your search.
          </div>
        ) : (
          pageRows.map((row, index) => {
            const movement = accountMonthMovement(
              Number(row.balance) || 0,
              monthNetsByAccount.get(row.id) ?? 0
            )
            return (
              <AccountMobileCard
                key={row.id}
                row={{
                  id: row.id,
                  serialNumber: pageStartIndex + index + 1,
                  name: row.name,
                  phone: row.phone,
                  accountTypeName: row.accountTypeName,
                  cashTypeName: row.cashTypeName,
                  balance: row.balance,
                  monthDelta: movement.monthDelta,
                  monthDeltaPct: movement.monthDeltaPct,
                }}
                formatBalance={formatBalance}
                currency={currency}
                onOpen={() => router.push(accountHref(row.id))}
              />
            )
          })
        )}
        {ready && filteredRows.length > 0 ? (
          <div className="flex items-center justify-between gap-3 rounded-[1.65rem] border border-gray-200 bg-white px-4 py-3 shadow-md dark:border-gray-700 dark:bg-gray-800">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Total</span>
            <span className={`text-sm font-semibold tabular-nums ${balanceColorClass(totalBalance)}`}>
              {formatBalance(totalBalance)}
            </span>
          </div>
        ) : null}
        <div className="lg:hidden">{paginationBar}</div>
      </div>

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
                  Balance
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
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    {emptyHint}
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No accounts match your search.
                  </td>
                </tr>
              ) : (
                pageRows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-gray-500 dark:text-gray-400">
                      {pageStartIndex + index + 1}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">
                      <Link
                        href={accountHref(row.id)}
                        className="text-primary-700 hover:underline dark:text-primary-300"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {row.phone || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                      {row.accountTypeName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                      {row.cashTypeName}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums font-medium ${balanceColorClass(row.balance)}`}
                    >
                      {formatBalance(row.balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {ready && filteredRows.length > 0 ? (
              <tfoot className="border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40">
                <tr>
                  <td className="px-4 py-3" colSpan={4} aria-hidden />
                  <td className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Total
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums font-semibold ${balanceColorClass(totalBalance)}`}
                  >
                    {formatBalance(totalBalance)}
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
        {paginationBar}
      </div>
    </div>
  )
}
