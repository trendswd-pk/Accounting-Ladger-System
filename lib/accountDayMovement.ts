import {
  signedTransactionAmount,
  type TransactionRecord,
} from '@/lib/transactions'

/** Local calendar YYYY-MM-DD (same basis as dashboard mix day nets). */
export function localTodayIso(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Local calendar YYYY-MM (current month prefix). */
export function currentMonthPrefix(dayIso: string = localTodayIso()): string {
  return dayIso.slice(0, 7)
}

/** Sum of signed entry amounts for each account on `dayIso`. */
export function todayNetsByAccount(
  transactions: TransactionRecord[],
  dayIso: string = localTodayIso()
): Map<string, number> {
  const byAccount = new Map<string, number>()
  for (const tx of transactions) {
    if (tx.transactionDate.slice(0, 10) !== dayIso) continue
    byAccount.set(
      tx.accountId,
      (byAccount.get(tx.accountId) ?? 0) + signedTransactionAmount(tx)
    )
  }
  return byAccount
}

/**
 * Sum of signed entry amounts for each account in the calendar month
 * (`YYYY-MM`). Used for balance change vs end of last month.
 */
export function monthToDateNetsByAccount(
  transactions: TransactionRecord[],
  monthPrefix: string = currentMonthPrefix()
): Map<string, number> {
  const byAccount = new Map<string, number>()
  for (const tx of transactions) {
    if (tx.transactionDate.slice(0, 7) !== monthPrefix) continue
    byAccount.set(
      tx.accountId,
      (byAccount.get(tx.accountId) ?? 0) + signedTransactionAmount(tx)
    )
  }
  return byAccount
}

/**
 * Balance change vs end of yesterday (dashboard Balance Mix style).
 * `todayNet` = sum of today's signed transactions for the account.
 */
export function accountDayMovement(
  balanceToday: number,
  todayNet: number
): { dayDelta: number; dayDeltaPct: number } {
  const yesterday = balanceToday - todayNet
  const dayDelta = todayNet
  const dayDeltaPct =
    yesterday === 0
      ? dayDelta === 0
        ? 0
        : dayDelta > 0
          ? 100
          : -100
      : (dayDelta / Math.abs(yesterday)) * 100
  return { dayDelta, dayDeltaPct }
}

export function formatDayDeltaPct(pct: number): string {
  const abs = Math.abs(pct)
  const body = abs >= 10 ? abs.toFixed(1) : abs.toFixed(2)
  if (pct > 0) return `+${body}%`
  if (pct < 0) return `-${body}%`
  return '0%'
}

/**
 * Change of `current` vs `previous` (e.g. this month's spend vs last month).
 * Same edge rules as account day movement when previous is zero.
 */
export function periodChange(
  current: number,
  previous: number
): { delta: number; deltaPct: number } {
  const delta = current - previous
  const deltaPct =
    previous === 0
      ? delta === 0
        ? 0
        : delta > 0
          ? 100
          : -100
      : (delta / Math.abs(previous)) * 100
  return { delta, deltaPct }
}

/**
 * Balance change vs end of last calendar month.
 * `monthToDateNet` = sum of this month's signed transactions for the account.
 */
export function accountMonthMovement(
  balanceToday: number,
  monthToDateNet: number
): { monthDelta: number; monthDeltaPct: number } {
  const endOfLastMonth = balanceToday - monthToDateNet
  const { delta, deltaPct } = periodChange(balanceToday, endOfLastMonth)
  return { monthDelta: delta, monthDeltaPct: deltaPct }
}
