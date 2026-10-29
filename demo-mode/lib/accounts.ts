import { recordRequestDeduped } from '@/lib/requestProfiler'
import {
  getAccountTypes,
  getCashTypes,
  getStoredAccounts,
  getStoredTransactions,
  newId,
  setStoredAccounts,
  type StoredAccount,
} from '@/lib/demoStore'
import { requireDemoUser } from '@/lib/demoAuth'

export type AccountRecord = {
  id: string
  name: string
  phone: string
  accountTypeId: string
  cashTypeId: string
  accountTypeName: string
  accountTypeCode: string
  cashTypeName: string
  cashTypeCode: string
  createdAt: string
  /** Net from transactions: credit +, debit −. */
  balance: number
}

const ENDPOINT = 'demo:accounts'
let cache: AccountRecord[] | null = null
let inflight: Promise<AccountRecord[]> | null = null

function signedAmount(entryTypeRaw: unknown, balanceRaw: unknown): number {
  const amount = Math.abs(Number(balanceRaw) || 0)
  return entryTypeRaw === 'debit' ? -amount : amount
}

function balancesByAccountId(): Map<string, number> {
  const map = new Map<string, number>()
  for (const tx of getStoredTransactions()) {
    map.set(tx.accountId, (map.get(tx.accountId) ?? 0) + signedAmount(tx.entryType, tx.balance))
  }
  return map
}

function hydrate(row: StoredAccount, balances: Map<string, number>): AccountRecord {
  const accountTypes = getAccountTypes()
  const cashTypes = getCashTypes()
  const at = accountTypes.find((t) => t.id === row.accountTypeId)
  const ct = cashTypes.find((t) => t.id === row.cashTypeId)
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? '',
    accountTypeId: row.accountTypeId,
    cashTypeId: row.cashTypeId,
    accountTypeName: at?.name ?? '',
    accountTypeCode: at?.code ?? '',
    cashTypeName: ct?.name ?? '',
    cashTypeCode: ct?.code ?? '',
    createdAt: row.createdAt,
    balance: balances.get(row.id) ?? 0,
  }
}

export function mapAccountRow(row: {
  id: string
  name: string
  phone: string | null
  account_type_id: string
  cash_type_id: string
  account_type_name: string
  account_type_code: string
  cash_type_name: string
  cash_type_code: string
  created_at: string
  balance?: number | string | null
}): AccountRecord {
  const balanceRaw = row.balance
  const balance =
    balanceRaw == null || balanceRaw === '' ? 0 : Number(balanceRaw) || 0
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? '',
    accountTypeId: row.account_type_id,
    cashTypeId: row.cash_type_id,
    accountTypeName: row.account_type_name,
    accountTypeCode: row.account_type_code,
    cashTypeName: row.cash_type_name,
    cashTypeCode: row.cash_type_code,
    createdAt: row.created_at,
    balance,
  }
}

export function getCachedAccounts(): AccountRecord[] | null {
  return cache ? cache.map((r) => ({ ...r })) : null
}

export function invalidateAccountsCache(): void {
  cache = null
  inflight = null
}

function listAccountsFromStore(): AccountRecord[] {
  requireDemoUser()
  const balances = balancesByAccountId()
  return getStoredAccounts().map((row) => hydrate(row, balances))
}

export async function fetchAccounts(options?: { force?: boolean }): Promise<AccountRecord[]> {
  const force = options?.force === true
  if (!force && cache) {
    return cache.map((r) => ({ ...r }))
  }
  if (inflight) {
    recordRequestDeduped(ENDPOINT)
    return inflight
  }

  const req = (async () => {
    const items = listAccountsFromStore()
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

export type AccountInput = {
  name: string
  phone: string
  accountTypeId: string
  cashTypeId: string
}

export async function createAccount(input: AccountInput): Promise<AccountRecord> {
  requireDemoUser()
  const name = String(input.name ?? '').trim()
  const phone = String(input.phone ?? '').trim()
  const accountTypeId = String(input.accountTypeId ?? '').trim()
  const cashTypeId = String(input.cashTypeId ?? '').trim()
  if (!name) throw new Error('Account name is required.')
  if (!accountTypeId) throw new Error('Account type is required.')
  if (!cashTypeId) throw new Error('Cash type is required.')

  const row: StoredAccount = {
    id: newId('acc'),
    name,
    phone,
    accountTypeId,
    cashTypeId,
    createdAt: new Date().toISOString(),
  }
  setStoredAccounts([...getStoredAccounts(), row])
  invalidateAccountsCache()
  const item = hydrate(row, balancesByAccountId())
  cache = [...(cache ?? listAccountsFromStore().filter((a) => a.id !== item.id)), item]
  return item
}

export async function updateAccount(id: string, input: AccountInput): Promise<AccountRecord> {
  requireDemoUser()
  const name = String(input.name ?? '').trim()
  const phone = String(input.phone ?? '').trim()
  const accountTypeId = String(input.accountTypeId ?? '').trim()
  const cashTypeId = String(input.cashTypeId ?? '').trim()
  if (!name) throw new Error('Account name is required.')
  if (!accountTypeId) throw new Error('Account type is required.')
  if (!cashTypeId) throw new Error('Cash type is required.')

  const rows = getStoredAccounts()
  const idx = rows.findIndex((r) => r.id === id)
  if (idx < 0) throw new Error('Account not found.')
  const next: StoredAccount = {
    ...rows[idx],
    name,
    phone,
    accountTypeId,
    cashTypeId,
  }
  const updated = [...rows]
  updated[idx] = next
  setStoredAccounts(updated)
  invalidateAccountsCache()
  const item = hydrate(next, balancesByAccountId())
  cache = listAccountsFromStore()
  return item
}

export async function deleteAccount(id: string): Promise<void> {
  requireDemoUser()
  setStoredAccounts(getStoredAccounts().filter((r) => r.id !== id))
  invalidateAccountsCache()
  cache = (cache ?? []).filter((r) => r.id !== id)
}
