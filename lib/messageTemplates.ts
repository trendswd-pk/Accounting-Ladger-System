import type { AccountRecord } from '@/lib/accounts'
import { formatMoney } from '@/lib/money'
import type { TransactionRecord } from '@/lib/transactions'

export const ACCOUNT_MESSAGE_VARS = [
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'balance', label: 'Balance' },
  { key: 'note', label: 'Note' },
  { key: 'ledger_url', label: 'Ledger URL' },
  { key: 'account_type', label: 'Account type' },
  { key: 'cash_type', label: 'Cash type' },
  { key: 'business_name', label: 'Business' },
  { key: 'currency', label: 'Currency' },
] as const

export const TRANSACTION_MESSAGE_VARS = [
  { key: 'date', label: 'Date' },
  { key: 'account_name', label: 'Account' },
  { key: 'phone', label: 'Phone' },
  { key: 'entry_type', label: 'Type' },
  { key: 'narration', label: 'Narration' },
  { key: 'amount', label: 'Amount' },
  { key: 'previous_balance', label: 'Previous bal.' },
  { key: 'current_transaction', label: 'This entry' },
  { key: 'current_balance', label: 'Current bal.' },
  { key: 'note', label: 'Note' },
  { key: 'pdf_url', label: 'PDF URL' },
  { key: 'ledger_url', label: 'Ledger URL' },
  { key: 'balance', label: 'Amount (alias)' },
  { key: 'business_name', label: 'Business' },
  { key: 'currency', label: 'Currency' },
] as const

export type MessageVarKey =
  | (typeof ACCOUNT_MESSAGE_VARS)[number]['key']
  | (typeof TRANSACTION_MESSAGE_VARS)[number]['key']

export type BalanceNoteTexts = {
  plus: string
  minus: string
  zero: string
}

export const DEFAULT_MESSAGE_NOTE_PLUS =
  'Plus (+) balance: payment receivable — they will pay you.'
export const DEFAULT_MESSAGE_NOTE_MINUS =
  'Minus (−) balance: payment payable — you will pay them.'
export const DEFAULT_MESSAGE_NOTE_ZERO =
  'Zero balance: everything is settled / all clear.'

export const DEFAULT_BALANCE_NOTES: BalanceNoteTexts = {
  plus: DEFAULT_MESSAGE_NOTE_PLUS,
  minus: DEFAULT_MESSAGE_NOTE_MINUS,
  zero: DEFAULT_MESSAGE_NOTE_ZERO,
}

/** Cap stored note line length. */
export function normalizeMessageNote(value: unknown, fallback: string): string {
  if (value == null) return fallback
  const text = String(value).trim().slice(0, 500)
  return text || fallback
}

/** One short note from balance sign (plus / minus / zero), using custom texts when provided. */
export function balanceNoteFor(
  amount: number,
  notes: BalanceNoteTexts = DEFAULT_BALANCE_NOTES
): string {
  const n = Number(amount)
  if (!Number.isFinite(n) || n === 0) return notes.zero
  if (n > 0) return notes.plus
  return notes.minus
}

/** Default account WhatsApp/share template ({{note}} matches balance sign). */
export const DEFAULT_ACCOUNT_MESSAGE_TEMPLATE = `Account Balance Details
--------------------------
Account: {{name}}
Phone: {{phone}}
Current Balance: {{balance}}

Note: {{note}}

Ledger: {{ledger_url}}`

/** Default transaction WhatsApp/share template ({{note}} matches current balance). */
export const DEFAULT_TRANSACTION_MESSAGE_TEMPLATE = `Transaction Details
--------------------------
Date: {{date}}
Account: {{account_name}}
Type: {{entry_type}}
Narration: {{narration}}
Amount: {{amount}}

Previous Balance: {{previous_balance}}
Current Transaction: {{current_transaction}}
Current Balance: {{current_balance}}

Note: {{note}}

PDF: {{pdf_url}}
Ledger: {{ledger_url}}`

/** Cap stored template length. */
export function normalizeMessageTemplate(value: unknown): string {
  if (value == null) return ''
  return String(value).slice(0, 4000)
}

export function fillMessageTemplate(
  template: string,
  vars: Record<string, string | number | null | undefined>
): string {
  return template.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_match, rawKey: string) => {
    const key = rawKey.toLowerCase()
    const value = vars[key]
    if (value == null) return ''
    return String(value)
  })
}

export function accountMessageVars(
  account: AccountRecord,
  opts: {
    businessName: string
    currency: string
    notes?: BalanceNoteTexts
    /** Short public ledger PDF link (empty when disabled / unavailable). */
    ledgerUrl?: string
  }
): Record<string, string> {
  return {
    name: account.name,
    phone: account.phone,
    balance: formatMoney(account.balance, opts.currency),
    note: balanceNoteFor(account.balance, opts.notes),
    ledger_url: String(opts.ledgerUrl ?? '').trim(),
    account_type: account.accountTypeName,
    cash_type: account.cashTypeName,
    business_name: opts.businessName,
    currency: opts.currency,
  }
}

export function transactionMessageVars(
  txn: TransactionRecord,
  opts: {
    businessName: string
    currency: string
    phone?: string
    notes?: BalanceNoteTexts
    /** Running balance after this entry (same account). */
    currentBalance?: number
    /** Running balance before this entry. */
    previousBalance?: number
    /** Short public transaction PDF link (empty when disabled / unavailable). */
    pdfUrl?: string
    /** Short public account ledger PDF link (empty when disabled / unavailable). */
    ledgerUrl?: string
  }
): Record<string, string> {
  const amount = Math.abs(Number(txn.balance) || 0)
  const signed = txn.entryType === 'debit' ? -amount : amount
  const current =
    opts.currentBalance != null && Number.isFinite(opts.currentBalance)
      ? opts.currentBalance
      : signed
  const previous =
    opts.previousBalance != null && Number.isFinite(opts.previousBalance)
      ? opts.previousBalance
      : current - signed

  const iso = String(txn.transactionDate).slice(0, 10)
  const dateLabel = /^\d{4}-\d{2}-\d{2}$/.test(iso)
    ? `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}`
    : iso

  return {
    account_name: txn.accountName,
    phone: opts.phone ?? '',
    amount: formatMoney(amount, opts.currency),
    entry_type:
      txn.entryType === 'debit'
        ? 'Debit (balance removed)'
        : 'Credit (balance added)',
    date: dateLabel,
    narration: txn.narration || '—',
    balance: formatMoney(amount, opts.currency),
    previous_balance: formatMoney(previous, opts.currency),
    current_transaction: formatMoney(signed, opts.currency),
    current_balance: formatMoney(current, opts.currency),
    note: balanceNoteFor(current, opts.notes),
    pdf_url: String(opts.pdfUrl ?? '').trim(),
    ledger_url: String(opts.ledgerUrl ?? '').trim(),
    business_name: opts.businessName,
    currency: opts.currency,
  }
}

/** Build wa.me URL with prefilled text (phone optional). */
export function buildWhatsAppUrl(
  phone: string | null | undefined,
  text: string
): string {
  const body = text.trim()
  const digits = String(phone ?? '').replace(/[^\d]/g, '')
  const q = body ? `?text=${encodeURIComponent(body)}` : ''
  return digits ? `https://wa.me/${digits}${q}` : `https://wa.me/${q}`
}

/**
 * Opens WhatsApp with prefilled text (phone optional).
 * Pass `target` (e.g. a window opened immediately on click) so the tab
 * is ready before slow PDF work finishes — avoids popup blockers + lag.
 */
export function openWhatsAppMessage(
  phone: string | null | undefined,
  text: string,
  target?: Window | null
): void {
  if (typeof window === 'undefined') return
  const body = text.trim()
  if (!body) {
    if (target && !target.closed) target.close()
    return
  }
  const url = buildWhatsAppUrl(phone, body)
  if (target && !target.closed) {
    target.location.href = url
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}
