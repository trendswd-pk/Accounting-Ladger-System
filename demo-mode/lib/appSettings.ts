import {
  DEFAULT_ACCOUNT_MESSAGE_TEMPLATE,
  DEFAULT_MESSAGE_NOTE_MINUS,
  DEFAULT_MESSAGE_NOTE_PLUS,
  DEFAULT_MESSAGE_NOTE_ZERO,
  DEFAULT_TRANSACTION_MESSAGE_TEMPLATE,
  normalizeMessageNote,
  normalizeMessageTemplate,
} from '@/lib/messageTemplates'
import { recordRequestDeduped } from '@/lib/requestProfiler'
import type { ThemePreference } from '@/lib/theme'
import { requireDemoUser } from '@/lib/demoAuth'
import { getStoredSettings, setStoredSettings } from '@/lib/demoStore'

/**
 * Migrate only known early seed templates. Do not rewrite user-edited text
 * (e.g. templates that say "Note:" without {{note}} must still persist).
 */
function coerceMessageTemplate(stored: unknown, fallback: string): string {
  const text = normalizeMessageTemplate(stored)
  if (!text) return fallback
  if (text.includes('A plus (+) balance means this account owes you')) return fallback
  return text
}

export type DefaultEntryMode = 'normal' | 'transfer'

export type AppSettings = {
  businessName: string
  currency: string
  theme: ThemePreference
  defaultEntryMode: DefaultEntryMode
  /** Optional header logo (R2 public URL). When set, replaces the name in the header. */
  logoUrl: string | null
  /** Optional browser tab favicon (R2 public URL). */
  faviconUrl: string | null
  /** WhatsApp/share template for account pages. Use {{name}}, {{balance}}, … */
  accountMessageTemplate: string
  /** WhatsApp/share template for transaction pages. Use {{account_name}}, {{amount}}, … */
  transactionMessageTemplate: string
  /** Custom {{note}} when balance is plus (receivable). */
  messageNotePlus: string
  /** Custom {{note}} when balance is minus (payable). */
  messageNoteMinus: string
  /** Custom {{note}} when balance is zero (settled). */
  messageNoteZero: string
  /** When true, Account Send message generates a ledger PDF and fills {{ledger_url}}. */
  accountMessageIncludeLedgerUrl: boolean
  /** When true, Transaction Send message generates a voucher PDF and fills {{pdf_url}}. */
  transactionMessageIncludePdfUrl: boolean
  /** When true, Transaction Send message also generates account ledger PDF and fills {{ledger_url}}. */
  transactionMessageIncludeLedgerUrl: boolean
  cashSavingsCashTypeIds: string[]
  cashSavingsAccountTypeIds: string[]
  /** Shared filter for Payable (−) and Receivable (+) pages/cards. */
  payableReceivableCashTypeIds: string[]
  payableReceivableAccountTypeIds: string[]
  updatedAt?: string
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  businessName: 'My Business',
  currency: 'PKR',
  theme: 'dark',
  defaultEntryMode: 'normal',
  logoUrl: null,
  faviconUrl: null,
  accountMessageTemplate: DEFAULT_ACCOUNT_MESSAGE_TEMPLATE,
  transactionMessageTemplate: DEFAULT_TRANSACTION_MESSAGE_TEMPLATE,
  messageNotePlus: DEFAULT_MESSAGE_NOTE_PLUS,
  messageNoteMinus: DEFAULT_MESSAGE_NOTE_MINUS,
  messageNoteZero: DEFAULT_MESSAGE_NOTE_ZERO,
  accountMessageIncludeLedgerUrl: true,
  transactionMessageIncludePdfUrl: true,
  transactionMessageIncludeLedgerUrl: true,
  cashSavingsCashTypeIds: [],
  cashSavingsAccountTypeIds: [],
  payableReceivableCashTypeIds: [],
  payableReceivableAccountTypeIds: [],
}

type DbRow = {
  business_name: string
  currency: string
  theme: string
  default_entry_mode?: string | null
  logo_url?: string | null
  favicon_url?: string | null
  account_message_template?: string | null
  transaction_message_template?: string | null
  message_note_plus?: string | null
  message_note_minus?: string | null
  message_note_zero?: string | null
  account_message_include_ledger_url?: boolean | null
  transaction_message_include_pdf_url?: boolean | null
  transaction_message_include_ledger_url?: boolean | null
  cash_savings_cash_type_ids?: unknown
  cash_savings_account_type_ids?: unknown
  payable_receivable_cash_type_ids?: unknown
  payable_receivable_account_type_ids?: unknown
  /** Legacy separate columns (fallback). */
  payable_cash_type_ids?: unknown
  payable_account_type_ids?: unknown
  receivable_cash_type_ids?: unknown
  receivable_account_type_ids?: unknown
  updated_at?: string
}

export function normalizeDefaultEntryMode(value: unknown): DefaultEntryMode {
  return value === 'transfer' ? 'transfer' : 'normal'
}

export function normalizeUuidIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const ids: string[] = []
  const seen = new Set<string>()
  for (const item of value) {
    const id = String(item ?? '').trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids
}

/** Empty / whitespace → null (optional branding URL). */
export function normalizeOptionalUrl(value: unknown): string | null {
  if (value == null) return null
  const url = String(value).trim()
  return url || null
}

/** @deprecated use normalizeUuidIdList */
export const normalizeCashSavingsCashTypeIds = normalizeUuidIdList
/** @deprecated use normalizeUuidIdList */
export const normalizeCashSavingsAccountTypeIds = normalizeUuidIdList

function firstNonEmptyIdList(...values: unknown[]): string[] {
  for (const value of values) {
    const ids = normalizeUuidIdList(value)
    if (ids.length > 0) return ids
  }
  return []
}

function cloneSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    cashSavingsCashTypeIds: [...settings.cashSavingsCashTypeIds],
    cashSavingsAccountTypeIds: [...settings.cashSavingsAccountTypeIds],
    payableReceivableCashTypeIds: [...settings.payableReceivableCashTypeIds],
    payableReceivableAccountTypeIds: [...settings.payableReceivableAccountTypeIds],
  }
}

function withIdDefaults(settings: AppSettings): AppSettings {
  return {
    ...settings,
    messageNotePlus: settings.messageNotePlus || DEFAULT_MESSAGE_NOTE_PLUS,
    messageNoteMinus: settings.messageNoteMinus || DEFAULT_MESSAGE_NOTE_MINUS,
    messageNoteZero: settings.messageNoteZero || DEFAULT_MESSAGE_NOTE_ZERO,
    accountMessageIncludeLedgerUrl: settings.accountMessageIncludeLedgerUrl !== false,
    transactionMessageIncludePdfUrl: settings.transactionMessageIncludePdfUrl !== false,
    transactionMessageIncludeLedgerUrl:
      settings.transactionMessageIncludeLedgerUrl !== false,
    cashSavingsCashTypeIds: settings.cashSavingsCashTypeIds ?? [],
    cashSavingsAccountTypeIds: settings.cashSavingsAccountTypeIds ?? [],
    payableReceivableCashTypeIds: settings.payableReceivableCashTypeIds ?? [],
    payableReceivableAccountTypeIds: settings.payableReceivableAccountTypeIds ?? [],
  }
}

export function mapAppSettingsRow(row: DbRow): AppSettings {
  const theme: ThemePreference = row.theme === 'light' ? 'light' : 'dark'
  return {
    businessName: row.business_name || DEFAULT_APP_SETTINGS.businessName,
    currency: row.currency || DEFAULT_APP_SETTINGS.currency,
    theme,
    defaultEntryMode: normalizeDefaultEntryMode(row.default_entry_mode),
    logoUrl: normalizeOptionalUrl(row.logo_url),
    faviconUrl: normalizeOptionalUrl(row.favicon_url),
    accountMessageTemplate: coerceMessageTemplate(
      row.account_message_template,
      DEFAULT_ACCOUNT_MESSAGE_TEMPLATE
    ),
    transactionMessageTemplate: coerceMessageTemplate(
      row.transaction_message_template,
      DEFAULT_TRANSACTION_MESSAGE_TEMPLATE
    ),
    messageNotePlus: normalizeMessageNote(row.message_note_plus, DEFAULT_MESSAGE_NOTE_PLUS),
    messageNoteMinus: normalizeMessageNote(row.message_note_minus, DEFAULT_MESSAGE_NOTE_MINUS),
    messageNoteZero: normalizeMessageNote(row.message_note_zero, DEFAULT_MESSAGE_NOTE_ZERO),
    accountMessageIncludeLedgerUrl: row.account_message_include_ledger_url !== false,
    transactionMessageIncludePdfUrl: row.transaction_message_include_pdf_url !== false,
    transactionMessageIncludeLedgerUrl:
      row.transaction_message_include_ledger_url !== false,
    cashSavingsCashTypeIds: normalizeUuidIdList(row.cash_savings_cash_type_ids),
    cashSavingsAccountTypeIds: normalizeUuidIdList(row.cash_savings_account_type_ids),
    payableReceivableCashTypeIds: firstNonEmptyIdList(
      row.payable_receivable_cash_type_ids,
      row.payable_cash_type_ids,
      row.receivable_cash_type_ids
    ),
    payableReceivableAccountTypeIds: firstNonEmptyIdList(
      row.payable_receivable_account_type_ids,
      row.payable_account_type_ids,
      row.receivable_account_type_ids
    ),
    updatedAt: row.updated_at,
  }
}

const SETTINGS_ENDPOINT = 'demo:settings'
const SETTINGS_CHANGED_EVENT = 'app-settings-changed'
let settingsInflight: Promise<AppSettings> | null = null
let settingsCache: AppSettings | null = null

export function invalidateAppSettingsCache(): void {
  settingsInflight = null
  settingsCache = null
}

export function getCachedAppSettings(): AppSettings | null {
  return settingsCache ? cloneSettings(settingsCache) : null
}

function notifySettingsChanged(settings: AppSettings): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT, { detail: settings }))
}

export function subscribeAppSettings(listener: (settings: AppSettings) => void): () => void {
  const handler = (e: Event) => {
    listener((e as CustomEvent<AppSettings>).detail)
  }
  window.addEventListener(SETTINGS_CHANGED_EVENT, handler)
  return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, handler)
}

/**
 * Subscribe to settings updates. Uses cache immediately; does not start a network
 * fetch (ThemeInit / ensureAppSettingsLoaded owns loading).
 */
export function watchAppSettings(listener: (settings: AppSettings) => void): () => void {
  const cached = getCachedAppSettings()
  if (cached) listener(cached)
  return subscribeAppSettings(listener)
}

export function sameIdList(a: string[], b: string[]): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every((id) => set.has(id))
}

async function loadSettingsFromStore(): Promise<AppSettings> {
  requireDemoUser()
  const stored = getStoredSettings()
  settingsCache = withIdDefaults(stored ?? DEFAULT_APP_SETTINGS)
  notifySettingsChanged(settingsCache)
  return cloneSettings(settingsCache)
}

/** Single-flight load. Cache hits are silent (no Deduped spam). */
export async function fetchAppSettings(): Promise<AppSettings> {
  if (settingsCache) {
    return cloneSettings(settingsCache)
  }
  if (settingsInflight) {
    recordRequestDeduped(SETTINGS_ENDPOINT)
    return settingsInflight
  }

  const req = loadSettingsFromStore()
  settingsInflight = req
  try {
    return await req
  } finally {
    if (settingsInflight === req) settingsInflight = null
  }
}

/** Kick one settings load if cache is cold. Safe to call from multiple places. */
export function ensureAppSettingsLoaded(): void {
  if (settingsCache || settingsInflight) return
  void fetchAppSettings().catch(() => {})
}

export type AppSettingsPatch = Partial<
  Pick<
    AppSettings,
    | 'businessName'
    | 'currency'
    | 'theme'
    | 'defaultEntryMode'
    | 'logoUrl'
    | 'faviconUrl'
    | 'accountMessageTemplate'
    | 'transactionMessageTemplate'
    | 'messageNotePlus'
    | 'messageNoteMinus'
    | 'messageNoteZero'
    | 'accountMessageIncludeLedgerUrl'
    | 'transactionMessageIncludePdfUrl'
    | 'transactionMessageIncludeLedgerUrl'
    | 'cashSavingsCashTypeIds'
    | 'cashSavingsAccountTypeIds'
    | 'payableReceivableCashTypeIds'
    | 'payableReceivableAccountTypeIds'
  >
>

/** Apply favicon (and apple-touch-icon) from settings into document head. */
export function applyFaviconUrl(url: string | null | undefined): void {
  if (typeof document === 'undefined') return
  const href = normalizeOptionalUrl(url)

  const ensureLink = (rel: string): HTMLLinkElement => {
    let link = document.head.querySelector<HTMLLinkElement>(
      `link[data-app-branding="1"][rel="${rel}"]`
    )
    if (!link) {
      link = document.createElement('link')
      link.rel = rel
      link.dataset.appBranding = '1'
      document.head.appendChild(link)
    }
    return link
  }

  if (!href) {
    document.head
      .querySelectorAll('link[data-app-branding="1"]')
      .forEach((el) => el.remove())
    return
  }

  ensureLink('icon').href = href
  ensureLink('shortcut icon').href = href
  ensureLink('apple-touch-icon').href = href
}

export async function saveAppSettings(input: AppSettingsPatch): Promise<AppSettings> {
  requireDemoUser()
  const current = withIdDefaults(getStoredSettings() ?? settingsCache ?? DEFAULT_APP_SETTINGS)
  const next: AppSettings = {
    ...current,
    ...input,
    cashSavingsCashTypeIds:
      input.cashSavingsCashTypeIds ?? current.cashSavingsCashTypeIds,
    cashSavingsAccountTypeIds:
      input.cashSavingsAccountTypeIds ?? current.cashSavingsAccountTypeIds,
    payableReceivableCashTypeIds:
      input.payableReceivableCashTypeIds ?? current.payableReceivableCashTypeIds,
    payableReceivableAccountTypeIds:
      input.payableReceivableAccountTypeIds ?? current.payableReceivableAccountTypeIds,
    updatedAt: new Date().toISOString(),
  }
  if (input.businessName !== undefined) {
    next.businessName = String(input.businessName).trim() || DEFAULT_APP_SETTINGS.businessName
  }
  if (input.currency !== undefined) {
    next.currency = String(input.currency).trim() || DEFAULT_APP_SETTINGS.currency
  }
  if (input.logoUrl !== undefined) next.logoUrl = normalizeOptionalUrl(input.logoUrl)
  if (input.faviconUrl !== undefined) next.faviconUrl = normalizeOptionalUrl(input.faviconUrl)
  setStoredSettings(withIdDefaults(next))
  settingsCache = withIdDefaults(next)
  notifySettingsChanged(settingsCache)
  return cloneSettings(settingsCache)
}
