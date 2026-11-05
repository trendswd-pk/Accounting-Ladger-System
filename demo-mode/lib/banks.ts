import { requireDemoUser } from '@/lib/demoAuth'
import {
  getBankDetails,
  newId,
  setBankDetails,
} from '@/lib/demoStore'
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

const ENDPOINT = 'demo:banks'

let cache: BankDetailRecord[] | null = null
let inflight: Promise<BankDetailRecord[]> | null = null

function normalize(input: BankDetailInput) {
  return {
    bankName: String(input.bankName ?? '').trim(),
    accountTitle: String(input.accountTitle ?? '').trim(),
    accountNumber: String(input.accountNumber ?? '').trim(),
    iban: String(input.iban ?? '').trim(),
    branchName: String(input.branchName ?? '').trim(),
    branchCode: String(input.branchCode ?? '').trim(),
    swiftCode: String(input.swiftCode ?? '').trim().toUpperCase(),
    notes: String(input.notes ?? '').trim(),
    active: input.active !== false,
  }
}

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
  requireDemoUser()
  const force = options?.force === true
  if (!force && cache) return cache.map((r) => ({ ...r }))
  if (inflight) {
    recordRequestDeduped(ENDPOINT)
    return inflight
  }

  const req = (async () => {
    const items = getBankDetails()
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
  requireDemoUser()
  const n = normalize(input)
  if (!n.bankName) throw new Error('Bank name is required.')
  if (!n.accountTitle) throw new Error('Account title is required.')
  if (!n.accountNumber) throw new Error('Account number is required.')

  const item: BankDetailRecord = {
    id: newId('bank'),
    ...n,
    createdAt: new Date().toISOString(),
  }
  const next = [...getBankDetails(), item]
  setBankDetails(next)
  cache = next
  return { ...item }
}

export async function updateBank(
  id: string,
  input: BankDetailInput
): Promise<BankDetailRecord> {
  requireDemoUser()
  const n = normalize(input)
  if (!n.bankName) throw new Error('Bank name is required.')
  if (!n.accountTitle) throw new Error('Account title is required.')
  if (!n.accountNumber) throw new Error('Account number is required.')

  const prev = getBankDetails()
  const idx = prev.findIndex((r) => r.id === id)
  if (idx < 0) throw new Error('Bank not found.')
  const item: BankDetailRecord = {
    ...prev[idx]!,
    ...n,
  }
  const next = prev.map((r) => (r.id === id ? item : r))
  setBankDetails(next)
  cache = next
  return { ...item }
}

export async function deleteBank(id: string): Promise<void> {
  requireDemoUser()
  const next = getBankDetails().filter((r) => r.id !== id)
  setBankDetails(next)
  cache = next
}
