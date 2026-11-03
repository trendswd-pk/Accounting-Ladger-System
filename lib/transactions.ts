import { adjustCachedAccountBalance } from '@/lib/accounts'
import { recordRequestDeduped } from '@/lib/requestProfiler'

export type TransactionEntryType = 'credit' | 'debit'

export type TransactionRecord = {
  id: string
  entryNumber: number
  transactionDate: string
  accountId: string
  accountName: string
  narration: string
  entryType: TransactionEntryType
  balance: number
  createdAt: string
}

type RpcRow = {
  id: string
  entry_number: number | string
  transaction_date: string
  account_id: string
  account_name: string
  narration?: string | null
  entry_type?: string | null
  balance: number | string
  created_at: string
}

const ENDPOINT = '/api/transactions'
let cache: TransactionRecord[] | null = null
let inflight: Promise<TransactionRecord[]> | null = null

export function normalizeEntryType(value: unknown): TransactionEntryType {
  return value === 'debit' ? 'debit' : 'credit'
}

export function mapTransactionRow(row: RpcRow): TransactionRecord {
  return {
    id: row.id,
    entryNumber: Number(row.entry_number),
    transactionDate: String(row.transaction_date).slice(0, 10),
    accountId: row.account_id,
    accountName: row.account_name,
    narration: String(row.narration ?? ''),
    entryType: normalizeEntryType(row.entry_type),
    balance: Number(row.balance) || 0,
    createdAt: row.created_at,
  }
}

/** Signed amount for running balance: credit +, debit − */
export function signedTransactionAmount(row: Pick<TransactionRecord, 'entryType' | 'balance'>): number {
  const amount = Math.abs(row.balance)
  return row.entryType === 'debit' ? -amount : amount
}

/**
 * Expense account spend (kharcha): amount added (credit) counts as expense (+),
 * debit reverses it (−). Matches expense account balance direction.
 */
export function expenseSpendAmount(
  row: Pick<TransactionRecord, 'entryType' | 'balance'>
): number {
  return signedTransactionAmount(row)
}

export function getCachedTransactions(): TransactionRecord[] | null {
  return cache ? cache.map((r) => ({ ...r })) : null
}

export function invalidateTransactionsCache(): void {
  cache = null
  inflight = null
}

export async function fetchTransactions(options?: { force?: boolean }): Promise<TransactionRecord[]> {
  const force = options?.force === true
  if (!force && cache) {
    return cache.map((r) => ({ ...r }))
  }
  if (inflight) {
    recordRequestDeduped(ENDPOINT)
    return inflight
  }

  const req = (async () => {
    const res = await fetch(ENDPOINT, { cache: 'no-store' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to load transactions')
    const items = (data.items as TransactionRecord[]) ?? []
    cache = items
    return items.map((r) => ({ ...r }))
  })()

  inflight = req
  try {
    return await req
  } finally {
    if (inflight === req) inflight = null
  }
}

export type TransactionInput = {
  transactionDate: string
  accountId: string
  narration: string
  entryType: TransactionEntryType
  balance: number
}

function applyCreatedToCache(items: TransactionRecord[]) {
  if (items.length === 0) return
  // Only prepend when we already have a full list cached; otherwise leave
  // cache null so the next fetchTransactions() loads the complete set.
  if (cache) cache = [...items, ...cache]
  for (const item of items) {
    adjustCachedAccountBalance(item.accountId, signedTransactionAmount(item))
  }
}

export async function createTransaction(input: TransactionInput): Promise<TransactionRecord> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to create transaction')
  const item = data.item as TransactionRecord
  applyCreatedToCache([item])
  return item
}

/** Create multiple journal lines in one request (used by Transfer). */
export async function createTransactions(
  inputs: TransactionInput[]
): Promise<TransactionRecord[]> {
  if (inputs.length === 0) return []
  if (inputs.length === 1) {
    return [await createTransaction(inputs[0]!)]
  }
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: inputs }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to create transactions')
  const items = (data.items as TransactionRecord[]) ?? []
  if (items.length === 0) throw new Error('Failed to create transactions')
  applyCreatedToCache(items)
  return items
}

/** Debit fromAccount + credit toAccount in a single API round-trip. */
export async function createTransfer(input: {
  transactionDate: string
  fromAccountId: string
  toAccountId: string
  narration: string
  balance: number
}): Promise<{ debit: TransactionRecord; credit: TransactionRecord }> {
  const amount = Math.abs(input.balance)
  const shared = {
    transactionDate: input.transactionDate,
    narration: input.narration,
    balance: amount,
  }
  const items = await createTransactions([
    {
      ...shared,
      accountId: input.fromAccountId,
      entryType: 'debit',
    },
    {
      ...shared,
      accountId: input.toAccountId,
      entryType: 'credit',
    },
  ])
  const debit =
    items.find((r) => r.entryType === 'debit' && r.accountId === input.fromAccountId) ??
    items[0]!
  const credit =
    items.find((r) => r.entryType === 'credit' && r.accountId === input.toAccountId) ??
    items[1]!
  return { debit, credit }
}

export async function updateTransaction(
  id: string,
  input: TransactionInput
): Promise<TransactionRecord> {
  const prev = cache?.find((r) => r.id === id)
  const res = await fetch(`${ENDPOINT}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to update transaction')
  const item = data.item as TransactionRecord
  cache = (cache ?? []).map((r) => (r.id === item.id ? item : r))
  if (prev) {
    adjustCachedAccountBalance(prev.accountId, -signedTransactionAmount(prev))
  }
  adjustCachedAccountBalance(item.accountId, signedTransactionAmount(item))
  return item
}

export async function deleteTransaction(id: string): Promise<void> {
  const prev = cache?.find((r) => r.id === id)
  const res = await fetch(`${ENDPOINT}/${id}`, { method: 'DELETE' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Failed to delete transaction')
  cache = (cache ?? []).filter((r) => r.id !== id)
  if (prev) {
    adjustCachedAccountBalance(prev.accountId, -signedTransactionAmount(prev))
  }
}
