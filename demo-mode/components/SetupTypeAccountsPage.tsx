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
  fetchSetupTypes,
  getCachedSetupTypes,
  type SetupTypeKind,
  type SetupTypeRecord,
} from '@/lib/setupTypes'
import {
  fetchTransactions,
  getCachedTransactions,
  type TransactionRecord,
} from '@/lib/transactions'

type SetupTypeAccountsPageProps = {
  kind: SetupTypeKind
  listPath: string
  singularLabel: string
}

/**
 * Linked accounts for one Account Type / Cash Type — full page
 * (replaces the old popup on the setup list).
 */
export default function SetupTypeAccountsPage({
  kind,
  listPath,
  singularLabel,
}: SetupTypeAccountsPageProps) {
  const params = useParams()
  const router = useRouter()
  const typeId = String(params?.id ?? '').trim()

  const [typeRow, setTypeRow] = useState<SetupTypeRecord | null>(() => {
    const cached = getCachedSetupTypes(kind)
    return cached?.find((r) => r.id === typeId) ?? null
  })
  const [accounts, setAccounts] = useState<AccountRecord[]>(
    () => getCachedAccounts() ?? []
  )
  const [transactions, setTransactions] = useState<TransactionRecord[]>(
    () => getCachedTransactions() ?? []
  )
  const [ready, setReady] = useState(
    () =>
      getCachedSetupTypes(kind) != null &&
      getCachedAccounts() != null &&
      getCachedTransactions() != null
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
      const [types, accs, txs] = await Promise.all([
        fetchSetupTypes(kind),
        fetchAccounts(),
        fetchTransactions(),
      ])
      setTypeRow(types.find((r) => r.id === typeId) ?? null)
      setAccounts(accs)
      setTransactions(txs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setReady(true)
    }
  }, [kind, typeId])

  useEffect(() => {
    void load()
  }, [load])

  const linkedAccounts = useMemo(() => {
    if (!typeId) return []
    const filtered =
      kind === 'account-types'
        ? accounts.filter((a) => a.accountTypeId === typeId)
        : accounts.filter((a) => a.cashTypeId === typeId)
    return [...filtered].sort(
      (a, b) =>
        Math.abs(b.balance) - Math.abs(a.balance) || a.name.localeCompare(b.name)
    )
  }, [accounts, kind, typeId])

  const monthNetsByAccount = useMemo(
    () => monthToDateNetsByAccount(transactions),
    [transactions]
  )

  const totalBalance = useMemo(
    () => linkedAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0),
    [linkedAccounts]
  )

  const formatBalance = (n: number) => formatMoney(n, currency)
  const balanceColorClass = (balance: number) =>
    balance > 0
      ? 'text-primary-700 dark:text-primary-400'
      : balance < 0
        ? 'text-red-700 dark:text-red-400'
        : 'text-gray-800 dark:text-gray-200'

  const detailPath = `${listPath}/${typeId}`
  const openAccount = (accountId: string) => {
    router.push(
      `/transactions?accountId=${encodeURIComponent(accountId)}&from=${encodeURIComponent(detailPath)}`
    )
  }

  if (!typeId) {
    return (
      <div className="w-full p-4 lg:p-8">
        <div className="mb-4 flex items-center gap-2">
          <Link
            href={listPath}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label={`Back to ${singularLabel} list`}
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {singularLabel}
          </h1>
        </div>
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          Invalid type.
        </p>
      </div>
    )
  }

  if (ready && !typeRow) {
    return (
      <div className="w-full p-4 lg:p-8">
        <div className="mb-4 flex items-center gap-2">
          <Link
            href={listPath}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label={`Back to ${singularLabel} list`}
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {singularLabel}
          </h1>
        </div>
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {singularLabel} not found.
        </p>
      </div>
    )
  }

  const title = typeRow?.name ?? singularLabel
  const code = typeRow?.code ?? ''

  return (
    <div className="w-full p-4 lg:p-8">
      <div className="mb-4 flex min-w-0 items-center gap-2 lg:mb-6">
        <Link
          href={listPath}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-300 dark:hover:bg-gray-700"
          aria-label={`Back to ${singularLabel} list`}
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </Link>
        <h1 className="truncate text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 lg:text-3xl">
          {title}
        </h1>
        {code ? (
          <span className="inline-flex shrink-0 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary-800 dark:bg-primary-900/40 dark:text-primary-300">
            {code}
          </span>
        ) : null}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setInfoOpen((v) => !v)}
            className={`rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              infoOpen
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400'
            }`}
            aria-label={`About ${singularLabel} accounts`}
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
                Accounts linked to this {singularLabel.toLowerCase()}. Tap a card
                to open that account’s transactions.
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
        ) : linkedAccounts.length === 0 ? (
          <div className="rounded-[1.75rem] border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500 shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            No accounts use this {singularLabel.toLowerCase()} yet.
          </div>
        ) : (
          <>
            {linkedAccounts.map((acc, index) => {
              const movement = accountMonthMovement(
                Number(acc.balance) || 0,
                monthNetsByAccount.get(acc.id) ?? 0
              )
              return (
                <AccountMobileCard
                  key={acc.id}
                  row={{
                    id: acc.id,
                    serialNumber: index + 1,
                    name: acc.name,
                    phone: acc.phone,
                    accountTypeName: acc.accountTypeName,
                    cashTypeName: acc.cashTypeName,
                    balance: acc.balance,
                    monthDelta: movement.monthDelta,
                    monthDeltaPct: movement.monthDeltaPct,
                  }}
                  formatBalance={formatBalance}
                  currency={currency}
                  onOpen={() => openAccount(acc.id)}
                />
              )
            })}
            <div className="flex items-center justify-between gap-3 rounded-[1.65rem] border border-gray-200 bg-white px-4 py-3 shadow-md dark:border-gray-700 dark:bg-gray-800">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Total
              </span>
              <span
                className={`text-sm font-semibold tabular-nums ${balanceColorClass(totalBalance)}`}
              >
                {formatBalance(totalBalance)}
              </span>
            </div>
          </>
        )}
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
                  {kind === 'account-types' ? 'Cash Type' : 'ACC Type'}
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {!ready ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : linkedAccounts.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No accounts use this {singularLabel.toLowerCase()} yet.
                  </td>
                </tr>
              ) : (
                linkedAccounts.map((acc, index) => (
                  <tr
                    key={acc.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openAccount(acc.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openAccount(acc.id)
                      }
                    }}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-gray-500 dark:text-gray-400">
                      {index + 1}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-primary-700 dark:text-primary-300">
                      {acc.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-gray-600 dark:text-gray-300">
                      {acc.phone.trim() || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {kind === 'account-types'
                        ? acc.cashTypeName.trim() || '—'
                        : acc.accountTypeName.trim() || '—'}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-3 text-right text-sm font-medium tabular-nums ${balanceColorClass(acc.balance)}`}
                    >
                      {formatBalance(acc.balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {ready && linkedAccounts.length > 0 ? (
              <tfoot className="border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40">
                <tr>
                  <td className="px-4 py-3" colSpan={4}>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Total
                    </span>
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-3 text-right text-sm font-semibold tabular-nums ${balanceColorClass(totalBalance)}`}
                  >
                    {formatBalance(totalBalance)}
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
