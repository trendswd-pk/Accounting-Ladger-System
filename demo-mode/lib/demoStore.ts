import type { AppSettings } from '@/lib/appSettings'
import type { BankDetailRecord } from '@/lib/banks'
import type { SetupTypeRecord } from '@/lib/setupTypes'
import type { TransactionRecord } from '@/lib/transactions'
import type { FileAttachment } from '@/lib/uploads'

const SLUG = 'accounting-ledger'
const SESSION_KEY = `demo:${SLUG}:session`

export type DemoResource =
  | 'accountTypes'
  | 'cashTypes'
  | 'bankDetails'
  | 'ledgerShares'
  | 'accounts'
  | 'transactions'
  | 'settings'
  | 'uploads'
  | 'seeded'
  | 'profile'

export type DemoLedgerShare = {
  id: string
  token: string
  accountId: string
  pinHash: string
  expiresAt: string
  failedAttempts: number
  lockedUntil: string | null
  createdAt: string
}

export function demoStorageKey(userId: string, resource: DemoResource): string {
  return `demo:${SLUG}:user:${userId}:${resource}`
}

function currentUserIdFromSession(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { userId?: string }
    return parsed?.userId ? String(parsed.userId) : null
  } catch {
    return null
  }
}

function requireUserId(explicit?: string): string {
  if (explicit) return explicit
  const id = currentUserIdFromSession()
  if (!id) throw new Error('Unauthorized. Please sign in.')
  return id
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

export function isDemoSeeded(userId?: string): boolean {
  const id = userId ?? currentUserIdFromSession()
  if (!id) return false
  return readJson<boolean>(demoStorageKey(id, 'seeded'), false) === true
}

export function markDemoSeeded(userId: string): void {
  writeJson(demoStorageKey(userId, 'seeded'), true)
}

export function getAccountTypes(userId?: string): SetupTypeRecord[] {
  const id = requireUserId(userId)
  return readJson<SetupTypeRecord[]>(demoStorageKey(id, 'accountTypes'), [])
}

export function setAccountTypes(rows: SetupTypeRecord[], userId?: string): void {
  const id = requireUserId(userId)
  writeJson(demoStorageKey(id, 'accountTypes'), rows)
}

export function getCashTypes(userId?: string): SetupTypeRecord[] {
  const id = requireUserId(userId)
  return readJson<SetupTypeRecord[]>(demoStorageKey(id, 'cashTypes'), [])
}

export function setCashTypes(rows: SetupTypeRecord[], userId?: string): void {
  const id = requireUserId(userId)
  writeJson(demoStorageKey(id, 'cashTypes'), rows)
}

export function getBankDetails(userId?: string): BankDetailRecord[] {
  const id = requireUserId(userId)
  return readJson<BankDetailRecord[]>(demoStorageKey(id, 'bankDetails'), [])
}

export function setBankDetails(rows: BankDetailRecord[], userId?: string): void {
  const id = requireUserId(userId)
  writeJson(demoStorageKey(id, 'bankDetails'), rows)
}

export function getLedgerShares(userId?: string): DemoLedgerShare[] {
  const id = requireUserId(userId)
  return readJson<DemoLedgerShare[]>(demoStorageKey(id, 'ledgerShares'), [])
}

export function setLedgerShares(rows: DemoLedgerShare[], userId?: string): void {
  const id = requireUserId(userId)
  writeJson(demoStorageKey(id, 'ledgerShares'), rows)
}

/** Resolve which demo user owns a ledger share token (recipients may be logged out). */
export function findLedgerShareOwnerUserId(token: string): string | null {
  if (typeof window === 'undefined') return null
  const prefix = `demo:${SLUG}:user:`
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith(prefix) || !key.endsWith(':ledgerShares')) {
        continue
      }
      const rows = readJson<DemoLedgerShare[]>(key, [])
      if (rows.some((r) => r.token === token)) {
        // demo:{slug}:user:{userId}:ledgerShares
        const mid = key.slice(prefix.length)
        return mid.replace(/:ledgerShares$/, '') || null
      }
    }
  } catch {
    return null
  }
  return null
}

/** Find a share by token across the current user sandbox (or any sandbox). */
export function findLedgerShareByToken(token: string): DemoLedgerShare | null {
  const owner = findLedgerShareOwnerUserId(token)
  if (owner) {
    return getLedgerShares(owner).find((r) => r.token === token) ?? null
  }
  const id = currentUserIdFromSession()
  if (!id) return null
  return getLedgerShares(id).find((r) => r.token === token) ?? null
}

export function updateLedgerShareByToken(
  token: string,
  patch: Partial<DemoLedgerShare>
): DemoLedgerShare | null {
  if (typeof window === 'undefined') return null
  const prefix = `demo:${SLUG}:user:`
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith(prefix) || !key.endsWith(':ledgerShares')) continue
    const rows = readJson<DemoLedgerShare[]>(key, [])
    const idx = rows.findIndex((r) => r.token === token)
    if (idx < 0) continue
    const next = { ...rows[idx]!, ...patch }
    const updated = rows.map((r, j) => (j === idx ? next : r))
    writeJson(key, updated)
    return next
  }
  return null
}

export type StoredAccount = {
  id: string
  name: string
  phone: string
  accountTypeId: string
  cashTypeId: string
  createdAt: string
}

export function getStoredAccounts(userId?: string): StoredAccount[] {
  const id = requireUserId(userId)
  return readJson<StoredAccount[]>(demoStorageKey(id, 'accounts'), [])
}

export function setStoredAccounts(rows: StoredAccount[], userId?: string): void {
  const id = requireUserId(userId)
  writeJson(demoStorageKey(id, 'accounts'), rows)
}

export function getStoredTransactions(userId?: string): TransactionRecord[] {
  const id = requireUserId(userId)
  return readJson<TransactionRecord[]>(demoStorageKey(id, 'transactions'), [])
}

export function setStoredTransactions(
  rows: TransactionRecord[],
  userId?: string
): void {
  const id = requireUserId(userId)
  writeJson(demoStorageKey(id, 'transactions'), rows)
}

export function getStoredSettings(userId?: string): AppSettings | null {
  const id = requireUserId(userId)
  return readJson<AppSettings | null>(demoStorageKey(id, 'settings'), null)
}

export function setStoredSettings(settings: AppSettings, userId?: string): void {
  const id = requireUserId(userId)
  writeJson(demoStorageKey(id, 'settings'), settings)
}

export function getStoredUploads(userId?: string): FileAttachment[] {
  const id = requireUserId(userId)
  return readJson<FileAttachment[]>(demoStorageKey(id, 'uploads'), [])
}

export function setStoredUploads(rows: FileAttachment[], userId?: string): void {
  const id = requireUserId(userId)
  writeJson(demoStorageKey(id, 'uploads'), rows)
}

export type DemoShortLink = {
  code: string
  targetUrl: string
  createdAt: string
}

const SHORT_LINKS_KEY = `demo:${SLUG}:shortLinks`

/** Global (browser) short-link map for ad-free /l/{code} redirects in Demo Mode. */
export function getStoredShortLinks(): DemoShortLink[] {
  return readJson<DemoShortLink[]>(SHORT_LINKS_KEY, [])
}

export function setStoredShortLinks(rows: DemoShortLink[]): void {
  writeJson(SHORT_LINKS_KEY, rows)
}

/** Wipe all resources for the current (or given) user and clear the seeded flag. */
export function clearDemoUserData(userId?: string): void {
  const id = requireUserId(userId)
  const resources: DemoResource[] = [
    'accountTypes',
    'cashTypes',
    'bankDetails',
    'ledgerShares',
    'accounts',
    'transactions',
    'settings',
    'uploads',
    'seeded',
    'profile',
  ]
  if (typeof window === 'undefined') return
  for (const resource of resources) {
    localStorage.removeItem(demoStorageKey(id, resource))
  }
}

export function newId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}
