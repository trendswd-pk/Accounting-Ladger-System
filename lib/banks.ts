import { recordRequestDeduped } from '@/lib/requestProfiler'

export type BankDetailRecord = {
  id: string
  bankName: string
  accountTitle: string
  accountNumber: string
  iban: string
  branchName: string
  branchCode: string
  swiftCode: string
  notes: string
  active: boolean
  createdAt: string
}

export type BankDetailInput = {
  bankName: string
  accountTitle: string
  accountNumber: string
  iban?: string
  branchName?: string
  branchCode?: string
  swiftCode?: string
  notes?: string
  active?: boolean
}

type DbRow = {
  id: string
  bank_name: string
  account_title: string
  account_number: string
  iban: string | null
  branch_name: string | null
  branch_code: string | null
  swift_code: string | null
  notes: string | null
  active: boolean
  created_at: string
}

export function mapBankDetailRow(row: DbRow): BankDetailRecord {
  return {
    id: row.id,
    bankName: row.bank_name,
    accountTitle: row.account_title,
    accountNumber: row.account_number,
    iban: row.iban ?? '',
    branchName: row.branch_name ?? '',
    branchCode: row.branch_code ?? '',
    swiftCode: row.swift_code ?? '',
    notes: row.notes ?? '',
    active: !!row.active,
    createdAt: row.created_at,
  }
}

const ENDPOINT = '/api/banks'

let cache: BankDetailRecord[] | null = null
let inflight: Promise<BankDetailRecord[]> | null = null

export function getCachedBanks(): BankDetailRecord[] | null {
  return cache ? cache.map((r) => ({ ...r })) : null
}

export function setCachedBanks(rows: BankDetailRecord[]): void {
  cache = rows.map((r) => ({ ...r }))
}

export function invalidateBanksCache(): void {
  cache = null
  inflight = null
}

export async function fetchBanks(options?: {
  force?: boolean
}): Promise<BankDetailRecord[]> {
  const force = options?.force === true
  if (!force && cache) return cache.map((r) => ({ ...r }))
  if (inflight) {
    recordRequestDeduped(ENDPOINT)
    return inflight
  }

  const req = (async () => {
    const res = await fetch(ENDPOINT, { cache: 'no-store' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to load bank details')
    const items = (data.items as BankDetailRecord[]) ?? []
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

export async function createBank(
  input: BankDetailInput
): Promise<BankDetailRecord> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to create bank details')
  const item = data.item as BankDetailRecord
  cache = [...(cache ?? []), item]
  return item
}

export async function updateBank(
  id: string,
  input: BankDetailInput
): Promise<BankDetailRecord> {
  const res = await fetch(`${ENDPOINT}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to update bank details')
  const item = data.item as BankDetailRecord
  if (cache) {
    cache = cache.map((r) => (r.id === id ? item : r))
  }
  return item
}

export async function deleteBank(id: string): Promise<void> {
  const res = await fetch(`${ENDPOINT}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Failed to delete bank details')
  if (cache) cache = cache.filter((r) => r.id !== id)
}
