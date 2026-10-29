/**
 * Demo Mode transactions API — localStorage-backed helpers (no NextResponse / Supabase).
 */
import {
  createTransaction,
  deleteTransaction,
  fetchTransactions,
  normalizeEntryType,
  updateTransaction,
  type TransactionRecord,
} from '@/lib/transactions'

export async function listTransactions(): Promise<{
  items: TransactionRecord[]
  via: string
}> {
  const items = await fetchTransactions({ force: true })
  return { items, via: 'demo-store' }
}

export async function createTransactionRow(body: {
  transactionDate?: string
  accountId?: string
  narration?: string
  entryType?: string
  balance?: number | string
}): Promise<{ item: TransactionRecord }> {
  const item = await createTransaction({
    transactionDate: String(body.transactionDate ?? ''),
    accountId: String(body.accountId ?? ''),
    narration: String(body.narration ?? ''),
    entryType: normalizeEntryType(body.entryType),
    balance: Math.abs(Number(body.balance)),
  })
  return { item }
}

export async function updateTransactionRow(
  id: string,
  body: {
    transactionDate?: string
    accountId?: string
    narration?: string
    entryType?: string
    balance?: number | string
  }
): Promise<{ item: TransactionRecord }> {
  const item = await updateTransaction(id, {
    transactionDate: String(body.transactionDate ?? ''),
    accountId: String(body.accountId ?? ''),
    narration: String(body.narration ?? ''),
    entryType: normalizeEntryType(body.entryType),
    balance: Math.abs(Number(body.balance)),
  })
  return { item }
}

export async function deleteTransactionRow(id: string): Promise<{ ok: true }> {
  await deleteTransaction(id)
  return { ok: true }
}
