import type { AccountRecord } from '@/lib/accounts'
import { formatDisplayDate } from '@/lib/localDate'
import { formatMoney } from '@/lib/money'
import { toWhatsAppDigits } from '@/lib/phone'
import type { TransactionRecord } from '@/lib/transactions'

export const ACCOUNT_MESSAGE_VARS = [
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'balance', label: 'Balance' },
  { key: 'note', label: 'Note' },
  { key: 'ledger_url', label: 'Ledger preview URL' },
  { key: 'ledger_pin', label: 'Ledger PIN' },
  { key: 'ledger_expires', label: 'Ledger expires' },
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
  { key: 'ledger_url', label: 'Ledger preview URL' },
  { key: 'ledger_pin', label: 'Ledger PIN' },
  { key: 'ledger_expires', label: 'Ledger expires' },
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

Ledger: {{ledger_url}}
Access code: {{ledger_pin}}
Valid until: {{ledger_expires}}`

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

Ledger: {{ledger_url}}
Access code: {{ledger_pin}}
Valid until: {{ledger_expires}}`

/** Cap stored template length. */
export function normalizeMessageTemplate(value: unknown): string {
  if (value == null) return ''
  return String(value).slice(0, 4000)
}

const LEDGER_PREVIEW_FOOTER = `Ledger: {{ledger_url}}
Access code: {{ledger_pin}}
Valid until: {{ledger_expires}}`

/**
 * Upgrade older WhatsApp templates that used PDF / bare ledger URL
 * to the interactive ledger preview footer (URL + PIN + expiry).
 * Leaves clearly custom user text alone when possible.
 */
export function upgradeLedgerPreviewMessageTemplate(
  stored: unknown,
  fallback: string
): string {
  let text = normalizeMessageTemplate(stored)
  if (!text) return fallback

  // Known early seed note wording → full current default.
  if (text.includes('A plus (+) balance means this account owes you')) {
    return fallback
  }

  // Drop legacy voucher PDF line.
  if (/\{\{\s*pdf_url\s*\}\}/i.test(text)) {
    text = text
      .replace(/^[ \t]*PDF:[ \t]*\{\{\s*pdf_url\s*\}\}[ \t]*$/gim, '')
      .replace(/\{\{\s*pdf_url\s*\}\}/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  const hasLedgerUrl = /\{\{\s*ledger_url\s*\}\}/i.test(text)
  const hasPin = /\{\{\s*ledger_pin\s*\}\}/i.test(text)
  const hasExpires = /\{\{\s*ledger_expires\s*\}\}/i.test(text)

  if (hasLedgerUrl && (!hasPin || !hasExpires)) {
    if (/Ledger:\s*\{\{\s*ledger_url\s*\}\}/i.test(text)) {
      text = text
        .replace(
          /Ledger:\s*\{\{\s*ledger_url\s*\}\}(?:\s*\n[ \t]*Access code:[ \t]*\{\{\s*ledger_pin\s*\}\})?(?:\s*\n[ \t]*Valid until:[ \t]*\{\{\s*ledger_expires\s*\}\})?/gi,
          LEDGER_PREVIEW_FOOTER
        )
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    } else {
      text = `${text.trim()}\n\n${LEDGER_PREVIEW_FOOTER}`
    }
  } else if (!hasLedgerUrl && !hasPin && !hasExpires) {
    // Templates that ended after Note with no link — append preview footer.
    if (/Note:\s*\{\{\s*note\s*\}\}\s*$/i.test(text.trim())) {
      text = `${text.trim()}\n\n${LEDGER_PREVIEW_FOOTER}`
    }
  }

  return text
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
    /** Interactive ledger preview URL (PIN-gated). */
    ledgerUrl?: string
    ledgerPin?: string
    ledgerExpires?: string
  }
): Record<string, string> {
  return {
    name: account.name,
    phone: account.phone,
    balance: formatMoney(account.balance, opts.currency),
    note: balanceNoteFor(account.balance, opts.notes),
    ledger_url: String(opts.ledgerUrl ?? '').trim(),
    ledger_pin: String(opts.ledgerPin ?? '').trim(),
    ledger_expires: String(opts.ledgerExpires ?? '').trim(),
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
    /** Interactive ledger preview URL (PIN-gated). */
    ledgerUrl?: string
    ledgerPin?: string
    ledgerExpires?: string
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

  return {
    account_name: txn.accountName,
    phone: opts.phone ?? '',
    amount: formatMoney(amount, opts.currency),
    entry_type:
      txn.entryType === 'debit'
        ? 'Debit (balance removed)'
        : 'Credit (balance added)',
    date: formatDisplayDate(txn.transactionDate),
    narration: txn.narration || '—',
    balance: formatMoney(amount, opts.currency),
    previous_balance: formatMoney(previous, opts.currency),
    current_transaction: formatMoney(signed, opts.currency),
    current_balance: formatMoney(current, opts.currency),
    note: balanceNoteFor(current, opts.notes),
    ledger_url: String(opts.ledgerUrl ?? '').trim(),
    ledger_pin: String(opts.ledgerPin ?? '').trim(),
    ledger_expires: String(opts.ledgerExpires ?? '').trim(),
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
  // E.164 / local PK numbers → country+number digits (default +92)
  const digits = toWhatsAppDigits(phone)
  const q = body ? `?text=${encodeURIComponent(body)}` : ''
  return digits ? `https://wa.me/${digits}${q}` : `https://wa.me/${q}`
}

/**
 * Opens WhatsApp with prefilled text (phone optional).
 * Call after in-app prep overlay finishes — opens WhatsApp in a new tab;
 * if the browser blocks it, navigates the current tab instead.
 */
export function openWhatsAppMessage(
  phone: string | null | undefined,
  text: string
): void {
  if (typeof window === 'undefined') return
  const body = text.trim()
  if (!body) return
  const url = buildWhatsAppUrl(phone, body)
  const opened = window.open(url, '_blank', 'noopener,noreferrer')
  if (!opened) {
    window.location.assign(url)
  }
}
