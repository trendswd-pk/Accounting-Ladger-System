import { recordRequestDeduped } from '@/lib/requestProfiler'

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

type RpcRow = {
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
}

const ENDPOINT = '/api/accounts'
let cache: AccountRecord[] | null = null
let inflight: Promise<AccountRecord[]> | null = null

export function mapAccountRow(row: RpcRow): AccountRecord {
  const balanceRaw = row.balance
  const balance =
    balanceRaw == null || balanceRaw === ''
      ? 0
      : Number(balanceRaw) || 0
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

/** Soft-update a cached account balance after a journal entry (avoids full /api/accounts reload). */
export function adjustCachedAccountBalance(accountId: string, delta: number): void {
  if (!cache || !accountId || !Number.isFinite(delta) || delta === 0) return
  cache = cache.map((row) =>
    row.id === accountId ? { ...row, balance: (Number(row.balance) || 0) + delta } : row
  )
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
    const res = await fetch(ENDPOINT, { cache: 'no-store' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to load accounts')
    const items = (data.items as AccountRecord[]) ?? []
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
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to create account')
  const item = data.item as AccountRecord
  cache = [...(cache ?? []), item]
  return item
}

export async function updateAccount(id: string, input: AccountInput): Promise<AccountRecord> {
  const res = await fetch(`${ENDPOINT}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to update account')
  const item = data.item as AccountRecord
  cache = (cache ?? []).map((r) => (r.id === item.id ? item : r))
  return item
}

export async function deleteAccount(id: string): Promise<void> {
  const res = await fetch(`${ENDPOINT}/${id}`, { method: 'DELETE' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Failed to delete account')
  cache = (cache ?? []).filter((r) => r.id !== id)
}
