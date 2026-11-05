/**
 * Client helpers for interactive ledger shares (PIN + expiry).
 */

import { formatDisplayDateTime } from '@/lib/localDate'

export type CreatedLedgerShare = {
  token: string
  pin: string
  url: string
  expiresAt: string
}

export function formatShareExpiryLabel(iso: string): string {
  return formatDisplayDateTime(iso)
}

export function buildShareAccessFooter(opts: {
  url: string
  pin: string
  expiresAt: string
}): string {
  return [
    `Ledger preview: ${opts.url}`,
    `Access code: ${opts.pin}`,
    `Valid until: ${formatShareExpiryLabel(opts.expiresAt)}`,
  ].join('\n')
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
  return {
    token: String(data.token ?? ''),
    pin: String(data.pin ?? ''),
    url: String(data.url ?? ''),
    expiresAt: String(data.expiresAt ?? ''),
  }
}
