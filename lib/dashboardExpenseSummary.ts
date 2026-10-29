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

export type ExpenseAccountSeries = {
  /** Stable Recharts dataKey, e.g. a_<uuid> */
  key: string
  id: string
  name: string
}

/** @deprecated Use ExpenseAccountSeries */
export type DailyExpenseSeries = ExpenseAccountSeries

export type DailyExpensePoint = {
  day: string
  /** Total expense for the day (all expense accounts). */
  expense: number
  /** Per-account amounts keyed by ExpenseAccountSeries.key */
  [accountKey: string]: string | number
}

export type MonthlyExpensePoint = {
  key: string
  label: string
  /** Total expense for the month (all expense accounts). */
  expense: number
  /** Per-account amounts keyed by ExpenseAccountSeries.key */
  [accountKey: string]: string | number
}

export type DashboardExpenseSummary = {
  todayExpense: number
  yesterdayExpense: number
  monthly: MonthlyExpensePoint[]
  /** Expense accounts plotted on the monthly chart (besides Total). */
  monthlySeries: ExpenseAccountSeries[]
  daily: DailyExpensePoint[]
  /** Expense accounts plotted on the daily chart (besides Total). */
  dailySeries: ExpenseAccountSeries[]
  topAccounts: Array<{ id: string; name: string; total: number }>
}

function seriesKeyForAccount(id: string): string {
  return `a_${id.replace(/[^a-zA-Z0-9]/g, '_')}`
}

function cloneSummary(summary: DashboardExpenseSummary): DashboardExpenseSummary {
  return {
    ...summary,
    monthly: summary.monthly.map((row) => ({ ...row })),
    monthlySeries: [...(summary.monthlySeries ?? [])],
    daily: summary.daily.map((row) => ({ ...row })),
    dailySeries: [...(summary.dailySeries ?? [])],
    topAccounts: [...summary.topAccounts],
  }
}

type SlimTx = {
  accountId: string
  transactionDate: string
  entryType: 'credit' | 'debit'
  balance: number
}

function emptySummary(): DashboardExpenseSummary {
  const now = new Date()
  const monthly: MonthlyExpensePoint[] = []
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
  const daily: DailyExpensePoint[] = []
  for (let day = 1; day <= days; day++) {
    daily.push({ day: String(day), expense: 0 })
  }
  return {
    todayExpense: 0,
    yesterdayExpense: 0,
    monthly,
    monthlySeries: [],
    daily,
    dailySeries: [],
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
  /** monthKey → accountId → spend */
  const monthlyByAccount = new Map<string, Map<string, number>>()
  const rangeAccountTotal = new Map<string, number>()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyMap.set(prefix, 0)
    monthlyByAccount.set(prefix, new Map())
  }

  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const daysInView = now.getDate()
  const dailyMap = new Map<string, number>()
  /** date → accountId → spend */
  const dailyByAccount = new Map<string, Map<string, number>>()
  for (let day = 1; day <= daysInView; day++) {
    const date = `${monthPrefix}-${String(day).padStart(2, '0')}`
    dailyMap.set(date, 0)
    dailyByAccount.set(date, new Map())
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
      const byAcc = monthlyByAccount.get(monthKey)!
      byAcc.set(tx.accountId, (byAcc.get(tx.accountId) ?? 0) + spend)
      rangeAccountTotal.set(
        tx.accountId,
        (rangeAccountTotal.get(tx.accountId) ?? 0) + spend
      )
    }

    if (dailyMap.has(date)) {
      dailyMap.set(date, (dailyMap.get(date) ?? 0) + spend)
      const byAcc = dailyByAccount.get(date)!
      byAcc.set(tx.accountId, (byAcc.get(tx.accountId) ?? 0) + spend)
    }

    if (date.startsWith(monthPrefix)) {
      topMap.set(tx.accountId, (topMap.get(tx.accountId) ?? 0) + spend)
    }
  }

  const nameById = new Map(expenseAccounts.map((a) => [a.id, a.name]))

  const rankedThisMonth = expenseAccounts
    .map((a) => ({
      id: a.id,
      name: a.name,
      total: Math.max(0, topMap.get(a.id) ?? 0),
    }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total)

  const topAccounts = rankedThisMonth.slice(0, 6)

  const rankedRange = [...rangeAccountTotal.entries()]
    .map(([id, total]) => ({
      id,
      name: nameById.get(id) ?? 'Account',
      total: Math.max(0, total),
    }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total)

  const monthlySeries: ExpenseAccountSeries[] = rankedRange.slice(0, 10).map((a) => ({
    key: seriesKeyForAccount(a.id),
    id: a.id,
    name: a.name,
  }))

  const monthly: MonthlyExpensePoint[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth()
    const prefix = `${y}-${String(m + 1).padStart(2, '0')}`
    const row: MonthlyExpensePoint = {
      key: prefix,
      label: `${MONTH_SHORT[m]} ${String(y).slice(2)}`,
      expense: Math.max(0, monthlyMap.get(prefix) ?? 0),
    }
    const byAcc = monthlyByAccount.get(prefix)
    for (const s of monthlySeries) {
      row[s.key] = Math.max(0, byAcc?.get(s.id) ?? 0)
    }
    monthly.push(row)
  }

  const dailySeries: ExpenseAccountSeries[] = rankedThisMonth.slice(0, 10).map((a) => ({
    key: seriesKeyForAccount(a.id),
    id: a.id,
    name: a.name,
  }))

  const daily: DailyExpensePoint[] = []
  for (let day = 1; day <= daysInView; day++) {
    const date = `${monthPrefix}-${String(day).padStart(2, '0')}`
    const row: DailyExpensePoint = {
      day: String(day),
      expense: Math.max(0, dailyMap.get(date) ?? 0),
    }
    const byAcc = dailyByAccount.get(date)
    for (const s of dailySeries) {
      row[s.key] = Math.max(0, byAcc?.get(s.id) ?? 0)
    }
    daily.push(row)
  }

  return {
    todayExpense,
    yesterdayExpense,
    monthly,
    monthlySeries,
    daily,
    dailySeries,
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
  return cache ? cloneSummary(cache) : null
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
    return cloneSummary(cache)
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
    if (!Array.isArray(summary.dailySeries)) summary.dailySeries = []
    if (!Array.isArray(summary.monthlySeries)) summary.monthlySeries = []
    cache = summary
    return cloneSummary(summary)
  })()

  inflight = req
  try {
    return await req
  } finally {
    if (inflight === req) inflight = null
  }
}
