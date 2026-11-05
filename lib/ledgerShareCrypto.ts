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
export const MAX_LEDGER_SHARE_PIN_ATTEMPTS = 5
export const LEDGER_SHARE_LOCK_MINUTES = 30
