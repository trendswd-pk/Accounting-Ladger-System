/**
 * Client helpers for interactive ledger shares (PIN + expiry).
 */

import { formatDisplayDateTime } from '@/lib/localDate'

export type CreatedLedgerShare = {
  token: string
  pin: string
  url: string
  expiresAt: string
  requirePin: boolean
}

export function formatShareExpiryLabel(iso: string): string {
  return formatDisplayDateTime(iso)
}

export function buildShareAccessFooter(opts: {
  url: string
  pin: string
  expiresAt: string
}): string {
  const lines = [`Ledger preview: ${opts.url}`]
  const pin = String(opts.pin ?? '').trim()
  if (pin) lines.push(`Access code: ${pin}`)
  lines.push(`Valid until: ${formatShareExpiryLabel(opts.expiresAt)}`)
  return lines.join('\n')
}

export async function createLedgerShare(accountId: string): Promise<CreatedLedgerShare> {
  const res = await fetch('/api/ledger-shares', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountId }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Could not create ledger share link.')
  }
  const pin = String(data.pin ?? '')
  return {
    token: String(data.token ?? ''),
    pin,
    url: String(data.url ?? ''),
    expiresAt: String(data.expiresAt ?? ''),
    requirePin: data.requirePin !== false && Boolean(pin),
  }
}
