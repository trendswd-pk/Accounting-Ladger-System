import { isExpenseLabel } from '@/lib/accountFilters'
import { recordRequestDeduped } from '@/lib/requestProfiler'
import {
  expenseSpendAmount,
  normalizeEntryType,
} from '@/lib/transactions'
import { getSupabaseAdmin } from '@/lib/supabase-server'

const ENDPOINT = '/api/dashboard/expense-summary'

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

export type DashboardExpenseSummary = {
  todayExpense: number
  yesterdayExpense: number
  monthly: Array<{ key: string; label: string; expense: number }>
  daily: Array<{ day: string; expense: number }>
  topAccounts: Array<{ id: string; name: string; total: number }>
}

type SlimTx = {
  accountId: string
  transactionDate: string
  entryType: 'credit' | 'debit'
  balance: number
}

function emptySummary(): DashboardExpenseSummary {
  const now = new Date()
  const monthly: DashboardExpenseSummary['monthly'] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth()
    const prefix = `${y}-${String(m + 1).padStart(2, '0')}`
    monthly.push({
      key: prefix,
      label: `${MONTH_SHORT[m]} ${String(y).slice(2)}`,
      expense: 0,
    })
  }
  const days = now.getDate()
  const daily: DashboardExpenseSummary['daily'] = []
  for (let day = 1; day <= days; day++) {
    daily.push({ day: String(day), expense: 0 })
  }
  return {
    todayExpense: 0,
    yesterdayExpense: 0,
    monthly,
    daily,
    topAccounts: [],
  }
}

function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function aggregate(
  txs: SlimTx[],
  expenseAccounts: Array<{ id: string; name: string }>
): DashboardExpenseSummary {
  const now = new Date()
  const today = isoDate(now)
  const yest = new Date(now)
  yest.setDate(yest.getDate() - 1)
  const yesterday = isoDate(yest)

  let todayExpense = 0
  let yesterdayExpense = 0

  const monthlyMap = new Map<string, number>()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyMap.set(prefix, 0)
  }

  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const daysInView = now.getDate()
  const dailyMap = new Map<string, number>()
  for (let day = 1; day <= daysInView; day++) {
    dailyMap.set(`${monthPrefix}-${String(day).padStart(2, '0')}`, 0)
  }

  const topMap = new Map<string, number>()

  for (const tx of txs) {
    const date = tx.transactionDate.slice(0, 10)
    const spend = expenseSpendAmount(tx)
    const monthKey = date.slice(0, 7)

    if (date === today) todayExpense += spend
    if (date === yesterday) yesterdayExpense += spend

    if (monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) ?? 0) + spend)
    }

    if (dailyMap.has(date)) {
      dailyMap.set(date, (dailyMap.get(date) ?? 0) + spend)
    }

    if (date.startsWith(monthPrefix)) {
      topMap.set(tx.accountId, (topMap.get(tx.accountId) ?? 0) + spend)
    }
  }

  const monthly: DashboardExpenseSummary['monthly'] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth()
    const prefix = `${y}-${String(m + 1).padStart(2, '0')}`
    monthly.push({
      key: prefix,
      label: `${MONTH_SHORT[m]} ${String(y).slice(2)}`,
      expense: Math.max(0, monthlyMap.get(prefix) ?? 0),
    })
  }

  const daily: DashboardExpenseSummary['daily'] = []
  for (let day = 1; day <= daysInView; day++) {
    const date = `${monthPrefix}-${String(day).padStart(2, '0')}`
    daily.push({
      day: String(day),
      expense: Math.max(0, dailyMap.get(date) ?? 0),
    })
  }

  const topAccounts = expenseAccounts
    .map((a) => ({
      id: a.id,
      name: a.name,
      total: Math.max(0, topMap.get(a.id) ?? 0),
    }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 6)

  return {
    todayExpense,
    yesterdayExpense,
    monthly,
    daily,
    topAccounts,
  }
}

/** Server: slim expense rows only (last ~6 months), pre-aggregated for dashboard. */
export async function buildDashboardExpenseSummary(): Promise<DashboardExpenseSummary> {
  const admin = getSupabaseAdmin()
  const { data: accountRows, error: accountError } = await admin
    .from('accounts')
    .select('id, name, account_types ( name, code )')

  if (accountError) throw new Error(accountError.message)

  type AccRow = {
    id: string
    name: string
    account_types: { name: string; code: string } | { name: string; code: string }[] | null
  }

  const expenseAccounts = ((accountRows ?? []) as AccRow[])
    .map((r) => {
      const at = Array.isArray(r.account_types) ? r.account_types[0] : r.account_types
      return {
        id: r.id,
        name: r.name,
        isExpense: isExpenseLabel(at?.name ?? '', at?.code ?? ''),
      }
    })
    .filter((a) => a.isExpense)
    .map(({ id, name }) => ({ id, name }))

  if (expenseAccounts.length === 0) return emptySummary()

  const expenseIds = expenseAccounts.map((a) => a.id)
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const fromStr = isoDate(from)

  const { data: txRows, error: txError } = await admin
    .from('transactions')
    .select('account_id, transaction_date, entry_type, balance')
    .in('account_id', expenseIds)
    .gte('transaction_date', fromStr)

  if (txError) throw new Error(txError.message)

  const txs: SlimTx[] = (txRows ?? []).map(
    (r: {
      account_id: string
      transaction_date: string
      entry_type?: string | null
      balance: number | string
    }) => ({
      accountId: r.account_id,
      transactionDate: String(r.transaction_date).slice(0, 10),
      entryType: normalizeEntryType(r.entry_type),
      balance: Number(r.balance) || 0,
    })
  )

  return aggregate(txs, expenseAccounts)
}

let cache: DashboardExpenseSummary | null = null
let inflight: Promise<DashboardExpenseSummary> | null = null

export function getCachedDashboardExpenseSummary(): DashboardExpenseSummary | null {
  return cache ? { ...cache, monthly: [...cache.monthly], daily: [...cache.daily], topAccounts: [...cache.topAccounts] } : null
}

export function invalidateDashboardExpenseSummaryCache(): void {
  cache = null
  inflight = null
}

export async function fetchDashboardExpenseSummary(options?: {
  force?: boolean
}): Promise<DashboardExpenseSummary> {
  const force = options?.force === true
  if (!force && cache) {
    return {
      ...cache,
      monthly: [...cache.monthly],
      daily: [...cache.daily],
      topAccounts: [...cache.topAccounts],
    }
  }
  if (inflight) {
    recordRequestDeduped(ENDPOINT)
    return inflight
  }

  const req = (async () => {
    const res = await fetch(ENDPOINT, { cache: 'no-store' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to load expense summary')
    const summary = data as DashboardExpenseSummary
    cache = summary
    return {
      ...summary,
      monthly: [...summary.monthly],
      daily: [...summary.daily],
      topAccounts: [...summary.topAccounts],
    }
  })()

  inflight = req
  try {
    return await req
  } finally {
    if (inflight === req) inflight = null
  }
}
