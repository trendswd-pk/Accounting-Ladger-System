import { adjustCachedAccountBalance } from '@/lib/accounts'
import { recordRequestDeduped } from '@/lib/requestProfiler'
import { requireDemoUser } from '@/lib/demoAuth'
import {
  getStoredAccounts,
  getStoredTransactions,
  newId,
  setStoredTransactions,
} from '@/lib/demoStore'
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

const ENDPOINT = 'demo:transactions'
let cache: TransactionRecord[] | null = null
let inflight: Promise<TransactionRecord[]> | null = null

export function normalizeEntryType(value: unknown): TransactionEntryType {
  return value === 'debit' ? 'debit' : 'credit'
}

export function mapTransactionRow(row: {
  id: string
  entry_number: number | string
  transaction_date: string
  account_id: string
  account_name: string
  narration?: string | null
  entry_type?: string | null
  balance: number | string
  created_at: string
}): TransactionRecord {
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
export function signedTransactionAmount(
  row: Pick<TransactionRecord, 'entryType' | 'balance'>
): number {
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

function listFromStore(): TransactionRecord[] {
  requireDemoUser()
  return [...getStoredTransactions()].sort((a, b) => b.entryNumber - a.entryNumber)
}

function accountNameById(accountId: string): string {
  return getStoredAccounts().find((a) => a.id === accountId)?.name ?? ''
}

function nextEntryNumber(): number {
  const rows = getStoredTransactions()
  let max = 0
  for (const row of rows) {
    if (row.entryNumber > max) max = row.entryNumber
  }
  return max + 1
}

export async function fetchTransactions(options?: {
  force?: boolean
}): Promise<TransactionRecord[]> {
  const force = options?.force === true
  if (!force && cache) {
    return cache.map((r) => ({ ...r }))
  }
  if (inflight) {
    recordRequestDeduped(ENDPOINT)
    return inflight
  }

  const req = (async () => {
    const items = listFromStore()
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

export async function createTransaction(
  input: TransactionInput
): Promise<TransactionRecord> {
  requireDemoUser()
  const transactionDate = String(input.transactionDate ?? '').trim().slice(0, 10)
  const accountId = String(input.accountId ?? '').trim()
  const narration = String(input.narration ?? '').trim()
  const entryType = normalizeEntryType(input.entryType)
  const balance = Math.abs(Number(input.balance))

  if (!transactionDate) throw new Error('Transaction date is required.')
  if (!accountId) throw new Error('Account is required.')
  if (!narration) throw new Error('Narration is required.')
  if (!Number.isFinite(balance)) throw new Error('Balance must be a number.')

  const item: TransactionRecord = {
    id: newId('tx'),
    entryNumber: nextEntryNumber(),
    transactionDate,
    accountId,
    accountName: accountNameById(accountId),
    narration,
    entryType,
    balance,
    createdAt: new Date().toISOString(),
  }
  setStoredTransactions([...getStoredTransactions(), item])
  if (cache) cache = [item, ...cache]
  adjustCachedAccountBalance(item.accountId, signedTransactionAmount(item))
  return item
}

export async function updateTransaction(
  id: string,
  input: TransactionInput
): Promise<TransactionRecord> {
  requireDemoUser()
  const transactionDate = String(input.transactionDate ?? '').trim().slice(0, 10)
  const accountId = String(input.accountId ?? '').trim()
  const narration = String(input.narration ?? '').trim()
  const entryType = normalizeEntryType(input.entryType)
  const balance = Math.abs(Number(input.balance))

  if (!transactionDate) throw new Error('Transaction date is required.')
  if (!accountId) throw new Error('Account is required.')
  if (!narration) throw new Error('Narration is required.')
  if (!Number.isFinite(balance)) throw new Error('Balance must be a number.')

  const rows = getStoredTransactions()
  const idx = rows.findIndex((r) => r.id === id)
  if (idx < 0) throw new Error('Transaction not found.')
  const prev = rows[idx]

  const item: TransactionRecord = {
    ...prev,
    transactionDate,
    accountId,
    accountName: accountNameById(accountId),
    narration,
    entryType,
    balance,
  }
  const updated = [...rows]
  updated[idx] = item
  setStoredTransactions(updated)
  cache = listFromStore()
  adjustCachedAccountBalance(prev.accountId, -signedTransactionAmount(prev))
  adjustCachedAccountBalance(item.accountId, signedTransactionAmount(item))
  return item
}

export async function deleteTransaction(id: string): Promise<void> {
  requireDemoUser()
  const prev = getStoredTransactions().find((r) => r.id === id)
  setStoredTransactions(getStoredTransactions().filter((r) => r.id !== id))
  cache = (cache ?? []).filter((r) => r.id !== id)
  if (prev) {
    adjustCachedAccountBalance(prev.accountId, -signedTransactionAmount(prev))
  }
}
