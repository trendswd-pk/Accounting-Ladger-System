import { createHash, randomInt } from 'crypto'
import { generateShortCode } from '@/lib/shortLinks'

const PEPPER =
  process.env.LEDGER_SHARE_PEPPER?.trim() ||
  process.env.CRON_SECRET?.trim() ||
  'accounting-ledger-share-pepper'

/** 4-digit numeric PIN (0000–9999), always zero-padded. */
export function generateLedgerPin(): string {
  return String(randomInt(0, 10000)).padStart(4, '0')
}

export function hashLedgerPin(pin: string, token: string): string {
  return createHash('sha256')
    .update(`${String(pin).trim()}:${token}:${PEPPER}`)
    .digest('hex')
}

export function verifyLedgerPin(
  pin: string,
  token: string,
  pinHash: string
): boolean {
  const a = hashLedgerPin(pin, token)
  if (a.length !== pinHash.length) return false
  // timing-safe-ish compare
  let ok = 0
  for (let i = 0; i < a.length; i++) {
    ok |= a.charCodeAt(i) ^ pinHash.charCodeAt(i)
  }
  return ok === 0
}

/** Public URL token (longer than short links). */
export function generateLedgerShareToken(): string {
  return generateShortCode(12)
}

export const DEFAULT_LEDGER_SHARE_TTL_HOURS = 24
export const MIN_LEDGER_SHARE_TTL_HOURS = 1
export const MAX_LEDGER_SHARE_TTL_HOURS = 720 // 30 days
export const MAX_LEDGER_SHARE_PIN_ATTEMPTS = 5
export const LEDGER_SHARE_LOCK_MINUTES = 30

/** Presets shown in Settings → Ledger preview link. */
export const LEDGER_SHARE_TTL_OPTIONS: ReadonlyArray<{
  hours: number
  label: string
}> = [
  { hours: 1, label: '1 hour' },
  { hours: 6, label: '6 hours' },
  { hours: 12, label: '12 hours' },
  { hours: 24, label: '24 hours' },
  { hours: 48, label: '2 days' },
  { hours: 72, label: '3 days' },
  { hours: 168, label: '7 days' },
  { hours: 336, label: '14 days' },
  { hours: 720, label: '30 days' },
]

export function normalizeLedgerShareTtlHours(value: unknown): number {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return DEFAULT_LEDGER_SHARE_TTL_HOURS
  return Math.max(
    MIN_LEDGER_SHARE_TTL_HOURS,
    Math.min(MAX_LEDGER_SHARE_TTL_HOURS, n)
  )
}
