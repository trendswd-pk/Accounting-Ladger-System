'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Banknote,
  Briefcase,
  Calendar,
  CalendarDays,
  Info,
  Plus,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import TransactionFormModal from '@/components/TransactionFormModal'

const DashboardCharts = dynamic(
  () => import('@/components/dashboard/DashboardCharts'),
  {
    ssr: false,
    loading: () => (
      <div className="mt-6 space-y-4" aria-hidden>
        <div className="h-72 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800/80" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800/80" />
          <div className="h-64 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800/80" />
        </div>
      </div>
    ),
  }
)
import {
  fetchAccounts,
  getCachedAccounts,
  type AccountRecord,
} from '@/lib/accounts'
import {
  isCashInPocketAccount,
  isCashSavingsAccount,
  isExpenseAccount,
  isInvestAccount,
  isPayableAccount,
  isReceivableAccount,
} from '@/lib/accountFilters'
import {
  DEFAULT_APP_SETTINGS,
  getCachedAppSettings,
  sameIdList,
  watchAppSettings,
} from '@/lib/appSettings'
import { formatMoney } from '@/lib/money'
import {
  expenseSpendAmount,
  fetchTransactions,
  getCachedTransactions,
  type TransactionRecord,
} from '@/lib/transactions'

function sumBalances(list: AccountRecord[]): number {
  return list.reduce((sum, a) => sum + (Number(a.balance) || 0), 0)
}

function balanceColorClass(amount: number): string {
  if (amount > 0) return 'text-green-700 dark:text-green-400'
  if (amount < 0) return 'text-red-700 dark:text-red-400'
  return 'text-gray-900 dark:text-gray-100'
}

/** Expense totals: kharcha (credit) red, reverse (debit) green */
function expenseColorClass(amount: number): string {
  if (amount > 0) return 'text-red-700 dark:text-red-400'
  if (amount < 0) return 'text-green-700 dark:text-green-400'
  return 'text-gray-900 dark:text-gray-100'
}

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function yesterdayISO(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function DashboardHome() {
  const cachedAccounts = getCachedAccounts()
  const cachedTx = getCachedTransactions()
  const [accounts, setAccounts] = useState<AccountRecord[]>(() => cachedAccounts ?? [])
  const [transactions, setTransactions] = useState<TransactionRecord[]>(() => cachedTx ?? [])
  const [ready, setReady] = useState(() => cachedAccounts != null)
  const [txReady, setTxReady] = useState(() => cachedTx != null)
  const [currency, setCurrency] = useState(
    () => getCachedAppSettings()?.currency ?? DEFAULT_APP_SETTINGS.currency
  )
  const [cashSavingsCashTypeIds, setCashSavingsCashTypeIds] = useState<string[]>(
    () => getCachedAppSettings()?.cashSavingsCashTypeIds ?? []
  )
  const [cashSavingsAccountTypeIds, setCashSavingsAccountTypeIds] = useState<
    string[]
  >(() => getCachedAppSettings()?.cashSavingsAccountTypeIds ?? [])
  const [payableReceivableCashTypeIds, setPayableReceivableCashTypeIds] =
    useState<string[]>(
      () => getCachedAppSettings()?.payableReceivableCashTypeIds ?? []
    )
  const [payableReceivableAccountTypeIds, setPayableReceivableAccountTypeIds] =
    useState<string[]>(
      () => getCachedAppSettings()?.payableReceivableAccountTypeIds ?? []
    )
  const [infoOpen, setInfoOpen] = useState(false)
  const [txnModalOpen, setTxnModalOpen] = useState(false)

  const refreshDashboard = useCallback(async () => {
    try {
      const items = await fetchAccounts({ force: true })
      setAccounts(items)
      setReady(true)
    } catch {
      /* keep current */
    }
    try {
      const txs = await fetchTransactions({ force: true })
      setTransactions(txs)
    } catch {
      /* keep current */
    } finally {
      setTxReady(true)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    // Accounts first — unlocks above-the-fold cards / LCP without waiting on heavy txs
    void (async () => {
      try {
        const items = await fetchAccounts({ force: true })
        if (!cancelled) setAccounts(items)
      } catch {
        if (!cancelled && getCachedAccounts() == null) setAccounts([])
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    void (async () => {
      try {
        const txs = await fetchTransactions({ force: true })
        if (!cancelled) setTransactions(txs)
      } catch {
        if (!cancelled && getCachedTransactions() == null) setTransactions([])
      } finally {
        if (!cancelled) setTxReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return watchAppSettings((s) => {
      setCurrency(s.currency)
      setCashSavingsCashTypeIds((prev) =>
        sameIdList(prev, s.cashSavingsCashTypeIds) ? prev : s.cashSavingsCashTypeIds
      )
      setCashSavingsAccountTypeIds((prev) =>
        sameIdList(prev, s.cashSavingsAccountTypeIds)
          ? prev
          : s.cashSavingsAccountTypeIds
      )
      setPayableReceivableCashTypeIds((prev) =>
        sameIdList(prev, s.payableReceivableCashTypeIds)
          ? prev
          : s.payableReceivableCashTypeIds
      )
      setPayableReceivableAccountTypeIds((prev) =>
        sameIdList(prev, s.payableReceivableAccountTypeIds)
          ? prev
          : s.payableReceivableAccountTypeIds
      )
    })
  }, [])

  const pocketAccounts = useMemo(
    () => accounts.filter(isCashInPocketAccount),
    [accounts]
  )
  const cashSavingsAccounts = useMemo(
    () =>
      accounts.filter((a) =>
        isCashSavingsAccount(a, {
          cashTypeIds: cashSavingsCashTypeIds,
          accountTypeIds: cashSavingsAccountTypeIds,
        })
      ),
    [accounts, cashSavingsCashTypeIds, cashSavingsAccountTypeIds]
  )
  const payableReceivableFilter = useMemo(
    () => ({
      cashTypeIds: payableReceivableCashTypeIds,
      accountTypeIds: payableReceivableAccountTypeIds,
    }),
    [payableReceivableCashTypeIds, payableReceivableAccountTypeIds]
  )
  const payableAccounts = useMemo(
    () => accounts.filter((a) => isPayableAccount(a, payableReceivableFilter)),
    [accounts, payableReceivableFilter]
  )
  const receivableAccounts = useMemo(
    () => accounts.filter((a) => isReceivableAccount(a, payableReceivableFilter)),
    [accounts, payableReceivableFilter]
  )
  const expenseAccounts = useMemo(() => accounts.filter(isExpenseAccount), [accounts])
  const investAccounts = useMemo(() => accounts.filter(isInvestAccount), [accounts])

  const expenseAccountIds = useMemo(
    () => new Set(expenseAccounts.map((a) => a.id)),
    [expenseAccounts]
  )

  const pocketBalance = useMemo(() => sumBalances(pocketAccounts), [pocketAccounts])
  const cashInHandBalance = useMemo(
    () => sumBalances(cashSavingsAccounts),
    [cashSavingsAccounts]
  )
  const loanBalance = useMemo(() => sumBalances(payableAccounts), [payableAccounts])
  const receivableBalance = useMemo(
    () => sumBalances(receivableAccounts),
    [receivableAccounts]
  )
  const expenseBalance = useMemo(() => sumBalances(expenseAccounts), [expenseAccounts])
  const investBalance = useMemo(() => sumBalances(investAccounts), [investAccounts])

  const todayDate = todayISO()
  const yesterdayDate = yesterdayISO()

  const todayExpense = useMemo(() => {
    let total = 0
    for (const tx of transactions) {
      if (!expenseAccountIds.has(tx.accountId)) continue
      if (tx.transactionDate.slice(0, 10) !== todayDate) continue
      total += expenseSpendAmount(tx)
    }
    return total
  }, [transactions, expenseAccountIds, todayDate])

  const yesterdayExpense = useMemo(() => {
    let total = 0
    for (const tx of transactions) {
      if (!expenseAccountIds.has(tx.accountId)) continue
      if (tx.transactionDate.slice(0, 10) !== yesterdayDate) continue
      total += expenseSpendAmount(tx)
    }
    return total
  }, [transactions, expenseAccountIds, yesterdayDate])

  const statCards: {
    name: string
    value: string
    icon: typeof Wallet
    valueClassName?: string
    href?: string
  }[] = [
    {
      name: 'Cash in Pocket',
      value: ready ? formatMoney(pocketBalance, currency) : '—',
      icon: Wallet,
      valueClassName: ready ? balanceColorClass(pocketBalance) : undefined,
    },
    {
      name: 'Cash & Savings',
      value: ready ? formatMoney(cashInHandBalance, currency) : '—',
      icon: Banknote,
      valueClassName: ready ? balanceColorClass(cashInHandBalance) : undefined,
      href: '/cash-savings',
    },
    {
      name: 'Payable',
      value: ready ? formatMoney(loanBalance, currency) : '—',
      icon: TrendingDown,
      valueClassName: ready ? balanceColorClass(loanBalance) : undefined,
      href: '/payable',
    },
    {
      name: 'Receivable',
      value: ready ? formatMoney(receivableBalance, currency) : '—',
      icon: TrendingUp,
      valueClassName: ready ? balanceColorClass(receivableBalance) : undefined,
      href: '/receivable',
    },
    {
      name: 'Investment',
      value: ready ? formatMoney(investBalance, currency) : '—',
      icon: Briefcase,
      valueClassName: ready ? balanceColorClass(investBalance) : undefined,
      href: '/investment',
    },
    {
      name: 'Expenses',
      value: ready ? formatMoney(expenseBalance, currency) : '—',
      icon: Receipt,
      valueClassName: ready ? balanceColorClass(expenseBalance) : undefined,
      href: '/expenses',
    },
    {
      name: 'Today Expense',
      value: txReady ? formatMoney(todayExpense, currency) : '—',
      icon: Calendar,
      valueClassName: txReady ? expenseColorClass(todayExpense) : undefined,
      href: '/expenses/daily',
    },
    {
      name: 'Yesterday Expense',
      value: txReady ? formatMoney(yesterdayExpense, currency) : '—',
      icon: CalendarDays,
      valueClassName: txReady ? expenseColorClass(yesterdayExpense) : undefined,
      href: '/expenses/daily',
    },
  ]

  return (
    <div className="w-full p-4 lg:p-8">
      <div className="mb-4 lg:mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Dashboard
            </h1>
            <div className="relative inline-flex shrink-0">
              <button
                type="button"
                onClick={() => setInfoOpen((v) => !v)}
                className={`rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  infoOpen
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400'
                }`}
                aria-label="About Dashboard"
                aria-expanded={infoOpen}
                aria-controls="dashboard-info-popover"
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
                    id="dashboard-info-popover"
                    role="dialog"
                    className="absolute left-0 top-full z-50 mt-2 w-64 max-w-[min(16rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                  >
                    Overview of your books — balances, ledgers, and recent activity.
                  </div>
                </>
              ) : null}
            </div>
          </div>
          <div className="flex h-10 shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setTxnModalOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary-600 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 lg:hidden"
              aria-label="Add Transaction"
            >
              <Plus className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setTxnModalOpen(true)}
              className="hidden h-10 items-center rounded-md bg-primary-600 px-4 text-sm font-medium leading-none text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 lg:inline-flex"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <TransactionFormModal
        open={txnModalOpen}
        onClose={() => setTxnModalOpen(false)}
        onSaved={() => {
          void refreshDashboard()
        }}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon
          const className =
            'flex min-h-[4.25rem] min-w-0 items-center overflow-hidden rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800/90 sm:min-h-[5rem] sm:p-4 lg:p-5' +
            (card.href
              ? ' transition-colors hover:border-primary-300 hover:bg-primary-50/40 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:hover:border-primary-700 dark:hover:bg-primary-900/20'
              : '')
          const body = (
            <div className="flex w-full min-w-0 items-center gap-2 sm:gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400 sm:h-9 sm:w-9">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 overflow-hidden">
                <p className="truncate text-xs font-medium leading-snug text-gray-500 dark:text-gray-400 sm:text-sm">
                  {card.name}
                </p>
                <p
                  title={card.value}
                  className={`max-w-full break-all text-xs font-semibold leading-tight tabular-nums sm:text-sm md:break-words md:text-base lg:text-lg xl:text-xl 2xl:text-2xl ${
                    card.valueClassName ?? 'text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {card.value}
                </p>
              </div>
            </div>
          )
          return card.href ? (
            <Link
              key={card.name}
              href={card.href}
              prefetch={false}
              className={className}
            >
              {body}
            </Link>
          ) : (
            <div key={card.name} className={className}>
              {body}
            </div>
          )
        })}
      </div>

      <DashboardCharts
        currency={currency}
        ready={ready}
        txReady={txReady}
        cashInPocket={pocketBalance}
        cashSavings={cashInHandBalance}
        payable={loanBalance}
        receivable={receivableBalance}
        expenseAccountIds={expenseAccountIds}
        transactions={transactions}
        expenseAccounts={expenseAccounts}
      />
    </div>
  )
}
