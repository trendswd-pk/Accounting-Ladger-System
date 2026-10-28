import { recordRequestDeduped } from '@/lib/requestProfiler'

export type TransactionRecord = {
  id: string
  entryNumber: number
  transactionDate: string
  accountId: string
  accountName: string
  balance: number
  createdAt: string
}

type RpcRow = {
  id: string
  entry_number: number | string
  transaction_date: string
  account_id: string
  account_name: string
  balance: number | string
  created_at: string
}

const ENDPOINT = '/api/transactions'
let cache: TransactionRecord[] | null = null
let inflight: Promise<TransactionRecord[]> | null = null

export function mapTransactionRow(row: RpcRow): TransactionRecord {
  return {
    id: row.id,
    entryNumber: Number(row.entry_number),
    transactionDate: String(row.transaction_date).slice(0, 10),
    accountId: row.account_id,
    accountName: row.account_name,
    balance: Number(row.balance) || 0,
    createdAt: row.created_at,
  }
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
    recordRequestDeduped(ENDPOINT)
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
  balance: number
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
  cache = [item, ...(cache ?? [])]
  return item
}

export async function updateTransaction(
  id: string,
  input: TransactionInput
): Promise<TransactionRecord> {
  const res = await fetch(`${ENDPOINT}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to update transaction')
  const item = data.item as TransactionRecord
  cache = (cache ?? []).map((r) => (r.id === item.id ? item : r))
  return item
}

export async function deleteTransaction(id: string): Promise<void> {
  const res = await fetch(`${ENDPOINT}/${id}`, { method: 'DELETE' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Failed to delete transaction')
  cache = (cache ?? []).filter((r) => r.id !== id)
}
