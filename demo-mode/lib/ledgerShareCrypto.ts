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
export const MAX_LEDGER_SHARE_PIN_ATTEMPTS = 5
export const LEDGER_SHARE_LOCK_MINUTES = 30
