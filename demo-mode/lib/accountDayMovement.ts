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
