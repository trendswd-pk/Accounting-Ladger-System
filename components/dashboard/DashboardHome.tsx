'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
import {
  fetchDashboardExpenseSummary,
  getCachedDashboardExpenseSummary,
  invalidateDashboardExpenseSummaryCache,
  type DashboardExpenseSummary,
} from '@/lib/dashboardExpenseSummary'
import { formatMoney } from '@/lib/money'

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

function scheduleIdle(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const ric = window.requestIdleCallback
  if (typeof ric === 'function') {
    const id = ric(() => cb(), { timeout: 1800 })
    return () => window.cancelIdleCallback(id)
  }
  const t = window.setTimeout(cb, 200)
  return () => window.clearTimeout(t)
}

export default function DashboardHome() {
  const router = useRouter()
  const cachedAccounts = getCachedAccounts()
  const cachedSummary = getCachedDashboardExpenseSummary()
  const [accounts, setAccounts] = useState<AccountRecord[]>(() => cachedAccounts ?? [])
  const [summary, setSummary] = useState<DashboardExpenseSummary | null>(
    () => cachedSummary
  )
  const [ready, setReady] = useState(() => cachedAccounts != null)
  const [summaryReady, setSummaryReady] = useState(() => cachedSummary != null)
  const [chartsMounted, setChartsMounted] = useState(false)
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

  const loadSummary = useCallback(async (force: boolean) => {
    try {
      if (force) invalidateDashboardExpenseSummaryCache()
      const next = await fetchDashboardExpenseSummary({ force })
      setSummary(next)
    } catch {
      /* keep current */
    } finally {
      setSummaryReady(true)
    }
  }, [])

  const refreshDashboard = useCallback(async () => {
    // Prefer soft-updated accounts cache (instant). Reconcile from API in background.
    const soft = getCachedAccounts()
    if (soft) {
      setAccounts(soft)
      setReady(true)
    }
    void (async () => {
      try {
        const items = await fetchAccounts({ force: true })
        setAccounts(items)
        setReady(true)
      } catch {
        /* keep soft / current */
      }
    })()
    void loadSummary(true)
  }, [loadSummary])

  useEffect(() => {
    let cancelled = false
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
    return () => {
      cancelled = true
    }
  }, [])

  // Defer expense summary + chart bundle until after first paint (cuts mobile TBT)
  useEffect(() => {
    let cancelled = false
    const cancelIdle = scheduleIdle(() => {
      if (cancelled) return
      setChartsMounted(true)
      void loadSummary(true)
    })
    return () => {
      cancelled = true
      cancelIdle()
    }
  }, [loadSummary])

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

  const { todayIso, yesterdayIso } = useMemo(() => {
    const toIso = (d: Date) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    return { todayIso: toIso(today), yesterdayIso: toIso(yesterday) }
  }, [])

  const todayExpense = summary?.todayExpense ?? 0
  const yesterdayExpense = summary?.yesterdayExpense ?? 0

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
      value: summaryReady ? formatMoney(todayExpense, currency) : '—',
      icon: Calendar,
      valueClassName: summaryReady ? expenseColorClass(todayExpense) : undefined,
      href: `/transactions?dateFrom=${encodeURIComponent(todayIso)}&dateTo=${encodeURIComponent(todayIso)}&expenseOnly=1&from=${encodeURIComponent('/')}`,
    },
    {
      name: 'Yesterday Expense',
      value: summaryReady ? formatMoney(yesterdayExpense, currency) : '—',
      icon: CalendarDays,
      valueClassName: summaryReady
        ? expenseColorClass(yesterdayExpense)
        : undefined,
      href: `/transactions?dateFrom=${encodeURIComponent(yesterdayIso)}&dateTo=${encodeURIComponent(yesterdayIso)}&expenseOnly=1&from=${encodeURIComponent('/')}`,
    },
  ]

  // Prefetch card targets (incl. Today/Yesterday query URLs) once per day key.
  useEffect(() => {
    const hrefs = [
      '/expenses',
      '/cash-savings',
      '/payable',
      '/receivable',
      '/investment',
      `/transactions?dateFrom=${encodeURIComponent(todayIso)}&dateTo=${encodeURIComponent(todayIso)}&expenseOnly=1&from=${encodeURIComponent('/')}`,
      `/transactions?dateFrom=${encodeURIComponent(yesterdayIso)}&dateTo=${encodeURIComponent(yesterdayIso)}&expenseOnly=1&from=${encodeURIComponent('/')}`,
    ]
    for (const href of hrefs) router.prefetch(href)
  }, [router, todayIso, yesterdayIso])

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
            <Link key={card.name} href={card.href} className={className}>
              {body}
            </Link>
          ) : (
            <div key={card.name} className={className}>
              {body}
            </div>
          )
        })}
      </div>

      {chartsMounted ? (
        <DashboardCharts
          currency={currency}
          ready={ready}
          summaryReady={summaryReady}
          cashInPocket={pocketBalance}
          cashSavings={cashInHandBalance}
          payable={loanBalance}
          receivable={receivableBalance}
          summary={summary}
        />
      ) : (
        <div className="mt-6 space-y-4" aria-hidden>
          <div className="h-72 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800/80" />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-64 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800/80" />
            <div className="h-64 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800/80" />
          </div>
        </div>
      )}
    </div>
  )
}
