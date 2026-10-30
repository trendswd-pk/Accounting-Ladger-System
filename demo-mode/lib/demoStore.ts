import type { AppSettings } from '@/lib/appSettings'
import type { SetupTypeRecord } from '@/lib/setupTypes'
import type { TransactionRecord } from '@/lib/transactions'
import type { FileAttachment } from '@/lib/uploads'

const SLUG = 'accounting-ledger'
const SESSION_KEY = `demo:${SLUG}:session`

export type DemoResource =
  | 'accountTypes'
  | 'cashTypes'
  | 'accounts'
  | 'transactions'
  | 'settings'
  | 'uploads'
  | 'seeded'
  | 'profile'

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
