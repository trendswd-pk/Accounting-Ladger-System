/** Browser-safe PIN helpers for Demo Mode (Web Crypto / fallback). */

function fallbackHash(input: string): string {
  // Simple non-crypto hash for offline demo only (not production).
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return `demo_${(h >>> 0).toString(16)}`
}

export function generateLedgerPin(): string {
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0')
}

export function generateLedgerShareToken(): string {
  const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 12; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

export function hashLedgerPin(pin: string, token: string): string {
  return fallbackHash(`${String(pin).trim()}:${token}:demo-pepper`)
}

export function verifyLedgerPin(
  pin: string,
  token: string,
  pinHash: string
): boolean {
  return hashLedgerPin(pin, token) === pinHash
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
